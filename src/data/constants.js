// ─────────────────────────────────────────────
//  USERS & ROLES
// ─────────────────────────────────────────────
export const USERS = [
  { id:1, tg:"@anton_leonov",      name:"Антон Леонов",      role:"manager",    dept:"Закупки",      av:"АЛ", color:"#0d9488" },
  { id:2, tg:"@aigul_aimakhanova", name:"Айгуль Аймаханова", role:"director",   dept:"Закупки",      av:"АА", color:"#7c3aed" },
  { id:3, tg:"@dinara_k",          name:"Динара К.",          role:"warehouse",  dept:"Склад С341/6", av:"ДК", color:"#0369a1" },
  { id:4, tg:"@zhanasya_a",        name:"Жансая А.",          role:"director_tk",dept:"ТК Алматы",    av:"ЖА", color:"#b45309" },
  { id:5, tg:"@bolat_s",           name:"Болат С.",           role:"employee",   dept:"Обжарка",      av:"БС", color:"#166534" },
];

export const ROLE_LABELS = {
  director:    "Директор Закупа",
  manager:     "Менеджер Закупа",
  director_tk: "Директор ТК",
  warehouse:   "Завскладом",
  employee:    "Сотрудник",
};

export const ROLE_ACCESS = {
  director:    ["dashboard","logistics","requests","tasks","coffee","payments","feedback"],
  manager:     ["dashboard","logistics","requests","tasks","coffee","payments","feedback"],
  director_tk: ["dashboard","logistics","requests","coffee","feedback"],
  warehouse:   ["dashboard","logistics","requests","feedback"],
  employee:    ["dashboard","requests","feedback"],
};

// ─────────────────────────────────────────────
//  WAREHOUSES & CURRENCIES
// ─────────────────────────────────────────────
export const WAREHOUSES = ["Все склады","Астана","Алматы","Обж. Цех","С341/6"];

export const CURRENCIES = ["KZT","USD","EUR","CNY","RUB"];
export const CUR_SIGN   = { KZT:"₸", USD:"$", EUR:"€", CNY:"¥", RUB:"₽" };
export const CUR_RATES  = { KZT:1, USD:450, EUR:490, CNY:62, RUB:5 };

// ─────────────────────────────────────────────
//  LOGISTICS STATUS FLOW
// ─────────────────────────────────────────────
export const STATUS_FLOW = ["Принят","Оплачен","В работе","В пути","Таможня","Доставлен"];

export const STATUS_DOT = {
  "Принят":    "bg-blue-500",
  "В работе":  "bg-yellow-500",
  "Оплачен":   "bg-teal-500",
  "В пути":    "bg-purple-500",
  "Таможня":   "bg-orange-500",
  "Доставлен": "bg-emerald-500",
  "Архив":     "bg-gray-400",
};

// ─────────────────────────────────────────────
//  BADGE COLORS
// ─────────────────────────────────────────────
export const SC = {
  "Принят":          "bg-blue-100 text-blue-800",
  "В работе":        "bg-yellow-100 text-yellow-800",
  "Оплачен":         "bg-teal-100 text-teal-800",
  "В пути":          "bg-purple-100 text-purple-800",
  "Таможня":         "bg-orange-100 text-orange-800",
  "Архив":           "bg-gray-100 text-gray-600",
  "Доставлен":       "bg-emerald-100 text-emerald-800",
  "Ожидает":         "bg-amber-100 text-amber-800",
  "Одобрена":        "bg-emerald-100 text-emerald-800",
  "Отклонена":       "bg-red-100 text-red-800",
  "Не оплачен":      "bg-red-100 text-red-800",
  "Частично":        "bg-amber-100 text-amber-800",
  "Изготавливается": "bg-blue-100 text-blue-800",
};

export const PC = {
  Critical: "border-l-red-500",
  High:     "border-l-orange-400",
  Medium:   "border-l-amber-400",
  Low:      "border-l-green-400",
};

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
export function genCode(id) {
  return "MC-" + String(id).padStart(4, "0");
}

export function fmt(n, cur) {
  return CUR_SIGN[cur] + Number(n).toLocaleString("ru-RU");
}

export function toKzt(n, cur) {
  return Number(n) * CUR_RATES[cur];
}

export function makeHistory(currentStatus, created) {
  const idx     = STATUS_FLOW.indexOf(currentStatus);
  const reached = STATUS_FLOW.slice(0, idx + 1);
  const base    = new Date("2026-04-01");
  return [
    ...reached.map((s, i) => ({
      status: s,
      date: new Date(base.getTime() + i * 3 * 24 * 60 * 60 * 1000).toLocaleDateString("ru-RU"),
      time: `${9 + i}:00`,
      done: true,
    })),
    ...STATUS_FLOW.slice(idx + 1).map(s => ({
      status: s,
      date: "—",
      time: "",
      done: false,
    })),
  ];
}

// ─────────────────────────────────────────────
//  SEED DATA
// ─────────────────────────────────────────────
export const INIT_ORDERS = [
  { id:17, code:genCode(17), title:"Чистящие средства Cafedem",       supplier:'ООО "ПРОФКОНТРАКТ"',                         warehouse:"Астана",  planDate:"30.04.2026", status:"Оплачен", country:"РФ",    comment:"Заказ на стадии производства. Ориентировочная дата забора 24–25 апреля", items:[{name:"CAFEDEM G21 (6 шт в уп.)",qty:66,unit:"шт"},{name:"CAFEDEM K41 BIO, в таблетках 600Г (6 шт в уп.)",qty:6,unit:"шт"}], created:"14.04.2026" },
  { id:16, code:genCode(16), title:"Чистящие средства Cafedem",       supplier:'ООО "ПРОФКОНТРАКТ"',                         warehouse:"Астана",  planDate:"30.04.2026", status:"Оплачен", country:"РФ",    comment:"",                                                                         items:[{name:"CAFEDEM G21",qty:228,unit:"шт"}], created:"10.04.2026" },
  { id:15, code:genCode(15), title:"Кофемашины и запчасти Dr.Coffee", supplier:"SUZHOU DR.COFFEE SYSTEM TECHNOLOGY CO.,LTD", warehouse:"Алматы",  planDate:"11.06.2026", status:"Оплачен", country:"Китай", comment:"",                                                                         items:[{name:"Кофемашина Dr.Coffee",qty:8,unit:"шт"}], created:"05.04.2026" },
  { id:14, code:genCode(14), title:"Кофемашины и запчасти Dr.Coffee", supplier:"SUZHOU DR.COFFEE SYSTEM TECHNOLOGY CO.,LTD", warehouse:"Астана",  planDate:"11.06.2026", status:"В пути",  country:"Китай", comment:"Трекинг отправлен экспедитором",                                            items:[{name:"Запчасти Dr.Coffee",qty:68,unit:"шт"}], created:"01.04.2026" },
  { id:13, code:genCode(13), title:"Сиропы Fructis",                  supplier:'ТОО "Асроров Фуд Трейд"',                   warehouse:"Алматы",  planDate:"23.04.2026", status:"Таможня", country:"Европа",comment:"Ждём растаможку",                                                          items:[{name:"Сироп Ваниль 1л",qty:50,unit:"л"},{name:"Сироп Карамель 1л",qty:50,unit:"л"}], created:"20.03.2026" },
  { id:12, code:genCode(12), title:"Упаковка DripBag",                supplier:"DripCraft Supply",                          warehouse:"С341/6",  planDate:"15.05.2026", status:"Таможня", country:"Китай", comment:"На таможне Алматы",                                                        items:[{name:"Упаковка DripBag 12г",qty:10000,unit:"шт"}], created:"15.03.2026" },
].map(o => ({ ...o, history: makeHistory(o.status, o.created) }));

export const INIT_REQUESTS = [
  { id:"REQ-023", employee:"Жансая А.", dept:"ТК Алматы",       category:"Этикетки",   product:"Этикетки для кофе Prestige",   qty:"2 000 шт", urgency:"Срочно",   date:"23.04.2025", status:"Ожидает",  comment:"" },
  { id:"REQ-022", employee:"Аружан М.", dept:"Кофейня Байтерек", category:"Оргтехника", product:"Мышка беспроводная Logitech",  qty:"2 шт",     urgency:"Обычная",  date:"22.04.2025", status:"Ожидает",  comment:"Срочно до пятницы" },
  { id:"REQ-021", employee:"Болат С.",  dept:"Обжарка",          category:"Хозтовары",  product:"Мешки для мусора 120л",        qty:"5 упак",   urgency:"Обычная",  date:"21.04.2025", status:"Одобрена", comment:"" },
  { id:"REQ-020", employee:"Динара К.", dept:"Склад С341/6",     category:"Упаковка",   product:"Пакеты для кофе 250г — крафт", qty:"500 шт",   urgency:"Критично", date:"20.04.2025", status:"Одобрена", comment:"" },
];

export const INIT_TASKS = [
  { id:1, title:"Согласовать прайс с Green Origins на Q3",  priority:"Medium",   assignee:"manager", status:"todo",        subtasks:[{t:"Запросить прайс-лист",done:true},{t:"Сравнить с конкурентами",done:false}], comments:[], due:"30.04" },
  { id:2, title:"Обновить базу поставщиков упаковки",       priority:"Low",      assignee:"manager", status:"todo",        subtasks:[], comments:[], due:"05.05" },
  { id:3, title:"Найти альтернативного поставщика DripBag", priority:"High",     assignee:"director",status:"todo",        subtasks:[{t:"Запросить образцы",done:false}], comments:[], due:"25.04" },
  { id:4, title:"Оплатить счёт Green Origins INV-22",       priority:"Critical", assignee:"director",status:"in_progress", subtasks:[], comments:["Директор: Ожидаем подпись"], due:"24.04" },
  { id:5, title:"Оформить заказ на этикетки Prestige",      priority:"Medium",   assignee:"manager", status:"in_progress", subtasks:[], comments:[], due:"25.04" },
  { id:6, title:"Составить бюджет закупок на май",          priority:"Medium",   assignee:"director",status:"in_progress", subtasks:[], comments:[], due:"28.04" },
  { id:7, title:"Проверить доставку Cafedem #ORD-038",      priority:"Low",      assignee:"manager", status:"done",        subtasks:[], comments:[], due:"21.04" },
  { id:8, title:"Одобрить заявки REQ-019, REQ-020",         priority:"Low",      assignee:"manager", status:"done",        subtasks:[], comments:[], due:"20.04" },
];

export const PRODUCT_GROUPS = [
  "Сиропы Fructis",
  "Chocofactory",
  "Китайские аксессуары",
  "Оборудование",
  "Одежда (Жилеты)",
  "Чистящие средства",
  "Пакеты для кофе",
  "Упаковка для дрипов",
];

export const DASHBOARD_CITIES = ["Астана", "Алматы", "Обжарочный цех"];

export const SALES = [
  { product:"Сироп Ваниль 1л",          group:"Сиропы Fructis",       stock:88,   sold:64,   city:"Астана",        unit:"л",   date:"2026-04-15" },
  { product:"Сироп Карамель 1л",         group:"Сиропы Fructis",       stock:72,   sold:58,   city:"Астана",        unit:"л",   date:"2026-04-18" },
  { product:"Сироп Лесной орех 1л",      group:"Сиропы Fructis",       stock:50,   sold:40,   city:"Алматы",        unit:"л",   date:"2026-04-20" },
  { product:"Шоко-топпинг 1кг",          group:"Chocofactory",         stock:120,  sold:95,   city:"Астана",        unit:"кг",  date:"2026-04-10" },
  { product:"Белый шоколад 1кг",         group:"Chocofactory",         stock:80,   sold:60,   city:"Алматы",        unit:"кг",  date:"2026-04-12" },
  { product:"Темперомер",                group:"Китайские аксессуары", stock:15,   sold:8,    city:"Астана",        unit:"шт",  date:"2026-04-05" },
  { product:"Питчер 600мл",              group:"Китайские аксессуары", stock:40,   sold:28,   city:"Алматы",        unit:"шт",  date:"2026-04-08" },
  { product:"Кофемашина Dr.Coffee F2+",  group:"Оборудование",         stock:5,    sold:3,    city:"Астана",        unit:"шт",  date:"2026-04-01" },
  { product:"Кофемолка Eureka",          group:"Оборудование",         stock:8,    sold:5,    city:"Алматы",        unit:"шт",  date:"2026-04-03" },
  { product:"Жилет бариста M",           group:"Одежда (Жилеты)",      stock:30,   sold:12,   city:"Астана",        unit:"шт",  date:"2026-04-22" },
  { product:"Жилет бариста L",           group:"Одежда (Жилеты)",      stock:25,   sold:10,   city:"Алматы",        unit:"шт",  date:"2026-04-22" },
  { product:"CAFEDEM G21",               group:"Чистящие средства",    stock:294,  sold:180,  city:"Астана",        unit:"шт",  date:"2026-04-14" },
  { product:"CAFEDEM K41 BIO",           group:"Чистящие средства",    stock:36,   sold:20,   city:"Алматы",        unit:"шт",  date:"2026-04-14" },
  { product:"Пакет крафт 250г",          group:"Пакеты для кофе",      stock:1200, sold:980,  city:"Алматы",        unit:"шт",  date:"2026-04-17" },
  { product:"Пакет крафт 500г",          group:"Пакеты для кофе",      stock:800,  sold:620,  city:"Астана",        unit:"шт",  date:"2026-04-17" },
  { product:"Пакет крафт 1кг",           group:"Пакеты для кофе",      stock:600,  sold:450,  city:"Обжарочный цех",unit:"шт",  date:"2026-04-17" },
  { product:"Упаковка DripBag 12г",      group:"Упаковка для дрипов",  stock:4500, sold:3200, city:"Астана",        unit:"шт",  date:"2026-04-15" },
  { product:"Упаковка DripBag 7г",       group:"Упаковка для дрипов",  stock:2000, sold:1400, city:"Обжарочный цех",unit:"шт",  date:"2026-04-15" },
];

export const INIT_INVOICES = [
  { id:"INV-22", supplier:"Green Origins Ltd",       desc:"Зелёный кофе 500кг",       amount:10000,   paid:5000,   cur:"USD", status:"Частично"   },
  { id:"INV-23", supplier:"DripCraft Supply",         desc:"Упаковка DripBag 10000шт", amount:85000,   paid:0,      cur:"CNY", status:"Не оплачен" },
  { id:"INV-21", supplier:'ТОО "Асроров Фуд Трейд"', desc:"Сиропы апрель",            amount:1200000, paid:1200000,cur:"KZT", status:"Оплачен"    },
];

export const INIT_COFFEE_ORDERS = [
  { id:"COF-012", city:"Астана", date:"21.04.2025", status:"Принят",    items:[{name:"Эспрессо Бленд",qty:400,unit:"кг"},{name:"Бразилия Можиана",qty:250,unit:"кг"},{name:"Бразилия 250г",qty:50,unit:"шт"}] },
  { id:"COF-011", city:"Алматы", date:"20.04.2025", status:"В обжарке", items:[{name:"Space Coffee + этикетки",qty:500,unit:"кг"}] },
  { id:"COF-010", city:"Астана", date:"14.04.2025", status:"Отправлен", items:[{name:"Эспрессо Бленд",qty:380,unit:"кг"}] },
  { id:"COF-009", city:"Алматы", date:"13.04.2025", status:"Получен",   items:[{name:"Бразилия Можиана",qty:200,unit:"кг"}] },
];
