// hours.js — открыта ли столовая сейчас.
// Время — число минут от начала суток (08:30 → 510), день недели — как в JavaScript:
// 0 — воскресенье, 1 — понедельник, …, 6 — суббота. Столовые работают пн–пт.

// "8:30" → 510
export function toMinutes(time) {
  const parts = time.split(':');
  return Number(parts[0]) * 60 + Number(parts[1]);
}

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

// Открыта ли столовая в момент now ({ weekday, minutes }).
// Возвращает { open: true/false, text: 'Открыто до 17:00' }.
export function getStatus(place, now) {
  const open = toMinutes(place.open);
  const close = toMinutes(place.close);
  const workday = now.weekday >= 1 && now.weekday <= 5;
  const opensAt = formatTime(open);

  if (workday && now.minutes >= open && now.minutes < close) {
    return { open: true, text: 'Открыто до ' + formatTime(close) };
  }
  if (workday && now.minutes < open) {
    return { open: false, text: 'Закрыто, откроется в ' + opensAt };
  }
  // Сегодня уже закрыто или выходной: в пн–чт и в воскресенье откроется завтра,
  // в пятницу вечером и в субботу — в понедельник.
  if (now.weekday === 5 || now.weekday === 6) {
    return { open: false, text: 'Закрыто, откроется в понедельник в ' + opensAt };
  }
  return { open: false, text: 'Закрыто, откроется завтра в ' + opensAt };
}
