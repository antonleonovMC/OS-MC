const CURRENCIES = ['USD', 'EUR', 'CNY', 'RUB'];
const CACHE = { data: null, ts: 0 };
const TTL = 60 * 60 * 1000; // 1 час

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Отдаём кэш если свежий
  if (CACHE.data && Date.now() - CACHE.ts < TTL) {
    return res.status(200).json(CACHE.data);
  }

  try {
    const r = await fetch('https://nationalbank.kz/rss/rates_all.xml', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const xml = await r.text();

    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[1]);
    const rates = {};

    for (const item of items) {
      const code   = (item.match(/<title>(.*?)<\/title>/)              || [])[1]?.trim();
      const value  = parseFloat((item.match(/<description>(.*?)<\/description>/) || [])[1]);
      const quant  = parseInt( (item.match(/<quant>(.*?)<\/quant>/)    || [])[1]) || 1;
      const change = parseFloat((item.match(/<change>(.*?)<\/change>/) || [])[1] || '0');

      if (code && CURRENCIES.includes(code) && !isNaN(value)) {
        rates[code] = {
          rate:   +(value / quant).toFixed(2),
          change: +change.toFixed(2),
        };
      }
    }

    const result = { rates, updated: new Date().toISOString() };
    CACHE.data = result;
    CACHE.ts   = Date.now();
    return res.status(200).json(result);
  } catch (err) {
    // Фоллбэк — примерные курсы если нацбанк не ответил
    return res.status(200).json({
      rates: {
        USD: { rate: 0, change: 0 },
        EUR: { rate: 0, change: 0 },
        CNY: { rate: 0, change: 0 },
        RUB: { rate: 0, change: 0 },
      },
      error: err.message,
    });
  }
}
