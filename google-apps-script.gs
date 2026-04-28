// ═══════════════════════════════════════════════════════════════
//  Master Coffee OS — Google Apps Script
//  Вставить в: Google Таблица → Расширения → Apps Script
// ═══════════════════════════════════════════════════════════════

const SS = SpreadsheetApp.getActiveSpreadsheet();

// ── ЗАПУСТИ ЭТУ ФУНКЦИЮ ОДИН РАЗ для создания всех листов ──────
// Выбери setupSheets в выпадающем списке функций → нажми ▶ Выполнить
function setupSheets() {
  const sheets = {
    'Заказы': [
      'id','code','title','supplier','warehouse','planDate',
      'status','country','comment','items','created','history'
    ],
    'Заявки': [
      'id','employee','dept','category','product',
      'qty','urgency','date','status','comment'
    ],
    'Счета': [
      'id','supplier','desc','amount','paid',
      'cur','status','dueDate','comment','payments'
    ],
    'Кофе': [
      'id','city','date','status','items'
    ],
    'Задачи': [
      'id','title','priority','assignee','status',
      'subtasks','comments','due'
    ],
    'Обратная связь': [
      'date','user','role','type','section',
      'priority','title','body','contact'
    ],
    'Сотрудники': [
      'id','tg','tg_id','name','role','dept','av','color'
    ],
    'Запросы': [
      'date','tg_id','username','first_name','last_name','status','role'
    ],
    'Аналитика': [
      '','','','','',  // твой свободный лист — заголовки не трогаем
    ],
  };

  for (const [name, headers] of Object.entries(sheets)) {
    let sheet = SS.getSheetByName(name);

    // Создаём лист если не существует
    if (!sheet) {
      sheet = SS.insertSheet(name);
      Logger.log('Создан лист: ' + name);
    } else {
      Logger.log('Лист уже существует: ' + name);
    }

    // Для Аналитики заголовки не трогаем
    if (name === 'Аналитика') continue;

    // Пишем заголовки в строку 1 только если лист пустой
    if (sheet.getLastRow() === 0) {
      const range = sheet.getRange(1, 1, 1, headers.length);
      range.setValues([headers]);

      // Стиль заголовков
      range.setBackground('#1a3a42');
      range.setFontColor('#ffffff');
      range.setFontWeight('bold');
      range.setFontSize(10);

      // Зафиксировать первую строку
      sheet.setFrozenRows(1);

      // Авто-ширина колонок
      sheet.autoResizeColumns(1, headers.length);

      Logger.log('Заголовки добавлены: ' + name);
    } else {
      Logger.log('Заголовки уже есть, пропускаем: ' + name);
    }
  }

  // Удаляем стандартный "Лист1" если он пустой
  const defaultSheet = SS.getSheetByName('Лист1') || SS.getSheetByName('Sheet1');
  if (defaultSheet && defaultSheet.getLastRow() === 0) {
    SS.deleteSheet(defaultSheet);
    Logger.log('Удалён пустой лист по умолчанию');
  }

  SpreadsheetApp.getUi().alert('✅ Готово! Все листы Master Coffee OS созданы.');
}


// ═══════════════════════════════════════════════════════════════
//  Ниже — основной код API (не трогать)
// ═══════════════════════════════════════════════════════════════

function doGet(e) {
  try {
    const sheetName = e.parameter.sheet;
    const sheet = SS.getSheetByName(sheetName);
    if (!sheet) return json({ error: 'Лист не найден: ' + sheetName });

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return json({ rows: [] });

    const headers = data[0];
    const rows = data.slice(1).map(row =>
      Object.fromEntries(headers.map((h, i) => [h, row[i] ?? '']))
    );

    return json({ rows });
  } catch (err) {
    return json({ error: err.message });
  }
}

const BOT_TOKEN = '8740508950:AAGddYGgY1DSC93wPIt_lG0kx2PGAYHAK3o';
const APP_URL   = 'https://os-mc.vercel.app';

function sendTg(chatId, text, replyMarkup) {
  const payload = { chat_id: chatId, text: text };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  UrlFetchApp.fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    // ── Telegram webhook ──────────────────────────────────────────
    if (body.message || body.callback_query) {
      const msg    = body.message || body.callback_query?.message;
      const chatId = msg?.chat?.id;
      const text   = msg?.text || '';

      if (chatId && text.startsWith('/start')) {
        sendTg(chatId,
          'Master Coffee OS\nНажмите кнопку ниже чтобы открыть приложение:',
          { inline_keyboard: [[{ text: 'Открыть приложение', web_app: { url: APP_URL } }]] }
        );
      }
      return json({ ok: true });
    }

    // ── Sheets API ────────────────────────────────────────────────
    const { action, sheet: sheetName, id, data } = body;

    const sheet = SS.getSheetByName(sheetName);
    if (!sheet) return json({ error: 'Лист не найден: ' + sheetName });

    const allValues = sheet.getDataRange().getValues();
    const headers   = allValues[0];

    if (action === 'append') {
      const row = headers.map(h => data[h] !== undefined ? data[h] : '');
      sheet.appendRow(row);
      return json({ ok: true, action: 'append' });
    }

    if (action === 'update') {
      const idCol = headers.indexOf('id');
      if (idCol < 0) return json({ error: 'Колонка id не найдена' });

      for (let r = 1; r < allValues.length; r++) {
        if (String(allValues[r][idCol]) === String(id)) {
          Object.entries(data).forEach(([key, val]) => {
            const col = headers.indexOf(key);
            if (col >= 0) sheet.getRange(r + 1, col + 1).setValue(val);
          });
          return json({ ok: true, action: 'update', row: r + 1 });
        }
      }
      return json({ error: 'Строка с id=' + id + ' не найдена' });
    }

    if (action === 'delete') {
      const idCol = headers.indexOf('id');
      if (idCol < 0) return json({ error: 'Колонка id не найдена' });

      for (let r = 1; r < allValues.length; r++) {
        if (String(allValues[r][idCol]) === String(id)) {
          sheet.deleteRow(r + 1);
          return json({ ok: true, action: 'delete', row: r + 1 });
        }
      }
      return json({ error: 'Строка с id=' + id + ' не найдена' });
    }

    return json({ error: 'Неизвестный action: ' + action });

  } catch (err) {
    return json({ error: err.message });
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
