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
