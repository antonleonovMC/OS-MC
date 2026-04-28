// Google Apps Script Web App URL — set in .env as VITE_SHEETS_URL
const BASE = import.meta.env.VITE_SHEETS_URL || '';

export const sheetsReady = () => !!BASE;

// ── Read all rows from a sheet ─────────────────────────────────────────────
export async function fetchSheet(sheet) {
  if (!BASE) throw new Error('no-url');
  const res = await fetch(`${BASE}?sheet=${encodeURIComponent(sheet)}`);
  const json = await res.json();
  return json.rows || [];
}

// ── Append a new row ───────────────────────────────────────────────────────
export async function appendRow(sheet, data) {
  if (!BASE) return;
  fetch(BASE, {
    method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'append', sheet, data }),
  }).catch(() => {});
}

// ── Update a row by id field ───────────────────────────────────────────────
export async function updateRow(sheet, id, data) {
  if (!BASE) return;
  fetch(BASE, {
    method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update', sheet, id, data }),
  }).catch(() => {});
}

// ── Delete a row by id ─────────────────────────────────────────────────────
export async function deleteRow(sheet, id) {
  if (!BASE) return;
  fetch(BASE, {
    method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', sheet, id }),
  }).catch(() => {});
}

// ── Parse JSON fields that come as strings from Sheets ────────────────────
export function parseRow(row, jsonFields = []) {
  const out = { ...row };
  for (const f of jsonFields) {
    if (typeof out[f] === 'string') {
      try { out[f] = JSON.parse(out[f]); } catch { out[f] = []; }
    }
  }
  return out;
}

// ── Send access request (unknown user) ────────────────────────────────────
export async function sendAccessRequest(data) {
  if (!BASE) return;
  return fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'append', sheet: 'Запросы', data }),
  }).catch(() => {});
}

// ── Send Telegram notification via Bot API ─────────────────────────────────
export async function notifyTelegram(chatId, text) {
  const token = import.meta.env.VITE_TG_BOT_TOKEN;
  if (!token || !chatId) return;
  return fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  }).catch(() => {});
}
