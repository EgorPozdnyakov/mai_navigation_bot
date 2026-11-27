// i18n.js — два языка интерфейса: русский (ru) и английский (en).
//
// Все тексты Mini App лежат здесь, в словаре TEXTS. Чтобы поменять или перевести текст,
// найдите его ключ и поправьте в обоих языках. Тексты с подстановкой — функции:
// (time) => `Открыто до ${time}` — вместо ${time} подставится время.
//
// В index.html тексты подставляются по атрибутам:
//   data-i18n="ключ"             → текст элемента
//   data-i18n-aria="ключ"        → aria-label (подпись для программ чтения с экрана)
//   data-i18n-placeholder="ключ" → подсказка в поле ввода
//
// Названия и адреса столовых переводятся в js/places.js полями name_en и where_en.

const russianDishCount = new Intl.PluralRules('ru');

export const TEXTS = {
  ru: {
    title: 'Столовые МАИ',
    viewGroup: 'Вид',
    viewMap: 'Карта',
    viewList: 'Список',
    viewDishes: 'Блюда',
    langButton: 'EN',
    langButtonLabel: 'Switch to English',
    aboutButton: 'О проекте',
    filters: 'Фильтры столовых',
    openNow: 'Открыто сейчас',
    accessibleFilter: '♿ Для маломобильных',

    legend: 'Обозначения',
    legendGreen: 'Очереди нет',
    legendYellow: 'Небольшая очередь',
    legendRed: 'Большая очередь',
    legendClosed: 'Закрыто',
    legendCoworking: 'Коворкинг',

    debugBadge: 'Режим разметки: нажмите на карту, чтобы узнать координаты x и y.',
    debugOutside: 'Эта точка за краем картинки',
    debugCopy: 'Скопировать',
    debugCopied: 'Скопировано',
    debugCopyFailed: 'Не вышло, перепишите вручную',

    mapErrorTitle: 'Не удалось загрузить карту кампуса.',
    mapErrorHint: 'Проверьте, что файл media/map.jpg есть на сайте. Пока можно посмотреть столовые списком.',
    openList: 'Открыть список',
    mapAlt: 'Схема кампуса МАИ',
    zoomIn: 'Приблизить',
    zoomOut: 'Отдалить',

    search: 'Поиск по названию',
    listEmpty: 'Ничего не нашлось. Попробуйте другой фильтр.',
    dishSearchTitle: 'Поиск по блюдам',
    dishSearchLabel: 'Название блюда',
    dishSearchPlaceholder: 'Например, сырники',
    dishSearchCount: (count) => `Найдено ${count} ${{ one: 'блюдо', few: 'блюда', many: 'блюд' }[russianDishCount.select(count)]}`,
    dishSearchEmpty: 'Блюда не найдены',
    dishSearchEmptyHint: 'Попробуйте изменить запрос или снять фильтры.',
    dishSuggestionSyrniki: 'Сырники',
    dishSuggestionBorscht: 'Борщ',
    dishSuggestionChicken: 'Курица',
    dishSuggestionCompote: 'Компот',

    // Статус «открыто / закрыто» (js/hours.js)
    openUntil: (time) => `Открыто до ${time}`,
    opensToday: (time) => `Закрыто, откроется в ${time}`,
    opensTomorrow: (time) => `Закрыто, откроется завтра в ${time}`,
    opensMonday: (time) => `Закрыто, откроется в понедельник в ${time}`,

    // Очередь
    queue_green: 'Очереди нет',
    queue_yellow: 'Очередь небольшая',
    queue_red: 'Большая очередь',

    // Карточка столовой
    noPhoto: '📷 Фото пока нет',
    photoAlt: (name, number) => `${name}: фото ${number}`,
    closeCard: 'Закрыть карточку',
    menuButton: 'Меню',
    where: 'Где',
    hours: 'Часы работы',
    weekdaysHours: (hours) => `Пн–Пт ${hours}`,
    weekendClosed: 'Сб–Вс закрыто',
    price: 'Средний чек',
    rubles: (price) => `${price} ₽`,
    payment: 'Оплата',
    accessibility: 'Для маломобильных',
    accessibleYes: 'доступно ♿',
    accessibleNo: 'недоступно',

    // Меню
    menuTitle: (name) => `Меню: ${name}`,
    menuBack: '← Назад',
    menuEmpty: 'Меню этой столовой пока не добавили.',
    menuAlt: (name) => `Меню: ${name}`,
    menuSample: 'Примерное меню',
    menuSampleNote: 'Блюда и цены приведены для примера.',
    menuFromPhoto: (date) => date ? `Меню по фото от ${date}` : 'Меню по фотографиям',
    menuFromPhotoNote: 'Блюда и цены могли измениться.',
    menuCategory_combos: 'Комплексные обеды',
    menuCategory_salads: 'Салаты',
    menuCategory_soups: 'Супы',
    menuCategory_mains: 'Горячие блюда',
    menuCategory_pancakes: 'Блины',
    menuCategory_sides: 'Гарниры',
    menuCategory_snacks: 'Перекусы',
    menuCategory_bakery: 'Выпечка',
    menuCategory_desserts: 'Десерты',
    menuCategory_drinks: 'Напитки',
    menuCategory_extras: 'Дополнительно',

    placeNotFound: (id) => `Столовая №${id} не найдена`,

    // О проекте
    aboutTitle: 'О проекте',
    about1: 'Карта столовых и коворкингов на основной территории МАИ (метро «Сокол»). Нажмите на метку, чтобы открыть карточку места.',
    about2: 'Приложение сделали студенты МАИ в рамках дисциплины «Обучение служением». Это студенческий проект, а не официальный сервис МАИ.',
    about3: 'Часы работы и цены собирают студенты. Данные могут меняться, уточняйте на месте.',
    about4: 'Цвет метки показывает очередь. Пока это прогноз по времени суток, а не живые данные: настоящее отслеживание очередей — в планах.',
    about5: 'Приложение не собирает и никуда не отправляет данные пользователей.',
    aboutMapSource: 'Источник схемы кампуса',
    close: 'Закрыть',
  },

  en: {
    title: 'MAI Canteens',
    viewGroup: 'View',
    viewMap: 'Map',
    viewList: 'List',
    viewDishes: 'Dishes',
    langButton: 'RU',
    langButtonLabel: 'Переключить на русский',
    aboutButton: 'About',
    filters: 'Canteen filters',
    openNow: 'Open now',
    accessibleFilter: '♿ Wheelchair accessible',

    legend: 'Legend',
    legendGreen: 'No queue',
    legendYellow: 'Short queue',
    legendRed: 'Long queue',
    legendClosed: 'Closed',
    legendCoworking: 'Study space',

    debugBadge: 'Markup mode: tap the map to get the x and y coordinates.',
    debugOutside: 'This point is outside the map image',
    debugCopy: 'Copy',
    debugCopied: 'Copied',
    debugCopyFailed: 'Could not copy, please write it down',

    mapErrorTitle: 'Could not load the campus map.',
    mapErrorHint: 'Check that media/map.jpg exists on the site. Meanwhile you can see the canteens as a list.',
    openList: 'Open list',
    mapAlt: 'MAI campus map',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',

    search: 'Search by name',
    listEmpty: 'Nothing found. Try another filter.',
    dishSearchTitle: 'Find a dish',
    dishSearchLabel: 'Dish name',
    dishSearchPlaceholder: 'Try cottage cheese pancakes',
    dishSearchCount: (count) => `${count} ${count === 1 ? 'dish' : 'dishes'} found`,
    dishSearchEmpty: 'No dishes found',
    dishSearchEmptyHint: 'Try changing your search or clearing the filters.',
    dishSuggestionSyrniki: 'Cottage cheese pancakes',
    dishSuggestionBorscht: 'Borscht',
    dishSuggestionChicken: 'Chicken',
    dishSuggestionCompote: 'Compote',

    openUntil: (time) => `Open until ${time}`,
    opensToday: (time) => `Closed, opens at ${time}`,
    opensTomorrow: (time) => `Closed, opens tomorrow at ${time}`,
    opensMonday: (time) => `Closed, opens on Monday at ${time}`,

    queue_green: 'No queue',
    queue_yellow: 'Short queue',
    queue_red: 'Long queue',

    noPhoto: '📷 No photo yet',
    photoAlt: (name, number) => `${name}: photo ${number}`,
    closeCard: 'Close',
    menuButton: 'Menu',
    where: 'Where',
    hours: 'Opening hours',
    weekdaysHours: (hours) => `Mon–Fri ${hours}`,
    weekendClosed: 'Sat–Sun closed',
    price: 'Average bill',
    rubles: (price) => `${price} ₽`,
    payment: 'Payment',
    accessibility: 'Wheelchair access',
    accessibleYes: 'accessible ♿',
    accessibleNo: 'not accessible',

    menuTitle: (name) => `Menu: ${name}`,
    menuBack: '← Back',
    menuEmpty: 'The menu for this canteen has not been added yet.',
    menuAlt: (name) => `Menu: ${name}`,
    menuSample: 'Sample menu',
    menuSampleNote: 'Dishes and prices are examples.',
    menuFromPhoto: (date) => date ? `Menu from the photo dated ${date}` : 'Menu based on photos',
    menuFromPhotoNote: 'Dishes and prices may have changed.',
    menuCategory_combos: 'Set lunches',
    menuCategory_salads: 'Salads',
    menuCategory_soups: 'Soups',
    menuCategory_mains: 'Main dishes',
    menuCategory_pancakes: 'Crêpes',
    menuCategory_sides: 'Side dishes',
    menuCategory_snacks: 'Snacks',
    menuCategory_bakery: 'Bakery',
    menuCategory_desserts: 'Desserts',
    menuCategory_drinks: 'Drinks',
    menuCategory_extras: 'Extras',

    placeNotFound: (id) => `Canteen No. ${id} not found`,

    aboutTitle: 'About',
    about1: 'A map of canteens and study spaces on the main MAI campus (Sokol metro station). Tap a marker for details.',
    about2: 'The app was made by MAI students as part of the Service-Learning course. It is a student project, not an official MAI service.',
    about3: 'Students collect opening hours and prices. They may change, so please check on site.',
    about4: 'The marker colour shows the queue. For now it is a forecast based on the time of day, not live data: real queue tracking is planned.',
    about5: 'The app does not collect or send any user data.',
    aboutMapSource: 'Campus map source',
    close: 'Close',
  },
};

// Оплата в js/places.js записана по-русски. Здесь — перевод частых вариантов.
// Если варианта нет в списке, показываем как написано.
const PAYMENT_EN = {
  'наличные и карта': 'cash and card',
  'только карта': 'card only',
  'только наличные': 'cash only',
};

const STORAGE_KEY = 'lang';
let lang = 'ru';

export function getLang() {
  return lang;
}

// Текст по ключу на текущем языке: t('openNow') или t('openUntil', '17:00').
// Если на английском ключа нет, берём русский — так недоперевод не сломает экран.
export function t(key, ...args) {
  let text = TEXTS[lang][key];
  if (text === undefined) text = TEXTS.ru[key];
  if (text === undefined) return key;
  return typeof text === 'function' ? text(...args) : text;
}

// Название или адрес столовой на текущем языке: placeText(place, 'name').
// По-английски берём name_en / where_en, а если их не заполнили — русский вариант.
export function placeText(place, field) {
  if (lang === 'en' && place[field + '_en']) return place[field + '_en'];
  return place[field];
}

export function paymentText(payment) {
  if (lang === 'en' && PAYMENT_EN[payment]) return PAYMENT_EN[payment];
  return payment;
}

// Какой язык включить при запуске. По порядку:
//   1) ?lang=en или ?lang=ru в ссылке;
//   2) язык, который человек выбрал кнопкой раньше (запомнен на устройстве);
//   3) язык Telegram, а в браузере — язык браузера:
//      русский (и близкие: украинский, белорусский, казахский) → ru, любой другой → en;
//   4) если ничего не известно — ru.
export function chooseLang({ urlLang, savedLang, userLang }) {
  for (const candidate of [urlLang, savedLang]) {
    if (candidate === 'ru' || candidate === 'en') return candidate;
  }
  if (!userLang) return 'ru';
  const code = userLang.toLowerCase().slice(0, 2);
  return ['ru', 'uk', 'be', 'kk'].includes(code) ? 'ru' : 'en';
}

// Выбранный кнопкой язык запоминаем на устройстве (никуда не отправляется).
// localStorage бывает недоступен (приватный режим) — тогда просто не запоминаем.
export function loadSavedLang() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    return null;
  }
}

export function setLang(newLang, { save = false } = {}) {
  lang = newLang === 'en' ? 'en' : 'ru';
  if (save) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (error) {
      // не получилось запомнить — не страшно
    }
  }
}

// Подставить тексты в index.html (по атрибутам data-i18n…).
export function translatePage() {
  document.documentElement.lang = lang;
  document.title = t('title');
  for (const element of document.querySelectorAll('[data-i18n]')) {
    element.textContent = t(element.dataset.i18n);
  }
  for (const element of document.querySelectorAll('[data-i18n-aria]')) {
    element.setAttribute('aria-label', t(element.dataset.i18nAria));
  }
  for (const element of document.querySelectorAll('[data-i18n-placeholder]')) {
    element.setAttribute('placeholder', t(element.dataset.i18nPlaceholder));
  }
}
