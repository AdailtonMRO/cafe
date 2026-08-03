/**
 * Módulo de Calculadora de Proporção e Timer Interativo de Barista
 * App Coffee Experience
 */

/**
 * Proporções padrão de extração (Gramas de Café : Ml de Água)
 */
export const COFFEE_RATIOS = {
  v60: { ratio: 15, name: 'Hario V60 (Equilibrado 1:15)', desc: 'Para destacar notas florais e acidez limpa.' },
  aeropress: { ratio: 12, name: 'Aeropress (Encorpado 1:12)', desc: 'Extratividade intensa com corpo denso.' },
  french_press: { ratio: 14, name: 'Prensa Francesa (1:14)', desc: 'Bebida com óleos naturais e corpo presente.' },
  clever: { ratio: 16, name: 'Clever Dripper (Suave 1:16)', desc: 'Infusão controlada com finalização limpa.' },
  chemex: { ratio: 16, name: 'Chemex (Extra Limpo 1:16)', desc: 'Filtro de papel grosso para clareza aromática.' }
};

/**
 * Calcula a quantidade exata de água e café com base na proporção escolhida
 * @param {number} inputVal Valor numérico fornecido
 * @param {'water' | 'coffee'} inputType Tipo de entrada ('water' em ml ou 'coffee' em gramas)
 * @param {number} ratioProportion Valor numérico da proporção (ex: 15 para 1:15)
 * @returns {{ coffeeGrams: number, waterMl: number }}
 */
export function calculateBrewRatio(inputVal, inputType, ratioProportion = 15) {
  const val = Math.max(0, Number(inputVal) || 0);
  const ratio = Math.max(1, Number(ratioProportion) || 15);

  if (inputType === 'coffee') {
    const coffeeGrams = Number(val.toFixed(1));
    const waterMl = Math.round(val * ratio);
    return { coffeeGrams, waterMl };
  } else {
    const waterMl = Math.round(val);
    const coffeeGrams = Number((val / ratio).toFixed(1));
    return { coffeeGrams, waterMl };
  }
}

/**
 * Timer de Extração de Barista com Estágios de Infusão
 */
export class BaristaTimer {
  constructor(onTick, onStageChange, onComplete) {
    this.seconds = 0;
    this.timerId = null;
    this.isRunning = false;
    this.onTick = onTick;
    this.onStageChange = onStageChange;
    this.onComplete = onComplete;
    this.stages = [
      { name: 'Bloom / Pré-Infusão (45s)', duration: 45 },
      { name: 'Primeiro Despejo de Água (45s)', duration: 90 },
      { name: 'Segundo Despejo de Água (60s)', duration: 150 },
      { name: 'Finalização & Drenagem (30s)', duration: 180 }
    ];
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.timerId = setInterval(() => {
      this.seconds++;
      if (this.onTick) this.onTick(this.seconds, this.getFormattedTime());
      this.checkStage();

      if (this.seconds >= 180) {
        this.stop();
        if (this.onComplete) this.onComplete();
      }
    }, 1000);
  }

  pause() {
    this.isRunning = false;
    if (this.timerId) clearInterval(this.timerId);
  }

  reset() {
    this.pause();
    this.seconds = 0;
    if (this.onTick) this.onTick(0, '00:00');
  }

  stop() {
    this.pause();
  }

  getFormattedTime() {
    const mins = String(Math.floor(this.seconds / 60)).padStart(2, '0');
    const secs = String(this.seconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  }

  checkStage() {
    const currentStage = this.stages.find(s => this.seconds <= s.duration) || this.stages[this.stages.length - 1];
    if (this.onStageChange) this.onStageChange(currentStage.name);
  }
}
