import { generateDailyCoffeeTip } from './ai-service.js';

const button = document.getElementById('recommendationButton');
const tipText = document.getElementById('tipText');

if (button && tipText) {
  button.addEventListener('click', async () => {
    button.disabled = true;
    tipText.style.opacity = '0.5';
    tipText.textContent = 'Consultando o Barista AI...';

    const result = await generateDailyCoffeeTip();

    tipText.style.opacity = '1';
    tipText.innerHTML = result.isAiGenerated
      ? `✨ <strong>Dica da IA (Gemini):</strong> ${result.text}`
      : `☕ <strong>Sugestão do dia:</strong> ${result.text}`;

    button.disabled = false;
  });
}
