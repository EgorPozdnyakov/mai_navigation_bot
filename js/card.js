// =============================================================================
// card.js — карточка места: панель, которая выезжает снизу (bottom sheet).
//
// Карточка закрывает только часть экрана, карта над ней остаётся видна.
// Правило для всех полей: пустое поле не показываем, а поле с ошибкой
// в таблице показываем как «нет данных» (см. INVALID в data.js).
// =============================================================================

import { CONFIG } from './config.js';
import { TEXTS } from './texts.js';
import { INVALID } from './data.js';
import { formatRange, formatStatus } from './hours.js';
import { el, byId } from './dom.js';

let openPlaceId = null; // id места, карточка которого открыта (null — закрыта)

/** Открыта ли сейчас карточка. */
export function isCardOpen() {
  return openPlaceId !== null;
}

/** Высота карточки в пикселях (чтобы карта знала, сколько места закрыто). */
export function getCardHeight() {
  const sheet = byId('sheet');
  return sheet.hidden ? 0 : sheet.offsetHeight;
}

/**
 * Открывает карточку места.
 * status   — результат getOpenStatus (открыто/закрыто);
 * handlers — { onMenu, onRoute, onClose }.
 */
export function openCard(place, status, { onMenu, onRoute, onClose }) {
  const sheet = byId('sheet');
  const content = byId('sheet-content');
  // Кнопки ставим сразу под названием (как в картах на телефоне):
  // так их видно без прокрутки.
  const parts = [
    renderPhotos(place),
    renderHeader(place, status, onClose),
    renderButtons(place, onMenu, onRoute), // может быть null — тогда кнопок нет
    renderDetails(place),
  ];
  content.replaceChildren(...parts.filter((part) => part !== null));
  openPlaceId = place.id;
  sheet.hidden = false;
  sheet.scrollTop = 0;
  // Фокус на заголовок: программа чтения с экрана сразу прочитает название,
  // а с клавиатуры можно продолжить Tab'ом по кнопкам карточки.
  byId('sheet-title').focus({ preventScroll: true });
}

/** Закрывает карточку. */
export function closeCard() {
  openPlaceId = null;
  byId('sheet').hidden = true;
}

/** Обновить строку «Открыто до …» (раз в минуту, без перерисовки карточки). */
export function updateCardStatus(status) {
  if (!isCardOpen()) return;
  const line = document.querySelector('#sheet .status');
  if (line) setStatusLine(line, status);
}

// -----------------------------------------------------------------------------
// Части карточки
// -----------------------------------------------------------------------------

/** Фото: несколько — горизонтальная прокрутка; нет — аккуратная заглушка. */
function renderPhotos(place) {
  if (place.photos.length === 0) return renderPhotoPlaceholder();

  const strip = el('div', { className: 'photos' });
  place.photos.forEach((fileName, index) => {
    const image = el('img', {
      className: 'photos__item',
      attrs: {
        src: CONFIG.PHOTOS_FOLDER + encodeURIComponent(fileName),
        alt: TEXTS.card.photoAlt(place.name, index + 1, place.photos.length),
        loading: 'lazy',  // фото загружается, только когда до него долистали
        decoding: 'async',
      },
    });
    // Файла нет — убираем фото; если не осталось ни одного — заглушка.
    image.addEventListener('error', () => {
      console.warn(`[фото] объект id=${place.id}: не найден файл ${CONFIG.PHOTOS_FOLDER}${fileName}`);
      image.remove();
      if (strip.childElementCount === 0) strip.replaceWith(renderPhotoPlaceholder());
    });
    strip.append(image);
  });
  if (place.photos.length === 1) strip.classList.add('photos--single');
  return strip;
}

function renderPhotoPlaceholder() {
  return el('div', { className: 'photos photos--empty' }, [
    el('span', { className: 'photos__icon', attrs: { 'aria-hidden': 'true' }, text: '📷' }),
    el('span', { text: TEXTS.card.noPhoto }),
  ]);
}

/** Название, тип, статус и кнопка закрытия. */
function renderHeader(place, status, onClose) {
  const typeText = typeof place.type === 'string' ? TEXTS.types[place.type] : TEXTS.card.noData;
  const statusLine = el('p', { className: 'status' });
  setStatusLine(statusLine, status);

  return el('div', { className: 'sheet__header' }, [
    el('div', { className: 'sheet__titles' }, [
      el('h2', { className: 'sheet__title', text: place.name, attrs: { id: 'sheet-title', tabindex: '-1' } }),
      el('p', { className: 'sheet__type' }, [
        el('span', { className: `badge badge--${place.group}`, text: String(place.id), attrs: { 'aria-hidden': 'true' } }),
        typeText,
      ]),
      statusLine,
    ]),
    el('button', {
      className: 'icon-button',
      text: '×',
      attrs: { type: 'button', 'aria-label': TEXTS.card.close },
      onClick: onClose,
    }),
  ]);
}

/** Строка статуса с цветной точкой: зелёная — открыто, красная — закрыто. */
function setStatusLine(line, status) {
  line.textContent = formatStatus(status);
  line.className = `status status--${status.state}`;
}

/** Все сведения о месте списком «название — значение». */
function renderDetails(place) {
  const list = el('dl', { className: 'details' });

  // Где: «Корпус ГУК, 1 этаж» + как найти.
  const whereParts = [];
  if (place.building) whereParts.push(TEXTS.card.building(place.building));
  if (place.floor) whereParts.push(TEXTS.card.floor(place.floor));
  addRow(list, TEXTS.card.where, whereParts.length ? whereParts.join(', ') : null);
  addRow(list, TEXTS.card.howToFind, place.howToFind);

  addHoursRow(list, place.schedule);

  if (place.group === 'food') {
    addRow(list, TEXTS.card.lunchPrice, place.lunchPrice, TEXTS.card.rubles);
    addRow(list, TEXTS.card.payment, place.payment);
    addRow(list, TEXTS.card.vegetarian, place.vegetarian, yesNoText);
  }
  if (place.group === 'cowork') {
    addRow(list, TEXTS.card.seats, place.seats);
    addRow(list, TEXTS.card.sockets, place.sockets);
    addRow(list, TEXTS.card.wifi, place.wifi, yesNoText);
    addRow(list, TEXTS.card.noise, place.noise);
  }

  // Доступность: «частично доступно. Лифта нет, …»
  let accessibility = place.accessible;
  if (typeof accessibility === 'string') {
    accessibility = TEXTS.card.accessibleValues[accessibility];
    if (place.accessibilityNote) accessibility += `. ${place.accessibilityNote}`;
  } else if (accessibility === null && place.accessibilityNote) {
    accessibility = place.accessibilityNote;
  }
  addRow(list, TEXTS.card.accessibility, accessibility);

  const wrapper = el('div', {}, [list]);
  if (place.updated !== null) {
    const date = place.updated === INVALID ? TEXTS.card.noData : place.updated;
    wrapper.append(el('p', { className: 'hint', text: TEXTS.card.updated(date) }));
  }
  return wrapper;
}

/**
 * Добавляет строку «название — значение».
 * value: null → строку не показываем; INVALID → «нет данных»;
 * иначе показываем значение (format — как его оформить, например «350 ₽»).
 */
function addRow(list, label, value, format = String) {
  if (value === null || value === undefined) return;
  const text = value === INVALID ? TEXTS.card.noData : format(value);
  list.append(
    el('div', { className: 'details__row' }, [
      el('dt', { text: label }),
      el('dd', { className: value === INVALID ? 'no-data' : '', text }),
    ]),
  );
}

function yesNoText(value) {
  return value ? TEXTS.card.yes : TEXTS.card.no;
}

/** Часы работы: будни, суббота, воскресенье, перерыв. */
function addHoursRow(list, schedule) {
  const lines = [];
  // Одна строка расписания («Будни: 09:00–17:00»). Пустую ячейку пропускаем.
  function addLine(label, parsed) {
    if (parsed.kind === 'empty' || parsed.kind === 'none') return;
    let text = TEXTS.card.noData;
    if (parsed.kind === 'open' || parsed.kind === 'break') text = formatRange(parsed);
    if (parsed.kind === 'closed') text = TEXTS.card.closedDay;
    lines.push(el('li', { className: parsed.kind === 'invalid' ? 'no-data' : '' }, [`${label}: `, text]));
  }

  addLine(TEXTS.card.weekdays, schedule.weekdays);
  addLine(TEXTS.card.saturday, schedule.saturday);
  if (lines.length === 0) return; // часов работы нет совсем — строку не показываем
  addLine(TEXTS.card.sunday, { kind: 'closed' }); // воскресенье — всегда выходной
  addLine(TEXTS.card.breakTime, schedule.break);

  list.append(
    el('div', { className: 'details__row' }, [
      el('dt', { text: TEXTS.card.hours }),
      el('dd', {}, [el('ul', { className: 'hours' }, lines)]),
    ]),
  );
}

/** Кнопки «Меню» (только у мест питания) и «Маршрут» (если есть координаты). */
function renderButtons(place, onMenu, onRoute) {
  const buttons = el('div', { className: 'sheet__buttons' });
  if (place.group === 'food') {
    buttons.append(el('button', {
      className: 'button',
      text: TEXTS.card.menuButton,
      attrs: { type: 'button', id: 'menu-button' },
      onClick: onMenu,
    }));
  }
  if (place.lat !== null && place.lon !== null) {
    buttons.append(el('button', {
      className: 'button button--secondary',
      text: TEXTS.card.routeButton,
      attrs: { type: 'button', title: TEXTS.card.routeHint },
      onClick: onRoute,
    }));
  }
  return buttons.childElementCount > 0 ? buttons : null;
}

/** Ссылка на пеший маршрут в Яндекс Картах до входа в корпус. */
export function buildRouteUrl(lat, lon) {
  return CONFIG.ROUTE_URL_TEMPLATE.replace('{lat}', String(lat)).replace('{lon}', String(lon));
}
