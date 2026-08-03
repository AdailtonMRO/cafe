/**
 * Utilitários para Formatação de Datas e Prazos do Lote
 * App Coffee Experience
 */

/**
 * Formata um objeto Date ou string ISO para data legível em português
 * @param {Date|string|number} dateInput 
 * @returns {string} Ex: "02/08/2026"
 */
export function formatDate(dateInput) {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d);
}

/**
 * Formata data e hora
 * @param {Date|string|number} dateInput 
 * @returns {string} Ex: "02/08/2026 às 19:30"
 */
export function formatDateTime(dateInput) {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
}

/**
 * Calcula os dias restantes até a data limite do lote
 * @param {Date|string|number} targetDate 
 * @returns {{ days: number, isExpired: boolean }}
 */
export function getRemainingDays(targetDate) {
  if (!targetDate) return { days: 0, isExpired: true };
  const target = new Date(targetDate).getTime();
  const now = Date.now();
  const diffMs = target - now;

  if (diffMs <= 0) {
    return { days: 0, isExpired: true };
  }

  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return { days, isExpired: false };
}
