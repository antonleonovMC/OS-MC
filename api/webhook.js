const BOT_TOKEN  = process.env.VITE_TG_BOT_TOKEN;
const SHEETS_URL = process.env.VITE_SHEETS_URL;
const APP_URL    = 'https://os-mc.vercel.app';

const ROLE_LABELS = {
  admin:       'Администратор',
  director_tk: 'Директор ТК',
  warehouse:   'Завскладом',
  reader:      'Читатель',
};

const COLORS = ['#7c3aed','#0d9488','#b45309','#0369a1','#166534','#be185d','#dc2626','#d97706'];

function initials(first, last) {
  return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase() || '??';
}

async function tg(method, body) {
  return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function sheetsAppend(data) {
  if (!SHEETS_URL) return;
  return fetch(SHEETS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'append', sheet: 'Сотрудники', data }),
  }).catch(() => {});
}

async function sheetsUpdateRequest(tgId, status) {
  if (!SHEETS_URL) return;
  // Update status in Запросы sheet — find by tg_id
  return fetch(SHEETS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update', sheet: 'Запросы', id: String(tgId), data: { status } }),
  }).catch(() => {});
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true });

  try {
    const body = req.body;

    // ── /start command ────────────────────────────────────────────────────
    if (body.message?.text?.startsWith('/start')) {
      const chatId = body.message.chat.id;
      await tg('sendMessage', {
        chat_id: chatId,
        text: 'Master Coffee OS\nНажмите кнопку чтобы открыть приложение:',
        reply_markup: {
          inline_keyboard: [[{ text: 'Открыть приложение', web_app: { url: APP_URL } }]],
        },
      });
      return res.status(200).json({ ok: true });
    }

    // ── Callback buttons (grant / deny) ───────────────────────────────────
    if (body.callback_query) {
      const { id: queryId, data, message } = body.callback_query;
      const adminChatId = message?.chat?.id;
      const msgId       = message?.message_id;

      // Always answer the callback to stop the loading spinner
      await tg('answerCallbackQuery', { callback_query_id: queryId });

      const parts = data.split('|');
      const action = parts[0]; // 'grant' or 'deny'

      if (action === 'grant') {
        const [, role, tgId, username, firstName, lastName] = parts;
        const numId    = Number(tgId);
        const fullName = [firstName, lastName].filter(Boolean).join(' ') || username || 'Сотрудник';
        const roleLabel = ROLE_LABELS[role] || role;
        const color    = COLORS[numId % COLORS.length];
        const av       = initials(firstName, lastName);

        // Add to Сотрудники sheet
        await sheetsAppend({
          id:    numId,
          tg:    username ? '@' + username : '',
          tg_id: numId,
          name:  fullName,
          role,
          dept:  '',
          av,
          color,
        });

        // Update request status
        await sheetsUpdateRequest(numId, 'Одобрен');

        // Notify the new user
        await tg('sendMessage', {
          chat_id: numId,
          text: `✅ Доступ открыт!\n\nВам выдана роль: ${roleLabel}\n\nОткройте приложение:`,
          reply_markup: {
            inline_keyboard: [[{ text: 'Открыть Master Coffee OS', web_app: { url: APP_URL } }]],
          },
        });

        // Edit admin message to show resolved
        if (adminChatId && msgId) {
          await tg('editMessageText', {
            chat_id:    adminChatId,
            message_id: msgId,
            text: `✅ Доступ выдан\n\n👤 ${fullName}\n${username ? '@' + username : ''}\nРоль: ${roleLabel}`,
          });
        }

      } else if (action === 'deny') {
        const [, tgId, username, firstName, lastName] = parts;
        const numId    = Number(tgId);
        const fullName = [firstName, lastName].filter(Boolean).join(' ') || username || 'Пользователь';

        // Update request status
        await sheetsUpdateRequest(numId, 'Отклонён');

        // Notify the user
        await tg('sendMessage', {
          chat_id: numId,
          text: 'Ваш запрос на доступ был отклонён.\nОбратитесь к администратору за информацией.',
        });

        // Edit admin message
        if (adminChatId && msgId) {
          await tg('editMessageText', {
            chat_id:    adminChatId,
            message_id: msgId,
            text: `❌ Отклонено\n\n👤 ${fullName}\n${username ? '@' + username : ''}`,
          });
        }
      }

      return res.status(200).json({ ok: true });
    }

  } catch (e) {
    console.error(e);
  }

  res.status(200).json({ ok: true });
}
