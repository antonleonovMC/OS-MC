const BOT_TOKEN = process.env.VITE_TG_BOT_TOKEN;
const APP_URL   = 'https://os-mc.vercel.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true });

  try {
    const body = req.body;
    const msg  = body?.message;
    if (!msg) return res.status(200).json({ ok: true });

    const chatId = msg.chat?.id;
    const text   = msg.text || '';

    if (chatId && text.startsWith('/start')) {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: 'Master Coffee OS\nНажмите кнопку чтобы открыть приложение:',
          reply_markup: {
            inline_keyboard: [[{
              text: 'Открыть приложение',
              web_app: { url: APP_URL },
            }]],
          },
        }),
      });
    }
  } catch {}

  res.status(200).json({ ok: true });
}
