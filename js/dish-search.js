import { MENUS } from './menus.js';

function normalize(text) {
  return text.toLowerCase().normalize('NFD')
    .replace(/(\p{Script=Latin})\p{M}+/gu, '$1').normalize('NFC')
    .replaceAll('ё', 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function findDishes(query) {
  const normalized = normalize(query);
  if (!normalized) return [];
  const terms = normalized.split(' ');
  const results = [];

  for (const [placeId, menu] of Object.entries(MENUS)) {
    const matches = [];
    for (const [category, dishes] of Object.entries(menu.dishes)) {
      for (const [index, dish] of dishes.entries()) {
        const names = [normalize(dish[0]), normalize(dish[1])];
        if (names.some((name) => terms.every((term) => name.includes(term)))) {
          matches.push({ key: `${placeId}-${category}-${index}`, dish });
        }
      }
    }
    if (matches.length > 0) results.push({ placeId: Number(placeId), matches });
  }
  return results;
}
