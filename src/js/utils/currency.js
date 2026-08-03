/**
 * Utilitários para Formatação Financeira e Cálculo de Cotas
 * App Coffee Experience
 */

/**
 * Formata um número para Moeda Brasileira (BRL)
 * @param {number} value 
 * @returns {string} Ex: "R$ 65,00"
 */
export function formatCurrency(value) {
  const num = Number(value) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(num);
}

/**
 * Calcula o valor total da cota com base no peso e preço por kg
 * @param {number} quantityKg 
 * @param {number} pricePerKg 
 * @returns {number}
 */
export function calculateBatchTotal(quantityKg, pricePerKg) {
  const kg = Math.max(0, Number(quantityKg) || 0);
  const price = Math.max(0, Number(pricePerKg) || 0);
  return Number((kg * price).toFixed(2));
}

/**
 * Calcula o rateio proporcional de frete por membro
 * @param {number} memberKg Quantidade em kg comprada pelo membro
 * @param {number} totalGroupKg Soma de todos os kg comprados no lote
 * @param {number} totalFreightCost Custo total do frete cobrado pelo fornecedor
 * @returns {number} Valor em R$ proporcional do frete para o participante
 */
export function calculateProportionalFreight(memberKg, totalGroupKg, totalFreightCost) {
  const mKg = Number(memberKg) || 0;
  const tKg = Number(totalGroupKg) || 0;
  const freight = Number(totalFreightCost) || 0;

  if (tKg <= 0 || freight <= 0 || mKg <= 0) return 0;

  const share = (mKg / tKg) * freight;
  return Number(share.toFixed(2));
}
