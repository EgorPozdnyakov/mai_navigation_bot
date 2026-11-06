// =============================================================================
// hours.js — часы работы и «открыто сейчас».
//
// Здесь только «чистые» функции: они получают данные на вход и возвращают
// результат, ничего не меняя вокруг и не трогая страницу. Поэтому их легко
// проверять тестами: подали время «понедельник 10:00» — проверили ответ.
//
// Время внутри хранится как число минут от начала суток:
//   08:30 → 8 * 60 + 30 = 510,   17:00 → 1020.
// С числами проще сравнивать: «сейчас 600, открыто с 510 до 1020 → открыто».
// =============================================================================

import { CONFIG } from './config.js';
import { TEXTS } from './texts.js';

// -----------------------------------------------------------------------------
// Разбор текста из таблицы
// -----------------------------------------------------------------------------

/**
 * "08:30" → 510 (минут от начала суток). Если формат неверный — null.
 * Разрешаем и "8:30". "24:00" разрешено как конец рабочего дня.
 */
export function parseTime(text) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(text).trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (minutes > 59) return null;
  if (hours > 24 || (hours === 24 && minutes > 0)) return null;
  return hours * 60 + minutes;
}

/**
 * "08:30-17:00" → { from: 510, to: 1020 }. Если формат неверный — null.
 * Разрешаем пробелы вокруг тире и длинные тире (– —): их часто ставит
 * автозамена в Excel и Google Таблицах.
 * Работа «через полночь» (например, 20:00-02:00) не поддерживается.
 */
export function parseTimeRange(text) {
  const parts = String(text).trim().split(/\s*[-–—]\s*/);
  if (parts.length !== 2) return null;

  const from = parseTime(parts[0]);
  const to = parseTime(parts[1]);
  if (from === null || to === null) return null;
  if (from >= to) return null;
  return { from, to };
}

/**
 * Часы работы за один день (колонки hours_weekdays и hours_saturday).
 * Возвращает объект с полем kind («вид»):
 *   { kind: 'open', from, to } — работает в эти часы;
 *   { kind: 'closed' }         — в таблице написано «закрыто»;
 *   { kind: 'empty' }          — ячейка пустая (данных нет);
 *   { kind: 'invalid' }        — что-то написано, но непонятно что («с 8 до 5»).
 */
export function parseDayHours(text) {
  const value = String(text ?? '').trim().toLowerCase();
  if (value === '') return { kind: 'empty' };
  if (value === 'закрыто') return { kind: 'closed' };

  const range = parseTimeRange(value);
  if (range === null) return { kind: 'invalid' };
  return { kind: 'open', from: range.from, to: range.to };
}

/**
 * Перерыв (колонка break). Перерыв один и действует во все рабочие дни.
 *   { kind: 'none' }            — перерыва нет (пустая ячейка);
 *   { kind: 'break', from, to } — перерыв в эти часы;
 *   { kind: 'invalid' }         — непонятная запись.
 */
export function parseBreak(text) {
  const value = String(text ?? '').trim();
  if (value === '') return { kind: 'none' };

  const range = parseTimeRange(value);
  if (range === null) return { kind: 'invalid' };
  return { kind: 'break', from: range.from, to: range.to };
}

/** 510 → "08:30". */
export function formatMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** { kind: 'open', from: 510, to: 1020 } → "08:30–17:00". */
export function formatRange(range) {
  return `${formatMinutes(range.from)}–${formatMinutes(range.to)}`;
}

// -----------------------------------------------------------------------------
// Московское время
// -----------------------------------------------------------------------------

// Intl.DateTimeFormat умеет показывать время в любом часовом поясе.
// Создаём его один раз: это дорогая операция, а вызывать будем часто.
// Язык 'en-US' выбран только ради коротких английских названий дней
// (Mon, Tue…), которые легко превратить в номер дня.
const moscowFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: CONFIG.TIME_ZONE,
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const WEEKDAY_NUMBERS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/**
 * Какой сейчас день недели и сколько минут прошло с полуночи — по Москве.
 * date — момент времени (по умолчанию «сейчас»). В тестах передаём своё время.
 * Возвращает { weekday: 0..6 (0 — воскресенье), minutes: 0..1439 }.
 */
export function getMoscowTime(date = new Date()) {
  const parts = {};
  for (const part of moscowFormatter.formatToParts(date)) {
    parts[part.type] = part.value;
  }
  // «% 24» — подстраховка: некоторые браузеры пишут полночь как "24".
  const hours = Number(parts.hour) % 24;
  return {
    weekday: WEEKDAY_NUMBERS[parts.weekday],
    minutes: hours * 60 + Number(parts.minute),
  };
}

// -----------------------------------------------------------------------------
// Открыто ли сейчас
// -----------------------------------------------------------------------------
// schedule — расписание места, его собирает data.js:
//   { weekdays: parseDayHours(...), saturday: parseDayHours(...), break: parseBreak(...) }

/** Часы работы для нужного дня недели. Воскресенье — всегда выходной. */
export function getDayHours(schedule, weekday) {
  if (weekday === 0) return { kind: 'closed' };
  if (weekday === 6) return schedule.saturday;
  return schedule.weekdays;
}

/**
 * Промежутки, когда место открыто в этот день, с учётом перерыва.
 * Пример: 09:00–17:00 и перерыв 13:00–13:30 → [09:00–13:00, 13:30–17:00].
 * Возвращает массив промежутков ([] — весь день закрыто)
 * или null, если часы неизвестны (пусто или записано с ошибкой).
 */
export function getOpenIntervals(dayHours, breakInfo) {
  if (dayHours.kind === 'closed') return [];
  if (dayHours.kind !== 'open') return null;
  if (breakInfo.kind === 'invalid') return null;
  if (breakInfo.kind !== 'break') return [{ from: dayHours.from, to: dayHours.to }];

  const intervals = [];
  // Кусок до перерыва (если перерыв начинается позже открытия).
  if (breakInfo.from > dayHours.from) {
    intervals.push({ from: dayHours.from, to: Math.min(breakInfo.from, dayHours.to) });
  }
  // Кусок после перерыва (если перерыв заканчивается раньше закрытия).
  if (breakInfo.to < dayHours.to) {
    intervals.push({ from: Math.max(breakInfo.to, dayHours.from), to: dayHours.to });
  }
  // Убираем пустые куски (на случай, если перерыв вне часов работы).
  return intervals.filter((interval) => interval.from < interval.to);
}

/**
 * Главная функция: открыто ли место в момент now (результат getMoscowTime).
 * Возвращает один из вариантов:
 *   { state: 'open', closesAt, breakFollows } — открыто до closesAt (минуты);
 *        breakFollows = true, если потом перерыв, а не конец дня;
 *   { state: 'closed', opensAt } — закрыто; opensAt = { daysAhead, weekday, minutes }
 *        (daysAhead: 0 — сегодня, 1 — завтра, …) или null, если не знаем когда;
 *   { state: 'unknown' } — часы на сегодня неизвестны.
 */
export function getOpenStatus(schedule, now) {
  const todayHours = getDayHours(schedule, now.weekday);
  const today = getOpenIntervals(todayHours, schedule.break);
  if (today === null) return { state: 'unknown' };

  const current = today.find((interval) => interval.from <= now.minutes && now.minutes < interval.to);
  if (current) {
    return { state: 'open', closesAt: current.to, breakFollows: current.to < todayHours.to };
  }

  // Сейчас закрыто — ищем ближайшее открытие: сначала сегодня позже,
  // потом в следующие дни. 7 дней вперёд хватит: это полная неделя.
  for (let daysAhead = 0; daysAhead <= 7; daysAhead++) {
    const weekday = (now.weekday + daysAhead) % 7;
    const intervals = daysAhead === 0
      ? today
      : getOpenIntervals(getDayHours(schedule, weekday), schedule.break);

    // В какой-то из дней часы неизвестны — честно не обещаем время открытия.
    if (intervals === null) return { state: 'closed', opensAt: null };

    const next = intervals.find((interval) => daysAhead > 0 || interval.from > now.minutes);
    if (next) {
      return { state: 'closed', opensAt: { daysAhead, weekday, minutes: next.from } };
    }
  }
  return { state: 'closed', opensAt: null };
}

/** Статус → текст для человека: «Открыто до 17:00», «Закрыто, откроется в 10:00»… */
export function formatStatus(status) {
  if (status.state === 'open') {
    const time = formatMinutes(status.closesAt);
    return status.breakFollows ? TEXTS.status.openUntilBreak(time) : TEXTS.status.openUntil(time);
  }
  if (status.state === 'closed') {
    if (!status.opensAt) return TEXTS.status.closed;
    const time = formatMinutes(status.opensAt.minutes);
    if (status.opensAt.daysAhead === 0) return TEXTS.status.closedOpensToday(time);
    if (status.opensAt.daysAhead === 1) return TEXTS.status.closedOpensTomorrow(time);
    return TEXTS.status.closedOpensOnDay(TEXTS.weekdaysOn[status.opensAt.weekday], time);
  }
  return TEXTS.status.unknown;
}
