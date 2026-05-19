# Master Coffee OS — Project Context

## Stack
React 18 + Vite + Tailwind CSS + Framer Motion + Recharts + Sonner toasts.
Deployed on Vercel. Data stored in Google Sheets via Apps Script Web App.

## Brand
- Primary: `#28798d` (BRAND)
- Dark: `#1a3a42` (DARK)
- Background: `#f4f8f9`
- Logo: `/logo.png` (local, in /public)

## Roles & Access
| Role | Label | Access |
|------|-------|--------|
| `admin` | Администратор | All pages (Айгуль Аймаханова, Антон Леонов) |
| `director_tk` | Директор ТК | dashboard, logistics, requests, coffee, feedback |
| `warehouse` | Завскладом | dashboard, logistics, requests, coffee, feedback |
| `reader` | Читатель | dashboard, requests, feedback |

**Only `admin` can:** create/edit logistics orders, approve/reject requests, manage payments, tasks.

## Authentication Flow
1. **Telegram Mini App**: auto-reads `window.Telegram.WebApp.initDataUnsafe.user`
2. **Browser**: Telegram Login Widget (requires `VITE_TG_BOT` env var = bot username)
3. Match by `tg_id` (number) first, then by `@username` fallback
4. **Session persistence**: after login, save `tg_id` to `localStorage('mc_tg_id')`. On next open, auto-login if tg_id matches a known user — skip auth screen entirely.
5. **Unknown user**: save to Google Sheets "Запросы" sheet, show waiting screen
6. **Admin reviews** "Запросы" sheet, adds user to "Сотрудники" sheet with a role

## Google Sheets Structure
URL stored in `.env` as `VITE_SHEETS_URL`. Also in Vercel Environment Variables.

| Sheet | Key columns |
|-------|-------------|
| Заказы | id, code, title, supplier, warehouse, planDate, status, country, comment, items (JSON), created, history (JSON) |
| Заявки | id, employee, dept, category, product, qty, urgency, date, status, comment |
| Счета | id, supplier, desc, amount, paid, cur, status, dueDate, comment, payments (JSON) |
| Кофе | id, city, date, status, items (JSON) |
| Задачи | id, title, priority, assignee, status, subtasks (JSON), comments (JSON), due |
| Сотрудники | id, tg, tg_id, name, role, dept, av, color |
| Запросы | date, tg_id, username, first_name, last_name, status, role |
| Подписки | tg_id, order_id, order_title |
| Обратная связь | date, user, role, type, section, priority, title, body, contact |
| Аналитика | (free sheet for Anton's personal analysis) |

## Telegram Bot
- Bot username: `VITE_TG_BOT` env var (for Login Widget in browser)
- Bot token: `VITE_TG_BOT_TOKEN` env var (for sending notifications)
- Notifications sent when: order status changes, order details edited
- Recipients: users subscribed to that order (stored in "Подписки" sheet)
- Bot must have domain set via BotFather `/setdomain` → `os-mc.vercel.app`

## Logistics Edit Rules
- Only `admin` role can edit existing orders
- Editable fields: title, supplier, planDate, country, warehouse, comment, items
- On save: update Google Sheets + notify all subscribers via Telegram Bot API
- Status change also triggers notification to subscribers

## Status History
- `makeHistory()` — seed/demo data only (fake dates)
- `advanceHistory(existingHistory, newStatus)` — real use, records actual Astana time (UTC+5)
- On create: first status "Принят" gets current Astana timestamp
- History entries are preserved when advancing — only new status gets new timestamp

## Key Files
- `src/data/constants.js` — USERS, ROLE_ACCESS, STATUS_FLOW, seed data
- `src/context/DataContext.jsx` — global state + Sheets sync, wrap entire app
- `src/lib/sheetsAPI.js` — fetch/append/update/delete rows in Sheets
- `src/pages/Auth.jsx` — Telegram auth with auto-login, widget, pending flow
- `src/pages/Logistics.jsx` — orders list/detail/edit, subscriptions
- `src/components/Avatar.jsx` — shows Telegram photo_url or colored initials fallback
- `google-apps-script.gs` — paste into Sheets Apps Script, run setupSheets() once

## Env Variables
```
VITE_SHEETS_URL=https://script.google.com/macros/s/.../exec
VITE_TG_BOT=bot_username_without_@
VITE_TG_BOT_TOKEN=123456:ABC-token-from-botfather
```

---

## Текущее состояние страниц

| Страница | Статус | Описание |
|----------|--------|----------|
| Dashboard | ✅ Готов | Сводка по заказам, заявкам, задачам |
| Logistics | ✅ Готов | Заказы, статусы, редактирование, подписки |
| Requests | ✅ Готов | Заявки сотрудников на закупку |
| Payments | ⚠️ Базовый | Заявки на оплату — нужно развитие |
| Tasks | ✅ Готов | Задачи с подзадачами и комментариями |
| Coffee | ✅ Готов | Кофе-заказы по городам |
| Staff | ✅ Готов | Список сотрудников |
| Feedback | ✅ Готов | Обратная связь |

---

## Раздел Оплаты — что нужно доработать

### Текущие проблемы
- Нет прикрепления документов (счёт, акт, договор)
- Нет истории изменений по каждой заявке
- Нет бюджета по категориям — непонятно сколько уже потрачено
- Нет просроченных платежей (overdue) — нет визуального предупреждения
- Нет реквизитов получателя (БИН, ИИК, БИК, банк)
- Нет подтверждения факта оплаты (прикрепить чек/скриншот)
- Конвертация валют примерная ($1 = 500 ₸ — захардкожено)
- Нет повторяющихся платежей (аренда, подписки)
- Нет аналитики расходов по категориям/месяцам
- Нет экспорта в Excel для бухгалтерии

### Что добавить (приоритет)

**Высокий:**
- [ ] Прикрепить файл к заявке (счёт PDF/фото) — через Google Drive
- [ ] Реквизиты получателя (БИН, ИИК, банк) — поле в форме
- [ ] Overdue-флаг — красная метка если срок прошёл а не оплачено
- [ ] История изменений по заявке (кто, когда, что изменил)
- [ ] Реальный курс валют из API Нацбанка РК (nationalbank.kz)

**Средний:**
- [ ] Бюджет по категориям — лимит + сколько использовано (прогресс-бар)
- [ ] Повторяющиеся платежи (ежемесячная аренда, подписки)
- [ ] Подтверждение оплаты — прикрепить чек/скриншот платежа
- [ ] Telegram-уведомление при смене статуса заявки
- [ ] Фильтр по периоду (месяц / квартал / год)
- [ ] Аналитика: график расходов по месяцам, pie chart по категориям

**Низкий:**
- [ ] Экспорт заявок в Excel для бухгалтерии
- [ ] Согласование в 2 шага (директор ТК → администратор)
- [ ] Шаблоны платежей (повторяющиеся получатели)

---

## Что добавить в MC OS (на основе анализа рынка)

Сравнение с ProcureDesk, Zoho Procurement, Procurify, Monday.com показало:

### Ближайшие (1-2 недели)
- [ ] **Курс валют live** — виджет на Dashboard, USD/EUR/CNY из nationalbank.kz
- [ ] **Overdue-уведомления** — напоминание за 3 дня до дедлайна поставки или оплаты
- [ ] **Глобальный поиск** — по заказам, заявкам, счетам сразу
- [ ] **Аналитика Dashboard** — расходы по категориям, топ поставщики, динамика

### Среднесрочные (1 месяц)
- [ ] **Карточки поставщиков** — контакты, история заказов, средние цены, рейтинг
- [ ] **Сравнение КП** — загрузить 2-3 предложения, система выделяет лучшее
- [ ] **Шаблоны заявок** — часто повторяющиеся заявки сохранить как шаблон
- [ ] **Push через Telegram** — проактивные уведомления, не только статус-чейнж

### Долгосрочные (3+ месяца)
- [ ] **Контракты** — хранение договоров, даты окончания, авто-напоминание
- [ ] **Трёхсторонняя сверка** — ПО + приход на склад + счёт = авто-проверка
- [ ] **Прогнозирование** — на основе истории: когда и сколько закупать
- [ ] **White label** — ребрендинг для других компаний РК, продажа как SaaS

---

## Скиллы и плагины для разработки

- `superpowers:brainstorming` — проектировать новые фичи перед реализацией
- `superpowers:writing-plans` — детальный план реализации
- `superpowers:frontend-design` — UI компоненты

### Внешние API
- **Нацбанк РК** — курсы валют: `https://nationalbank.kz/rss/rates_all.xml`
- **Telegram Bot API** — уведомления (уже подключён)
- **Google Drive API** — хранение прикреплённых файлов

---

## Бизнес-контекст

**Компания:** Master Coffee (Казахстан, Алматы + Астана)
**Продукт:** Внутренняя операционная система — закупки, логистика, заявки, оплаты
**Аудитория:** 5-15 сотрудников (закупки, логистика, склад, директор ТК)
**Цель:** Обкатать на MC → продать другим компаниям РК как SaaS

**Ценообразование при продаже:**
- До 10 сотрудников: 150 000 — 300 000 ₸ внедрение + 50 000 ₸/мес
- Вся компания: 500 000 — 800 000 ₸ + 100 000 ₸/мес
