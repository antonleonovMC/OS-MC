const BOT_TOKEN = process.env.VITE_TG_BOT_TOKEN;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { tg_ids, text } = req.body;
  if (!tg_ids?.length || !text) return res.status(400).json({ error: 'missing fields' });

  const results = await Promise.allSettled(
    tg_ids.map(chat_id =>
      fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id, text, parse_mode: 'HTML' }),
      }).then(r => r.json())
    )
  );

  const sent   = results.filter(r => r.status === 'fulfilled' && r.value?.ok).length;
  const failed = results.filter(r => r.status === 'rejected' || !r.value?.ok).length;
  res.status(200).json({ ok: true, sent, failed });
}
