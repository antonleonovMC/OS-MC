const BOT_TOKEN = process.env.VITE_TG_BOT_TOKEN;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { chat_id, text, reply_markup } = req.body;
  if (!chat_id || !text) return res.status(400).json({ error: 'missing fields' });

  const { parse_mode } = req.body;
  const body = { chat_id, text, parse_mode: parse_mode || 'HTML' };
  if (reply_markup) body.reply_markup = reply_markup;

  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await r.json();
  res.status(200).json(json);
}
