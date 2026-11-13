// map.js — карта кампуса на Leaflet.
//
// Основа карты — картинка media/map.jpg. В режиме L.CRS.Simple координаты — просто числа.
// В таблице map_x идёт вправо, map_y — вниз, а у Leaflet первая координата растёт вверх.
// Поэтому точка картинки (x, y) для Leaflet — это [-y, x].

import { CONFIG } from './config.js';

let map = null;
let bounds = null;     // прямоугольник картинки
let width = 0;         // размеры картинки в пикселях
let height = 0;
let fitZoom = 0;       // масштаб, при котором видна вся карта
let bottomInset = 0;   // сколько пикселей снизу закрывает карточка места
const markers = {};    // id места → метка

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Не загрузилась картинка карты ' + url));
    image.src = url;
  });
}

// Создаёт карту. Размеры картинки узнаём при загрузке, в коде их нет.
// debug — режим разметки (?debug=1): по нажатию показываем map_x и map_y.
export async function createMap(debug, onMapClick) {
  const image = await loadImage(CONFIG.mapImage);
  width = image.naturalWidth;
  height = image.naturalHeight;
  bounds = L.latLngBounds([-height, 0], [0, width]);

  map = L.map('map', {
    crs: L.CRS.Simple,
    zoomSnap: 0.25,
    zoomDelta: 0.5,
    maxBoundsViscosity: 1, // за край карты не утянуть
    zoomControl: false,
    attributionControl: false,
  });
  // Кнопки +/− и подпись — справа внизу, сверху их закрывали бы фильтры.
  L.control.zoom({ position: 'bottomright', zoomInTitle: 'Приблизить', zoomOutTitle: 'Отдалить' }).addTo(map);
  L.control.attribution({ position: 'bottomright', prefix: 'Leaflet' }).addTo(map);
  L.imageOverlay(CONFIG.mapImage, bounds, { attribution: 'Карта: mai-sten.online', alt: 'Схема кампуса МАИ' }).addTo(map);

  updateZoomLimits();
  map.fitBounds(bounds, { animate: false });
  updateMaxBounds();

  // Повернули телефон или изменилась высота окна — пересчитываем масштаб.
  map.on('resize', () => {
    updateZoomLimits();
    updateMaxBounds();
  });
  map.on('zoomend', updateMaxBounds);
  map.on('click', (event) => {
    if (debug) showCoordinates(event.latlng);
    else onMapClick();
  });
}

// Отдалить можно до «вся карта на экране», приблизить — до CONFIG.maxZoom.
function updateZoomLimits() {
  map.options.minZoom = -10; // снимаем старые пределы, иначе getBoundsZoom их учтёт
  map.options.maxZoom = 10;
  fitZoom = map.getBoundsZoom(bounds);
  map.setMaxZoom(Math.max(CONFIG.maxZoom, fitZoom));
  map.setMinZoom(fitZoom);
}

// Карту нельзя утащить за край картинки. Но когда открыта карточка, она закрывает
// низ экрана — тогда разрешаем поднять карту на высоту карточки.
function updateMaxBounds() {
  const extra = bottomInset / Math.pow(2, map.getZoom()); // пиксели экрана → единицы карты
  map.setMaxBounds([[-height - extra, 0], [0, width]]);
}

export function setBottomInset(px) {
  bottomInset = px;
  if (map) updateMaxBounds();
}

// Пересчитать размер карты (после того как её снова показали).
export function refreshSize() {
  if (map) map.invalidateSize();
}

// Ставит метки мест. Места без map_x/map_y пропускаем.
export function addMarkers(places, debug, onClick) {
  for (const place of places) {
    if (place.mapX === null) continue;
    // Метка — область 44×44 px (легко попасть пальцем), внутри кружок с номером.
    const icon = L.divIcon({
      className: 'marker marker--' + place.group,
      html: `<span class="marker__dot" aria-hidden="true">${place.id}</span>`,
      iconSize: [44, 44],
    });
    const marker = L.marker([-place.mapY, place.mapX], { icon });
    marker.on('click', () => onClick(place.id));
    // С клавиатуры: Tab — перейти к метке, Enter — открыть.
    marker.on('keypress', (event) => {
      if (event.originalEvent.key === 'Enter') onClick(place.id);
    });
    if (debug) {
      marker.bindTooltip(`id ${place.id} (${place.mapX}, ${place.mapY})`, { permanent: true, direction: 'right', offset: [14, 0] });
    }
    markers[place.id] = marker;
  }
}

// Показывает или прячет метку и меняет её вид: закрыто — бледная, выбрана — крупнее.
export function updateMarker(id, show, closed, selected, label) {
  const marker = markers[id];
  if (!marker) return;
  if (show) marker.addTo(map);
  else marker.remove();

  const element = marker.getElement();
  if (!element) return;
  element.classList.toggle('is-closed', closed);
  element.classList.toggle('is-selected', selected);
  element.setAttribute('aria-label', label);
  marker.setZIndexOffset(selected ? 1000 : 0);
}

// Показать метку над карточкой. zoomIn — ещё и приблизить (из списка или по ссылке).
export function showPlace(id, zoomIn) {
  const marker = markers[id];
  if (!marker) return;

  // Метку и так хорошо видно — карту не двигаем.
  const point = map.latLngToContainerPoint(marker.getLatLng());
  const size = map.getSize();
  const visible = point.x > 40 && point.x < size.x - 40 && point.y > 40 && point.y < size.y - bottomInset - 40;
  if (visible && !zoomIn) return;

  let zoom = map.getZoom();
  if (zoomIn) zoom = Math.min(map.getMaxZoom(), Math.max(zoom, fitZoom + 1));
  // Сдвигаем центр вниз на половину карточки: метка окажется посередине видимой части.
  const center = map.project(marker.getLatLng(), zoom).add([0, bottomInset / 2]);
  map.setView(map.unproject(center, zoom), zoom);
}

// Режим разметки: показываем map_x и map_y точки и кнопку «Скопировать».
// Копируем через табуляцию — в таблице числа сами встанут в две соседние ячейки.
function showCoordinates(latlng) {
  const x = Math.round(latlng.lng);
  const y = Math.round(-latlng.lat);
  let html = `<b>map_x: ${x}, map_y: ${y}</b><br>`;
  if (x < 0 || y < 0 || x > width || y > height) {
    html += '<small>Эта точка за краем картинки</small>';
  } else {
    html += '<button type="button" class="button button--small" id="copy-button">Скопировать</button>';
    html += '<br><small>Вставится в таблицу сразу в две ячейки</small>';
  }
  L.popup().setLatLng(latlng).setContent(html).openOn(map);

  const button = document.getElementById('copy-button');
  if (!button) return;
  button.onclick = async () => {
    try {
      await navigator.clipboard.writeText(x + '\t' + y);
      button.textContent = 'Скопировано';
    } catch (error) {
      button.textContent = 'Не вышло, перепишите вручную';
    }
  };
}
