// ═══════════════════════════════════════════════════════════════
//  Master Coffee OS — Google Apps Script
//  Вставить в: Google Таблица → Расширения → Apps Script
// ═══════════════════════════════════════════════════════════════

const SS = SpreadsheetApp.getActiveSpreadsheet();

// ── ЗАПУСТИ ЭТУ ФУНКЦИЮ ОДИН РАЗ для создания всех листов ──────
// Выбери setupSheets в выпадающем списке → нажми ▶ Выполнить
function setupSheets() {
  const sheets = {
    'Заказы': [
      'id','code','title','supplier','warehouse','planDate',
      'status','country','comment','items','created','history'
    ],
    'Заявки': [
      'id','employee','dept','category','product',
      'qty','urgency','date','status','comment','reject_reason'
    ],
    'Счета': [
      'id','supplier','desc','amount','paid',
      'cur','status','dueDate','comment','payments'
    ],
    'Кофе': [
      'id','city','date','deliveryDate','status','items'
    ],
    'Настройки Кофе': [
      'Светлая Обжарка','Средняя Обжарка','Тёмная Обжарка','Дрип Кофе'
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
    'Подписки': [
      'id','tg_id','order_id','order_title'
    ],
    'Заявки на оплату': [
      'id','requester','legal_entity','recipient','amount','currency',
      'category','due_date','purpose','comment','status',
      'reject_reason','confirmed_by','confirmed_at','paid_by','paid_at','created'
    ],
    'Данные дашборда': [
      'city','product_group','date_start','date_end','product_name','stock','sales_total','sales_per_day'
    ],
    'Настройки': [
      'Город','Категория товаров'
    ],
    'Аналитика': [
      '','','','','',
    ],
  };

  for (const [name, headers] of Object.entries(sheets)) {
    let sheet = SS.getSheetByName(name);

    if (!sheet) {
      sheet = SS.insertSheet(name);
      Logger.log('Создан лист: ' + name);
    } else {
      Logger.log('Лист уже существует: ' + name);
    }

    if (name === 'Аналитика') continue;

    if (sheet.getLastRow() === 0) {
      const range = sheet.getRange(1, 1, 1, headers.length);
      range.setValues([headers]);
      range.setBackground('#1a3a42');
      range.setFontColor('#ffffff');
      range.setFontWeight('bold');
      range.setFontSize(10);
      sheet.setFrozenRows(1);
      sheet.autoResizeColumns(1, headers.length);
      Logger.log('Заголовки добавлены: ' + name);
    } else {
      Logger.log('Заголовки уже есть, пропускаем: ' + name);
    }
  }

  const defaultSheet = SS.getSheetByName('Лист1') || SS.getSheetByName('Sheet1');
  if (defaultSheet && defaultSheet.getLastRow() === 0) {
    SS.deleteSheet(defaultSheet);
  }

  // ── Заполняем Настройки (только если лист пустой) ──────────────
  // Столбец A = Города, Столбец B = Категории товаров
  // Редактируй прямо в таблице — изменения сразу появятся в дашборде
  const settingsSheet = SS.getSheetByName('Настройки');
  if (settingsSheet && settingsSheet.getLastRow() <= 1) {
    const cities = [
      'Астана',
      'Алматы',
      'Обжарочный Цех',
      'Склад С341/6',
    ];
    const groups = [
      'Сиропы Fructis',
      'Чистящие средства Cafedem',
      'Жилеты',
      'Кит. Аксессуары',
      'Упаковка для Каспи',
      'Крафт пакеты',
      'Оборудование',
      'Chocofactory',
    ];
    const maxRows = Math.max(cities.length, groups.length);
    for (let i = 0; i < maxRows; i++) {
      settingsSheet.appendRow([cities[i] || '', groups[i] || '']);
    }

    // Стиль строк с данными
    settingsSheet.getRange(2, 1, maxRows, 2).setBackground('#f4f8f9');
    settingsSheet.autoResizeColumns(1, 2);
    Logger.log('Настройки заполнены');
  }

  // ── Заполняем Настройки Кофе (только если лист пустой) ────────
  const cofSheet = SS.getSheetByName('Настройки Кофе');
  if (cofSheet && cofSheet.getLastRow() <= 1) {
    // Каждый столбец = группа. Строки = названия кофе в этой группе
    const coffeeDefaults = [
      ['Эфиопия Йиргачефф', 'Бразилия Можиана', 'Эспрессо Бленд', 'Дрип Эфиопия'],
      ['Кения АА',          'Колумбия Уила',    'Space Coffee',   'Дрип Бразилия'],
      ['',                  '',                 '',               'Дрип Колумбия'],
    ];
    cofSheet.getRange(2, 1, coffeeDefaults.length, 4).setValues(coffeeDefaults);
    cofSheet.getRange(2, 1, coffeeDefaults.length, 4).setBackground('#f4f8f9');
    cofSheet.autoResizeColumns(1, 4);
    Logger.log('Настройки Кофе заполнены примерами');
  }

  // ── Дропдауны в "Данные дашборда" ссылаются на Настройки ───────
  // Используем большой диапазон A2:A1000 / B2:B1000 — новые строки
  // подхватываются автоматически без повторного запуска setupSheets
  applyDashboardValidation();

  SpreadsheetApp.getUi().alert('✅ Готово! Все листы Master Coffee OS созданы.');
}

// Вызови отдельно если нужно обновить только валидацию дропдаунов
function applyDashboardValidation() {
  const dashSheet     = SS.getSheetByName('Данные дашборда');
  const settingsSheet = SS.getSheetByName('Настройки');
  if (!dashSheet || !settingsSheet) return;

  // Диапазоны на 1000 строк — новый город/категория в Настройках
  // сразу появляется в выпадающем списке без пересохранения правил
  const cityRange  = settingsSheet.getRange('A2:A1000');
  const groupRange = settingsSheet.getRange('B2:B1000');

  const cityRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(cityRange, true)
    .setAllowInvalid(false)
    .build();
  dashSheet.getRange(2, 1, 1000, 1).setDataValidation(cityRule);

  const groupRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(groupRange, true)
    .setAllowInvalid(false)
    .build();
  dashSheet.getRange(2, 2, 1000, 1).setDataValidation(groupRule);

  Logger.log('Валидация дропдаунов обновлена');
}


// ═══════════════════════════════════════════════════════════════
//  Основной код API (не трогать)
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

const BOT_TOKEN = PropertiesService.getScriptProperties().getProperty('BOT_TOKEN')
  || '8740508950:AAGddYGgY1DSC93wPIt_lG0kx2PGAYHAK3o';
const APP_URL   = 'https://os-mc.vercel.app';

function sendTg(chatId, text, replyMarkup, parseMode) {
  const payload = {
    chat_id:    chatId,
    text:       text,
    parse_mode: parseMode || 'HTML',
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  UrlFetchApp.fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage', {
    method:          'post',
    contentType:     'application/json',
    payload:         JSON.stringify(payload),
    muteHttpExceptions: true,
  });
}

function editTg(chatId, messageId, text) {
  UrlFetchApp.fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/editMessageText', {
    method:      'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      chat_id:    chatId,
      message_id: messageId,
      text:       text,
      parse_mode: 'HTML',
    }),
    muteHttpExceptions: true,
  });
}

function answerCb(callbackQueryId, text) {
  UrlFetchApp.fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/answerCallbackQuery', {
    method:      'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      callback_query_id: callbackQueryId,
      text:              text || '',
      show_alert:        false,
    }),
    muteHttpExceptions: true,
  });
}

// ── Доступы и подписи ролей (используются при выдаче доступа из Telegram) ──
const ROLE_LABELS = {
  admin:         'Администратор',
  director_tk:   'Директор ТК',
  warehouse:     'Завскладом',
  sales_manager: 'Менеджер отдела продаж',
  roaster:       'Обжарщик',
  reader:        'Читатель',
};

const ROLE_DEPT = {
  admin:         'Управляющая компания',
  director_tk:   'ТК',
  warehouse:     'Склад',
  sales_manager: 'Отдел продаж',
  roaster:       'Обжарочный цех',
  reader:        'Прочее',
};

const AVATAR_COLORS = ['#7c3aed','#0d9488','#b45309','#0369a1','#166534','#be185d','#0891b2','#dc2626'];

function pickColor(seed) {
  let h = 0;
  const s = String(seed || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// Достаёт строку из листа "Запросы" по tg_id
function findRequestRow(tgId) {
  const sheet = SS.getSheetByName('Запросы');
  if (!sheet) return null;
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol   = headers.indexOf('tg_id');
  if (idCol < 0) return null;
  for (let r = data.length - 1; r >= 1; r--) {
    if (String(data[r][idCol]) === String(tgId)) {
      const obj = {};
      headers.forEach((h, i) => obj[h] = data[r][i]);
      return { row: r + 1, headers, data: obj, sheet };
    }
  }
  return null;
}

function updateRequestStatus(tgId, status, role) {
  const found = findRequestRow(tgId);
  if (!found) return;
  const { sheet, headers, row } = found;
  const sCol = headers.indexOf('status');
  const rCol = headers.indexOf('role');
  if (sCol >= 0) sheet.getRange(row, sCol + 1).setValue(status);
  if (rCol >= 0 && role) sheet.getRange(row, rCol + 1).setValue(role);
}

// Добавляет нового сотрудника в лист "Сотрудники" (если ещё нет)
function addStaffMember(req, role) {
  const sheet = SS.getSheetByName('Сотрудники');
  if (!sheet) return;
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];

  const tgIdCol = headers.indexOf('tg_id');
  const tgCol   = headers.indexOf('tg');

  // уже есть — обновим роль и больше ничего не дублируем
  for (let r = 1; r < data.length; r++) {
    if (tgIdCol >= 0 && String(data[r][tgIdCol]) === String(req.tg_id)) {
      const roleCol = headers.indexOf('role');
      if (roleCol >= 0) sheet.getRange(r + 1, roleCol + 1).setValue(role);
      return;
    }
    if (tgCol >= 0 && req.username && String(data[r][tgCol]).replace('@','').toLowerCase() === String(req.username).replace('@','').toLowerCase()) {
      const roleCol  = headers.indexOf('role');
      const tgIdCol2 = headers.indexOf('tg_id');
      if (roleCol  >= 0) sheet.getRange(r + 1, roleCol + 1).setValue(role);
      if (tgIdCol2 >= 0 && req.tg_id) sheet.getRange(r + 1, tgIdCol2 + 1).setValue(Number(req.tg_id));
      return;
    }
  }

  // новый сотрудник
  const fullName = [req.first_name, req.last_name].filter(Boolean).join(' ') || req.username || ('User ' + req.tg_id);
  const initials = fullName.split(/\s+/).slice(0, 2).map(p => p.charAt(0).toUpperCase()).join('') || '??';
  const newId    = (data.length); // headers + N rows → next id ≈ N
  const newRow = headers.map(h => {
    switch (h) {
      case 'id':    return newId;
      case 'tg':    return req.username ? (String(req.username).indexOf('@') === 0 ? req.username : '@' + req.username) : '';
      case 'tg_id': return Number(req.tg_id) || '';
      case 'name':  return fullName;
      case 'role':  return role;
      case 'dept':  return ROLE_DEPT[role] || '';
      case 'av':    return initials;
      case 'color': return pickColor(req.tg_id || fullName);
      default:      return '';
    }
  });
  sheet.appendRow(newRow);
}

function handleAccessCallback(cb) {
  const data       = String(cb.data || '');
  const fromChatId = cb.message && cb.message.chat && cb.message.chat.id;
  const messageId  = cb.message && cb.message.message_id;
  const adminName  = (cb.from && (cb.from.first_name || cb.from.username)) || 'Админ';

  const parts  = data.split('|');
  const action = parts[0];

  // Формат:
  //   g|<role>|<tg_id>   — выдать роль
  //   d|<tg_id>          — отклонить
  if (action !== 'g' && action !== 'd') {
    answerCb(cb.id, '');
    return;
  }

  const role  = action === 'g' ? parts[1] : '';
  const tgId  = action === 'g' ? parts[2] : parts[1];
  const found = findRequestRow(tgId);
  if (!found) {
    answerCb(cb.id, 'Запрос не найден');
    if (fromChatId && messageId) {
      editTg(fromChatId, messageId, '⚠️ Запрос не найден в листе «Запросы». Возможно, он уже обработан.');
    }
    return;
  }
  const req = found.data;

  const fullName = [req.first_name, req.last_name].filter(Boolean).join(' ') || req.username || ('ID ' + tgId);
  const userTag  = req.username ? (String(req.username).indexOf('@') === 0 ? req.username : '@' + req.username) : '';

  if (action === 'g') {
    if (!ROLE_LABELS[role]) {
      answerCb(cb.id, 'Неизвестная роль');
      return;
    }
    addStaffMember({
      tg_id:      tgId,
      username:   req.username,
      first_name: req.first_name,
      last_name:  req.last_name,
    }, role);
    updateRequestStatus(tgId, 'Одобрено', role);
    answerCb(cb.id, 'Доступ выдан: ' + ROLE_LABELS[role]);

    if (fromChatId && messageId) {
      editTg(fromChatId, messageId,
        '✅ <b>Доступ выдан</b>\n\n' +
        '👤 ' + fullName + (userTag ? '\n' + userTag : '') + '\n' +
        '🆔 ID: ' + tgId + '\n' +
        '🎭 Роль: <b>' + ROLE_LABELS[role] + '</b>\n\n' +
        '<i>Выдал: ' + adminName + '</i>'
      );
    }

    sendTg(Number(tgId),
      '🎉 <b>Доступ к Master Coffee OS выдан</b>\n\n' +
      'Ваша роль: <b>' + ROLE_LABELS[role] + '</b>\n\n' +
      'Откройте приложение через бота — кнопка «📦 Открыть приложение».'
    );
  } else { // 'd' → deny
    updateRequestStatus(tgId, 'Отклонено', '');
    answerCb(cb.id, 'Запрос отклонён');

    if (fromChatId && messageId) {
      editTg(fromChatId, messageId,
        '❌ <b>Запрос отклонён</b>\n\n' +
        '👤 ' + fullName + (userTag ? '\n' + userTag : '') + '\n' +
        '🆔 ID: ' + tgId + '\n\n' +
        '<i>Отклонил: ' + adminName + '</i>'
      );
    }

    sendTg(Number(tgId),
      'ℹ️ <b>Запрос на доступ отклонён</b>\n\n' +
      'Если это ошибка — обратитесь к администратору Master Coffee.'
    );
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    // ── Telegram webhook ──────────────────────────────────────────
    if (body.callback_query) {
      handleAccessCallback(body.callback_query);
      return json({ ok: true });
    }
    if (body.message) {
      const msg    = body.message;
      const chatId = msg && msg.chat && msg.chat.id;
      const text   = msg.text || '';

      if (chatId && text.indexOf('/start') === 0) {
        sendTg(chatId,
          '☕ <b>Master Coffee OS</b>\nНажмите кнопку ниже чтобы открыть приложение:',
          { inline_keyboard: [[{ text: '📦 Открыть приложение', web_app: { url: APP_URL } }]] }
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

    // ── Notify subscribers ────────────────────────────────────────
    if (action === 'notify') {
      const { order_id, order_title, lines } = data;
      const subsSheet = SS.getSheetByName('Подписки');
      if (!subsSheet) return json({ ok: true, sent: 0 });

      const subsData    = subsSheet.getDataRange().getValues();
      const subsHeaders = subsData[0];
      const orderIdCol  = subsHeaders.indexOf('order_id');
      const tgIdCol     = subsHeaders.indexOf('tg_id');

      const msg =
        '🚚 <b>Обновление по заказу</b>\n' +
        (order_title || '') + '\n\n' +
        (lines || '') +
        '\n\nБлагодарю, хорошего дня 🙏';

      let sent = 0;
      for (let r = 1; r < subsData.length; r++) {
        if (String(subsData[r][orderIdCol]) === String(order_id)) {
          const tgId = subsData[r][tgIdCol];
          if (tgId) { sendTg(tgId, msg); sent++; }
        }
      }
      return json({ ok: true, action: 'notify', sent });
    }

    // ── Прямое уведомление конкретному пользователю ───────────────
    if (action === 'notify_direct') {
      const { tg_id, message } = data;
      if (tg_id) sendTg(Number(tg_id), message);
      return json({ ok: true, action: 'notify_direct' });
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
