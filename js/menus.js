// Меню по номеру столовой. Строка блюда: [русское название, английское название, цена в рублях].
// sample: true — примерный ассортимент и ориентировочные цены.
export const MENUS = {
  1: {
    sample: true,
    dishes: {
      salads: [
        ['Салат из капусты и моркови', 'Cabbage and carrot salad', 100],
        ['Винегрет', 'Beet and potato salad', 120],
      ],
      soups: [
        ['Борщ со сметаной', 'Borscht with sour cream', 140],
      ],
      mains: [
        ['Куриная котлета', 'Chicken cutlet', 170],
        ['Рыба под маринадом', 'Fish with vegetable marinade', 210],
      ],
      sides: [
        ['Гречка', 'Buckwheat', 75],
        ['Картофельное пюре', 'Mashed potatoes', 95],
      ],
      desserts: [
        ['Творожная запеканка', 'Cottage cheese bake', 140],
      ],
      drinks: [
        ['Компот', 'Fruit compote drink', 60],
      ],
    },
  },
  2: {
    sample: true,
    dishes: {
      salads: [
        ['Оливье', 'Olivier potato salad', 160],
        ['Салат из свёклы с чесноком', 'Beetroot and garlic salad', 110],
      ],
      soups: [
        ['Куриный суп с лапшой', 'Chicken noodle soup', 150],
        ['Гороховый суп', 'Split pea soup', 120],
      ],
      mains: [
        ['Гуляш из говядины', 'Beef goulash', 260],
        ['Курица, запечённая с овощами', 'Roast chicken with vegetables', 230],
      ],
      sides: [
        ['Отварной рис', 'Steamed rice', 80],
      ],
      desserts: [
        ['Сырники со сметаной', 'Cottage cheese pancakes with sour cream', 160],
      ],
      drinks: [
        ['Ягодный морс', 'Berry drink', 85],
      ],
    },
  },
  3: {
    sample: true,
    dishes: {
      salads: [
        ['Морковь с яблоком', 'Carrot and apple salad', 80],
      ],
      soups: [
        ['Щи со сметаной', 'Cabbage soup with sour cream', 110],
      ],
      mains: [
        ['Мясные тефтели в томатном соусе', 'Meatballs in tomato sauce', 165],
        ['Макароны по-флотски', 'Pasta with minced meat', 180],
      ],
      sides: [
        ['Картофель отварной', 'Boiled potatoes', 75],
        ['Тушёная капуста', 'Braised cabbage', 75],
      ],
      bakery: [
        ['Пирожок с капустой', 'Cabbage pastry', 50],
      ],
      drinks: [
        ['Чёрный чай', 'Black tea', 45],
        ['Компот из сухофруктов', 'Dried fruit drink', 55],
      ],
    },
  },
  4: {
    date: '2026-11-19',
    dishes: {
      salads: [
        ['Цезарь с курицей', 'Chicken Caesar salad', 280],
        ['Ярославский салат', 'Yaroslavl ham and vegetable salad', 180],
        ['Греческий салат', 'Greek salad', 220],
        ['Витаминный салат', 'Cabbage and carrot salad', 130],
      ],
      soups: [
        ['Рыбный суп', 'Fish soup', 150],
        ['Гороховый суп', 'Split pea soup', 100],
      ],
      mains: [
        ['Творожная запеканка', 'Cottage cheese bake', 150],
        ['Макароны по-итальянски', 'Italian-style pasta', 250],
        ['Мясные тефтели', 'Meatballs', 190],
        ['Свинина по-французски', 'Pork baked with cheese and tomato', 280],
        ['Гуляш из говядины', 'Beef goulash', 280],
        ['Жареный хек', 'Fried hake', 240],
      ],
      sides: [
        ['Запечённый картофель', 'Roasted potatoes', 110],
        ['Рис отварной', 'Steamed rice', 75],
        ['Капуста тушёная', 'Braised cabbage', 100],
      ],
      drinks: [
        ['Свежевыжатый сок', 'Freshly squeezed juice', 70],
        ['Компот', 'Fruit compote drink', 60],
        ['Чай', 'Tea', 50],
        ['Кофе', 'Coffee', 70],
        ['Морс', 'Berry drink', 90],
      ],
      extras: [
        ['Сахар, 1 кубик', 'Sugar, 1 cube', 1],
        ['Соус', 'Sauce', 10],
        ['Хлеб пшеничный', 'Wheat bread', 5],
        ['Ланч-бокс', 'Takeaway container', 15],
      ],
    },
  },
  5: {
    sample: true,
    dishes: {
      salads: [
        ['Греческий салат', 'Greek salad', 210],
        ['Салат с ветчиной и огурцом', 'Ham and cucumber salad', 170],
      ],
      soups: [
        ['Грибной крем-суп', 'Cream of mushroom soup', 170],
      ],
      mains: [
        ['Куриный рулет с грибами', 'Chicken roulade with mushrooms', 245],
        ['Свинина под сыром', 'Pork baked with cheese', 270],
      ],
      sides: [
        ['Картофель по-деревенски', 'Roasted potato wedges', 110],
        ['Овощи на пару', 'Steamed vegetables', 120],
      ],
      desserts: [
        ['Медовик', 'Honey layer cake', 150],
      ],
      drinks: [
        ['Облепиховый чай', 'Sea buckthorn tea', 110],
      ],
    },
  },
  6: {
    sample: true,
    dishes: {
      salads: [
        ['Цезарь с курицей', 'Chicken Caesar salad', 250],
      ],
      soups: [
        ['Рассольник', 'Pickle and barley soup', 145],
        ['Сырный крем-суп', 'Creamy cheese soup', 175],
      ],
      mains: [
        ['Плов с курицей', 'Chicken pilaf', 235],
        ['Запечённая рыба', 'Baked fish', 250],
      ],
      sides: [
        ['Булгур с овощами', 'Bulgur with vegetables', 105],
      ],
      bakery: [
        ['Слойка с сыром', 'Cheese puff pastry', 90],
      ],
      desserts: [
        ['Блины с творогом', 'Cottage cheese crêpes', 150],
      ],
      drinks: [
        ['Морс из чёрной смородины', 'Blackcurrant drink', 90],
      ],
    },
  },
  7: {
    dishes: {
      salads: [
        ['Греческий салат', 'Greek salad', 260],
        ['Цезарь с курицей', 'Chicken Caesar salad', 280],
      ],
      soups: [
        ['Щи с курицей', 'Cabbage soup with chicken', 150],
        ['Суп с ветчиной', 'Ham soup', 160],
      ],
      mains: [
        ['Шашлычок из свинины', 'Pork skewer', 220],
        ['Куриная котлета', 'Chicken cutlet', 180],
        ['Запечённый куриный рулет с грибами', 'Baked chicken roulade with mushrooms', 180],
        ['Запечённая курица', 'Roast chicken', 220],
        ['Карбонара', 'Carbonara', 300],
        ['Мясная лазанья', 'Meat lasagna', 250],
      ],
      sides: [
        ['Картофельное пюре', 'Mashed potatoes', 100],
        ['Запечённый картофель', 'Roasted potatoes', 100],
        ['Отварные макароны', 'Boiled pasta', 80],
      ],
      snacks: [
        ['Багет с ветчиной', 'Ham baguette', 180],
        ['Шаурма с курицей', 'Chicken shawarma', 200],
      ],
      bakery: [
        ['Круассан в ассортименте', 'Assorted croissants', 200],
      ],
      desserts: [
        ['Творожная запеканка', 'Cottage cheese bake', 150],
        ['Сырники, 2 шт.', 'Cottage cheese pancakes, 2 pieces', 150],
        ['Панна-котта с вишней и смородиной', 'Cherry and currant panna cotta', 120],
      ],
      drinks: [
        ['Питьевая вода без газа', 'Still water', 60],
        ['Газированная минеральная вода', 'Sparkling mineral water', 60],
        ['Добрый Cola', 'Dobry Cola', 150],
        ['Добрый лайм-лимон', 'Dobry lime and lemon soda', 150],
        ['Добрый апельсин', 'Dobry orange soda', 150],
        ['Pulpy в ассортименте', 'Pulpy, assorted flavours', 140],
        ['Чай Rich в ассортименте', 'Rich iced tea, assorted flavours', 140],
        ['Сок, 0,3 л', 'Juice, 0.3 L', 80],
        ['Мохито в ассортименте', 'Mojito soft drink, assorted flavours', 150],
      ],
    },
  },
  8: {
    sample: true,
    dishes: {
      salads: [
        ['Салат из огурцов и помидоров', 'Cucumber and tomato salad', 145],
        ['Салат с яйцом и зелёным луком', 'Egg and spring onion salad', 125],
      ],
      soups: [
        ['Картофельный суп с курицей', 'Potato and chicken soup', 135],
      ],
      mains: [
        ['Шницель из курицы', 'Chicken schnitzel', 205],
        ['Рыбная котлета', 'Fish cake', 180],
      ],
      sides: [
        ['Макароны с маслом', 'Buttered pasta', 80],
        ['Гречка с грибами', 'Buckwheat with mushrooms', 95],
      ],
      bakery: [
        ['Булочка с корицей', 'Cinnamon roll', 75],
      ],
      drinks: [
        ['Чай с лимоном', 'Tea with lemon', 55],
        ['Яблочный компот', 'Apple compote drink', 65],
      ],
    },
  },
  9: {
    dishes: {
      combos: [
        ['Домашний обед «Экономный»', 'Economy set lunch', 511],
        ['Домашний обед «Спортобед»', 'Sports set lunch', 551],
        ['Домашний обед «Разнообразный»', 'Variety set lunch', 545],
        ['Домашний обед «Сытный»', 'Hearty set lunch', 632],
        ['Домашний обед с котлетками', 'Set lunch with cutlets', 787],
      ],
      pancakes: [
        ['Блин с маслом', 'Crêpe with butter', 171],
        ['Блин с капустой и яйцом', 'Crêpe with cabbage and egg', 178],
        ['Блин со сметаной', 'Crêpe with sour cream', 228],
        ['Блин «Двойной с ветчиной и сыром»', 'Double ham and cheese crêpe', 297],
        ['Блин «Карбонара»', 'Carbonara crêpe', 401],
        ['Блин с сёмгой', 'Crêpe with salmon', 466],
        ['Блин «Куриный богатырь»', 'Chicken Bogatyr crêpe', 451],
        ['Блин «Терем» с говядиной', 'Terem beef crêpe', 431],
        ['Блин с сахаром', 'Crêpe with sugar', 168],
        ['Блин с шоколадным кремом', 'Crêpe with chocolate cream', 292],
        ['Яблочно-карамельный блин', 'Apple caramel crêpe', 336],
      ],
      soups: [
        ['Грибной суп с чипами, стандартная порция', 'Mushroom soup with crisps, regular portion', 269],
        ['Гороховый суп с копчёностями, стандартная порция', 'Split pea soup with smoked meat, regular portion', 295],
        ['Сырный крем-суп, стандартная порция', 'Creamy cheese soup, regular portion', 298],
        ['Борщ Теремковский, стандартная порция', 'Teremok borscht, regular portion', 328],
      ],
      mains: [
        ['Пельмени, стандартная порция', 'Pelmeni dumplings, regular portion', 260],
        ['Пельмени, двойная порция', 'Pelmeni dumplings, double portion', 392],
        ['Гречка с маслом', 'Buckwheat with butter', 190],
        ['Гречка с томлёной куриной грудкой', 'Buckwheat with slow-cooked chicken breast', 415],
      ],
      salads: [
        ['Витаминчик', 'Fresh vegetable salad', 257],
        ['Оливье с ветчиной', 'Olivier salad with ham', 283],
        ['Русский Цезарь', 'Russian-style Caesar salad', 311],
      ],
      desserts: [
        ['Сырники, 2 шт.', 'Cottage cheese pancakes, 2 pieces', 241],
        ['Сырники, 3 шт.', 'Cottage cheese pancakes, 3 pieces', 292],
        ['Банановый десерт', 'Banana dessert', 167],
      ],
      drinks: [
        ['Квас Теремок, 0,3 л', 'Teremok kvass, 0.3 L', 112],
        ['Квас Теремок, 0,5 л', 'Teremok kvass, 0.5 L', 165],
      ],
    },
  },
  10: {
    date: '2026-09-03',
    dishes: {
      salads: [
        ['Цезарь с курицей', 'Chicken Caesar salad', 280],
      ],
      mains: [
        ['Творожная запеканка', 'Cottage cheese bake', 200],
        ['Паста «Карбонара»', 'Carbonara pasta', 250],
        ['Блины с творогом', 'Cottage cheese crêpes', 150],
        ['Блины с мясом', 'Meat crêpes', 180],
        ['Сырники, 2 шт.', 'Cottage cheese pancakes, 2 pieces', 150],
        ['Отварной картофель с мясными тефтелями', 'Boiled potatoes with meatballs', 390],
      ],
      snacks: [
        ['Сэндвич с курицей или ветчиной', 'Chicken or ham sandwich', 250],
        ['Багет с курицей или ветчиной', 'Chicken or ham baguette', 250],
        ['Датский хот-дог', 'Danish hot dog', 250],
      ],
      bakery: [
        ['Пирожок с капустой', 'Cabbage pastry', 50],
        ['Пирожок с яблоком', 'Apple pastry', 50],
        ['Пирожок с мясом', 'Meat pastry', 50],
      ],
      desserts: [
        ['Сметанник', 'Sour cream cake', 110],
        ['Эклер', 'Éclair', 100],
        ['Песочное пирожное с повидлом', 'Shortbread pastry with fruit jam', 80],
        ['Замороженное пирожное в ассортименте', 'Assorted frozen pastries', 280],
        ['Пирожное «Картошка»', 'Chocolate biscuit truffle cake', 60],
        ['Пирожное «Буше»', 'Bouchée sponge cake', 80],
        ['Бисквитный рулет с малиновым джемом', 'Sponge roll with raspberry jam', 90],
        ['Малиновое пирожное', 'Raspberry pastry', 90],
        ['Мороженое эскимо «Волшебный фонарь»', 'Magic Lantern ice cream bar', 150],
        ['Манник', 'Semolina cake', 80],
        ['Пирожное «Сказка»', 'Skazka sponge cake', 120],
      ],
      drinks: [
        ['Американо, 200 мл', 'Americano, 200 mL', 150],
        ['Капучино или латте, 200 мл', 'Cappuccino or latte, 200 mL', 200],
        ['Капучино или латте, 400 мл', 'Cappuccino or latte, 400 mL', 300],
        ['Чай', 'Tea', 60],
        ['Газированная вода, 0,5 л', 'Sparkling water, 0.5 L', 60],
        ['Негазированная вода, 0,5 л', 'Still water, 0.5 L', 60],
        ['Добрый апельсин или лимон-лайм, 0,5 л', 'Dobry orange or lemon-lime soda, 0.5 L', 150],
        ['Добрый Cola, 0,5 л', 'Dobry Cola, 0.5 L', 150],
        ['Pulpy в ассортименте, 0,45 л', 'Pulpy, assorted flavours, 0.45 L', 150],
        ['Чай Rich, 0,5 л', 'Rich iced tea, 0.5 L', 140],
        ['Добрый яблоко, 0,33 л', 'Dobry apple drink, 0.33 L', 100],
      ],
    },
  },
};
