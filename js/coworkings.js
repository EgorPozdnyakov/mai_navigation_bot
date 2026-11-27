// x и y — координаты на общей схеме кампуса. Их можно узнать в режиме ?debug=1.
export const COWORKINGS = [
  {
    id: 'coworking-1', marker: 'К1', x: 489, y: 76,
    photos: ['coworking-1-1.png', 'coworking-1-2.png'],
    name: 'Коворкинг в 7 корпусе', where: 'Корпус 7',
    description: 'Пространство с панорамными окнами, мозаикой и отреставрированными тематическими витражами',
    name_en: 'Building 7 Study Space', where_en: 'Building 7',
    description_en: 'A space with panoramic windows, mosaics and restored themed stained-glass windows',
  },
  {
    id: 'coworking-2', marker: 'К2', x: 355, y: 316,
    photos: ['coworking-2-1.png'],
    markerOffsetY: 28, // Разводим метки К2 и столовой №9 на экране.
    name: 'Образовательный центр VK (Институт №8)', where: 'Главный корпус',
    description: 'Коворкинг в стиле лофт с исторической кирпичной кладкой главного корпуса',
    name_en: 'VK Education Center (Institute No. 8)', where_en: 'Main Building',
    description_en: 'A loft-style study space featuring the Main Building’s historic brickwork',
  },
  {
    id: 'coworking-3', marker: 'К3', x: 455, y: 133,
    photos: ['coworking-3-1.png', 'coworking-3-2.png'],
    markerOffsetY: 18, // Метка К3 не перекрывает К1 при отдалении.
    name: 'Коворкинг Института №2', where: 'Корпус 2В, цокольный этаж',
    description: 'Площадка в цокольном этаже в стиле «Marvel»',
    name_en: 'Institute No. 2 Study Space', where_en: 'Building 2V, lower ground floor',
    description_en: 'A Marvel-themed space on the lower ground floor',
  },
  {
    id: 'coworking-4', marker: 'К4', x: 334, y: 226,
    markerOnTop: true, // Метка в плотной группе должна оставаться доступной на общем масштабе.
    photos: ['coworking-4-1.png', 'coworking-4-2.png'],
    name: 'Коворкинг Института №3', where: 'Институт №3',
    description: 'Коворкинг в холле Института №3',
    name_en: 'Institute No. 3 Study Space', where_en: 'Institute No. 3',
    description_en: 'A study space in the lobby of Institute No. 3',
  },
];
