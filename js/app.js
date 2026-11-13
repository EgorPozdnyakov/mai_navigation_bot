// app.js — главный файл: фильтры, список, карточка столовой, меню и Telegram.

import { PLACES } from './places.js';
import { getMoscowTime, getStatus, formatTime, toMinutes } from './hours.js';
import * as map from './map.js';

const PHOTOS_FOLDER = 'media/photos/';

// ---------- Состояние приложения ----------
const statuses = {};        // id столовой → { open, text }, пересчитываем раз в минуту
let view = 'map';           // 'map' или 'list'
let openNowOnly = false;    // фильтр «Открыто сейчас»
let accessibleOnly = false; // фильтр ♿
let search = '';            // поиск в списке
let selectedId = null;      // столовая, чья карточка открыта
let mapLoaded = false;

const debug = new URLSearchParams(location.search).get('debug') === '1'; // режим разметки

// Скрипт Telegram создаёт Telegram.WebApp и в обычном браузере,
// поэтому проверяем initData: её передаёт только сам Telegram.
const tg = window.Telegram ? window.Telegram.WebApp : null;
const inTelegram = Boolean(tg && tg.initData);

// ---------- Помощники ----------

function $(id) {
  return document.getElementById(id);
}

function findPlace(id) {
  return PLACES.find((place) => place.id === id);
}

// Ссылка на фото из папки media/photos/
function photoUrl(fileName) {
  return PHOTOS_FOLDER + encodeURIComponent(fileName);
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
  if (openNowOnly && !statuses[place.id].open) return false;
  if (accessibleOnly && !place.accessible) return false;
  return true;
}

// Пересчитать «открыто / закрыто» по московскому времени.
function updateStatuses() {
  const now = getMoscowTime();
  for (const place of PLACES) statuses[place.id] = getStatus(place, now);
  render();
}

// Перерисовать всё, что зависит от фильтров и статусов.
function render() {
  // aria-pressed="true" — кнопка включена (по нему же CSS её красит).
  for (const button of document.querySelectorAll('.segmented [data-view]')) {
    button.setAttribute('aria-pressed', button.dataset.view === view);
  }
  $('open-now').setAttribute('aria-pressed', openNowOnly);
  $('accessible').setAttribute('aria-pressed', accessibleOnly);

  for (const place of PLACES) {
    const status = statuses[place.id];
    const selected = place.id === selectedId;
    // Выбранную столовую показываем всегда, иначе метка пропала бы под карточкой.
    const show = matchesFilters(place) || selected;
    map.updateMarker(place.id, show, !status.open, selected, `${place.id}. ${place.name}. ${status.text}`);
  }

  renderList();

  if (selectedId !== null) {
    const status = statuses[selectedId];
    $('sheet-status').className = status.open ? 'status status--open' : 'status status--closed';
    $('sheet-status').textContent = status.text;
  }
}

function renderList() {
  let html = '';
  for (const place of PLACES) {
    if (!matchesFilters(place)) continue;
    if (search !== '' && !place.name.toLowerCase().includes(search)) continue;
    const status = statuses[place.id];
    html += `
      <li>
        <button type="button" class="list-item" data-id="${place.id}">
          <span class="badge">${place.id}</span>
          <span class="list-item__text">
            <span class="list-item__name">${place.name}</span>
            <span class="hint">${place.where}</span>
            <span class="status ${status.open ? 'status--open' : 'status--closed'}">${status.text}</span>
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

// ---------- Карточка столовой ----------

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
  $('menu-button').onclick = () => openMenu(place);
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
  let html = '';

  // Фото листаются вбок. Если файла нет — фото просто пропадает.
  if (place.photos.length > 0) {
    html += '<div class="photos">';
    for (let i = 0; i < place.photos.length; i++) {
      html += `<img class="photos__item" src="${photoUrl(place.photos[i])}" alt="${place.name}: фото ${i + 1}" loading="lazy" onerror="this.remove()">`;
    }
    html += '</div>';
  } else {
    html += '<div class="photos photos--empty">📷 Фото пока нет</div>';
  }

  const hours = formatTime(toMinutes(place.open)) + '–' + formatTime(toMinutes(place.close));
  html += `
    <div class="sheet__header">
      <div class="sheet__titles">
        <h2 id="sheet-title" class="sheet__title" tabindex="-1">${place.name}</h2>
        <p id="sheet-status" class="status ${status.open ? 'status--open' : 'status--closed'}">${status.text}</p>
      </div>
      <button type="button" id="sheet-close" class="icon-button" aria-label="Закрыть карточку">×</button>
    </div>
    <div class="sheet__buttons">
      <button type="button" id="menu-button" class="button">Меню</button>
    </div>
    <dl class="details">
      <div class="details__row"><dt>Где</dt><dd>${place.where}</dd></div>
      <div class="details__row"><dt>Часы работы</dt><dd>Пн–Пт ${hours}<br>Сб–Вс закрыто</dd></div>
      <div class="details__row"><dt>Средний чек</dt><dd>${place.price} ₽</dd></div>
      <div class="details__row"><dt>Оплата</dt><dd>${place.payment}</dd></div>
      <div class="details__row"><dt>Для маломобильных</dt><dd>${place.accessible ? 'доступно ♿' : 'недоступно'}</dd></div>
    </dl>`;
  return html;
}

// ---------- Меню (фото) ----------

function openMenu(place) {
  let html = '';
  if (place.menu.length === 0) {
    html = '<p class="message">Меню этой столовой пока не добавили.</p>';
  }
  for (const fileName of place.menu) {
    html += `<img class="menu-photo" src="${photoUrl(fileName)}" alt="Меню: ${place.name}" onerror="this.remove()">`;
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

// Номер столовой из ссылки: startapp=place_3 (Telegram) или ?place=3 (браузер).
function startPlaceId() {
  let text = new URLSearchParams(location.search).get('place');
  if (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) text = tg.initDataUnsafe.start_param;
  if (!text) return null;
  return Number(text.replace('place_', '')) || null;
}

// ---------- Запуск ----------

async function startMap() {
  try {
    await map.createMap(debug, closeCard);
  } catch (error) {
    console.error(error);
    $('map-error').hidden = false;
    return;
  }
  mapLoaded = true;
  map.addMarkers(PLACES, debug, (id) => openCard(id, false));
  render();
  // Карточку могли открыть по ссылке раньше, чем загрузилась карта.
  if (selectedId !== null) map.showPlace(selectedId, true);
}

function start() {
  setupTelegram();
  if (debug) $('debug-badge').hidden = false;

  for (const button of document.querySelectorAll('[data-view]')) {
    button.onclick = () => setView(button.dataset.view);
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

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') goBack();
  });
  // Повернули экран — у карточки другая высота.
  window.addEventListener('resize', () => {
    if (selectedId !== null) map.setBottomInset($('sheet').offsetHeight);
  });

  updateStatuses();
  setInterval(updateStatuses, 60 * 1000);
  startMap();

  const id = startPlaceId();
  if (id !== null) {
    if (findPlace(id)) openCard(id, true);
    else showToast(`Столовая №${id} не найдена`);
  }
}

start();
