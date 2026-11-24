// app.js — главный файл: фильтры, список, карточка столовой, меню, язык и Telegram.
// Все тексты интерфейса — в js/i18n.js, здесь они берутся через t('ключ').

import { PLACES } from './places.js';
import { MENUS } from './menus.js';
import { findDishes } from './dish-search.js';
import { getMoscowTime, getStatus, getQueue, queueLabel, formatTime, toMinutes } from './hours.js';
import { t, placeText, paymentText, getLang, setLang, chooseLang, loadSavedLang, translatePage } from './i18n.js';
import * as map from './map.js';

const PHOTOS_FOLDER = 'media/photos/';

// ---------- Состояние приложения ----------
const statuses = {};        // id столовой → { open, text, queue }, пересчитываем раз в минуту
let view = 'map';           // 'map', 'list' или 'dishes'
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

// Текст про очередь. У закрытой столовой очереди нет.
function queueText(status) {
  if (!status.open) return '';
  return queueLabel(status.queue);
}

// Строка «● Большая очередь» с цветной точкой.
function queueHtml(status, id) {
  return `<p id="${id}" class="queue queue--${status.open ? status.queue : 'none'}">${queueText(status)}</p>`;
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
  for (const place of PLACES) {
    statuses[place.id] = getStatus(place, now);
    statuses[place.id].queue = getQueue(place); // очередь меняется раз в час
  }
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
    const label = `${place.id}. ${placeText(place, 'name')}. ${status.text}. ${queueText(status)}`.replace(/\. $/, '');
    map.updateMarker(place.id, show, !status.open, status.queue, selected, label);
  }

  renderList();
  if (view === 'dishes') renderDishes();

  if (selectedId !== null) {
    const status = statuses[selectedId];
    $('sheet-status').className = status.open ? 'status status--open' : 'status status--closed';
    $('sheet-status').textContent = status.text;
    $('sheet-queue').outerHTML = queueHtml(status, 'sheet-queue');
  }
}

function renderList() {
  let html = '';
  for (const place of PLACES) {
    if (!matchesFilters(place)) continue;
    // Ищем и по русскому, и по английскому названию.
    const names = (place.name + ' ' + (place.name_en || '')).toLowerCase();
    if (search !== '' && !names.includes(search)) continue;
    const status = statuses[place.id];
    html += `
      <li>
        <button type="button" class="list-item" data-id="${place.id}">
          <span class="badge">${place.id}</span>
          <span class="list-item__text">
            <span class="list-item__name">${placeText(place, 'name')}</span>
            <span class="hint">${placeText(place, 'where')}</span>
            <span class="status ${status.open ? 'status--open' : 'status--closed'}">${status.text}</span>
            ${queueHtml(status, '')}
          </span>
        </button>
      </li>`;
  }
  $('places-list').innerHTML = html;
  $('list-empty').hidden = html !== '';
}

function setView(newView) {
  if (newView !== 'map') closeCard();
  view = newView;
  // Карту прячем через visibility (класс is-hidden): так Leaflet не теряет размеры.
  $('map-view').classList.toggle('is-hidden', view !== 'map');
  $('list-view').hidden = view !== 'list';
  $('dishes-view').hidden = view !== 'dishes';
  if (view === 'map') map.refreshSize();
  render();
}

// ---------- Поиск по блюдам ----------

function renderDishes() {
  const query = $('dish-query').value.trim();
  const results = $('dish-results');
  const focused = results.contains(document.activeElement) ? document.activeElement.id : '';
  const english = getLang() === 'en';
  let count = 0;
  let html = '';

  for (const { placeId, matches } of findDishes(query)) {
    const place = findPlace(placeId);
    if (!place || !matchesFilters(place)) continue;
    const status = statuses[placeId];
    count += matches.length;
    const titleId = `dish-place-${placeId}`;
    const rows = matches.map(({ key, dish: [nameRu, nameEn, price] }) => `
      <li>
        <button type="button" class="dish-result__row" id="dish-result-${key}"
          data-dish-key="${key}" data-dish-place="${placeId}" aria-describedby="${titleId}">
          <span>${english ? nameEn : nameRu}</span>
          <span class="dish-result__price">${t('rubles', price)}</span>
          <span class="dish-result__arrow" aria-hidden="true"></span>
        </button>
      </li>`).join('');
    html += `
      <section class="dish-result" aria-labelledby="${titleId}">
        <header class="dish-result__header">
          <h3 id="${titleId}">${placeText(place, 'name')}</h3>
          <span class="status ${status.open ? 'status--open' : 'status--closed'}">${status.text}</span>
        </header>
        <ul>${rows}</ul>
      </section>`;
  }

  $('dish-suggestions').hidden = query !== '';
  $('dish-results-empty').hidden = query === '' || count > 0;
  const summary = query === '' ? '' : count ? t('dishSearchCount', count) : t('dishSearchEmpty');
  const summaryElement = $('dish-results-status');
  if (summaryElement.textContent !== summary) summaryElement.textContent = summary;
  results.innerHTML = html;
  if (focused) ($(focused) || $('dish-query')).focus({ preventScroll: true });
}

// ---------- Карточка столовой ----------

// Открыть карточку. zoomIn — приблизить карту к метке (из списка и по ссылке).
function openCard(id, zoomIn) {
  const place = findPlace(id);
  if (!place) return;
  selectedId = id;
  closeMenu();

  const sheet = $('sheet');
  fillCard(place);
  sheet.hidden = false;
  sheet.scrollTop = 0;
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

// Заполнить карточку (при открытии и при смене языка).
function fillCard(place) {
  $('sheet').innerHTML = cardHtml(place);
  $('sheet-close').onclick = closeCard;
  $('menu-button').onclick = () => openMenu(place);
}

function cardHtml(place) {
  const name = placeText(place, 'name');
  const status = statuses[place.id];
  let html = '';

  // Фото листаются вбок. Если файла нет — фото просто пропадает.
  if (place.photos.length > 0) {
    html += '<div class="photos">';
    for (let i = 0; i < place.photos.length; i++) {
      html += `<img class="photos__item" src="${photoUrl(place.photos[i])}" alt="${t('photoAlt', name, i + 1)}" loading="lazy" onerror="this.remove()">`;
    }
    html += '</div>';
  } else {
    html += `<div class="photos photos--empty">${t('noPhoto')}</div>`;
  }

  const hours = formatTime(toMinutes(place.open)) + '–' + formatTime(toMinutes(place.close));
  html += `
    <div class="sheet__header">
      <div class="sheet__titles">
        <h2 id="sheet-title" class="sheet__title" tabindex="-1">${name}</h2>
        <p id="sheet-status" class="status ${status.open ? 'status--open' : 'status--closed'}">${status.text}</p>
        ${queueHtml(status, 'sheet-queue')}
      </div>
      <button type="button" id="sheet-close" class="icon-button" aria-label="${t('closeCard')}">×</button>
    </div>
    <div class="sheet__buttons">
      <button type="button" id="menu-button" class="button">${t('menuButton')}</button>
    </div>
    <dl class="details">
      <div class="details__row"><dt>${t('where')}</dt><dd>${placeText(place, 'where')}</dd></div>
      <div class="details__row"><dt>${t('hours')}</dt><dd>${t('weekdaysHours', hours)}<br>${t('weekendClosed')}</dd></div>
      <div class="details__row"><dt>${t('price')}</dt><dd>${t('rubles', place.price)}</dd></div>
      <div class="details__row"><dt>${t('payment')}</dt><dd>${paymentText(place.payment)}</dd></div>
      <div class="details__row"><dt>${t('accessibility')}</dt><dd>${place.accessible ? t('accessibleYes') : t('accessibleNo')}</dd></div>
    </dl>`;
  return html;
}

// ---------- Меню ----------

let menuPlace = null; // столовая, чьё меню открыто (чтобы перевести экран при смене языка)
let menuDish = null;  // блюдо, выбранное в поиске

function openMenu(place, dishKey = null) {
  menuDish = dishKey;
  fillMenu(place);
  $('menu-content').scrollTop = 0;
  $('menu-screen').hidden = false;
  const dish = menuDish && $('menu-dish-' + menuDish);
  if (dish) dish.scrollIntoView({ block: 'center' });
  (dish || $('menu-title')).focus({ preventScroll: true });
  updateBackButton();
}

function fillMenu(place) {
  menuPlace = place;
  const name = placeText(place, 'name');
  const menu = MENUS[place.id];
  let html = '';
  if (menu) {
    const lang = getLang();
    const date = menu.date
      ? new Intl.DateTimeFormat(lang, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(menu.date))
      : '';
    const heading = menu.sample ? t('menuSample') : t('menuFromPhoto', date);
    const note = t(menu.sample ? 'menuSampleNote' : 'menuFromPhotoNote');
    html = `<p class="menu-source"><strong>${heading}</strong><br>${note}</p>`;
    for (const [category, dishes] of Object.entries(menu.dishes)) {
      const items = dishes.map(([nameRu, nameEn, price], index) => {
        const key = `${place.id}-${category}-${index}`;
        const selected = menuDish === key;
        return `
        <li class="menu-list__item${selected ? ' menu-list__item--selected' : ''}"${selected ? ` id="menu-dish-${key}" tabindex="-1"` : ''}>
          <span>${lang === 'en' ? nameEn : nameRu}</span>
          <span class="menu-list__price">${t('rubles', price)}</span>
        </li>`;
      }).join('');
      html += `<section class="menu-category">
        <h3>${t('menuCategory_' + category)}</h3>
        <ul class="menu-list">${items}</ul>
      </section>`;
    }
  } else if (place.menu.length === 0) {
    html = `<p class="message">${t('menuEmpty')}</p>`;
  }
  for (const fileName of place.menu) {
    html += `<img class="menu-photo" src="${photoUrl(fileName)}" alt="${t('menuAlt', name)}" onerror="this.remove()">`;
  }
  $('menu-title').textContent = t('menuTitle', name);
  $('menu-content').innerHTML = html;
}

function closeMenu() {
  $('menu-screen').hidden = true;
  menuPlace = null;
  menuDish = null;
}

// ---------- Язык (русский / английский) ----------

// Перевести всё, что сейчас на экране. Карточку и меню перерисовываем на месте,
// карту не двигаем.
function applyLanguage() {
  translatePage();
  // На кнопке написан язык, на который переключимся, — для программ чтения указываем его язык.
  $('lang-button').lang = getLang() === 'ru' ? 'en' : 'ru';
  map.translateMap();
  updateStatuses(); // тексты «Открыто до …» и очередей — на новом языке
  if (selectedId !== null) fillCard(findPlace(selectedId));
  if (menuPlace !== null) fillMenu(menuPlace);
}

function toggleLanguage() {
  setLang(getLang() === 'ru' ? 'en' : 'ru', { save: true });
  applyLanguage();
}

// Язык при запуске: ?lang=… в ссылке, выбор с прошлого раза, язык Telegram или браузера.
function startLanguage() {
  const telegramLang = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user.language_code : null;
  setLang(chooseLang({
    urlLang: new URLSearchParams(location.search).get('lang'),
    savedLang: loadSavedLang(),
    userLang: inTelegram ? telegramLang : navigator.language,
  }));
  translatePage();
  $('lang-button').lang = getLang() === 'ru' ? 'en' : 'ru';
}

// ---------- Кнопка «Назад» (системная в Telegram, своя в браузере, Esc) ----------

// Закрывает то, что открыто сверху: «О проекте» → меню → карточку.
function goBack() {
  if (!$('about').hidden) {
    $('about').hidden = true;
    $('about-button').focus();
  } else if (!$('menu-screen').hidden) {
    const origin = menuDish ? $('dish-result-' + menuDish) || $('dish-query') : $('menu-button');
    closeMenu();
    origin?.focus({ preventScroll: true });
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
  startLanguage();
  setupTelegram();
  $('lang-button').onclick = toggleLanguage;
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

  $('dish-query').oninput = renderDishes;
  $('dish-suggestions').onclick = (event) => {
    const suggestion = event.target.closest('[data-dish-suggestion]');
    if (!suggestion) return;
    $('dish-query').value = t(suggestion.dataset.dishSuggestion);
    renderDishes();
    $('dish-results-status').focus({ preventScroll: true });
  };
  $('dish-results').onclick = (event) => {
    const result = event.target.closest('[data-dish-key]');
    if (!result) return;
    openMenu(findPlace(Number(result.dataset.dishPlace)), result.dataset.dishKey);
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
    else showToast(t('placeNotFound', id));
  }
}

start();
