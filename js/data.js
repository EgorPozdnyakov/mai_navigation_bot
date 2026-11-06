// =============================================================================
// data.js — загрузка и проверка данных из CSV.
//
// Остальной код не знает, откуда пришли данные: из файла рядом с сайтом
// или из опубликованной Google-таблицы. Он вызывает loadAllData() и получает
// готовые, проверенные объекты. Источник задаётся в config.js (DATA_SOURCES).
//
// Главное правило: кривые данные не должны ломать приложение.
//  - строку с неверным id пропускаем;
//  - место без map_x/map_y не ставим на карту (но оставляем в списке);
//  - неверное поле показываем как «нет данных»;
//  - visible = нет — место не показываем вообще;
//  - обо всех проблемах пишем предупреждение в консоль браузера (F12 → Console)
//    с id объекта и названием поля, чтобы было легко найти и исправить.
//
// Функции проверки «чистые» (не трогают страницу), их проверяют тесты.
// Для разбора CSV используется библиотека Papa Parse (vendor/papaparse).
// =============================================================================

import { CONFIG } from './config.js';
import { TEXTS } from './texts.js';
import { parseDayHours, parseBreak } from './hours.js';

// Особое значение «в ячейке что-то написано, но понять не смогли».
// Отличаем его от null («ячейка пустая»):
//   null    → поле в карточке не показываем;
//   INVALID → показываем «нет данных» (и пишем предупреждение в консоль).
// Сравнивать так: if (value === INVALID) { … }
export const INVALID = Object.freeze({ invalid: true });

// Колонки, которые должны быть в objects.csv и menu.csv.
export const OBJECT_COLUMNS = [
  'id', 'type', 'name', 'building', 'floor', 'how_to_find', 'hours_weekdays', 'hours_saturday',
  'break', 'payment', 'lunch_price', 'vegetarian', 'accessible', 'accessibility_note', 'lat', 'lon',
  'map_x', 'map_y', 'seats', 'sockets', 'wifi', 'noise', 'photos', 'visible', 'updated',
];
export const MENU_COLUMNS = ['object_id', 'category', 'dish', 'price', 'vegetarian', 'updated'];

// -----------------------------------------------------------------------------
// Разбор отдельных ячеек. Каждая функция возвращает:
//   нормальное значение, null (пусто) или INVALID (непонятно что).
// -----------------------------------------------------------------------------

/** Убирает пробелы по краям. undefined/null (нет такой колонки) → ''. */
export function cleanText(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

/** Текст или null, если ячейка пустая. */
export function parseText(value) {
  const text = cleanText(value);
  return text === '' ? null : text;
}

/** Целое число из одних цифр: "350" → 350. "350 руб." → INVALID. */
export function parseInteger(value) {
  const text = cleanText(value);
  if (text === '') return null;
  if (!/^\d+$/.test(text)) return INVALID;
  return Number(text);
}

/**
 * Дробное число: "55.8112" → 55.8112. Запятая тоже подходит ("55,8112"):
 * так пишет числа русский Excel.
 */
export function parseDecimal(value) {
  const text = cleanText(value).replace(',', '.');
  if (text === '') return null;
  if (!/^-?\d+(\.\d+)?$/.test(text)) return INVALID;
  return Number(text);
}

/** Одно из разрешённых слов (без учёта регистра): "Частично" → "частично". */
export function parseChoice(value, allowed) {
  const text = cleanText(value).toLowerCase();
  if (text === '') return null;
  return allowed.includes(text) ? text : INVALID;
}

/** "да" → true, "нет" → false. */
export function parseYesNo(value) {
  const choice = parseChoice(value, ['да', 'нет']);
  if (choice === 'да') return true;
  if (choice === 'нет') return false;
  return choice; // null или INVALID
}

/** Дата "ДД.ММ.ГГГГ". Возвращаем ту же строку, если дата настоящая. */
export function parseDate(value) {
  const text = cleanText(value);
  if (text === '') return null;
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(text);
  if (!match) return INVALID;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  // Проверяем, что такая дата существует (например, 31.02 — нет).
  const date = new Date(year, month - 1, day);
  const exists = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return exists ? text : INVALID;
}

/**
 * Список фото: "a.jpg, b.jpg" → { photos: ['a.jpg', 'b.jpg'], bad: [] }.
 * Имя файла — без папок, с расширением jpg, jpeg, png или webp.
 * Неправильные имена попадают в bad (о них предупредим и пропустим).
 */
export function parsePhotoList(value) {
  const names = cleanText(value).split(',').map((name) => name.trim()).filter((name) => name !== '');
  const photos = [];
  const bad = [];
  for (const name of names) {
    const looksLikeImage = /^[^\\/]+\.(jpe?g|png|webp)$/i.test(name) && !name.startsWith('.');
    if (looksLikeImage) photos.push(name);
    else bad.push(name);
  }
  return { photos, bad };
}

/** "01.11.2026" → "20261101": в таком виде даты удобно сравнивать как строки. */
function dateSortKey(date) {
  const [day, month, year] = date.split('.');
  return year + month + day;
}

/** Самая свежая дата из списка (пустые и неверные пропускаем) или null. */
export function latestDate(dates) {
  let latest = null;
  for (const date of dates) {
    if (typeof date !== 'string') continue; // null или INVALID
    if (latest === null || dateSortKey(date) > dateSortKey(latest)) latest = date;
  }
  return latest;
}

// -----------------------------------------------------------------------------
// Проверка строки objects.csv
// -----------------------------------------------------------------------------

/**
 * Превращает строку таблицы (объект «колонка → текст») в объект места.
 * rowNumber — номер строки в файле (для понятных предупреждений).
 * Возвращает { place, hidden, warnings }:
 *   place    — готовый объект места или null, если строку нельзя показывать;
 *   hidden   — true, если строка скрыта специально (visible = нет);
 *   warnings — список текстов-предупреждений.
 */
export function validateObjectRow(row, rowNumber) {
  const warnings = [];

  // 1. id — без него место нельзя ни найти, ни открыть по ссылке.
  const idText = cleanText(row.id);
  const id = parseInteger(idText);
  if (id === null || id === INVALID || id === 0) {
    warnings.push(`строка ${rowNumber}, поле id: неверное значение «${idText}» — строка пропущена`);
    return { place: null, hidden: false, warnings };
  }

  const name = cleanText(row.name);
  const who = name ? `объект id=${id} («${name}»)` : `объект id=${id}`;

  // Вспомогательная функция: если значение не разобрали — записываем
  // предупреждение с названием поля. Значение возвращаем дальше как есть.
  function check(field, value) {
    if (value === INVALID) {
      warnings.push(`${who}, поле ${field}: непонятное значение «${cleanText(row[field])}» — показываем «${TEXTS.card.noData}»`);
    }
    return value;
  }

  // 2. visible = нет — место специально скрыто, дальше не проверяем.
  const visible = check('visible', parseYesNo(row.visible));
  if (visible === false) return { place: null, hidden: true, warnings };

  if (name === '') warnings.push(`${who}, поле name: пусто — показываем «${TEXTS.card.unnamed}»`);

  // 3. Тип и группа (еда / коворкинг). Неизвестный тип — серая метка.
  const type = check('type', parseChoice(row.type, Object.keys(CONFIG.TYPE_GROUPS)));
  const group = typeof type === 'string' ? CONFIG.TYPE_GROUPS[type] : 'other';

  // 4. Часы работы.
  const schedule = {
    weekdays: parseDayHours(row.hours_weekdays),
    saturday: parseDayHours(row.hours_saturday),
    break: parseBreak(row.break),
  };
  const hourFields = [['hours_weekdays', schedule.weekdays], ['hours_saturday', schedule.saturday], ['break', schedule.break]];
  for (const [field, parsed] of hourFields) {
    if (parsed.kind === 'invalid') {
      warnings.push(`${who}, поле ${field}: непонятное время «${cleanText(row[field])}» (нужно "08:30-17:00" или "закрыто") — показываем «${TEXTS.card.noData}»`);
    }
  }

  // 5. Положение метки на картинке карты (в пикселях от левого верхнего угла).
  let mapX = parseDecimal(row.map_x);
  let mapY = parseDecimal(row.map_y);
  const mapOk = typeof mapX === 'number' && typeof mapY === 'number' && mapX >= 0 && mapY >= 0;
  if (!mapOk) {
    warnings.push(`${who}, поля map_x/map_y: нет правильных координат («${cleanText(row.map_x)}», «${cleanText(row.map_y)}») — на карте не показываем, только в списке`);
    mapX = null;
    mapY = null;
  }

  // 6. Координаты входа для маршрута. Нет обеих — просто прячем кнопку «Маршрут».
  let lat = parseDecimal(row.lat);
  let lon = parseDecimal(row.lon);
  const geoOk = typeof lat === 'number' && typeof lon === 'number' && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  if (!geoOk) {
    const somethingWritten = cleanText(row.lat) !== '' || cleanText(row.lon) !== '';
    if (somethingWritten) {
      warnings.push(`${who}, поля lat/lon: неверные координаты («${cleanText(row.lat)}», «${cleanText(row.lon)}») — кнопку «Маршрут» не показываем`);
    }
    lat = null;
    lon = null;
  }

  // 7. Фото.
  const photoList = parsePhotoList(row.photos);
  for (const badName of photoList.bad) {
    warnings.push(`${who}, поле photos: неверное имя файла «${badName}» — фото пропущено`);
  }

  // 8. Всё остальное.
  const place = {
    id,
    name: name || TEXTS.card.unnamed,
    type,
    group,
    building: parseText(row.building),
    floor: parseText(row.floor),
    howToFind: parseText(row.how_to_find),
    schedule,
    payment: parseText(row.payment),
    lunchPrice: check('lunch_price', parseInteger(row.lunch_price)),
    vegetarian: check('vegetarian', parseYesNo(row.vegetarian)),
    accessible: check('accessible', parseChoice(row.accessible, CONFIG.ALLOWED.accessible)),
    accessibilityNote: parseText(row.accessibility_note),
    lat,
    lon,
    mapX,
    mapY,
    seats: check('seats', parseInteger(row.seats)),
    sockets: check('sockets', parseChoice(row.sockets, CONFIG.ALLOWED.sockets)),
    wifi: check('wifi', parseYesNo(row.wifi)),
    noise: check('noise', parseChoice(row.noise, CONFIG.ALLOWED.noise)),
    photos: photoList.photos,
    updated: check('updated', parseDate(row.updated)),
  };
  return { place, hidden: false, warnings };
}

/**
 * Проверяет все строки objects.csv.
 * Возвращает { places, hiddenIds, warnings }. places отсортированы по id.
 */
export function validateObjects(rows) {
  const places = [];
  const hiddenIds = [];
  const warnings = [];
  const seenIds = new Set();

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // строка 1 в файле — заголовки колонок
    const result = validateObjectRow(row, rowNumber);
    warnings.push(...result.warnings);

    if (result.hidden) {
      hiddenIds.push(parseInteger(row.id));
      return;
    }
    if (!result.place) return;

    if (seenIds.has(result.place.id)) {
      warnings.push(`строка ${rowNumber}, поле id: id=${result.place.id} уже есть выше — строка пропущена`);
      return;
    }
    seenIds.add(result.place.id);
    places.push(result.place);
  });

  places.sort((a, b) => a.id - b.id);
  return { places, hiddenIds, warnings };
}

// -----------------------------------------------------------------------------
// Проверка menu.csv
// -----------------------------------------------------------------------------

/** Одна строка меню → { dish, warnings }. dish = null, если строку пропускаем. */
export function validateMenuRow(row, rowNumber) {
  const warnings = [];
  const objectId = parseInteger(row.object_id);
  const name = cleanText(row.dish);
  if (objectId === null || objectId === INVALID || name === '') {
    warnings.push(`меню, строка ${rowNumber}: нет правильного object_id или названия блюда (dish) — строка пропущена`);
    return { dish: null, warnings };
  }

  const who = `меню, объект id=${objectId}, блюдо «${name}»`;
  function check(field, value) {
    if (value === INVALID) {
      warnings.push(`${who}, поле ${field}: непонятное значение «${cleanText(row[field])}» — показываем «${TEXTS.card.noData}»`);
    }
    return value;
  }

  let category = parseChoice(row.category, CONFIG.MENU_CATEGORIES);
  if (typeof category !== 'string') {
    warnings.push(`${who}, поле category: неизвестная категория «${cleanText(row.category)}» — блюдо попадёт в «${CONFIG.MENU_OTHER_CATEGORY}»`);
    category = CONFIG.MENU_OTHER_CATEGORY;
  }

  const dish = {
    objectId,
    category,
    name,
    price: check('price', parseInteger(row.price)),
    vegetarian: check('vegetarian', parseYesNo(row.vegetarian)),
    updated: check('updated', parseDate(row.updated)),
  };
  return { dish, warnings };
}

/** Все строки меню → { dishesByPlace: Map(id места → [блюда]), warnings }. */
export function validateMenu(rows) {
  const dishesByPlace = new Map();
  const warnings = [];
  rows.forEach((row, index) => {
    const result = validateMenuRow(row, index + 2);
    warnings.push(...result.warnings);
    if (!result.dish) return;

    if (!dishesByPlace.has(result.dish.objectId)) dishesByPlace.set(result.dish.objectId, []);
    dishesByPlace.get(result.dish.objectId).push(result.dish);
  });
  return { dishesByPlace, warnings };
}

/**
 * Раскладывает блюда по категориям в порядке из config.js.
 * Возвращает [{ category: 'первое', dishes: [...] }, ...] — только непустые.
 */
export function groupMenuByCategory(dishes) {
  const order = [...CONFIG.MENU_CATEGORIES, CONFIG.MENU_OTHER_CATEGORY];
  return order
    .map((category) => ({ category, dishes: dishes.filter((dish) => dish.category === category) }))
    .filter((group) => group.dishes.length > 0);
}

// -----------------------------------------------------------------------------
// Чтение CSV
// -----------------------------------------------------------------------------

/**
 * Разбирает текст CSV с помощью Papa Parse.
 * Возвращает { rows, columns, problems }:
 *   rows     — массив строк, каждая — объект { id: '1', name: '…', … };
 *   columns  — названия колонок из первой строки файла;
 *   problems — ошибки формата (например, в строке не хватает ячеек).
 * Разделитель (запятая или точка с запятой) Papa Parse определяет сам.
 */
export function parseCsvText(text) {
  const Papa = globalThis.Papa;
  if (!Papa) throw new Error('Не загрузилась библиотека Papa Parse (vendor/papaparse/papaparse.min.js)');

  const result = Papa.parse(text, {
    header: true,               // первая строка — названия колонок
    skipEmptyLines: 'greedy',   // пропускать пустые строки (и строки из одних пробелов)
    // Названия колонок приводим к одному виду: без пробелов по краям
    // (и без невидимого символа BOM, который добавляет Excel) и маленькими буквами.
    transformHeader: (header) => header.trim().toLowerCase(),
  });
  const problems = result.errors.map((error) => {
    const where = typeof error.row === 'number' ? `строка ${error.row + 2}: ` : '';
    return where + error.message;
  });
  return { rows: result.data, columns: result.meta.fields || [], problems };
}

/** Каких обязательных колонок нет в файле. */
export function findMissingColumns(columns, required) {
  return required.filter((column) => !columns.includes(column));
}

/** Скачивает CSV по адресу и разбирает его. При ошибке сети — исключение. */
export async function loadCsv(url) {
  // cache: 'no-cache' — браузер каждый раз спрашивает сервер, не изменился ли
  // файл. Так новые данные появляются сразу, а не через полчаса.
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`${url}: сервер ответил ${response.status}`);
  return parseCsvText(await response.text());
}

/** Печатает предупреждения в консоль одной понятной группой. */
function printWarnings(fileName, warnings) {
  for (const warning of warnings) console.warn(`[данные ${fileName}] ${warning}`);
}

/**
 * Загружает всё: места и меню.
 * Если не загрузились места — выбрасывает ошибку (приложение покажет
 * «Не удалось загрузить данные» и кнопку «Повторить»).
 * Если не загрузилось только меню — работаем дальше, а в меню пишем, что
 * оно не загрузилось (menuFailed = true).
 */
export async function loadAllData() {
  const objectsCsv = await loadCsv(CONFIG.DATA_SOURCES.objects);
  printWarnings('objects', objectsCsv.problems);

  const missingObjectColumns = findMissingColumns(objectsCsv.columns, OBJECT_COLUMNS);
  if (missingObjectColumns.includes('id')) {
    throw new Error('В данных о местах нет колонки id — похоже, по ссылке не та таблица');
  }
  if (missingObjectColumns.length > 0) {
    console.warn(`[данные objects] нет колонок: ${missingObjectColumns.join(', ')}`);
  }

  const objects = validateObjects(objectsCsv.rows);
  printWarnings('objects', objects.warnings);
  if (objects.hiddenIds.length > 0) {
    console.info(`[данные objects] скрыты (visible = нет): id ${objects.hiddenIds.join(', ')}`);
  }

  let dishesByPlace = new Map();
  let menuFailed = false;
  try {
    const menuCsv = await loadCsv(CONFIG.DATA_SOURCES.menu);
    printWarnings('menu', menuCsv.problems);
    const missingMenuColumns = findMissingColumns(menuCsv.columns, MENU_COLUMNS);
    if (missingMenuColumns.length > 0) {
      console.warn(`[данные menu] нет колонок: ${missingMenuColumns.join(', ')}`);
    }
    const menu = validateMenu(menuCsv.rows);
    printWarnings('menu', menu.warnings);
    dishesByPlace = menu.dishesByPlace;
  } catch (error) {
    console.warn('[данные menu] меню не загрузилось:', error);
    menuFailed = true;
  }

  return { places: objects.places, dishesByPlace, menuFailed };
}
