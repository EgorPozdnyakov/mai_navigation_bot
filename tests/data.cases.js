// =============================================================================
// Проверки для js/data.js (разбор и проверка строк CSV) и разбора ссылок
// из js/telegram.js. Как запускать — см. начало tests/hours.cases.js.
//
// env.readTextFile(путь) читает файл проекта (нужно для проверки демо-данных):
// в Node.js — с диска, в браузере — через fetch.
// =============================================================================

import {
  INVALID, cleanText, parseInteger, parseDecimal, parseChoice, parseYesNo, parseDate,
  parsePhotoList, latestDate, validateObjectRow, validateObjects, validateMenuRow,
  validateMenu, groupMenuByCategory, parseCsvText, findMissingColumns, OBJECT_COLUMNS,
} from '../js/data.js';
import { placeIdFromParam } from '../js/telegram.js';

/** Правильная строка objects.csv; в тестах меняем в ней отдельные поля. */
function goodRow(changes = {}) {
  return {
    id: '7', type: 'столовая', name: 'Тестовая столовая', building: 'ГУК', floor: '1',
    how_to_find: 'Направо', hours_weekdays: '09:00-17:00', hours_saturday: 'закрыто', break: '',
    payment: 'карта', lunch_price: '350', vegetarian: 'да', accessible: 'частично',
    accessibility_note: 'Есть пандус', lat: '55.81', lon: '37.50', map_x: '120', map_y: '45',
    seats: '', sockets: '', wifi: '', noise: '', photos: 'a.jpg, b.png', visible: 'да', updated: '01.11.2026',
    ...changes,
  };
}

/** Есть ли предупреждение, где упомянуты все кусочки текста. */
function hasWarning(warnings, ...pieces) {
  return warnings.some((warning) => pieces.every((piece) => warning.includes(piece)));
}

export const dataCases = [
  {
    name: 'Разбор ячеек: числа',
    run({ assert }) {
      assert.equal(cleanText('  текст '), 'текст');
      assert.equal(cleanText(undefined), '');
      assert.equal(parseInteger('350'), 350);
      assert.equal(parseInteger(' 350 '), 350);
      assert.equal(parseInteger(''), null);
      assert.equal(parseInteger('350 руб.'), INVALID);
      assert.equal(parseInteger('-5'), INVALID);
      assert.equal(parseDecimal('55.8112'), 55.8112);
      assert.equal(parseDecimal('55,8112'), 55.8112, 'запятая как в русском Excel');
      assert.equal(parseDecimal('abc'), INVALID);
    },
  },
  {
    name: 'Разбор ячеек: да/нет, варианты, даты',
    run({ assert }) {
      assert.equal(parseYesNo('да'), true);
      assert.equal(parseYesNo('Нет'), false);
      assert.equal(parseYesNo(''), null);
      assert.equal(parseYesNo('может быть'), INVALID);
      assert.equal(parseChoice('Частично', ['да', 'частично', 'нет']), 'частично');
      assert.equal(parseChoice('иногда', ['да', 'нет']), INVALID);
      assert.equal(parseDate('01.11.2026'), '01.11.2026');
      assert.equal(parseDate('31.02.2026'), INVALID, 'такой даты нет');
      assert.equal(parseDate('2026-11-01'), INVALID, 'нужен формат ДД.ММ.ГГГГ');
      assert.equal(parseDate(''), null);
      assert.equal(latestDate(['01.11.2026', null, '15.10.2026', INVALID, '03.11.2026']), '03.11.2026');
      assert.equal(latestDate([]), null);
    },
  },
  {
    name: 'Разбор ячеек: список фото',
    run({ assert }) {
      assert.deepEqual(parsePhotoList('a.jpg, b.PNG,c.webp'), { photos: ['a.jpg', 'b.PNG', 'c.webp'], bad: [] });
      assert.deepEqual(parsePhotoList(''), { photos: [], bad: [] });
      assert.deepEqual(parsePhotoList('../secret.jpg, фото.txt'), { photos: [], bad: ['../secret.jpg', 'фото.txt'] });
    },
  },
  {
    name: 'Правильная строка → объект места без предупреждений',
    run({ assert }) {
      const { place, hidden, warnings } = validateObjectRow(goodRow(), 2);
      assert.deepEqual(warnings, []);
      assert.equal(hidden, false);
      assert.equal(place.id, 7);
      assert.equal(place.group, 'food');
      assert.equal(place.lunchPrice, 350);
      assert.equal(place.vegetarian, true);
      assert.equal(place.accessible, 'частично');
      assert.equal(place.mapX, 120);
      assert.equal(place.mapY, 45);
      assert.equal(place.lat, 55.81);
      assert.deepEqual(place.photos, ['a.jpg', 'b.png']);
      assert.deepEqual(place.schedule.weekdays, { kind: 'open', from: 540, to: 1020 });
      assert.equal(place.seats, null, 'пустая ячейка → null');
    },
  },
  {
    name: 'Неверный id → строка пропущена, в предупреждении есть поле id',
    run({ assert }) {
      for (const badId of ['', 'abc', '0', '3.5']) {
        const { place, warnings } = validateObjectRow(goodRow({ id: badId }), 5);
        assert.equal(place, null, `id «${badId}»`);
        assert.ok(hasWarning(warnings, 'строка 5', 'поле id'), `предупреждение для id «${badId}»`);
      }
    },
  },
  {
    name: 'Нет map_x/map_y → на карту не ставим, но место остаётся',
    run({ assert }) {
      const { place, warnings } = validateObjectRow(goodRow({ map_y: '' }), 2);
      assert.equal(place.mapX, null);
      assert.equal(place.mapY, null);
      assert.ok(hasWarning(warnings, 'id=7', 'map_x/map_y'));

      const negative = validateObjectRow(goodRow({ map_x: '-10' }), 2);
      assert.equal(negative.place.mapX, null);
    },
  },
  {
    name: 'visible = нет → скрыто без предупреждений',
    run({ assert }) {
      const { place, hidden, warnings } = validateObjectRow(goodRow({ visible: 'нет' }), 2);
      assert.equal(place, null);
      assert.equal(hidden, true);
      assert.deepEqual(warnings, []);
      // Пустое visible — показываем (по умолчанию «да»).
      assert.equal(validateObjectRow(goodRow({ visible: '' }), 2).hidden, false);
    },
  },
  {
    name: 'Неверное поле → INVALID («нет данных») и предупреждение с id и полем',
    run({ assert }) {
      const { place, warnings } = validateObjectRow(goodRow({
        lunch_price: 'примерно 300', accessible: 'наверное', updated: 'вчера', type: 'ресторан',
      }), 2);
      assert.equal(place.lunchPrice, INVALID);
      assert.equal(place.accessible, INVALID);
      assert.equal(place.updated, INVALID);
      assert.equal(place.type, INVALID);
      assert.equal(place.group, 'other', 'неизвестный тип — серая метка');
      assert.ok(hasWarning(warnings, 'id=7', 'lunch_price'));
      assert.ok(hasWarning(warnings, 'id=7', 'accessible'));
      assert.ok(hasWarning(warnings, 'id=7', 'updated'));
      assert.ok(hasWarning(warnings, 'id=7', 'type'));
    },
  },
  {
    name: 'Часы «с 8 до 5» → kind invalid и предупреждение hours_weekdays',
    run({ assert }) {
      const { place, warnings } = validateObjectRow(goodRow({ hours_weekdays: 'с 8 до 5' }), 2);
      assert.deepEqual(place.schedule.weekdays, { kind: 'invalid' });
      assert.ok(hasWarning(warnings, 'id=7', 'hours_weekdays', 'с 8 до 5'));
    },
  },
  {
    name: 'lat/lon: ошибка → нет маршрута, пусто → без предупреждения',
    run({ assert }) {
      const broken = validateObjectRow(goodRow({ lat: 'север' }), 2);
      assert.equal(broken.place.lat, null);
      assert.equal(broken.place.lon, null);
      assert.ok(hasWarning(broken.warnings, 'lat/lon'));

      const empty = validateObjectRow(goodRow({ lat: '', lon: '' }), 2);
      assert.equal(empty.place.lat, null);
      assert.deepEqual(empty.warnings, []);
    },
  },
  {
    name: 'validateObjects: повтор id пропускаем, скрытые запоминаем, сортируем по id',
    run({ assert }) {
      const rows = [goodRow({ id: '9' }), goodRow({ id: '7' }), goodRow({ id: '9', name: 'Дубль' }), goodRow({ id: '4', visible: 'нет' })];
      const { places, hiddenIds, warnings } = validateObjects(rows);
      assert.deepEqual(places.map((place) => place.id), [7, 9]);
      assert.deepEqual(hiddenIds, [4]);
      assert.ok(hasWarning(warnings, 'строка 4', 'id=9', 'уже есть'));
    },
  },
  {
    name: 'Меню: неизвестная категория → «другое», порядок категорий',
    run({ assert }) {
      const bad = validateMenuRow({ object_id: '1', category: 'десерт', dish: 'Торт', price: '90', vegetarian: 'да', updated: '' }, 3);
      assert.equal(bad.dish.category, 'другое');
      assert.ok(hasWarning(bad.warnings, 'category', 'десерт'));

      const noName = validateMenuRow({ object_id: '1', category: 'первое', dish: '', price: '90' }, 4);
      assert.equal(noName.dish, null);

      const { dishesByPlace } = validateMenu([
        { object_id: '1', category: 'напитки', dish: 'Чай', price: '30', vegetarian: 'да', updated: '' },
        { object_id: '1', category: 'первое', dish: 'Суп', price: 'сто', vegetarian: 'да', updated: '' },
        { object_id: '2', category: 'первое', dish: 'Борщ', price: '120', vegetarian: 'нет', updated: '' },
      ]);
      const groups = groupMenuByCategory(dishesByPlace.get(1));
      assert.deepEqual(groups.map((group) => group.category), ['первое', 'напитки']);
      assert.equal(groups[0].dishes[0].price, INVALID);
      assert.equal(dishesByPlace.get(2).length, 1);
    },
  },
  {
    name: 'parseCsvText: точка с запятой, BOM от Excel, кавычки с запятой внутри',
    run({ assert }) {
      const text = '﻿id;Name;photos\n1;Буфет;"a.jpg,b.jpg"\n\n2;Кафе;\n';
      const { rows, columns, problems } = parseCsvText(text);
      assert.deepEqual(columns, ['id', 'name', 'photos']);
      assert.equal(rows.length, 2, 'пустая строка пропущена');
      assert.equal(rows[0].photos, 'a.jpg,b.jpg');
      assert.deepEqual(problems, []);
      assert.deepEqual(findMissingColumns(columns, ['id', 'map_x']), ['map_x']);
    },
  },
  {
    name: 'Демо-данные data/objects.csv: 4 места на карте, 1 скрыто, 1 ожидаемое предупреждение',
    async run({ assert, readTextFile }) {
      const { rows, columns, problems } = parseCsvText(await readTextFile('data/objects.csv'));
      assert.deepEqual(problems, []);
      assert.deepEqual(findMissingColumns(columns, OBJECT_COLUMNS), []);

      const { places, hiddenIds, warnings } = validateObjects(rows);
      assert.deepEqual(places.map((place) => place.id), [1, 2, 3, 4]);
      assert.deepEqual(hiddenIds, [5]);
      assert.equal(warnings.length, 1, warnings.join('\n'));
      assert.ok(hasWarning(warnings, 'id=2', 'hours_weekdays'));
      assert.ok(places.every((place) => place.mapX !== null), 'у всех демо-мест есть map_x/map_y');
    },
  },
  {
    name: 'Демо-данные data/menu.csv: у демо-столовой 10 блюд без ошибок',
    async run({ assert, readTextFile }) {
      const { rows, problems } = parseCsvText(await readTextFile('data/menu.csv'));
      assert.deepEqual(problems, []);
      const { dishesByPlace, warnings } = validateMenu(rows);
      assert.deepEqual(warnings, []);
      assert.equal(dishesByPlace.get(1).length, 10);
    },
  },
  {
    name: 'Ссылки для QR-кодов: place_3 и ?place=3',
    run({ assert }) {
      assert.equal(placeIdFromParam('place_3'), 3);
      assert.equal(placeIdFromParam('3'), 3);
      assert.equal(placeIdFromParam(' place_12 '), 12);
      assert.equal(placeIdFromParam('place_0'), null);
      assert.equal(placeIdFromParam('place_abc'), null);
      assert.equal(placeIdFromParam(''), null);
      assert.equal(placeIdFromParam(null), null);
      assert.equal(placeIdFromParam(undefined), null);
    },
  },
];
