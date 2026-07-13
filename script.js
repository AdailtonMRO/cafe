const recommendations = [
  'Sugestão do dia: um café coado com um toque de canela.',
  'Sugestão do dia: um latte com leite vaporizado e um pouco de chocolate.',
  'Sugestão do dia: um cold brew gelado para um descanso leve.',
  'Sugestão do dia: um espresso curto e intenso para a manhã.'
];

const button = document.getElementById('recommendationButton');
const tipText = document.getElementById('tipText');

button.addEventListener('click', () => {
  const randomIndex = Math.floor(Math.random() * recommendations.length);
  tipText.textContent = recommendations[randomIndex];
});
