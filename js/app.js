// =============================================================================
// app.js — точка входа. Здесь хранится состояние приложения и связываются
// все части: данные (data.js), часы (hours.js), карта (map.js),
// карточка (card.js), меню (menu.js), остальной интерфейс (ui.js), Telegram.
//
// Порядок запуска (функция start в конце файла):
//   1. Подключаемся к Telegram (если открыты в нём), подставляем тексты.
//   2. Одновременно загружаем картинку карты и данные из CSV.
//   3. Когда готово и то, и другое, — ставим метки.
//   4. Если приложение открыли по ссылке на место (QR-код) — открываем его.
// =============================================================================

import { CONFIG } from './config.js';
import { TEXTS } from './texts.js';
import { loadAllData } from './data.js';
import { getMoscowTime, getOpenStatus, formatStatus } from './hours.js';
import { byId } from './dom.js';
import * as telegram from './telegram.js';
import * as mapView from './map.js';
import * as ui from './ui.js';
import * as card from './card.js';
import * as menu from './menu.js';

// Всё, что приложение «помнит», — в одном объекте. Так проще понять,
// от чего зависит то, что видно на экране.
const state = {
  places: [],                 // места из objects.csv (уже проверенные)
  placesById: new Map(),      // id → место, чтобы быстро находить по номеру
  dishesByPlace: new Map(),   // id места → блюда из menu.csv
  menuFailed: false,          // меню не загрузилось
  statusById: new Map(),      // id → открыто/закрыто (пересчитывается раз в минуту)

  category: 'all',            // фильтр: 'all' | 'food' | 'cowork'
  openNowOnly: false,         // фильтр «Открыто сейчас»
  view: 'map',                // что показываем: 'map' | 'list'
  selectedId: null,           // место, чья карточка открыта

  debug: false,               // режим разметки (?debug=1)
  mapReady: false,            // картинка карты загрузилась
  dataReady: false,           // данные загрузились
  markersPlaced: false,       // метки уже поставлены
};

let refreshTimer = null;

// -----------------------------------------------------------------------------
// Фильтры
// -----------------------------------------------------------------------------

/** Подходит ли место под выбранные фильтры. */
function matchesFilters(place) {
  if (state.category !== 'all' && place.group !== state.category) return false;
  if (state.openNowOnly && state.statusById.get(place.id).state !== 'open') return false;
  return true;
}

function setCategory(category) {
  state.category = category;
  ui.renderControls(state);
  renderAll();
}

function toggleOpenNow() {
  state.openNowOnly = !state.openNowOnly;
  ui.renderControls(state);
  renderAll();
}

// -----------------------------------------------------------------------------
// Отрисовка меток и списка
// -----------------------------------------------------------------------------

function renderAll() {
  renderMarkers();
  renderList();
}

function renderMarkers() {
  if (!state.markersPlaced) return;
  const visibleIds = new Set();
  const closedIds = new Set();
  const labels = new Map();

  for (const place of state.places) {
    const status = state.statusById.get(place.id);
    // Выбранное место показываем всегда, даже если оно не подходит под
    // фильтр: иначе метка пропала бы прямо под открытой карточкой.
    if (matchesFilters(place) || place.id === state.selectedId) visibleIds.add(place.id);
    if (status.state === 'closed') closedIds.add(place.id);
    labels.set(place.id, TEXTS.map.markerLabel(place.id, place.name, formatStatus(status)));
  }
  mapView.updateMarkers({ visibleIds, closedIds, selectedId: state.selectedId, labels });
}

function renderList() {
  const items = state.places.filter(matchesFilters).map((place) => {
    const status = state.statusById.get(place.id);
    return { place, state: status.state, statusText: formatStatus(status), onMap: place.mapX !== null };
  });
  ui.renderList(items, selectFromList);
}

/** Пересчитать «открыто / закрыто» по московскому времени. */
function refreshStatuses() {
  const now = getMoscowTime();
  for (const place of state.places) {
    state.statusById.set(place.id, getOpenStatus(place.schedule, now));
  }
  renderAll();
  if (state.selectedId !== null) card.updateCardStatus(state.statusById.get(state.selectedId));
}

// -----------------------------------------------------------------------------
// Карта / список
// -----------------------------------------------------------------------------

function setView(view) {
  state.view = view;
  // В списке карточка и меню не нужны — закрываем.
  if (view === 'list') closeCard();
  ui.showView(view);
  ui.renderControls(state);
  if (view === 'map') mapView.refreshSize();
}

/** Нажали на место в списке: переходим на карту и открываем карточку. */
function selectFromList(id) {
  setView('map');
  selectPlace(id, { zoomIn: true });
}

// -----------------------------------------------------------------------------
// Карточка места
// -----------------------------------------------------------------------------

/**
 * Открыть карточку места id.
 * zoomIn = true — приблизить карту к метке (из списка и по ссылке).
 */
function selectPlace(id, { zoomIn }) {
  const place = state.placesById.get(id);
  if (!place) return;

  state.selectedId = id;
  menu.closeMenu();
  card.openCard(place, state.statusById.get(id), {
    onMenu: () => openMenu(place),
    onRoute: () => telegram.openExternalLink(card.buildRouteUrl(place.lat, place.lon)),
    onClose: closeCard,
  });
  updateMapInset();
  if (state.markersPlaced) mapView.showPlace(id, { zoomIn });
  renderMarkers();
  updateBackButton();
}

function closeCard() {
  if (!card.isCardOpen()) return;
  const id = state.selectedId;
  // Если фокус клавиатуры был в карточке — вернём его на метку.
  const focusWasInCard = byId('sheet').contains(document.activeElement);

  menu.closeMenu();
  card.closeCard();
  state.selectedId = null;
  updateMapInset();
  renderMarkers();
  updateBackButton();
  if (focusWasInCard) mapView.focusMarker(id);
}

/** Сообщаем карте, сколько места снизу занимает карточка. */
function updateMapInset() {
  if (state.mapReady) mapView.setBottomInset(card.getCardHeight());
}

function openMenu(place) {
  menu.openMenu(place, state.dishesByPlace.get(place.id) || [], { menuFailed: state.menuFailed });
  updateBackButton();
}

function openAbout() {
  ui.openAbout();
  updateBackButton();
}

// -----------------------------------------------------------------------------
// Кнопка «Назад» (системная в Telegram, своя в браузере, клавиша Esc)
// -----------------------------------------------------------------------------

/** Закрывает то, что открыто «сверху»: окно → меню → карточка. */
function goBack() {
  if (ui.isAboutOpen()) {
    ui.closeAbout();
  } else if (menu.isMenuOpen()) {
    menu.closeMenu();
    const menuButton = document.getElementById('menu-button');
    if (menuButton) menuButton.focus();
  } else if (card.isCardOpen()) {
    closeCard();
  }
  updateBackButton();
}

/** Системная кнопка «Назад» Telegram видна, только когда есть что закрыть. */
function updateBackButton() {
  telegram.setBackButtonVisible(ui.isAboutOpen() || menu.isMenuOpen() || card.isCardOpen());
}

// -----------------------------------------------------------------------------
// Загрузка
// -----------------------------------------------------------------------------

/** Загружает картинку карты. Ошибка — сообщение на месте карты. */
async function startMap() {
  try {
    await mapView.createMap(byId('map'), {
      debug: state.debug,
      onMarkerClick: (id) => selectPlace(id, { zoomIn: false }),
      onMapClick: closeCard,
      onCopy: (ok) => ui.showToast(ok ? TEXTS.debug.copied : TEXTS.debug.copyFailed),
    });
    state.mapReady = true;
    placeMarkersWhenReady();
  } catch (error) {
    console.error(error);
    ui.showMapError();
  }
}

/** Загружает данные. Ошибка — экран с кнопкой «Повторить». */
async function startData() {
  ui.showLoading();
  try {
    const data = await loadAllData();
    state.places = data.places;
    state.placesById = new Map(data.places.map((place) => [place.id, place]));
    state.dishesByPlace = data.dishesByPlace;
    state.menuFailed = data.menuFailed;
    state.dataReady = true;
  } catch (error) {
    console.error('Не удалось загрузить данные:', error);
    ui.showDataError(startData); // «Повторить» запустит эту же функцию ещё раз
    return;
  }

  ui.hideStatusScreen();
  refreshStatuses();
  if (refreshTimer === null) refreshTimer = setInterval(refreshStatuses, CONFIG.STATUS_REFRESH_MS);
  placeMarkersWhenReady();
  openStartPlace();
}

/** Метки ставим, только когда готовы и картинка, и данные. */
function placeMarkersWhenReady() {
  if (!state.mapReady || !state.dataReady || state.markersPlaced) return;
  mapView.setPlaces(state.places, { debug: state.debug });
  state.markersPlaced = true;
  renderMarkers();
  // Карточку могли открыть по ссылке раньше, чем загрузилась карта.
  if (state.selectedId !== null) {
    updateMapInset();
    mapView.showPlace(state.selectedId, { zoomIn: true });
  }
}

/** Открыли по ссылке place_N (Telegram) или ?place=N (браузер) — сразу показываем место. */
function openStartPlace() {
  const id = telegram.getStartPlaceId();
  if (id === null) return;
  if (!state.placesById.has(id)) {
    console.warn(`Ссылка ведёт на место id=${id}, но такого места нет (или оно скрыто)`);
    ui.showToast(TEXTS.errors.placeNotFound(id));
    return;
  }
  selectPlace(id, { zoomIn: true });
}

// -----------------------------------------------------------------------------
// Запуск
// -----------------------------------------------------------------------------

function start() {
  state.debug = new URLSearchParams(window.location.search).get('debug') === '1';

  telegram.initTelegram({ onBack: goBack });
  ui.applyGroupColors();
  ui.applyStaticTexts();
  ui.initControls({
    onCategory: setCategory,
    onOpenNow: toggleOpenNow,
    onView: setView,
    onAbout: openAbout,
    onBack: goBack,
  });
  ui.renderControls(state);
  if (state.debug) ui.showDebugBadge();

  // Esc в браузере работает как «Назад».
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') goBack();
  });
  // Повернули экран — высота карточки изменилась.
  window.addEventListener('resize', updateMapInset);

  // Картинку и данные грузим одновременно — так быстрее.
  startMap();
  startData();
}

start();
