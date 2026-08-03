/**
 * Módulo de Pagamento de Cotas (PIX Direto ao Líder e Transição para Gateway Digital)
 * App Coffee Experience
 */

import { formatCurrency } from '../../utils/currency.js';

/**
 * Gera o template visual do modal de pagamento para uma cota
 * @param {object} params
 * @param {string} params.leaderPixKey Chave PIX do Líder do Grupo
 * @param {string} params.leaderName Nome do Líder
 * @param {number} params.totalValue Valor total em R$ da cota
 * @param {number} params.totalKg Quantidade em kg comprada
 * @returns {string} HTML do Modal de Checkout/Pagamento PIX
 */
export function renderPixPaymentModal({ leaderPixKey, leaderName, totalValue, totalKg }) {
  const pixKey = leaderPixKey || 'financeiro@coffeeexperience.com.br';
  const name = leaderName || 'Líder do Grupo Local';

  return `
    <div class="pix-payment-modal-container" style="display:flex; flex-direction:column; gap:1.25rem;">
      <div style="background:var(--bg-elevated); padding:1rem; border-radius:var(--radius-md); border:1px solid var(--border-color);">
        <span style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:0.25rem;">Resumo da sua Cota Coletiva</span>
        <strong style="font-size:1.4rem; color:var(--primary);" class="tabular-num">${formatCurrency(totalValue)}</strong>
        <span style="font-size:0.85rem; color:var(--text-secondary); display:block; margin-top:0.2rem;">
          📦 ${totalKg} kg de Café Especial seleccionado
        </span>
      </div>

      <!-- Fase 1: PIX Direto ao Líder do Grupo -->
      <div style="border:1px solid var(--border-color); padding:1.25rem; border-radius:var(--radius-md); background:var(--bg-surface);">
        <h4 style="font-size:1.05rem; margin-bottom:0.5rem; color:var(--text-primary);">
          ⚡ Opção 1: PIX Direto ao Líder do Grupo (Fase 1)
        </h4>
        <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:1rem; line-height:1.4;">
          Realize a transferência PIX para o organizador <strong>${name}</strong> para garantir a isenção de taxas bancárias e rateio proporcional de frete.
        </p>

        <div class="form-group" style="margin-bottom:1rem;">
          <label style="font-size:0.8rem; color:var(--text-muted);">Chave PIX do Líder:</label>
          <div style="display:flex; gap:0.5rem; margin-top:0.25rem;">
            <input type="text" id="pixKeyInput" value="${pixKey}" readonly style="flex:1; padding:0.6rem; font-family:var(--font-mono); font-size:0.9rem; background:var(--bg-primary); border:1px solid var(--border-color); color:var(--text-primary); border-radius:var(--radius-sm);" />
            <button type="button" class="primary" id="copyPixKeyBtn" style="padding:0.6rem 1rem; font-size:0.85rem;">
              📋 Copiar
            </button>
          </div>
        </div>

        <div style="text-align:center; margin-top:0.75rem; padding:0.75rem; background:var(--bg-primary); border-radius:var(--radius-sm);">
          <span style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:0.5rem;">QR Code estático do Líder</span>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(pixKey)}" alt="QR Code Pix" style="width:140px; height:140px; border-radius:8px; border:2px solid var(--border-color);" />
        </div>
      </div>

      <!-- Fase 2: Gateway Digital (Cartão de Crédito e Pix Dinâmico) -->
      <div style="border:1px dashed var(--border-color); padding:1rem; border-radius:var(--radius-md); opacity:0.85; background:var(--bg-elevated);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem;">
          <strong style="font-size:0.9rem; color:var(--text-primary);">💳 Cartão de Crédito / Pix Automático (Fase 2)</strong>
          <span style="font-size:0.7rem; background:var(--bg-primary); color:var(--primary); padding:0.2rem 0.5rem; border-radius:4px; border:1px solid var(--border-color);">Em breve</span>
        </div>
        <p style="font-size:0.78rem; color:var(--text-muted); line-height:1.3;">
          Integração com Split bancário em cartão de crédito e confirmação via webhook instantâneo.
        </p>
      </div>
    </div>
  `;
}
