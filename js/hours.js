// hours.js — «открыто сейчас» по часам работы из таблицы.
// Время — число минут от начала суток (08:30 → 510), день недели — как в JavaScript:
// 0 — воскресенье, 1 — понедельник, …, 6 — суббота.

import { BAD } from './data.js';

const DAYS_ON = ['в воскресенье', 'в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу'];

// 510 → "08:30"
export function formatTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

// День недели и минуты по Москве, даже если на телефоне другой часовой пояс.
// В Москве UTC+3 круглый год (на летнее время не переходят с 2014 года).
export function getMoscowTime(date = new Date()) {
  const moscow = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  return { weekday: moscow.getUTCDay(), minutes: moscow.getUTCHours() * 60 + moscow.getUTCMinutes() };
}

// Промежутки работы места в этот день с учётом перерыва.
// 09:00–17:00 и перерыв 13:00–13:30 → [09:00–13:00, 13:30–17:00].
// [] — весь день закрыто, null — часы неизвестны (пусто или ошибка в таблице).
export function getIntervals(place, weekday) {
  let day = place.weekdays;
  if (weekday === 6) day = place.saturday;
  if (weekday === 0) day = 'closed'; // воскресенье всегда выходной

  if (day === 'closed') return [];
  if (day === null || day === BAD || place.break === BAD) return null;
  if (place.break === null) return [day];

  const result = [];
  if (place.break.from > day.from) result.push({ from: day.from, to: Math.min(place.break.from, day.to) });
  if (place.break.to < day.to) result.push({ from: Math.max(place.break.to, day.from), to: day.to });
  return result.filter((part) => part.from < part.to);
}

// Открыто ли место в момент now ({ weekday, minutes }).
// Возвращает { state: 'open' | 'closed' | 'unknown', text: 'Открыто до 17:00' }.
export function getStatus(place, now) {
  const today = getIntervals(place, now.weekday);
  if (today === null) return { state: 'unknown', text: 'Часы работы неизвестны' };

  for (const part of today) {
    if (part.from <= now.minutes && now.minutes < part.to) {
      let text = 'Открыто до ' + formatTime(part.to);
      if (place.break !== null && part.to === place.break.from) text += ', потом перерыв';
      return { state: 'open', text };
    }
  }

  // Сейчас закрыто — ищем ближайшее открытие: сегодня позже или в следующие 7 дней.
  for (let ahead = 0; ahead <= 7; ahead++) {
    const weekday = (now.weekday + ahead) % 7;
    const parts = getIntervals(place, weekday);
    if (parts === null) break; // в этот день часы неизвестны — не обещаем лишнего

    for (const part of parts) {
      if (ahead === 0 && part.from <= now.minutes) continue;
      const time = formatTime(part.from);
      if (ahead === 0) return { state: 'closed', text: 'Закрыто, откроется в ' + time };
      if (ahead === 1) return { state: 'closed', text: 'Закрыто, откроется завтра в ' + time };
      return { state: 'closed', text: `Закрыто, откроется ${DAYS_ON[weekday]} в ${time}` };
    }
  }
  return { state: 'closed', text: 'Закрыто' };
}
