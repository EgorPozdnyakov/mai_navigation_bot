// Проверки для js/hours.js и данных в js/places.js.
// Запуск: «node --test» в папке проекта или страница tests/tests.html в браузере.
// Каждая проверка — [название, функция].

import { toMinutes, formatTime, getMoscowTime, getStatus } from '../js/hours.js';
import { PLACES } from '../js/places.js';

// Сравнение через JSON: подходит и для чисел, и для объектов.
function eq(actual, expected, message = '') {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${message}\nполучили: ${a}\nожидали:  ${b}`);
}

// Статус столовой 09:00–17:00 в день недели (0 — вс, 1 — пн, …, 6 — сб) и время "ЧЧ:ММ".
const usual = { open: '9:00', close: '17:00' };
function status(weekday, time) {
  return getStatus(usual, { weekday, minutes: toMinutes(time) }).text;
}

export const cases = [
  ['Время: "8:30" ↔ 510 минут', () => {
    eq(toMinutes('8:30'), 510);
    eq(toMinutes('17:00'), 1020);
    eq(formatTime(510), '08:30');
    eq(formatTime(0), '00:00');
  }],

  ['Московское время, а не время телефона', () => {
    // Понедельник 9 ноября 2026, 07:00 UTC = 10:00 по Москве.
    eq(getMoscowTime(new Date('2026-11-09T07:00:00Z')), { weekday: 1, minutes: 600 });
    // Воскресенье 21:30 UTC — в Москве уже понедельник 00:30.
    eq(getMoscowTime(new Date('2026-11-08T21:30:00Z')), { weekday: 1, minutes: 30 });
  }],

  ['Будни', () => {
    eq(status(1, '10:00'), 'Открыто до 17:00');
    eq(status(1, '09:00'), 'Открыто до 17:00', 'в момент открытия уже открыто');
    eq(status(1, '08:00'), 'Закрыто, откроется в 09:00');
    eq(status(1, '17:00'), 'Закрыто, откроется завтра в 09:00', 'в момент закрытия уже закрыто');
    eq(getStatus(usual, { weekday: 3, minutes: 600 }).open, true);
  }],

  ['Пятница вечером и выходные', () => {
    eq(status(5, '18:00'), 'Закрыто, откроется в понедельник в 09:00');
    eq(status(6, '12:00'), 'Закрыто, откроется в понедельник в 09:00');
    eq(status(0, '12:00'), 'Закрыто, откроется завтра в 09:00');
    eq(getStatus(usual, { weekday: 6, minutes: 600 }).open, false);
  }],

  ['Данные в js/places.js заполнены правильно', () => {
    const ids = PLACES.map((place) => place.id);
    eq(new Set(ids).size, ids.length, 'id не повторяются');
    for (const place of PLACES) {
      const who = `столовая id=${place.id}`;
      eq(/^\d{1,2}:\d{2}$/.test(place.open) && /^\d{1,2}:\d{2}$/.test(place.close), true, `${who}: время в формате 9:00`);
      eq(toMinutes(place.open) < toMinutes(place.close), true, `${who}: открытие раньше закрытия`);
      eq(typeof place.price === 'number' && typeof place.accessible === 'boolean', true, `${who}: price и accessible`);
      eq(place.x >= 0 && place.x <= 800 && place.y >= 0 && place.y <= 700, true, `${who}: метка внутри карты 800×700`);
      eq(Array.isArray(place.photos) && Array.isArray(place.menu), true, `${who}: photos и menu — списки`);
    }
  }],
];
