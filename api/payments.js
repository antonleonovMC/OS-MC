const PAYMENTS_URL = process.env.VITE_PAYMENTS_URL;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  if (!PAYMENTS_URL) return res.status(500).json({ error: 'VITE_PAYMENTS_URL not set' });

  const r = await fetch(PAYMENTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(req.body),
    redirect: 'follow',
  });

  const text = await r.text();
  try {
    res.status(200).json(JSON.parse(text));
  } catch {
    res.status(200).json({ ok: true });
  }
}
