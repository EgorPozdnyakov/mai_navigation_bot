// places.js — все столовые. Чтобы что-то поменять, правьте этот файл.
//
// id         — номер на метке и в ссылке ?place=N
// open/close — часы работы в будни (пн–пт). В субботу и воскресенье закрыто
// price      — средняя стоимость еды, ₽
// accessible — true, если можно попасть без ступенек (для маломобильных)
// x, y       — где стоит метка на картинке карты (пиксели от левого верхнего угла).
//              Узнать координаты: откройте сайт с ?debug=1 и нажмите на карту
// photos     — фото из папки media/photos/ (первое — главное)
// menu       — фото меню из папки media/photos/. Пустой список — меню пока нет

export const PLACES = [
  {
    id: 1, name: 'Столовая у КПП №5', where: 'Корпус 7, 3 этаж',
    open: '9:00', close: '17:00', price: 400, payment: 'наличные и карта', accessible: false,
    x: 395, y: 69, photos: [], menu: [],
  },
  {
    id: 2, name: 'Столовая в 24 корпусе', where: 'Корпус 24, 1 этаж',
    open: '9:30', close: '17:00', price: 500, payment: 'только карта', accessible: true,
    x: 190, y: 91, photos: [], menu: [],
  },
  {
    id: 3, name: 'Столовая у КПП №4', where: 'ГАК, 1 этаж',
    open: '9:00', close: '17:00', price: 300, payment: 'наличные и карта', accessible: true,
    x: 276, y: 104, photos: [], menu: [],
  },
  {
    id: 4, name: 'Столовая у спорткомплекса №3', where: 'Корпус 3, 1 этаж',
    open: '9:00', close: '17:00', price: 550, payment: 'наличные и карта', accessible: false,
    x: 276, y: 199, photos: [], menu: [],
  },
  {
    id: 5, name: 'Столовая «Ёлочка»', where: 'Строение 99, около корпуса №3',
    open: '10:00', close: '18:00', price: 650, payment: 'наличные и карта', accessible: true,
    x: 369, y: 199, photos: [], menu: [],
  },
  {
    id: 6, name: 'Столовая у КПП №1', where: 'Корпус 5, 1 этаж',
    open: '9:00', close: '17:00', price: 650, payment: 'наличные и карта', accessible: true,
    x: 572, y: 204, photos: [], menu: [],
  },
  {
    id: 7, name: 'Столовая у ДК МАИ', where: 'ДК МАИ',
    open: '10:00', close: '18:00', price: 770, payment: 'только карта', accessible: true,
    x: 286, y: 268, photos: [], menu: [],
  },
  {
    id: 8, name: 'Ледокол', where: 'Ул. Константина Царёва, д. 16',
    open: '9:00', close: '18:00', price: 450, payment: 'только наличные', accessible: true,
    x: 139, y: 275, photos: [], menu: [],
  },
  {
    id: 9, name: 'Теремок', where: 'ГУК, зона «В», балкон',
    open: '8:30', close: '18:30', price: 350, payment: 'наличные и карта', accessible: false,
    x: 392, y: 314, photos: [], menu: [],
  },
  {
    id: 10, name: 'Столовая в ГУКе', where: 'ГУК, зона «Б», 4 этаж',
    open: '10:00', close: '18:00', price: 650, payment: 'наличные и карта', accessible: false,
    x: 398, y: 263, photos: [], menu: [],
  },
];
