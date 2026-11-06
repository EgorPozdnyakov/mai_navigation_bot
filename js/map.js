// =============================================================================
// map.js — карта кампуса на Leaflet.
//
// Основа карты — КАРТИНКА (media/map.jpg), а не географическая карта.
// Для этого у Leaflet есть режим L.CRS.Simple: координаты — просто числа.
//
// Как пиксели картинки превращаются в координаты Leaflet:
//   в таблице map_x — пиксели слева направо, map_y — сверху вниз;
//   у Leaflet первая координата (lat) растёт ВВЕРХ, вторая (lng) — вправо.
//   Поэтому точка (x, y) картинки — это [-y, x] для Leaflet.
//   Вся картинка занимает прямоугольник от [-высота, 0] до [0, ширина].
//
// Leaflet подключается в index.html обычным <script> и доступен как window.L.
// =============================================================================

import { CONFIG } from './config.js';
import { TEXTS } from './texts.js';
import { el, copyText } from './dom.js';

let map = null;            // объект карты Leaflet
let imageBounds = null;    // прямоугольник картинки в координатах Leaflet
let imageSize = null;      // { width, height } картинки в пикселях
let fitZoom = 0;           // масштаб, при котором видна вся карта
let bottomInsetPx = 0;     // сколько пикселей снизу закрывает карточка места
let markersLayer = null;   // слой, на котором лежат метки
const markers = new Map(); // id места → метка Leaflet
let markerClickHandler = () => {}; // что делать при нажатии на метку (задаёт app.js)

/** Точка картинки (пиксели) → координаты Leaflet. */
export function pixelToLatLng(x, y) {
  return window.L.latLng(-y, x);
}

/** Координаты Leaflet → точка картинки (целые пиксели). */
export function latLngToPixel(latLng) {
  return { x: Math.round(latLng.lng), y: Math.round(-latLng.lat) };
}

/**
 * Загружает картинку, чтобы узнать её настоящие размеры.
 * Размеры не записаны в коде: заменили картинку — всё пересчитается само.
 */
function loadImageSize(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error(`Не удалось загрузить картинку карты: ${url}`));
    image.src = url;
  });
}

/**
 * Создаёт карту в элементе container.
 * handlers:
 *   onMarkerClick(id) — нажали на метку;
 *   onMapClick()      — нажали на пустое место карты (обычный режим);
 *   onCopy(ok)        — режим разметки: нажали «Скопировать» (ok — получилось ли).
 * debug — режим разметки (?debug=1).
 * Если картинки нет — выбрасывает ошибку (app.js покажет сообщение).
 */
export async function createMap(container, { debug, onMarkerClick, onMapClick, onCopy }) {
  imageSize = await loadImageSize(CONFIG.MAP_IMAGE);
  const L = window.L;
  imageBounds = L.latLngBounds([[-imageSize.height, 0], [0, imageSize.width]]);

  map = L.map(container, {
    crs: L.CRS.Simple,     // карта-картинка, а не земной шар
    minZoom: -10,          // временные границы, настоящие считаем ниже
    maxZoom: 10,
    zoomSnap: 0.25,        // масштаб меняется плавно, четвертями шага
    zoomDelta: 0.5,        // кнопки +/− меняют масштаб на полшага
    maxBoundsViscosity: 1, // за край карты не утянуть совсем
    zoomControl: false,
    attributionControl: false,
  });

  // Кнопки +/− справа внизу: сверху их закрывали бы фильтры.
  L.control.zoom({ position: 'bottomright', zoomInTitle: TEXTS.map.zoomIn, zoomOutTitle: TEXTS.map.zoomOut }).addTo(map);
  // Подпись в углу: откуда карта. Ссылок не ставим: внутри Telegram
  // обычная ссылка открылась бы вместо приложения.
  L.control.attribution({ position: 'bottomright', prefix: 'Leaflet' }).addTo(map);

  L.imageOverlay(CONFIG.MAP_IMAGE, imageBounds, { attribution: TEXTS.map.credit, alt: TEXTS.map.alt }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);

  updateZoomLimits();
  map.fitBounds(imageBounds, { animate: false }); // при открытии видна вся карта
  applyMaxBounds(); // после fitBounds: границы зависят от масштаба, а он появился только сейчас

  // Повернули телефон или Telegram изменил высоту окна — пересчитываем,
  // при каком масштабе видна вся карта.
  map.on('resize', () => {
    updateZoomLimits();
    applyMaxBounds();
  });
  // Границы зависят от масштаба (см. applyMaxBounds), поэтому пересчитываем.
  map.on('zoomend', applyMaxBounds);

  map.on('click', (event) => {
    if (debug) showDebugPopup(event.latlng, onCopy);
    else onMapClick();
  });

  markerClickHandler = onMarkerClick;
  return imageSize;
}

/**
 * Пределы масштаба: отдалить можно ровно до «вся карта на экране»,
 * приблизить — до CONFIG.MAP_MAX_ZOOM.
 */
function updateZoomLimits() {
  // getBoundsZoom учитывает текущие пределы, поэтому сначала их снимаем.
  map.options.minZoom = -10;
  map.options.maxZoom = 10;
  fitZoom = map.getBoundsZoom(imageBounds);
  map.setMaxZoom(Math.max(CONFIG.MAP_MAX_ZOOM, fitZoom));
  map.setMinZoom(fitZoom);
}

/**
 * Границы, за которые нельзя утащить карту (maxBounds).
 * Обычно это сама картинка. Но когда снизу открыта карточка места, она
 * закрывает нижнюю часть экрана. Тогда разрешаем поднять карту выше ровно
 * на высоту карточки — чтобы нижние метки можно было увидеть над карточкой.
 */
function applyMaxBounds() {
  if (!map) return;
  // Пиксели экрана → единицы карты: при масштабе z одна единица = 2^z пикселей.
  const extra = bottomInsetPx / Math.pow(2, map.getZoom());
  const south = imageBounds.getSouth() - extra;
  map.setMaxBounds(window.L.latLngBounds(
    [south, imageBounds.getWest()],
    [imageBounds.getNorth(), imageBounds.getEast()],
  ));
}

/** Сколько пикселей снизу закрыто карточкой (0 — карточка закрыта). */
export function setBottomInset(px) {
  bottomInsetPx = px;
  applyMaxBounds();
}

/** Пересчитать размер карты (после того как её снова показали). */
export function refreshSize() {
  if (map) map.invalidateSize();
}

// -----------------------------------------------------------------------------
// Метки
// -----------------------------------------------------------------------------

/** Создаёт метки для мест. Места без map_x/map_y пропускаем. */
export function setPlaces(places, { debug }) {
  if (!map) return;
  const L = window.L;
  markersLayer.clearLayers();
  markers.clear();

  for (const place of places) {
    if (place.mapX === null || place.mapY === null) continue;

    // Метка — это div 44×44 px (удобно попасть пальцем),
    // внутри — цветной кружок с номером места поменьше.
    const icon = L.divIcon({
      className: `marker marker--${place.group}`,
      html: `<span class="marker__dot" aria-hidden="true">${place.id}</span>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
    const marker = L.marker(pixelToLatLng(place.mapX, place.mapY), { icon, keyboard: true });
    marker.on('click', () => markerClickHandler(place.id));
    // Управление с клавиатуры: Tab — перейти к метке, Enter или пробел — открыть.
    // Сам Leaflet на Enter открывает только всплывающие подсказки, поэтому так.
    marker.on('keypress', (event) => {
      const key = event.originalEvent.key;
      if (key === 'Enter' || key === ' ') {
        event.originalEvent.preventDefault();
        markerClickHandler(place.id);
      }
    });

    // Режим разметки: рядом с меткой подпись с id и координатами.
    if (debug) {
      marker.bindTooltip(`id ${place.id} (${place.mapX}, ${place.mapY})`, {
        permanent: true, direction: 'right', offset: [14, 0], className: 'debug-tooltip',
      });
    }
    markers.set(place.id, marker);
  }
}

/**
 * Обновляет вид меток:
 *   visibleIds — какие метки показывать (фильтры);
 *   closedIds  — какие места сейчас закрыты (их метки приглушены);
 *   selectedId — выбранное место (метка крупнее);
 *   labels     — id → текст для программ чтения с экрана.
 */
export function updateMarkers({ visibleIds, closedIds, selectedId, labels }) {
  for (const [id, marker] of markers) {
    const shouldShow = visibleIds.has(id);
    if (shouldShow && !markersLayer.hasLayer(marker)) markersLayer.addLayer(marker);
    if (!shouldShow && markersLayer.hasLayer(marker)) markersLayer.removeLayer(marker);

    // Элемент метки существует, только пока метка на карте.
    const element = marker.getElement();
    if (!element) continue;
    element.classList.toggle('is-selected', id === selectedId);
    element.classList.toggle('is-closed', closedIds.has(id));
    element.setAttribute('aria-label', labels.get(id) || String(id));
    // Выбранная метка поверх остальных.
    marker.setZIndexOffset(id === selectedId ? 1000 : 0);
  }
}

/** Есть ли у места метка на карте. */
export function hasMarker(id) {
  return markers.has(id);
}

/** Поставить фокус клавиатуры на метку (после закрытия карточки). */
export function focusMarker(id) {
  const marker = markers.get(id);
  const element = marker ? marker.getElement() : null;
  if (element) element.focus({ preventScroll: true });
}

/**
 * Показать метку в видимой части карты (над карточкой).
 * zoomIn = true — ещё и приблизить (когда место выбрали в списке или по ссылке).
 * Если метку и так хорошо видно и приближать не нужно — карту не двигаем.
 */
export function showPlace(id, { zoomIn }) {
  const marker = markers.get(id);
  if (!map || !marker) return;
  const latLng = marker.getLatLng();

  if (!zoomIn && isComfortablyVisible(latLng)) return;

  let zoom = map.getZoom();
  if (zoomIn) zoom = Math.min(map.getMaxZoom(), Math.max(zoom, fitZoom + CONFIG.MAP_FOCUS_ZOOM_STEP));

  // Центр карты сдвигаем вниз на половину высоты карточки: тогда метка
  // окажется посередине той части экрана, которую карточка не закрывает.
  const markerPoint = map.project(latLng, zoom);
  const center = map.unproject(markerPoint.add([0, bottomInsetPx / 2]), zoom);
  map.setView(center, zoom, { animate: true });
}

/** Метка на экране, не у самого края и не под карточкой? */
function isComfortablyVisible(latLng) {
  const point = map.latLngToContainerPoint(latLng);
  const size = map.getSize();
  const margin = 40;
  return point.x > margin && point.x < size.x - margin
    && point.y > margin && point.y < size.y - bottomInsetPx - margin;
}

// -----------------------------------------------------------------------------
// Режим разметки (?debug=1)
// -----------------------------------------------------------------------------

/**
 * Нажали на карту в режиме разметки — показываем map_x и map_y этой точки
 * и кнопку «Скопировать». Копируем через табуляцию: при вставке в таблицу
 * числа сами разложатся в две соседние ячейки (map_x и map_y).
 */
function showDebugPopup(latLng, onCopy) {
  const { x, y } = latLngToPixel(latLng);
  const inside = x >= 0 && y >= 0 && x <= imageSize.width && y <= imageSize.height;

  const content = el('div', { className: 'debug-popup' }, [
    el('strong', { text: TEXTS.debug.coords(x, y) }),
  ]);
  if (inside) {
    content.append(
      el('button', {
        className: 'button button--small',
        text: TEXTS.debug.copy,
        attrs: { type: 'button' },
        onClick: async () => onCopy(await copyText(`${x}\t${y}`)),
      }),
      el('small', { text: TEXTS.debug.copyHint }),
    );
  } else {
    content.append(el('small', { text: TEXTS.debug.outside }));
  }

  window.L.popup({ autoPan: true, maxWidth: 220 }).setLatLng(latLng).setContent(content).openOn(map);
}
