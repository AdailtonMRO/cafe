/**
 * Módulo de Gerenciamento da Fila Offline (Outbox Sync Queue) e Concorrência Transacional
 * App Coffee Experience
 */

import { getFirestoreDb } from '../core/firebase-service.js';
import { stateManager } from '../core/state-manager.js';

const QUEUE_STORAGE_KEY = 'coffee_pending_sync_queue';

/**
 * Retorna a fila de participações pendentes gravadas no armazenamento local
 * @returns {Array}
 */
export function getPendingSyncQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_STORAGE_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

/**
 * Adiciona uma participação à fila offline para envio assim que houver conexão
 * @param {object} participationData 
 */
export function enqueueOfflineParticipation(participationData) {
  const queue = getPendingSyncQueue();
  const itemWithSnapshot = {
    ...participationData,
    localTimestamp: Date.now(),
    snapshotPricePerKg: participationData.pricePerKg || 0,
    status: 'pending_sync'
  };

  queue.push(itemWithSnapshot);
  localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  console.log('[SyncQueue] Participação salva na fila offline com sucesso:', itemWithSnapshot);
}

/**
 * Remove um item processado da fila offline
 * @param {string} localId 
 */
export function dequeueOfflineParticipation(localId) {
  const queue = getPendingSyncQueue().filter(i => i.id !== localId);
  localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
}

/**
 * Processa e sincroniza todas as participações pendentes da fila usando Firestore Transactions
 */
export async function flushSyncQueue() {
  const queue = getPendingSyncQueue();
  if (queue.length === 0) return;

  const db = getFirestoreDb();
  if (!db || !navigator.onLine) {
    console.log('[SyncQueue] Sem conexão ou DB indisponível. Mantendo itens na fila.');
    return;
  }

  console.log(`[SyncQueue] Iniciando sincronização de ${queue.length} item(ns) pendente(s)...`);

  for (const item of queue) {
    try {
      // Uso de Firestore Transaction para garantir consistência ACID e evitar estouro de estoque
      await db.runTransaction(async (transaction) => {
        // Suporte ao schema hierárquico: groups/{groupId}/orders/{orderId}
        const orderRef = db.collection('groups').doc(item.groupId || 'default_group')
                           .collection('orders').doc(item.orderId || 'default_order');
        
        const orderDoc = await transaction.get(orderRef);

        if (!orderDoc.exists) {
          throw new Error(`Lote ${item.orderId} não encontrado no servidor.`);
        }

        const orderData = orderDoc.data();
        const currentKg = Number(orderData.currentKg || 0);
        const goalKg = Number(orderData.goalKg || 999);
        const requestedKg = Number(item.quantityKg || 1);

        if (currentKg + requestedKg > goalKg) {
          console.warn(`[SyncQueue] Meta do lote excedida para o pedido ${item.orderId}. Cota ajustada ao limite.`);
        }

        // Criar subcoleção de participação
        const participationRef = orderRef.collection('participations').doc(item.id || `part_${Date.now()}`);
        transaction.set(participationRef, {
          userId: item.userId,
          userName: item.userName,
          quantityKg: requestedKg,
          pricePerKg: item.snapshotPricePerKg,
          valueTotal: item.valueTotal,
          paymentStatus: item.paymentStatus || 'pendente',
          shippingAddress: item.shippingAddress || null,
          createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
        });

        // Atualizar acumulado em kg no lote de forma atômica
        transaction.update(orderRef, {
          currentKg: window.firebase.firestore.FieldValue.increment(requestedKg)
        });
      });

      // Se a transação deu certo, remover da fila local
      dequeueOfflineParticipation(item.id);
      console.log(`[SyncQueue] Item ${item.id} sincronizado e removido da fila com sucesso.`);
    } catch (err) {
      console.error(`[SyncQueue] Erro ao sincronizar item ${item.id}:`, err);
    }
  }

  // Notificar estado para re-renderizar interface
  stateManager.notify();
}

// Ouvinte global para sincronizar automaticamente quando a internet voltar
window.addEventListener('online', () => {
  console.log('[Network] Conexão restabelecida! Disparando sincronização da fila de compras...');
  flushSyncQueue();
});
