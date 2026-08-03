/**
 * Módulo de Comunidade, Feed Social e Avaliações de Degustação
 * App Coffee Experience
 */

import { formatDateTime } from '../../utils/date-helpers.js';

/**
 * Renderiza o widget de atividade recente e engajamento do Lote Coletivo
 * @param {Array} participations Lista de participações do lote ativo
 * @returns {string} HTML do Feed de Atividades
 */
export function renderCollectiveBatchActivityFeed(participations = []) {
  if (!participations || participations.length === 0) {
    return `
      <div class="card" style="padding:1.25rem; text-align:center;">
        <span style="font-size:2rem; display:block; margin-bottom:0.5rem;">🤝</span>
        <h4 style="font-size:1rem; color:var(--text-primary); margin-bottom:0.25rem;">Seja o primeiro participante deste Lote!</h4>
        <p style="font-size:0.85rem; color:var(--text-muted);">Garantindo sua cota em kg você ajuda o grupo a bater a meta de sacas.</p>
      </div>
    `;
  }

  const recentItems = [...participations].reverse().slice(0, 5);

  return `
    <div class="card collective-activity-feed" style="padding:1.25rem; background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-lg);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <h3 style="font-size:1.1rem; color:var(--text-primary); display:flex; align-items:center; gap:0.5rem;">
          🔥 Engajamento do Lote em Tempo Real
        </h3>
        <span style="font-size:0.75rem; background:var(--bg-elevated); color:var(--primary); padding:0.25rem 0.6rem; border-radius:var(--radius-pill); font-weight:600;">
          ${participations.length} adesões
        </span>
      </div>

      <div style="display:flex; flex-direction:column; gap:0.75rem;">
        ${recentItems.map(item => `
          <div style="display:flex; align-items:center; gap:0.75rem; padding:0.6rem; background:var(--bg-primary); border-radius:var(--radius-sm); border:1px solid var(--border-color);">
            <div style="width:36px; height:36px; border-radius:50%; background:var(--primary); color:#ffffff; display:flex; justify-content:center; align-items:center; font-weight:700; font-size:0.9rem;">
              ${(item.userName || 'P').charAt(0).toUpperCase()}
            </div>
            <div style="flex:1;">
              <span style="font-size:0.88rem; color:var(--text-primary); font-weight:600; display:block;">
                ${item.userName || 'Membro do Clube'}
              </span>
              <span style="font-size:0.78rem; color:var(--text-muted);">
                Garantia de <strong>${item.quantityKg || 1} kg</strong> no lote &bull; ${formatDateTime(item.createdAt)}
              </span>
            </div>
            <span style="font-size:0.78rem; font-weight:700; color:var(--status-success); background:rgba(76,175,80,0.1); padding:0.2rem 0.5rem; border-radius:4px;">
              ⚡ Cota Ativa
            </span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Renderiza o componente de Avaliação/Review Sensorial do Café
 * @param {object} params
 * @param {number} params.stars Nota de 1 a 5 estrelas
 * @param {string} params.comment Comentário sobre o perfil de sabor
 * @param {string} params.author Nome do autor
 * @param {string} params.coffeeTitle Nome do café avaliado
 * @returns {string} HTML da Avaliação
 */
export function renderCoffeeReviewCard({ stars = 5, comment, author, coffeeTitle, createdAt }) {
  const starIcons = '★'.repeat(stars) + '☆'.repeat(5 - stars);

  return `
    <article class="coffee-review-card" style="padding:1rem; background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-md); margin-bottom:0.75rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
        <strong style="font-size:0.95rem; color:var(--text-primary);">${coffeeTitle || 'Bourbon Amarelo'}</strong>
        <span style="color:#ffb300; font-size:1rem; letter-spacing:0.1em;">${starIcons}</span>
      </div>
      <p style="font-size:0.85rem; color:var(--text-secondary); line-height:1.5; margin-bottom:0.5rem;">
        "${comment || 'Excelente café, corpo aveludado e notas sensoriais muito fiéis à ficha técnica do produtor!'}"
      </p>
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.78rem; color:var(--text-muted);">
        <span>Por <strong>${author || 'Entusiasta de Café'}</strong></span>
        <span>${formatDateTime(createdAt)}</span>
      </div>
    </article>
  `;
}
