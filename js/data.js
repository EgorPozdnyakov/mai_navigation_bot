// data.js — загрузка и проверка таблиц objects.csv и menu.csv.
//
// Главное правило: ошибка в таблице не должна ломать приложение.
//   пустая ячейка        → null, поле в карточке не показываем;
//   непонятное значение  → BAD, в карточке пишем «нет данных»,
//                          а в консоль (F12 → Console) — предупреждение с id и полем.
// Функции здесь не трогают страницу, поэтому их легко проверять тестами.

import { CONFIG, TYPES, MENU_CATEGORIES } from './config.js';

export const BAD = 'нет данных';

export const OBJECT_COLUMNS = [
  'id', 'type', 'name', 'building', 'floor', 'how_to_find', 'hours_weekdays', 'hours_saturday',
  'break', 'payment', 'lunch_price', 'vegetarian', 'accessible', 'accessibility_note', 'lat', 'lon',
  'map_x', 'map_y', 'seats', 'sockets', 'wifi', 'noise', 'photos', 'visible', 'updated',
];
export const MENU_COLUMNS = ['object_id', 'category', 'dish', 'price', 'vegetarian', 'updated'];

// ---------- Разбор одной ячейки ----------

// Текст без пробелов по краям. Нет такой колонки (undefined) → ''.
export function clean(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

export function toText(value) {
  const text = clean(value);
  if (text === '') return null;
  return text;
}

// "350" → 350. Только цифры: "350 руб." → BAD.
export function toInt(value) {
  const text = clean(value);
  if (text === '') return null;
  if (!/^\d+$/.test(text)) return BAD;
  return Number(text);
}

// "55.81" → 55.81. Запятая тоже подходит ("55,81"): так пишет русский Excel.
export function toNumber(value) {
  const text = clean(value).replace(',', '.');
  if (text === '') return null;
  if (!/^-?\d+(\.\d+)?$/.test(text)) return BAD;
  return Number(text);
}

// Одно слово из списка allowed, без учёта регистра: "Частично" → "частично".
export function toChoice(value, allowed) {
  const text = clean(value).toLowerCase();
  if (text === '') return null;
  if (!allowed.includes(text)) return BAD;
  return text;
}

// "да" → true, "нет" → false.
export function toYesNo(value) {
  const choice = toChoice(value, ['да', 'нет']);
  if (choice === 'да') return true;
  if (choice === 'нет') return false;
  return choice; // null или BAD
}

// Дата "ДД.ММ.ГГГГ". Проверяем, что такой день есть (31.02 — нет).
export function toDate(value) {
  const text = clean(value);
  if (text === '') return null;
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(text);
  if (!match) return BAD;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const date = new Date(Number(match[3]), month - 1, day);
  if (date.getDate() !== day || date.getMonth() !== month - 1) return BAD;
  return text;
}

// "01.11.2026" → "20261101": в таком виде даты можно сравнивать как строки.
function dateKey(date) {
  return date.slice(6) + date.slice(3, 5) + date.slice(0, 2);
}

// Самая свежая дата из списка (null и BAD пропускаем).
export function latestDate(dates) {
  let latest = null;
  for (const date of dates) {
    if (date === null || date === BAD) continue;
    if (latest === null || dateKey(date) > dateKey(latest)) latest = date;
  }
  return latest;
}

// "a.jpg, b.png" → { photos: ['a.jpg', 'b.png'], bad: [] }.
// Имя файла без папок, расширение jpg, jpeg, png или webp.
export function parsePhotos(value) {
  const photos = [];
  const bad = [];
  for (let name of clean(value).split(',')) {
    name = name.trim();
    if (name === '') continue;
    if (/^[^\\/.][^\\/]*\.(jpe?g|png|webp)$/i.test(name)) photos.push(name);
    else bad.push(name);
  }
  return { photos, bad };
}

// ---------- Часы работы ----------
// Время храним числом минут от начала суток: 08:30 → 8 * 60 + 30 = 510.

// "08:30" → 510. Ошибка → null. "24:00" можно — это конец дня.
export function parseTime(text) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (minutes > 59 || hours > 24 || (hours === 24 && minutes > 0)) return null;
  return hours * 60 + minutes;
}

// "08:30-17:00" → { from: 510, to: 1020 }. Ошибка → null.
// Длинные тире (– —) тоже подходят: их ставит автозамена в таблицах.
// Работа «через полночь» (20:00-02:00) не поддерживается.
export function parseRange(text) {
  const parts = text.trim().split(/\s*[-–—]\s*/);
  if (parts.length !== 2) return null;
  const from = parseTime(parts[0]);
  const to = parseTime(parts[1]);
  if (from === null || to === null || from >= to) return null;
  return { from, to };
}

// Часы одного дня: null (пусто), 'closed' («закрыто»), { from, to } или BAD («с 8 до 5»).
export function parseDay(value) {
  const text = clean(value).toLowerCase();
  if (text === '') return null;
  if (text === 'закрыто') return 'closed';
  return parseRange(text) || BAD;
}

// Перерыв: null (нет перерыва), { from, to } или BAD.
export function parseBreak(value) {
  const text = clean(value);
  if (text === '') return null;
  return parseRange(text) || BAD;
}

// ---------- Строка objects.csv → место ----------

// row — строка таблицы { id: '1', name: '…', … }, line — её номер в файле.
// Предупреждения складываем в массив warnings.
// Возвращает объект места, { id, hidden: true } для visible = нет, или null, если строку пропускаем.
export function parsePlace(row, line, warnings) {
  const id = toInt(row.id);
  if (id === null || id === BAD || id === 0) {
    warnings.push(`строка ${line}, поле id: неверное значение «${clean(row.id)}» — строка пропущена`);
    return null;
  }
  if (toYesNo(row.visible) === false) return { id, hidden: true };

  const name = clean(row.name);
  const who = name ? `объект id=${id} («${name}»)` : `объект id=${id}`;
  if (name === '') warnings.push(`${who}, поле name: пусто`);

  // Разбирает поле и, если значение непонятное, пишет предупреждение.
  function get(field, parse, allowed) {
    const value = parse(row[field], allowed);
    if (value === BAD) warnings.push(`${who}, поле ${field}: непонятное значение «${clean(row[field])}»`);
    return value;
  }

  get('visible', toYesNo);
  const type = get('type', toChoice, Object.keys(TYPES));
  const group = TYPES[type] ? TYPES[type].group : 'other'; // неизвестный тип — серая метка

  // Положение метки на картинке (пиксели от левого верхнего угла).
  let mapX = toNumber(row.map_x);
  let mapY = toNumber(row.map_y);
  if (typeof mapX !== 'number' || typeof mapY !== 'number' || mapX < 0 || mapY < 0) {
    warnings.push(`${who}, поля map_x/map_y: нет правильных координат — на карте не показываем, только в списке`);
    mapX = null;
    mapY = null;
  }

  // Координаты входа для кнопки «Маршрут».
  let lat = toNumber(row.lat);
  let lon = toNumber(row.lon);
  if (typeof lat !== 'number' || typeof lon !== 'number' || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    if (clean(row.lat) !== '' || clean(row.lon) !== '') {
      warnings.push(`${who}, поля lat/lon: неверные координаты — кнопку «Маршрут» не показываем`);
    }
    lat = null;
    lon = null;
  }

  const photos = parsePhotos(row.photos);
  for (const badName of photos.bad) {
    warnings.push(`${who}, поле photos: неверное имя файла «${badName}» — фото пропущено`);
  }

  return {
    id,
    name: name || 'Без названия',
    type,
    group,
    building: toText(row.building),
    floor: toText(row.floor),
    howToFind: toText(row.how_to_find),
    weekdays: get('hours_weekdays', parseDay),
    saturday: get('hours_saturday', parseDay),
    break: get('break', parseBreak),
    payment: toText(row.payment),
    lunchPrice: get('lunch_price', toInt),
    vegetarian: get('vegetarian', toYesNo),
    accessible: get('accessible', toChoice, ['да', 'частично', 'нет']),
    accessibilityNote: toText(row.accessibility_note),
    lat,
    lon,
    mapX,
    mapY,
    seats: get('seats', toInt),
    sockets: get('sockets', toChoice, ['много', 'мало', 'нет']),
    wifi: get('wifi', toYesNo),
    noise: get('noise', toChoice, ['тихо', 'шумно']),
    photos: photos.photos,
    updated: get('updated', toDate),
  };
}

// Все строки objects.csv → { places, hiddenIds, warnings }. Места отсортированы по id.
export function parsePlaces(rows) {
  const places = [];
  const hiddenIds = [];
  const warnings = [];
  const usedIds = [];

  for (let i = 0; i < rows.length; i++) {
    const line = i + 2; // строка 1 в файле — названия колонок
    const place = parsePlace(rows[i], line, warnings);
    if (place === null) continue;
    if (place.hidden) {
      hiddenIds.push(place.id);
    } else if (usedIds.includes(place.id)) {
      warnings.push(`строка ${line}, поле id: id=${place.id} уже есть выше — строка пропущена`);
    } else {
      usedIds.push(place.id);
      places.push(place);
    }
  }
  places.sort((a, b) => a.id - b.id);
  return { places, hiddenIds, warnings };
}

// ---------- Меню ----------

// Строка menu.csv → блюдо или null, если строку пропускаем.
export function parseDish(row, line, warnings) {
  const placeId = toInt(row.object_id);
  const name = clean(row.dish);
  if (typeof placeId !== 'number' || name === '') {
    warnings.push(`меню, строка ${line}: нет правильного object_id или названия блюда — строка пропущена`);
    return null;
  }
  const who = `меню, объект id=${placeId}, блюдо «${name}»`;

  let category = clean(row.category).toLowerCase();
  if (!MENU_CATEGORIES[category]) {
    warnings.push(`${who}, поле category: неизвестная категория «${category}» — блюдо попадёт в «Другое»`);
    category = 'другое';
  }

  const dish = {
    placeId,
    category,
    name,
    price: toInt(row.price),
    vegetarian: toYesNo(row.vegetarian),
    updated: toDate(row.updated),
  };
  for (const field of ['price', 'vegetarian', 'updated']) {
    if (dish[field] === BAD) warnings.push(`${who}, поле ${field}: непонятное значение «${clean(row[field])}»`);
  }
  return dish;
}

// Все строки меню → { menu: { id места: [блюда] }, warnings }.
export function parseMenu(rows) {
  const menu = {};
  const warnings = [];
  for (let i = 0; i < rows.length; i++) {
    const dish = parseDish(rows[i], i + 2, warnings);
    if (dish === null) continue;
    if (!menu[dish.placeId]) menu[dish.placeId] = [];
    menu[dish.placeId].push(dish);
  }
  return { menu, warnings };
}

// Блюда → [{ category, title, dishes }] в порядке из MENU_CATEGORIES, только непустые.
export function groupMenu(dishes) {
  const groups = [];
  for (const category in MENU_CATEGORIES) {
    const inCategory = dishes.filter((dish) => dish.category === category);
    if (inCategory.length > 0) groups.push({ category, title: MENU_CATEGORIES[category], dishes: inCategory });
  }
  return groups;
}

// ---------- Ссылки на место (QR-коды) ----------

// "place_3" (Telegram, startapp=place_3) или "3" (браузер, ?place=3) → 3. Остальное → null.
export function placeIdFromParam(text) {
  const match = /^(place_)?(\d+)$/.exec(clean(text));
  if (!match || Number(match[2]) === 0) return null;
  return Number(match[2]);
}

// ---------- Чтение CSV ----------

// Текст CSV → { rows, columns, errors }. Papa Parse сам понимает и запятую,
// и точку с запятой (так сохраняет русский Excel).
export function parseCsv(text) {
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: 'greedy',
    // Названия колонок: без пробелов (и невидимого символа BOM от Excel), маленькими буквами.
    transformHeader: (header) => header.trim().toLowerCase(),
  });
  const errors = [];
  for (const error of result.errors) {
    if (typeof error.row === 'number') errors.push(`строка ${error.row + 2}: ${error.message}`);
    else errors.push(error.message);
  }
  return { rows: result.data, columns: result.meta.fields || [], errors };
}

async function loadCsv(url, name, columns) {
  // no-cache — браузер каждый раз спрашивает сервер, не поменялся ли файл.
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`${url}: сервер ответил ${response.status}`);
  const csv = parseCsv(await response.text());

  const missing = columns.filter((column) => !csv.columns.includes(column));
  if (missing.includes(columns[0])) throw new Error(`В таблице ${name} нет колонки ${columns[0]} — похоже, это не та таблица`);
  if (missing.length > 0) console.warn(`[${name}] нет колонок: ${missing.join(', ')}`);
  for (const error of csv.errors) console.warn(`[${name}] ${error}`);
  return csv.rows;
}

// Загружает места и меню. Не загрузились места — ошибка (покажем «Повторить»).
// Не загрузилось только меню — работаем дальше, menuFailed = true.
export async function loadData() {
  const objects = parsePlaces(await loadCsv(CONFIG.objectsUrl, 'objects', OBJECT_COLUMNS));
  for (const warning of objects.warnings) console.warn('[objects] ' + warning);
  if (objects.hiddenIds.length > 0) console.info('[objects] скрыты (visible = нет): id ' + objects.hiddenIds.join(', '));

  let menu = {};
  let menuFailed = false;
  try {
    const result = parseMenu(await loadCsv(CONFIG.menuUrl, 'menu', MENU_COLUMNS));
    for (const warning of result.warnings) console.warn('[menu] ' + warning);
    menu = result.menu;
  } catch (error) {
    console.warn('[menu] меню не загрузилось:', error);
    menuFailed = true;
  }
  return { places: objects.places, menu, menuFailed };
}
