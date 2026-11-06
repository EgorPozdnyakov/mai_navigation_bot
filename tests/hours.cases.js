// =============================================================================
// Проверки для js/hours.js (часы работы и «открыто сейчас»).
//
// Каждая проверка — объект { name, run }. run получает env.assert с тремя
// функциями: equal (равно), deepEqual (объекты/массивы равны), ok (истина).
// Запускают проверки два «запускателя»:
//   tests/node.test.js   — в Node.js:  node --test
//   tests/tests.html     — в браузере: http://localhost:8000/tests/tests.html
// =============================================================================

import {
  parseTime, parseTimeRange, parseDayHours, parseBreak, formatMinutes,
  getMoscowTime, getOpenIntervals, getOpenStatus, formatStatus,
} from '../js/hours.js';

// Дни недели — как в JavaScript: 0 — воскресенье, 1 — понедельник, …, 6 — суббота.
const SUN = 0, MON = 1, FRI = 5, SAT = 6;

/** Расписание из трёх ячеек таблицы: будни, суббота, перерыв. */
function makeSchedule(weekdays, saturday, breakText = '') {
  return { weekdays: parseDayHours(weekdays), saturday: parseDayHours(saturday), break: parseBreak(breakText) };
}

/** Момент «день недели + время по Москве», как его возвращает getMoscowTime. */
function at(weekday, time) {
  return { weekday, minutes: parseTime(time) };
}

/** Короткая запись: какой текст статуса будет у расписания в этот момент. */
function statusText(schedule, weekday, time) {
  return formatStatus(getOpenStatus(schedule, at(weekday, time)));
}

// Как у демо-столовой без перерыва: будни 09:00–17:00, суббота 10:00–15:00.
const usual = makeSchedule('09:00-17:00', '10:00-15:00');

export const hoursCases = [
  {
    name: 'parseTime: "08:30" → 510 минут, ошибки → null',
    run({ assert }) {
      assert.equal(parseTime('08:30'), 510);
      assert.equal(parseTime('8:30'), 510);
      assert.equal(parseTime('00:00'), 0);
      assert.equal(parseTime('24:00'), 1440);
      assert.equal(parseTime('24:30'), null);
      assert.equal(parseTime('12:60'), null);
      assert.equal(parseTime('8'), null);
      assert.equal(parseTime('восемь'), null);
    },
  },
  {
    name: 'parseTimeRange: тире, пробелы, неправильный порядок',
    run({ assert }) {
      assert.deepEqual(parseTimeRange('08:30-17:00'), { from: 510, to: 1020 });
      assert.deepEqual(parseTimeRange('08:30 – 17:00'), { from: 510, to: 1020 });
      assert.deepEqual(parseTimeRange('08:30—17:00'), { from: 510, to: 1020 });
      assert.equal(parseTimeRange('17:00-08:30'), null, 'конец раньше начала');
      assert.equal(parseTimeRange('09:00-09:00'), null, 'пустой промежуток');
      assert.equal(parseTimeRange('08:30'), null);
      assert.equal(parseTimeRange('08:30-12:00-13:00'), null);
    },
  },
  {
    name: 'parseDayHours: open / closed / empty / invalid',
    run({ assert }) {
      assert.deepEqual(parseDayHours('08:30-17:00'), { kind: 'open', from: 510, to: 1020 });
      assert.deepEqual(parseDayHours('закрыто'), { kind: 'closed' });
      assert.deepEqual(parseDayHours('  Закрыто '), { kind: 'closed' });
      assert.deepEqual(parseDayHours(''), { kind: 'empty' });
      assert.deepEqual(parseDayHours(undefined), { kind: 'empty' });
      assert.deepEqual(parseDayHours('с 8 до 5'), { kind: 'invalid' });
    },
  },
  {
    name: 'parseBreak: пусто — перерыва нет',
    run({ assert }) {
      assert.deepEqual(parseBreak(''), { kind: 'none' });
      assert.deepEqual(parseBreak('13:00-13:30'), { kind: 'break', from: 780, to: 810 });
      assert.deepEqual(parseBreak('обед'), { kind: 'invalid' });
    },
  },
  {
    name: 'formatMinutes: 510 → "08:30"',
    run({ assert }) {
      assert.equal(formatMinutes(510), '08:30');
      assert.equal(formatMinutes(0), '00:00');
      assert.equal(formatMinutes(1440), '24:00');
    },
  },
  {
    name: 'getMoscowTime: время по Москве, а не по часам устройства',
    run({ assert }) {
      // 9 ноября 2026, понедельник, 07:00 по Гринвичу (UTC) = 10:00 по Москве (UTC+3).
      assert.deepEqual(getMoscowTime(new Date('2026-11-09T07:00:00Z')), { weekday: MON, minutes: 600 });
      // Воскресенье 21:30 UTC — в Москве уже понедельник 00:30.
      assert.deepEqual(getMoscowTime(new Date('2026-11-08T21:30:00Z')), { weekday: MON, minutes: 30 });
      // Суббота 20:59 UTC = суббота 23:59 по Москве.
      assert.deepEqual(getMoscowTime(new Date('2026-11-14T20:59:00Z')), { weekday: SAT, minutes: 1439 });
    },
  },
  {
    name: 'getOpenIntervals: перерыв делит день на две части',
    run({ assert }) {
      const day = parseDayHours('09:00-17:00');
      assert.deepEqual(getOpenIntervals(day, parseBreak('')), [{ from: 540, to: 1020 }]);
      assert.deepEqual(getOpenIntervals(day, parseBreak('13:00-13:30')), [{ from: 540, to: 780 }, { from: 810, to: 1020 }]);
      assert.deepEqual(getOpenIntervals(day, parseBreak('18:00-18:30')), [{ from: 540, to: 1020 }], 'перерыв после закрытия не мешает');
      assert.deepEqual(getOpenIntervals(parseDayHours('закрыто'), parseBreak('')), []);
      assert.equal(getOpenIntervals(parseDayHours('с 8 до 5'), parseBreak('')), null);
      assert.equal(getOpenIntervals(day, parseBreak('обед')), null);
    },
  },
  {
    name: 'Будни: открыто днём, закрыто утром и вечером',
    run({ assert }) {
      assert.equal(statusText(usual, MON, '10:00'), 'Открыто до 17:00');
      assert.equal(statusText(usual, MON, '09:00'), 'Открыто до 17:00', 'ровно в момент открытия уже открыто');
      assert.equal(statusText(usual, MON, '16:59'), 'Открыто до 17:00');
      assert.equal(statusText(usual, MON, '08:00'), 'Закрыто, откроется в 09:00');
      assert.equal(statusText(usual, MON, '17:00'), 'Закрыто, откроется завтра в 09:00', 'ровно в момент закрытия уже закрыто');
    },
  },
  {
    name: 'Пятница вечером → откроется завтра (в субботу) по субботнему расписанию',
    run({ assert }) {
      assert.equal(statusText(usual, FRI, '18:00'), 'Закрыто, откроется завтра в 10:00');
    },
  },
  {
    name: 'Суббота и воскресенье: воскресенье по умолчанию выходной',
    run({ assert }) {
      assert.equal(statusText(usual, SAT, '12:00'), 'Открыто до 15:00');
      assert.equal(statusText(usual, SAT, '16:00'), 'Закрыто, откроется в понедельник в 09:00');
      assert.equal(statusText(usual, SUN, '12:00'), 'Закрыто, откроется завтра в 09:00');
    },
  },
  {
    name: 'Суббота «закрыто»: после пятницы откроется в понедельник',
    run({ assert }) {
      const noSaturday = makeSchedule('08:30-17:00', 'закрыто');
      assert.equal(statusText(noSaturday, FRI, '20:00'), 'Закрыто, откроется в понедельник в 08:30');
      assert.equal(statusText(noSaturday, SAT, '12:00'), 'Закрыто, откроется в понедельник в 08:30');
    },
  },
  {
    name: 'Перерыв: до него «потом перерыв», во время — «откроется в …»',
    run({ assert }) {
      const withBreak = makeSchedule('09:00-17:00', 'закрыто', '13:00-13:30');
      assert.equal(statusText(withBreak, MON, '12:00'), 'Открыто до 13:00, потом перерыв');
      assert.equal(statusText(withBreak, MON, '13:00'), 'Закрыто, откроется в 13:30');
      assert.equal(statusText(withBreak, MON, '13:15'), 'Закрыто, откроется в 13:30');
      assert.equal(statusText(withBreak, MON, '13:30'), 'Открыто до 17:00');
    },
  },
  {
    name: 'Ошибка в часах («с 8 до 5») → «Часы работы неизвестны»',
    run({ assert }) {
      const broken = makeSchedule('с 8 до 5', 'закрыто');
      assert.equal(getOpenStatus(broken, at(MON, '10:00')).state, 'unknown');
      assert.equal(statusText(broken, MON, '10:00'), 'Часы работы неизвестны');
      // В воскресенье точно закрыто, но когда откроется — не знаем.
      assert.equal(statusText(broken, SUN, '10:00'), 'Закрыто');
    },
  },
  {
    name: 'Пустая ячейка субботы → в субботу статус неизвестен',
    run({ assert }) {
      const noSaturdayData = makeSchedule('09:00-17:00', '');
      assert.equal(statusText(noSaturdayData, SAT, '12:00'), 'Часы работы неизвестны');
      assert.equal(statusText(noSaturdayData, MON, '12:00'), 'Открыто до 17:00');
    },
  },
  {
    name: 'Ошибка в перерыве → статус неизвестен (не обещаем лишнего)',
    run({ assert }) {
      const brokenBreak = makeSchedule('09:00-17:00', 'закрыто', 'обед');
      assert.equal(statusText(brokenBreak, MON, '12:00'), 'Часы работы неизвестны');
    },
  },
];
