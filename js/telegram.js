// =============================================================================
// telegram.js — всё общение с Telegram в одном месте.
//
// Приложение работает и внутри Telegram, и в обычном браузере. Поэтому
// каждая функция сначала проверяет, что Telegram доступен, и только потом
// вызывает его. В браузере функции просто ничего не делают (или делают
// «браузерный» вариант: например, открывают ссылку в новой вкладке).
//
// Документация: https://core.telegram.org/bots/webapps
//
// Обратите внимание: скрипт telegram-web-app.js создаёт window.Telegram.WebApp
// даже в обычном браузере. Поэтому «мы внутри Telegram» проверяем по initData —
// строке с данными запуска, которую передаёт только сам Telegram.
// Мы её никуда не отправляем и не используем, только проверяем, что она есть.
//
// К window обращаемся только внутри функций: так файл можно подключить
// в тестах на Node.js, где window нет.
// =============================================================================

/** Объект Telegram.WebApp или null, если скрипт Telegram не загрузился. */
function getWebApp() {
  if (typeof window === 'undefined') return null;
  if (!window.Telegram || !window.Telegram.WebApp) return null;
  return window.Telegram.WebApp;
}

/** true — приложение открыто внутри Telegram. */
export function isInsideTelegram() {
  const webApp = getWebApp();
  return Boolean(webApp && webApp.initData);
}

/** Поддерживает ли клиент Telegram функцию из версии API version (например '6.1'). */
function supports(version) {
  const webApp = getWebApp();
  return Boolean(webApp && isInsideTelegram() && webApp.isVersionAtLeast(version));
}

// Какие цвета темы Telegram в какие наши CSS-переменные кладём.
// Названия слева — из документации Telegram (ThemeParams),
// справа — переменные из css/style.css.
const THEME_TO_CSS = {
  bg_color: '--color-bg',
  secondary_bg_color: '--color-surface-2',
  section_bg_color: '--color-surface',
  text_color: '--color-text',
  hint_color: '--color-hint',
  link_color: '--color-link',
  button_color: '--color-accent',
  button_text_color: '--color-accent-text',
};

/** Переносит цвета темы Telegram в CSS-переменные. */
function applyTelegramTheme() {
  const webApp = getWebApp();
  const root = document.documentElement;
  const theme = webApp.themeParams || {};
  for (const [telegramName, cssName] of Object.entries(THEME_TO_CSS)) {
    if (theme[telegramName]) root.style.setProperty(cssName, theme[telegramName]);
  }
  // Светлая или тёмная тема — для цветов, которых нет в теме Telegram
  // (например, зелёный «открыто»). См. [data-theme] в style.css.
  root.dataset.theme = webApp.colorScheme === 'dark' ? 'dark' : 'light';
}

// Что делать при нажатии системной кнопки «Назад». Задаётся из app.js.
let backHandler = null;

/**
 * Запуск: сообщаем Telegram, что приложение готово, разворачиваем
 * на весь экран, берём цвета темы. Возвращает true, если мы в Telegram.
 */
export function initTelegram({ onBack }) {
  backHandler = onBack;
  if (!isInsideTelegram()) return false;

  const webApp = getWebApp();
  webApp.ready();   // убрать экран загрузки Telegram
  webApp.expand();  // развернуть приложение на всю высоту

  // Без этого жест «потянуть карту вниз» сворачивает приложение
  // вместо того, чтобы двигать карту. Есть в Telegram с версии 7.7.
  if (supports('7.7')) webApp.disableVerticalSwipes();

  applyTelegramTheme();
  webApp.onEvent('themeChanged', applyTelegramTheme);

  // Системная кнопка «Назад» есть с версии 6.1. Если она есть, свою кнопку
  // «Назад» в интерфейсе прячем (класс has-telegram-back, см. style.css).
  if (supports('6.1')) {
    webApp.BackButton.onClick(() => {
      if (backHandler) backHandler();
    });
    document.documentElement.classList.add('has-telegram-back');
  }
  return true;
}

/** Показать или спрятать системную кнопку «Назад» Telegram. */
export function setBackButtonVisible(visible) {
  if (!supports('6.1')) return;
  const backButton = getWebApp().BackButton;
  if (visible) backButton.show();
  else backButton.hide();
}

/**
 * Открыть внешнюю ссылку (например, Яндекс Карты).
 * Внутри Telegram — через openLink: ссылка откроется в браузере телефона
 * или в приложении Яндекс Карт, а наше приложение останется открытым.
 * В обычном браузере — в новой вкладке.
 */
export function openExternalLink(url) {
  const webApp = getWebApp();
  if (isInsideTelegram() && typeof webApp.openLink === 'function') {
    try {
      webApp.openLink(url);
      return;
    } catch (error) {
      console.warn('Telegram не смог открыть ссылку, открываем обычным способом', error);
    }
  }
  window.open(url, '_blank', 'noopener');
}

/**
 * Из параметра ссылки достаём номер места.
 * "place_3" (Telegram, startapp=place_3) → 3; "3" (браузер, ?place=3) → 3;
 * всё остальное → null.
 */
export function placeIdFromParam(text) {
  const match = /^(?:place_)?(\d+)$/.exec(String(text ?? '').trim());
  if (!match) return null;
  const id = Number(match[1]);
  return id > 0 ? id : null;
}

/**
 * Номер места, с которого нужно открыть приложение (для QR-кодов), или null.
 * Telegram: ссылка https://t.me/<бот>/<приложение>?startapp=place_3
 *           → Telegram передаёт start_param = "place_3".
 * Браузер:  https://<сайт>/?place=3
 */
export function getStartPlaceId() {
  const webApp = getWebApp();
  const fromTelegram = webApp && webApp.initDataUnsafe ? webApp.initDataUnsafe.start_param : null;
  const fromUrl = new URLSearchParams(window.location.search).get('place');
  return placeIdFromParam(fromTelegram) ?? placeIdFromParam(fromUrl);
}
