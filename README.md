# Master Coffee OS — Procurement System

## Быстрый старт (3 команды)

```bash
# 1. Установить зависимости
npm install

# 2. Запустить локально
npm run dev

# 3. Открыть в браузере
# http://localhost:5173
```

---

## Структура проекта

```
mastercoffee-os/
├── src/
│   ├── App.jsx                  ← главный роутер
│   ├── main.jsx                 ← точка входа React
│   ├── index.css                ← Tailwind CSS
│   │
│   ├── data/
│   │   └── constants.js         ← ВСЕ данные, роли, настройки
│   │
│   ├── components/
│   │   ├── Badge.jsx            ← цветной статус-тег
│   │   ├── Sidebar.jsx          ← боковое меню
│   │   └── StatusTimeline.jsx   ← вертикальный трекер статусов
│   │
│   └── pages/
│       ├── Auth.jsx             ← экран входа (выбор пользователя)
│       ├── Dashboard.jsx        ← главная страница
│       ├── Logistics.jsx        ← логистика / поставки
│       ├── Requests.jsx         ← заявки на закуп
│       ├── Payments.jsx         ← оплата счетов
│       ├── Coffee.jsx           ← кофе-заказы в обжарку
│       └── Tasks.jsx            ← канбан задачи отдела
│
├── public/
│   └── favicon.svg
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

---

## Что куда добавлять

### Новый пользователь
→ `src/data/constants.js` → массив `USERS`

### Новый раздел
1. Создать файл `src/pages/MyPage.jsx`
2. Добавить в `ROLE_ACCESS` в `constants.js`
3. Импортировать и добавить роут в `src/App.jsx`
4. Добавить в `nav` в `src/components/Sidebar.jsx`

### Подключить Google Sheets
→ В `src/data/constants.js` замените `INIT_ORDERS` / `INIT_REQUESTS` 
  на fetch из Google Sheets API или Apps Script Web App URL.

Пример:
```js
// src/data/api.js
export async function fetchOrders() {
  const res = await fetch('YOUR_APPS_SCRIPT_URL?sheet=ORDERS');
  return res.json();
}
```

### Подключить реальный Telegram Login
→ Замените `src/pages/Auth.jsx` на Telegram Login Widget.
  Документация: https://core.telegram.org/widgets/login

---

## Деплой на Vercel (бесплатно)

```bash
npm install -g vercel
vercel
# Следовать инструкциям — проект задеплоится за 1 минуту
```

Или через GitHub:
1. `git init && git add . && git commit -m "init"`
2. Пушите на GitHub
3. Заходите на vercel.com → Import → выбрать репозиторий
4. Deploy — готово, получаете HTTPS ссылку

---

## Роли и доступ

| Роль         | Дашборд | Логистика | Заявки | Кофе | Оплата | Задачи |
|--------------|---------|-----------|--------|------|--------|--------|
| Директор     | ✓       | ✓         | ✓      | ✓    | ✓      | ✓      |
| Менеджер     | ✓       | ✓         | ✓      | ✓    | ✓      | ✓      |
| Директор ТК  | ✓       | ✓         | ✓      | ✓    | —      | —      |
| Завскладом   | ✓       | ✓         | —      | —    | —      | —      |
| Сотрудник    | ✓       | —         | ✓      | —    | —      | —      |

---

## Технологии

- **React 18** — UI
- **Vite** — сборщик (быстрый dev-сервер)
- **Tailwind CSS 3** — стили
- **Без бэкенда** — данные пока в памяти (заменить на API)
