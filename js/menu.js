// =============================================================================
// menu.js — экран меню: блюда по категориям с ценами.
// Открывается кнопкой «Меню» в карточке места, закрывается «Назад».
// =============================================================================

import { TEXTS } from './texts.js';
import { INVALID, groupMenuByCategory, latestDate } from './data.js';
import { el, byId } from './dom.js';

/** Открыт ли сейчас экран меню. */
export function isMenuOpen() {
  return !byId('menu-screen').hidden;
}

/**
 * Показывает меню места.
 * dishes     — блюда этого места (может быть пустым массивом);
 * menuFailed — true, если файл меню вообще не загрузился.
 */
export function openMenu(place, dishes, { menuFailed }) {
  byId('menu-title').textContent = TEXTS.menu.title(place.name);
  const body = byId('menu-content');

  if (menuFailed) {
    body.replaceChildren(el('p', { className: 'message', text: TEXTS.menu.loadFailed }));
  } else if (dishes.length === 0) {
    body.replaceChildren(el('p', { className: 'message', text: TEXTS.menu.empty }));
  } else {
    const updated = renderUpdated(dishes); // null, если дат в таблице нет
    body.replaceChildren(...renderCategories(dishes), ...(updated ? [updated] : []));
  }

  const screen = byId('menu-screen');
  screen.hidden = false;
  screen.scrollTop = 0;
  byId('menu-title').focus({ preventScroll: true });
}

/** Закрывает экран меню. */
export function closeMenu() {
  byId('menu-screen').hidden = true;
}

/** Категории: заголовок + список блюд с ценами. */
function renderCategories(dishes) {
  return groupMenuByCategory(dishes).map(({ category, dishes: categoryDishes }) => el('section', { className: 'menu-section' }, [
    el('h3', { text: TEXTS.menu.categories[category] || category }),
    el('ul', { className: 'menu-list' }, categoryDishes.map(renderDish)),
  ]));
}

/** Одно блюдо: название, отметка «вег.», цена. */
function renderDish(dish) {
  const priceText = dish.price === null ? '' : dish.price === INVALID ? TEXTS.card.noData : TEXTS.card.rubles(dish.price);
  return el('li', { className: 'menu-list__item' }, [
    el('span', { className: 'menu-list__name' }, [
      dish.name,
      dish.vegetarian === true
        ? el('span', {
          className: 'veg-badge',
          text: TEXTS.menu.vegetarian,
          attrs: { title: TEXTS.menu.vegetarianLabel, 'aria-label': TEXTS.menu.vegetarianLabel },
        })
        : null,
    ]),
    el('span', { className: dish.price === INVALID ? 'menu-list__price no-data' : 'menu-list__price', text: priceText }),
  ]);
}

/** «Меню обновлено: …» — самая свежая дата среди блюд. */
function renderUpdated(dishes) {
  const date = latestDate(dishes.map((dish) => dish.updated));
  return date ? el('p', { className: 'hint', text: TEXTS.menu.updated(date) }) : null;
}
