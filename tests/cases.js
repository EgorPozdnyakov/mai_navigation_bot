// Проверки функций из js/data.js и js/hours.js.
// Запуск: «node --test» в папке проекта или страница tests/tests.html в браузере.
// Каждая проверка — [название, функция]. Функция получает read(путь) — чтение файла проекта.

import {
  BAD, toInt, toNumber, toChoice, toYesNo, toDate, latestDate, parsePhotos, parseTime, parseRange,
  parseDay, parseBreak, parsePlace, parsePlaces, parseDish, parseMenu, groupMenu, placeIdFromParam,
  parseCsv, OBJECT_COLUMNS,
} from '../js/data.js';
import { formatTime, getMoscowTime, getIntervals, getStatus } from '../js/hours.js';

// Сравнение через JSON: подходит и для чисел, и для объектов, и для массивов.
function eq(actual, expected, message = '') {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${message}\nполучили: ${a}\nожидали:  ${b}`);
}

// Правильная строка objects.csv; в проверках меняем отдельные поля.
function goodRow(changes = {}) {
  const row = {
    id: '7', type: 'столовая', name: 'Тестовая', building: 'ГУК', floor: '1', how_to_find: 'Направо',
    hours_weekdays: '09:00-17:00', hours_saturday: 'закрыто', break: '', payment: 'карта',
    lunch_price: '350', vegetarian: 'да', accessible: 'частично', accessibility_note: 'Есть пандус',
    lat: '55.81', lon: '37.50', map_x: '120', map_y: '45', seats: '', sockets: '', wifi: '', noise: '',
    photos: 'a.jpg, b.png', visible: 'да', updated: '01.11.2026',
  };
  return Object.assign(row, changes);
}

// Место только с часами работы — для проверок «открыто сейчас».
function hours(weekdays, saturday, breakText = '') {
  return { weekdays: parseDay(weekdays), saturday: parseDay(saturday), break: parseBreak(breakText) };
}

// Текст статуса в день недели (0 — вс, 1 — пн, …, 6 — сб) и время "ЧЧ:ММ".
function status(place, weekday, time) {
  return getStatus(place, { weekday, minutes: parseTime(time) }).text;
}

const usual = hours('09:00-17:00', '10:00-15:00');

export const cases = [
  ['Ячейки: числа', () => {
    eq(toInt('350'), 350);
    eq(toInt(' 350 '), 350);
    eq(toInt(''), null);
    eq(toInt(undefined), null);
    eq(toInt('350 руб.'), BAD);
    eq(toInt('-5'), BAD);
    eq(toNumber('55,8112'), 55.8112, 'запятая как в русском Excel');
    eq(toNumber('abc'), BAD);
  }],

  ['Ячейки: да/нет, варианты, даты', () => {
    eq(toYesNo('Да'), true);
    eq(toYesNo('нет'), false);
    eq(toYesNo(''), null);
    eq(toYesNo('может быть'), BAD);
    eq(toChoice('Частично', ['да', 'частично']), 'частично');
    eq(toChoice('иногда', ['да', 'нет']), BAD);
    eq(toDate('01.11.2026'), '01.11.2026');
    eq(toDate('31.02.2026'), BAD, 'такой даты нет');
    eq(toDate('2026-11-01'), BAD);
    eq(latestDate(['01.11.2026', null, '15.10.2026', BAD, '03.11.2026']), '03.11.2026');
    eq(latestDate([]), null);
  }],

  ['Ячейки: список фото', () => {
    eq(parsePhotos('a.jpg, b.PNG,c.webp'), { photos: ['a.jpg', 'b.PNG', 'c.webp'], bad: [] });
    eq(parsePhotos(''), { photos: [], bad: [] });
    eq(parsePhotos('../secret.jpg, фото.txt, .jpg'), { photos: [], bad: ['../secret.jpg', 'фото.txt', '.jpg'] });
  }],

  ['Часы: разбор времени и промежутков', () => {
    eq(parseTime('08:30'), 510);
    eq(parseTime('8:30'), 510);
    eq(parseTime('24:00'), 1440);
    eq(parseTime('24:30'), null);
    eq(parseTime('12:60'), null);
    eq(parseTime('восемь'), null);
    eq(parseRange('08:30 – 17:00'), { from: 510, to: 1020 });
    eq(parseRange('08:30—17:00'), { from: 510, to: 1020 });
    eq(parseRange('17:00-08:30'), null, 'конец раньше начала');
    eq(parseRange('08:30'), null);
    eq(parseDay('  Закрыто '), 'closed');
    eq(parseDay(''), null);
    eq(parseDay('с 8 до 5'), BAD);
    eq(parseBreak(''), null);
    eq(parseBreak('обед'), BAD);
    eq(formatTime(510), '08:30');
    eq(formatTime(0), '00:00');
  }],

  ['Московское время, а не время телефона', () => {
    // Понедельник 9 ноября 2026, 07:00 UTC = 10:00 по Москве.
    eq(getMoscowTime(new Date('2026-11-09T07:00:00Z')), { weekday: 1, minutes: 600 });
    // Воскресенье 21:30 UTC — в Москве уже понедельник 00:30.
    eq(getMoscowTime(new Date('2026-11-08T21:30:00Z')), { weekday: 1, minutes: 30 });
  }],

  ['Перерыв делит день на две части', () => {
    eq(getIntervals(hours('09:00-17:00', ''), 1), [{ from: 540, to: 1020 }]);
    eq(getIntervals(hours('09:00-17:00', '', '13:00-13:30'), 1), [{ from: 540, to: 780 }, { from: 810, to: 1020 }]);
    eq(getIntervals(hours('09:00-17:00', '', '18:00-18:30'), 1), [{ from: 540, to: 1020 }]);
    eq(getIntervals(hours('09:00-17:00', ''), 0), [], 'воскресенье — выходной');
    eq(getIntervals(hours('с 8 до 5', ''), 1), null);
    eq(getIntervals(hours('09:00-17:00', '', 'обед'), 1), null);
  }],

  ['Открыто / закрыто в будни', () => {
    eq(status(usual, 1, '10:00'), 'Открыто до 17:00');
    eq(status(usual, 1, '09:00'), 'Открыто до 17:00', 'в момент открытия уже открыто');
    eq(status(usual, 1, '08:00'), 'Закрыто, откроется в 09:00');
    eq(status(usual, 1, '17:00'), 'Закрыто, откроется завтра в 09:00', 'в момент закрытия уже закрыто');
    eq(status(usual, 5, '18:00'), 'Закрыто, откроется завтра в 10:00', 'в субботу своё расписание');
  }],

  ['Выходные', () => {
    eq(status(usual, 6, '12:00'), 'Открыто до 15:00');
    eq(status(usual, 6, '16:00'), 'Закрыто, откроется в понедельник в 09:00');
    eq(status(usual, 0, '12:00'), 'Закрыто, откроется завтра в 09:00');
    const noSaturday = hours('08:30-17:00', 'закрыто');
    eq(status(noSaturday, 5, '20:00'), 'Закрыто, откроется в понедельник в 08:30');
  }],

  ['Перерыв', () => {
    const withBreak = hours('09:00-17:00', 'закрыто', '13:00-13:30');
    eq(status(withBreak, 1, '12:00'), 'Открыто до 13:00, потом перерыв');
    eq(status(withBreak, 1, '13:15'), 'Закрыто, откроется в 13:30');
    eq(status(withBreak, 1, '13:30'), 'Открыто до 17:00');
  }],

  ['Ошибки в часах → не обещаем лишнего', () => {
    const broken = hours('с 8 до 5', 'закрыто');
    eq(getStatus(broken, { weekday: 1, minutes: 600 }).state, 'unknown');
    eq(status(broken, 1, '10:00'), 'Часы работы неизвестны');
    eq(status(broken, 0, '10:00'), 'Закрыто', 'в воскресенье закрыто, но когда откроется — неизвестно');
    eq(status(hours('09:00-17:00', ''), 6, '12:00'), 'Часы работы неизвестны', 'пустая суббота');
    eq(status(hours('09:00-17:00', 'закрыто', 'обед'), 1, '12:00'), 'Часы работы неизвестны');
  }],

  ['Правильная строка → место без предупреждений', () => {
    const warnings = [];
    const place = parsePlace(goodRow(), 2, warnings);
    eq(warnings, []);
    eq(place.id, 7);
    eq(place.group, 'food');
    eq(place.lunchPrice, 350);
    eq(place.accessible, 'частично');
    eq([place.mapX, place.mapY, place.lat], [120, 45, 55.81]);
    eq(place.photos, ['a.jpg', 'b.png']);
    eq(place.weekdays, { from: 540, to: 1020 });
    eq(place.seats, null, 'пустая ячейка → null');
  }],

  ['Неверный id → строка пропущена', () => {
    for (const badId of ['', 'abc', '0', '3.5']) {
      const warnings = [];
      eq(parsePlace(goodRow({ id: badId }), 5, warnings), null, `id «${badId}»`);
      eq(warnings[0].includes('строка 5, поле id'), true);
    }
  }],

  ['Ошибки в ячейках → «нет данных» и предупреждение с id и полем', () => {
    const warnings = [];
    const place = parsePlace(goodRow({ lunch_price: 'примерно 300', type: 'ресторан', hours_weekdays: 'с 8 до 5' }), 2, warnings);
    eq(place.lunchPrice, BAD);
    eq(place.type, BAD);
    eq(place.group, 'other', 'неизвестный тип — серая метка');
    eq(place.weekdays, BAD);
    eq(warnings.length, 3);
    eq(warnings[0].includes('id=7') && warnings.some((w) => w.includes('hours_weekdays')), true);
  }],

  ['Нет map_x/map_y или lat/lon', () => {
    const warnings = [];
    const place = parsePlace(goodRow({ map_y: '', lat: 'север' }), 2, warnings);
    eq([place.mapX, place.mapY, place.lat, place.lon], [null, null, null, null]);
    eq(warnings.length, 2);
    const empty = [];
    parsePlace(goodRow({ lat: '', lon: '' }), 2, empty);
    eq(empty, [], 'пустые lat/lon — без предупреждения');
  }],

  ['visible = нет, повтор id, сортировка', () => {
    const rows = [goodRow({ id: '9' }), goodRow({ id: '7' }), goodRow({ id: '9', name: 'Дубль' }), goodRow({ id: '4', visible: 'нет' })];
    const result = parsePlaces(rows);
    eq(result.places.map((place) => place.id), [7, 9]);
    eq(result.hiddenIds, [4]);
    eq(result.warnings.length, 1);
    eq(result.warnings[0].includes('строка 4'), true);
  }],

  ['Меню: неизвестная категория, порядок категорий', () => {
    const warnings = [];
    eq(parseDish({ object_id: '1', category: 'десерт', dish: 'Торт', price: '90' }, 3, warnings).category, 'другое');
    eq(parseDish({ object_id: '1', category: 'первое', dish: '' }, 4, warnings), null);
    eq(warnings.length, 2);

    const { menu } = parseMenu([
      { object_id: '1', category: 'напитки', dish: 'Чай', price: '30' },
      { object_id: '1', category: 'Первое', dish: 'Суп', price: 'сто' },
      { object_id: '2', category: 'первое', dish: 'Борщ', price: '120' },
    ]);
    const groups = groupMenu(menu[1]);
    eq(groups.map((group) => group.category), ['первое', 'напитки']);
    eq(groups[0].dishes[0].price, BAD);
    eq(menu[2].length, 1);
  }],

  ['CSV: точка с запятой, BOM от Excel, запятая в кавычках', () => {
    const csv = parseCsv('﻿id;Name;photos\n1;Буфет;"a.jpg,b.jpg"\n\n2;Кафе;\n');
    eq(csv.columns, ['id', 'name', 'photos']);
    eq(csv.rows.length, 2, 'пустая строка пропущена');
    eq(csv.rows[0].photos, 'a.jpg,b.jpg');
    eq(csv.errors, []);
  }],

  ['Ссылки для QR-кодов: place_3 и ?place=3', () => {
    eq(placeIdFromParam('place_3'), 3);
    eq(placeIdFromParam('3'), 3);
    eq(placeIdFromParam(' place_12 '), 12);
    eq(placeIdFromParam('place_0'), null);
    eq(placeIdFromParam('place_abc'), null);
    eq(placeIdFromParam(null), null);
    eq(placeIdFromParam(undefined), null);
  }],

  ['Данные data/objects.csv: 9 столовых на значках общепита', async (read) => {
    const csv = parseCsv(await read('data/objects.csv'));
    eq(csv.errors, []);
    eq(OBJECT_COLUMNS.filter((column) => !csv.columns.includes(column)), [], 'все колонки на месте');
    const result = parsePlaces(csv.rows);
    eq(result.places.map((place) => place.id), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    eq(result.warnings, []);
    eq(result.places.every((place) => place.mapX !== null), true, 'у всех мест есть метка');
  }],

  ['Данные data/menu.csv читаются без ошибок', async (read) => {
    const csv = parseCsv(await read('data/menu.csv'));
    eq(csv.errors, []);
    eq(parseMenu(csv.rows).warnings, []);
  }],
];
