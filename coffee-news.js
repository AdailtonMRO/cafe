export const coffeeNews = [
  {
    title: 'Café especial ganha espaço em cafeterias premium',
    category: 'Mercado',
    blurb: 'A procura por grãos especiais e métodos de preparo artesanais cresce entre consumidores que buscam sabor e experiência.',
    accent: 'Single origin',
    image: 'assets/coffee-beans.png',
  },
  {
    title: 'Torra média revela notas frutadas e florais',
    category: 'Tendências',
    blurb: 'Novas torrações destacam perfis aromáticos mais delicados, ideais para quem aprecia cafés mais complexos.',
    accent: 'Perfis aromáticos',
    image: 'assets/coffee-tasting.png',
  },
  {
    title: 'A cultura do café se transforma em experiência social',
    category: 'Cultura',
    blurb: 'Eventos, degustações e encontros de comunidade aproximam pessoas e transformam o café em um ritual compartilhado.',
    accent: 'Ritual moderno',
    image: 'assets/coffee-plantation.png',
  },
];

export function getCoffeeNewsStory(index) {
  const safeIndex = Number.isInteger(index) && index >= 0 ? index : 0;
  return coffeeNews[safeIndex] ?? coffeeNews[0];
}
