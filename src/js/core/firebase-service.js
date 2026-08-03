/**
 * Módulo de Serviços do Firebase (Auth, Firestore e Offline Persistence)
 * App Coffee Experience
 */

import { stateManager } from './state-manager.js';

let db = null;
let auth = null;

/**
 * Inicializa os serviços do Firebase com suporte a Persistência Offline (IndexedDB)
 * @param {object} firebaseConfig 
 */
export async function initFirebaseService(firebaseConfig) {
  if (!window.firebase) {
    console.warn('[FirebaseService] SDK compat do Firebase não carregado no window.');
    stateManager.setState({ firebaseMode: false, firebaseError: 'SDK não encontrado.' });
    return false;
  }

  try {
    if (!window.firebase.apps.length) {
      window.firebase.initializeApp(firebaseConfig);
    }

    auth = window.firebase.auth();
    db = window.firebase.firestore();

    // Habilitar Persistência Offline Nativa (IndexedDB) para garantir funcionamento sem internet
    try {
      await db.enablePersistence({ synchronizeTabs: true });
      console.log('[FirebaseService] Persistência offline habilitada com sucesso no IndexedDB.');
    } catch (err) {
      if (err.code === 'failed-precondition') {
        console.warn('[FirebaseService] Persistência falhou: Múltiplas abas abertas.');
      } else if (err.code === 'unimplemented') {
        console.warn('[FirebaseService] Navegador não suporta persistência offline do Firestore.');
      }
    }

    stateManager.setState({ firebaseMode: true, firebaseError: null });

    // Listener de estado de autenticação
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        stateManager.setState({ user });
        await loadUserProfile(user.uid);
      } else {
        stateManager.setState({ user: null, profile: null, group: null });
      }
    });

    return true;
  } catch (error) {
    console.error('[FirebaseService] Erro ao inicializar Firebase:', error);
    stateManager.setState({ firebaseMode: false, firebaseError: error.message });
    return false;
  }
}

/**
 * Carrega o perfil do usuário na coleção /users/{uid}
 * @param {string} uid 
 */
export async function loadUserProfile(uid) {
  if (!db || !uid) return null;
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      const profile = { uid, ...userDoc.data() };
      stateManager.setState({ profile });
      return profile;
    }
  } catch (err) {
    console.error('[FirebaseService] Erro ao carregar perfil do usuário:', err);
  }
  return null;
}

/**
 * Retorna a instância do Firestore DB
 */
export function getFirestoreDb() {
  return db;
}

/**
 * Retorna a instância do Auth
 */
export function getFirebaseAuth() {
  return auth;
}
