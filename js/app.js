// app.js — главный файл: загрузка, фильтры, список, карточка места, меню и Telegram.

import { CONFIG, TYPES } from './config.js';
import { BAD, loadData, groupMenu, latestDate, placeIdFromParam } from './data.js';
import { getMoscowTime, getStatus, formatTime } from './hours.js';
import * as map from './map.js';

// ---------- Состояние приложения ----------
let places = [];          // места из objects.csv
let menu = {};            // id места → блюда из menu.csv
let menuFailed = false;   // menu.csv не загрузился
const statuses = {};      // id места → { state, text }, пересчитываем раз в минуту

let view = 'map';         // 'map' или 'list'
let category = null;      // фильтр: null (все), 'food' или 'cowork'
let openNowOnly = false;  // фильтр «Открыто сейчас»
let accessibleOnly = false; // фильтр ♿
let search = '';          // поиск в списке
let selectedId = null;    // место, чья карточка открыта
let mapLoaded = false;
let dataLoaded = false;

const debug = new URLSearchParams(location.search).get('debug') === '1'; // режим разметки

// Скрипт Telegram создаёт Telegram.WebApp и в обычном браузере,
// поэтому проверяем initData: её передаёт только сам Telegram.
const tg = window.Telegram ? window.Telegram.WebApp : null;
const inTelegram = Boolean(tg && tg.initData);

// ---------- Помощники ----------

function $(id) {
  return document.getElementById(id);
}

// Текст из таблицы вставляем в HTML только через esc():
// если в ячейке окажется <script> или <b>, он покажется как обычный текст.
function esc(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function findPlace(id) {
  return places.find((place) => place.id === id);
}

// «Корпус ГУК, 1 этаж»
function whereText(place) {
  const parts = [];
  if (place.building) parts.push('Корпус ' + place.building);
  if (place.floor) parts.push(place.floor + ' этаж');
  return parts.join(', ');
}

let toastTimer = null;
function showToast(text) {
  $('toast').textContent = text;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3000);
}

// ---------- Фильтры, метки и список ----------

function matchesFilters(place) {
  if (category !== null && place.group !== category) return false;
  if (openNowOnly && statuses[place.id].state !== 'open') return false;
  if (accessibleOnly && place.accessible !== 'да') return false;
  return true;
}

// Пересчитать «открыто / закрыто» по московскому времени.
function updateStatuses() {
  const now = getMoscowTime();
  for (const place of places) statuses[place.id] = getStatus(place, now);
  render();
}

// Перерисовать всё, что зависит от фильтров и статусов.
function render() {
  // aria-pressed="true" — кнопка включена (по нему же CSS её красит).
  for (const button of document.querySelectorAll('.segmented [data-view]')) {
    button.setAttribute('aria-pressed', button.dataset.view === view);
  }
  for (const button of document.querySelectorAll('[data-category]')) {
    button.setAttribute('aria-pressed', button.dataset.category === category);
  }
  $('open-now').setAttribute('aria-pressed', openNowOnly);
  $('accessible').setAttribute('aria-pressed', accessibleOnly);

  for (const place of places) {
    const status = statuses[place.id];
    const selected = place.id === selectedId;
    // Выбранное место показываем всегда, иначе метка пропала бы под карточкой.
    const show = matchesFilters(place) || selected;
    map.updateMarker(place.id, show, status.state === 'closed', selected, `${place.id}. ${place.name}. ${status.text}`);
  }

  renderList();

  if (selectedId !== null) {
    const status = statuses[selectedId];
    $('sheet-status').className = 'status status--' + status.state;
    $('sheet-status').textContent = status.text;
  }
}

function renderList() {
  let html = '';
  for (const place of places) {
    if (!matchesFilters(place)) continue;
    if (search !== '' && !place.name.toLowerCase().includes(search)) continue;

    const status = statuses[place.id];
    let where = whereText(place);
    if (place.mapX === null) where += where ? ', нет на карте' : 'нет на карте';
    html += `
      <li>
        <button type="button" class="list-item" data-id="${place.id}">
          <span class="badge badge--${place.group}">${place.id}</span>
          <span class="list-item__text">
            <span class="list-item__name">${esc(place.name)}</span>
            ${where ? `<span class="hint">${esc(where)}</span>` : ''}
            <span class="status status--${status.state}">${status.text}</span>
          </span>
        </button>
      </li>`;
  }
  $('places-list').innerHTML = html;
  $('list-empty').hidden = html !== '';
}

function setView(newView) {
  view = newView;
  if (view === 'list') closeCard();
  // Карту прячем через visibility (класс is-hidden): так Leaflet не теряет размеры.
  $('map-view').classList.toggle('is-hidden', view !== 'map');
  $('list-view').hidden = view !== 'list';
  if (view === 'map') map.refreshSize();
  render();
}

// ---------- Карточка места ----------

// Открыть карточку. zoomIn — приблизить карту к метке (из списка и по ссылке).
function openCard(id, zoomIn) {
  const place = findPlace(id);
  if (!place) return;
  selectedId = id;
  closeMenu();

  const sheet = $('sheet');
  sheet.innerHTML = cardHtml(place);
  sheet.hidden = false;
  sheet.scrollTop = 0;
  $('sheet-close').onclick = closeCard;
  if ($('menu-button')) $('menu-button').onclick = () => openMenu(place);
  if ($('route-button')) $('route-button').onclick = () => openLink(CONFIG.routeUrl.replace('{lat}', place.lat).replace('{lon}', place.lon));
  $('sheet-title').focus({ preventScroll: true }); // программа чтения с экрана сразу прочитает название

  map.setBottomInset(sheet.offsetHeight);
  if (mapLoaded) map.showPlace(id, zoomIn);
  render();
  updateBackButton();
}

function closeCard() {
  if (selectedId === null) return;
  selectedId = null;
  closeMenu();
  $('sheet').hidden = true;
  map.setBottomInset(0);
  render();
  updateBackButton();
}

function cardHtml(place) {
  const status = statuses[place.id];
  const type = TYPES[place.type] ? TYPES[place.type].title : BAD;
  let html = '';

  // Фото листаются вбок. Если файла нет — фото просто пропадает.
  if (place.photos.length > 0) {
    html += '<div class="photos">';
    for (let i = 0; i < place.photos.length; i++) {
      const src = CONFIG.photosFolder + encodeURIComponent(place.photos[i]);
      html += `<img class="photos__item" src="${esc(src)}" alt="${esc(place.name)}: фото ${i + 1}" loading="lazy" onerror="this.remove()">`;
    }
    html += '</div>';
  } else {
    html += '<div class="photos photos--empty">📷 Фото пока нет</div>';
  }

  html += `
    <div class="sheet__header">
      <div class="sheet__titles">
        <h2 id="sheet-title" class="sheet__title" tabindex="-1">${esc(place.name)}</h2>
        <p class="sheet__type"><span class="badge badge--${place.group}">${place.id}</span>${esc(type)}</p>
        <p id="sheet-status" class="status status--${status.state}">${status.text}</p>
      </div>
      <button type="button" id="sheet-close" class="icon-button" aria-label="Закрыть карточку">×</button>
    </div>
    <div class="sheet__buttons">`;
  if (place.group === 'food') {
    html += '<button type="button" id="menu-button" class="button">Меню</button>';
  }
  if (place.lat !== null) {
    html += '<button type="button" id="route-button" class="button button--secondary" title="Откроется пеший маршрут в Яндекс Картах">Маршрут</button>';
  }
  html += '</div><dl class="details">';

  html += row('Где', whereText(place) || null);
  html += row('Как найти', place.howToFind);
  html += hoursRow(place);
  if (place.group === 'food') {
    html += row('Обед примерно', typeof place.lunchPrice === 'number' ? place.lunchPrice + ' ₽' : place.lunchPrice);
    html += row('Оплата', place.payment);
    html += row('Вегетарианские блюда', yesNo(place.vegetarian));
  }
  if (place.group === 'cowork') {
    html += row('Мест', place.seats);
    html += row('Розетки', place.sockets);
    html += row('Wi‑Fi', yesNo(place.wifi));
    html += row('Обстановка', place.noise);
  }
  html += row('Доступность для маломобильных', accessText(place));
  html += '</dl>';

  if (place.updated !== null) html += `<p class="hint">Данные обновлены: ${esc(place.updated)}</p>`;
  return html;
}

// Строка «название — значение». null — не показываем, BAD — серым «нет данных».
function row(label, value) {
  if (value === null) return '';
  const cls = value === BAD ? ' class="no-data"' : '';
  return `<div class="details__row"><dt>${label}</dt><dd${cls}>${esc(value)}</dd></div>`;
}

function yesNo(value) {
  if (value === true) return 'есть';
  if (value === false) return 'нет';
  return value; // null или BAD
}

function accessText(place) {
  const names = { 'да': 'доступно', 'частично': 'частично доступно', 'нет': 'недоступно' };
  let text = names[place.accessible] || place.accessible;
  if (place.accessibilityNote) {
    if (text === null) text = place.accessibilityNote;
    else text += '. ' + place.accessibilityNote;
  }
  return text;
}

// Часы одного дня или перерыва → "09:00–17:00", "закрыто" или серое «нет данных».
function dayText(day) {
  if (day === 'closed') return 'закрыто';
  if (day === BAD) return `<span class="no-data">${BAD}</span>`;
  return formatTime(day.from) + '–' + formatTime(day.to);
}

function hoursRow(place) {
  if (place.weekdays === null && place.saturday === null) return '';
  let lines = '';
  if (place.weekdays !== null) lines += `<li>Будни: ${dayText(place.weekdays)}</li>`;
  if (place.saturday !== null) lines += `<li>Суббота: ${dayText(place.saturday)}</li>`;
  lines += '<li>Воскресенье: закрыто</li>';
  if (place.break !== null) lines += `<li>Перерыв: ${dayText(place.break)}</li>`;
  return `<div class="details__row"><dt>Часы работы</dt><dd><ul class="hours">${lines}</ul></dd></div>`;
}

// ---------- Меню ----------

function openMenu(place) {
  const dishes = menu[place.id] || [];
  let html = '';
  if (menuFailed) {
    html = '<p class="message">Не удалось загрузить меню. Попробуйте открыть приложение позже.</p>';
  } else if (dishes.length === 0) {
    html = '<p class="message">Меню этого места пока не добавили.</p>';
  } else {
    for (const group of groupMenu(dishes)) {
      html += `<h3>${group.title}</h3><ul class="menu-list">`;
      for (const dish of group.dishes) {
        let price = '';
        if (typeof dish.price === 'number') price = dish.price + ' ₽';
        if (dish.price === BAD) price = `<span class="no-data">${BAD}</span>`;
        const veg = dish.vegetarian === true ? ' <span class="veg-badge" title="вегетарианское блюдо">вег.</span>' : '';
        html += `<li><span>${esc(dish.name)}${veg}</span><b>${price}</b></li>`;
      }
      html += '</ul>';
    }
    const date = latestDate(dishes.map((dish) => dish.updated));
    if (date) html += `<p class="hint">Меню обновлено: ${esc(date)}</p>`;
  }

  $('menu-title').textContent = 'Меню: ' + place.name;
  $('menu-content').innerHTML = html;
  $('menu-content').scrollTop = 0;
  $('menu-screen').hidden = false;
  $('menu-title').focus({ preventScroll: true });
  updateBackButton();
}

function closeMenu() {
  $('menu-screen').hidden = true;
}

// ---------- Кнопка «Назад» (системная в Telegram, своя в браузере, Esc) ----------

// Закрывает то, что открыто сверху: «О проекте» → меню → карточку.
function goBack() {
  if (!$('about').hidden) {
    $('about').hidden = true;
    $('about-button').focus();
  } else if (!$('menu-screen').hidden) {
    closeMenu();
    if ($('menu-button')) $('menu-button').focus();
  } else {
    closeCard();
  }
  updateBackButton();
}

// Системная кнопка «Назад» в Telegram видна, только когда есть что закрыть.
function updateBackButton() {
  if (!inTelegram || !tg.isVersionAtLeast('6.1')) return;
  if (!$('about').hidden || !$('menu-screen').hidden || selectedId !== null) tg.BackButton.show();
  else tg.BackButton.hide();
}

// ---------- Telegram ----------

function setupTelegram() {
  if (!inTelegram) return;
  tg.ready();   // убрать заставку Telegram
  tg.expand();  // развернуть на всю высоту
  // Без этого жест «потянуть вниз» сворачивает приложение, а не двигает карту.
  if (tg.isVersionAtLeast('7.7')) tg.disableVerticalSwipes();
  if (tg.isVersionAtLeast('6.1')) {
    tg.BackButton.onClick(goBack);
    document.documentElement.classList.add('has-telegram-back'); // свою «Назад» прячем
  }
  applyTelegramTheme();
  tg.onEvent('themeChanged', applyTelegramTheme);
}

// Цвета темы Telegram → наши CSS-переменные.
function applyTelegramTheme() {
  const names = {
    bg_color: '--bg',
    secondary_bg_color: '--surface-2',
    section_bg_color: '--surface',
    text_color: '--text',
    hint_color: '--hint',
    link_color: '--link',
    button_color: '--accent',
    button_text_color: '--accent-text',
  };
  for (const key in names) {
    if (tg.themeParams[key]) document.documentElement.style.setProperty(names[key], tg.themeParams[key]);
  }
  document.documentElement.dataset.theme = tg.colorScheme === 'dark' ? 'dark' : 'light';
}

// В Telegram ссылка откроется в браузере или в Яндекс Картах, а наше приложение останется открытым.
function openLink(url) {
  if (inTelegram) tg.openLink(url);
  else window.open(url, '_blank', 'noopener');
}

// ---------- Загрузка ----------

async function startMap() {
  try {
    await map.createMap(debug, closeCard);
  } catch (error) {
    console.error(error);
    $('map-error').hidden = false;
    return;
  }
  mapLoaded = true;
  placeMarkers();
}

async function startData() {
  $('status-screen').hidden = false;
  $('status-text').textContent = 'Загружаем карту и данные…';
  $('status-hint').textContent = '';
  $('retry-button').hidden = true;
  try {
    const data = await loadData();
    places = data.places;
    menu = data.menu;
    menuFailed = data.menuFailed;
  } catch (error) {
    console.error('Не удалось загрузить данные:', error);
    $('status-text').textContent = 'Не удалось загрузить данные';
    $('status-hint').textContent = 'Проверьте интернет и попробуйте ещё раз.';
    $('retry-button').hidden = false;
    $('retry-button').focus();
    return;
  }
  $('status-screen').hidden = true;
  dataLoaded = true;
  updateStatuses();
  setInterval(updateStatuses, 60 * 1000);
  placeMarkers();
  openStartPlace();
}

// Метки ставим, когда готовы и картинка, и данные.
function placeMarkers() {
  if (!mapLoaded || !dataLoaded) return;
  map.addMarkers(places, debug, (id) => openCard(id, false));
  render();
  // Карточку могли открыть по ссылке раньше, чем загрузилась карта.
  if (selectedId !== null) map.showPlace(selectedId, true);
}

// Открыли по ссылке startapp=place_3 (Telegram) или ?place=3 (браузер) — сразу показываем место.
function openStartPlace() {
  const fromTelegram = tg && tg.initDataUnsafe ? tg.initDataUnsafe.start_param : null;
  const fromUrl = new URLSearchParams(location.search).get('place');
  const id = placeIdFromParam(fromTelegram) || placeIdFromParam(fromUrl);
  if (id === null) return;
  if (findPlace(id)) openCard(id, true);
  else showToast(`Место №${id} не найдено`);
}

// ---------- Запуск ----------

function start() {
  setupTelegram();
  if (debug) $('debug-badge').hidden = false;

  for (const button of document.querySelectorAll('[data-view]')) {
    button.onclick = () => setView(button.dataset.view);
  }
  for (const button of document.querySelectorAll('[data-category]')) {
    button.onclick = () => {
      // Повторное нажатие снимает фильтр.
      if (category === button.dataset.category) category = null;
      else category = button.dataset.category;
      render();
    };
  }
  $('open-now').onclick = () => {
    openNowOnly = !openNowOnly;
    render();
  };
  $('accessible').onclick = () => {
    accessibleOnly = !accessibleOnly;
    render();
  };
  $('search').oninput = () => {
    search = $('search').value.trim().toLowerCase();
    renderList();
  };
  $('places-list').onclick = (event) => {
    const item = event.target.closest('[data-id]');
    if (!item) return;
    setView('map');
    openCard(Number(item.dataset.id), true);
  };

  $('about-button').onclick = () => {
    $('about').hidden = false;
    $('about-close').focus();
    updateBackButton();
  };
  $('about-close').onclick = goBack;
  $('about').onclick = (event) => {
    if (event.target.id === 'about') goBack(); // нажали на тёмный фон вокруг окна
  };
  $('menu-back').onclick = goBack;
  $('retry-button').onclick = startData;

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') goBack();
  });
  // Повернули экран — у карточки другая высота.
  window.addEventListener('resize', () => {
    if (selectedId !== null) map.setBottomInset($('sheet').offsetHeight);
  });

  // Картинку и данные грузим одновременно — так быстрее.
  startMap();
  startData();
}

start();
