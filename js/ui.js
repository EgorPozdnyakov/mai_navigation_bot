// =============================================================================
// ui.js — всё остальное в интерфейсе: фильтры, переключатель «Карта / Список»,
// список мест, окно «О проекте», сообщения о загрузке и ошибках.
//
// Сам по себе ui.js ничего не решает: при нажатиях он вызывает функции
// из app.js (handlers), а app.js уже решает, что делать.
// =============================================================================

import { CONFIG } from './config.js';
import { TEXTS } from './texts.js';
import { el, byId } from './dom.js';

// -----------------------------------------------------------------------------
// Тексты и цвета
// -----------------------------------------------------------------------------

/** Берёт текст из TEXTS по пути вида "filters.food". */
function getText(path) {
  let value = TEXTS;
  for (const key of path.split('.')) value = value ? value[key] : undefined;
  return typeof value === 'string' ? value : path;
}

/**
 * Подставляет тексты в index.html: data-text="ключ" → textContent,
 * data-aria-label="ключ" → подпись для программ чтения с экрана.
 */
export function applyStaticTexts() {
  document.title = TEXTS.appTitle;
  for (const element of document.querySelectorAll('[data-text]')) {
    element.textContent = getText(element.dataset.text);
  }
  for (const element of document.querySelectorAll('[data-aria-label]')) {
    element.setAttribute('aria-label', getText(element.dataset.ariaLabel));
  }
  // Абзацы «О проекте» — их несколько, поэтому создаём из массива.
  byId('about-text').replaceChildren(...TEXTS.about.paragraphs.map((text) => el('p', { text })));
}

/** Цвета групп из config.js → CSS-переменные --color-food и т.д. */
export function applyGroupColors() {
  for (const [group, color] of Object.entries(CONFIG.GROUP_COLORS)) {
    document.documentElement.style.setProperty(`--color-${group}`, color);
  }
}

// -----------------------------------------------------------------------------
// Верхняя панель: фильтры и переключатель вида
// -----------------------------------------------------------------------------

/**
 * Подключает кнопки к обработчикам из app.js.
 * handlers: { onCategory(category), onOpenNow(), onView(view), onAbout(), onBack() }
 */
export function initControls(handlers) {
  for (const chip of document.querySelectorAll('[data-category]')) {
    chip.addEventListener('click', () => handlers.onCategory(chip.dataset.category));
  }
  byId('chip-open-now').addEventListener('click', handlers.onOpenNow);

  for (const button of document.querySelectorAll('[data-view]')) {
    button.addEventListener('click', () => handlers.onView(button.dataset.view));
  }

  byId('about-button').addEventListener('click', handlers.onAbout);
  byId('about-close').addEventListener('click', handlers.onBack);
  // Нажатие на затемнённый фон вокруг окна тоже закрывает его.
  byId('about-dialog').addEventListener('click', (event) => {
    if (event.target.id === 'about-dialog') handlers.onBack();
  });

  byId('menu-back').addEventListener('click', handlers.onBack);
  byId('map-error-list').addEventListener('click', () => handlers.onView('list'));
}

/**
 * Отмечает нажатые кнопки. aria-pressed="true" — кнопка «включена»:
 * по нему же CSS красит активный фильтр.
 */
export function renderControls({ category, openNowOnly, view }) {
  for (const chip of document.querySelectorAll('[data-category]')) {
    chip.setAttribute('aria-pressed', String(chip.dataset.category === category));
  }
  byId('chip-open-now').setAttribute('aria-pressed', String(openNowOnly));
  for (const button of document.querySelectorAll('[data-view]')) {
    button.setAttribute('aria-pressed', String(button.dataset.view === view));
  }
}

/** Показывает карту или список. */
export function showView(view) {
  // Карту прячем через visibility, а не display: так Leaflet не теряет
  // размеры, и при возврате карта сразу на месте.
  byId('map-view').classList.toggle('is-hidden', view !== 'map');
  byId('list-view').hidden = view !== 'list';
  if (view === 'list') byId('list-view').scrollTop = 0;
}

// -----------------------------------------------------------------------------
// Список мест
// -----------------------------------------------------------------------------

/**
 * Рисует список. items: [{ place, statusText, state, onMap }], onSelect(id).
 * Каждый элемент — кнопка: на неё можно нажать и пальцем, и с клавиатуры.
 */
export function renderList(items, onSelect) {
  const list = byId('places-list');
  byId('list-empty').hidden = items.length > 0;
  // Список перерисовывается раз в минуту (обновляются статусы). Если человек
  // в этот момент стоял клавишей Tab на каком-то месте — вернём фокус туда же.
  const focusedId = list.contains(document.activeElement) ? document.activeElement.dataset.id : null;

  list.replaceChildren(...items.map(({ place, statusText, state, onMap }) => {
    const where = [];
    if (place.building) where.push(TEXTS.card.building(place.building));
    if (place.floor) where.push(TEXTS.card.floor(place.floor));
    if (!onMap) where.push(TEXTS.list.notOnMap);

    return el('li', {}, [
      el('button', {
        className: 'list-item',
        attrs: { type: 'button', 'data-id': String(place.id) },
        onClick: () => onSelect(place.id),
      }, [
        el('span', { className: `badge badge--${place.group}`, text: String(place.id) }),
        el('span', { className: 'list-item__text' }, [
          el('span', { className: 'list-item__name', text: place.name }),
          where.length ? el('span', { className: 'list-item__where', text: where.join(', ') }) : null,
          el('span', { className: `status status--${state}`, text: statusText }),
        ]),
      ]),
    ]);
  }));
  if (focusedId) focusListItem(focusedId);
}

/** Поставить фокус на элемент списка (после закрытия карточки). */
export function focusListItem(id) {
  const button = document.querySelector(`.list-item[data-id="${id}"]`);
  if (button) button.focus();
}

// -----------------------------------------------------------------------------
// Окно «О проекте»
// -----------------------------------------------------------------------------

export function isAboutOpen() {
  return !byId('about-dialog').hidden;
}

export function openAbout() {
  byId('about-dialog').hidden = false;
  byId('about-close').focus();
}

export function closeAbout() {
  byId('about-dialog').hidden = true;
  byId('about-button').focus();
}

// -----------------------------------------------------------------------------
// Загрузка, ошибки, короткие сообщения
// -----------------------------------------------------------------------------

/** Экран «Загружаем…». */
export function showLoading() {
  byId('status-screen').hidden = false;
  byId('status-text').textContent = TEXTS.loading;
  byId('status-hint').textContent = '';
  byId('retry-button').hidden = true;
}

/** Убрать экран загрузки/ошибки. */
export function hideStatusScreen() {
  byId('status-screen').hidden = true;
}

/** «Не удалось загрузить данные» + кнопка «Повторить». */
export function showDataError(onRetry) {
  byId('status-screen').hidden = false;
  byId('status-text').textContent = TEXTS.errors.dataTitle;
  byId('status-hint').textContent = TEXTS.errors.dataHint;
  const button = byId('retry-button');
  button.hidden = false;
  button.onclick = onRetry; // onclick, а не addEventListener: обработчик всегда один
  button.focus();
}

/** Картинка карты не загрузилась: сообщение вместо пустого экрана. */
export function showMapError() {
  byId('map-error').hidden = false;
}

/** Плашка режима разметки сверху карты. */
export function showDebugBadge() {
  byId('debug-badge').hidden = false;
}

let toastTimer = null;

/** Короткое сообщение внизу экрана на 3 секунды («Скопировано»). */
export function showToast(text) {
  const toast = byId('toast');
  toast.textContent = text;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 3000);
}
