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

// Очередь в столовой: 'green' — нет очереди, 'yellow' — небольшая, 'red' — большая.
// Пока живого отслеживания нет, это прогноз: «случайное» число, которое зависит от
// номера столовой и текущего часа. Поэтому у всех пользователей цвета одинаковые
// и меняются раз в час. В обед (12–14) большая очередь бывает чаще.
export function getQueue(place, date = new Date()) {
  const hourNumber = Math.floor(date.getTime() / (60 * 60 * 1000)); // номер часа с 1970 года
  const hour = (hourNumber + 3) % 24; // час по Москве

  // Псевдослучайное число от 0 до 1 (одно и то же для одной столовой в течение часа).
  const x = Math.sin(place.id * 12.9898 + hourNumber * 78.233) * 43758.5453;
  const random = x - Math.floor(x);

  let red = 0.1;    // вероятность большой очереди
  let yellow = 0.3; // вероятность небольшой очереди
  if (hour === 12 || hour === 13) {
    red = 0.45;
    yellow = 0.35;
  } else if (hour === 11 || hour === 14) {
    red = 0.25;
    yellow = 0.4;
  }
  if (random < red) return 'red';
  if (random < red + yellow) return 'yellow';
  return 'green';
}

export const QUEUE_TEXT = {
  green: 'Очереди нет',
  yellow: 'Очередь небольшая',
  red: 'Большая очередь',
};
