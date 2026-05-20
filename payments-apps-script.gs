// ═══════════════════════════════════════════════════════════
//  КОНФИГУРАЦИЯ
// ═══════════════════════════════════════════════════════════
const BOT_TOKEN  = '8740508950:AAGddYGgY1DSC93wPIt_lG0kx2PGAYHAK3o';
const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbx8aUWlnWV-P0c3hc6Jl5eZPtdSvhpsEgJy2cn4jAWm59z530uOtVyJ6uD58KhHaSGEXQ/exec';
const STATUS_PAID = 'Оплачено';

// ═══════════════════════════════════════════════════════════
//  УСТАНОВКА ТРИГГЕРОВ — запустить один раз вручную!
// ═══════════════════════════════════════════════════════════
function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
  });

  ScriptApp.newTrigger("onSheetEdit")
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();

  Logger.log("✅ Триггер успешно установлен!");
  SpreadsheetApp.getUi().alert("✅ Триггер успешно установлен!\nТеперь скрипт будет работать автоматически.");
}

// ═══════════════════════════════════════════════════════════
//  TELEGRAM
// ═══════════════════════════════════════════════════════════
function sendTg(chatId, text) {
  if (!chatId) return;
  UrlFetchApp.fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: Number(chatId), text: text, parse_mode: 'HTML' }),
    muteHttpExceptions: true,
  });
}

// Обновить статус заявки в листе "Заявки на оплату" через основной GAS
function updateAppStatus(appId, status) {
  if (!appId) return;
  try {
    UrlFetchApp.fetch(SHEETS_URL, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        action: 'update',
        sheet:  'Заявки на оплату',
        id:     appId,
        data:   { status: status },
      }),
      muteHttpExceptions: true,
    });
    Logger.log('✅ Статус обновлён в приложении: ' + appId + ' → ' + status);
  } catch(err) {
    Logger.log('⚠️ updateAppStatus error: ' + err);
  }
}

// ═══════════════════════════════════════════════════════════
//  ОСНОВНОЙ ОБРАБОТЧИК РЕДАКТИРОВАНИЯ
// ═══════════════════════════════════════════════════════════
function onSheetEdit(e) {
  const sheet = e.range.getSheet();
  const row   = e.range.getRow();
  const col   = e.range.getColumn();

  if (row === 1) return;

  // Ищем колонки по заголовку — точное совпадение (нижний регистр)
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  Logger.log('onSheetEdit: row=' + row + ' col=' + col + ' headers=' + JSON.stringify(headers));

  // Очищаем заголовок: убираем переносы строк, текст в скобках, лишние пробелы
  function cleanHeader(h) {
    return String(h)
      .replace(/\n/g, ' ')
      .replace(/\(.*?\)/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }
  function ci(keyword) {
    const kw = keyword.toLowerCase().trim();
    // сначала точное совпадение после очистки
    const exact = headers.findIndex(function(h) { return cleanHeader(h) === kw; });
    if (exact >= 0) return exact;
    // затем частичное
    return headers.findIndex(function(h) { return cleanHeader(h).indexOf(kw) !== -1; });
  }

  const emailIdx    = ci('адрес электронной почты');
  const purposeIdx  = ci('назначение платежа');
  const amountIdx   = ci('сумма');
  const statusIdx   = ci('статус оплаты');
  const confirmIdx  = ci('подтверждение');
  const threadIdx   = ci('id ветки');
  const tgIdIdx     = ci('tg_id');
  const appIdIdx    = ci('app_id');

  Logger.log('cols → email:' + emailIdx + ' status:' + statusIdx + ' confirm:' + confirmIdx + ' tgId:' + tgIdIdx + ' appId:' + appIdIdx);

  const values    = sheet.getRange(row, 1, 1, headers.length).getValues()[0];
  const email     = emailIdx   >= 0 ? values[emailIdx]   : '';
  const purpose   = purposeIdx >= 0 ? values[purposeIdx] : '';
  const amount    = amountIdx  >= 0 ? values[amountIdx]  : '';
  const status    = statusIdx  >= 0 ? values[statusIdx]  : '';
  const confirmed = confirmIdx >= 0 ? values[confirmIdx] : false;
  const threadId  = threadIdx  >= 0 ? values[threadIdx]  : '';
  const tgId      = tgIdIdx    >= 0 ? values[tgIdIdx]    : '';
  const appId     = appIdIdx   >= 0 ? values[appIdIdx]   : '';

  Logger.log('values → email:' + email + ' status:' + status + ' confirmed:' + confirmed + ' tgId:' + tgId + ' appId:' + appId);

  if (!email && !tgId) {
    Logger.log('⚠️ Нет email и tg_id — выходим.');
    return;
  }

  // ── 1. Галочка подтверждения ────────────────────────────
  if (col === confirmIdx + 1 && confirmed === true) {

    // Оплата уже прошла до галочки — подтверждение не нужно
    if (status === STATUS_PAID) {
      Logger.log('ℹ️ Строка ' + row + ': галочка после оплаты — пропускаем подтверждение.');
      return;
    }

    // Ветка уже есть — повтор не нужен
    if (threadId) {
      Logger.log('ℹ️ Строка ' + row + ': ветка уже существует, пропускаем.');
      return;
    }

    // Telegram
    sendTg(tgId,
      '✅ <b>Заявка на оплату подтверждена</b>\n\n' +
      '📋 ' + purpose + '\n' +
      '💰 Сумма: ' + amount + ' ₸\n\n' +
      'Оплата будет произведена в ближайшее время 🙏'
    );

    // Email
    const subject = 'Подтверждение заявки: ' + purpose;
    const body    =
      'Здравствуйте!\n\n' +
      'Ваш запрос на оплату «' + purpose + '» на сумму ' + amount + ' подтверждён.\n' +
      'Оплата будет произведена в ближайшее время.';
    const newThreadId = sendFirstEmailAndGetId(email, subject, body);
    if (newThreadId && threadIdx >= 0) {
      sheet.getRange(row, threadIdx + 1).setValue(newThreadId);
    }

    // Статус в приложении
    updateAppStatus(appId, 'Подтверждена');
    return;
  }

  // ── 2. Статус → «Оплачено» ─────────────────────────────
  if (col === statusIdx + 1 && status === STATUS_PAID) {

    // Telegram — всегда при оплате
    sendTg(tgId,
      '💸 <b>Оплата произведена!</b>\n\n' +
      '📋 ' + purpose + '\n' +
      '💰 Сумма: ' + amount + ' ₸\n\n' +
      'Спасибо, хорошего дня! 🙏'
    );

    // Email
    const body =
      'Здравствуйте!\n\n' +
      'Ваш запрос на оплату «' + purpose + '» на сумму ' + amount + ' успешно оплачен.';
    if (threadId) {
      const success = replyToThread(threadId, email, body);
      if (!success) sendFallbackEmail(email, purpose, amount, body);
    } else {
      sendFallbackEmail(email, purpose, amount, body);
    }

    // Статус в приложении
    updateAppStatus(appId, 'Оплачена');
  }
}

// ═══════════════════════════════════════════════════════════
//  ОТПРАВКА ПЕРВОГО ПИСЬМА
// ═══════════════════════════════════════════════════════════
function sendFirstEmailAndGetId(email, subject, body) {
  try {
    GmailApp.sendEmail(email, subject, body);
    Utilities.sleep(4000);

    const query   = `in:sent to:(${email}) subject:"${subject}"`;
    const threads = GmailApp.search(query, 0, 5);

    if (threads.length > 0) {
      Logger.log(`✅ Первое письмо отправлено: ${email}, threadId: ${threads[0].getId()}`);
      return threads[0].getId();
    }

    const threads2 = GmailApp.search(`in:sent to:(${email})`, 0, 3);
    if (threads2.length > 0) {
      Logger.log(`✅ Ветка найдена запасным поиском: ${threads2[0].getId()}`);
      return threads2[0].getId();
    }

    Logger.log(`⚠️ Письмо отправлено, но ветка не найдена.`);
    return null;

  } catch (err) {
    Logger.log(`❌ Ошибка отправки первого письма: ${err}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════
//  ОТВЕТ В СУЩЕСТВУЮЩУЮ ВЕТКУ
// ═══════════════════════════════════════════════════════════
function replyToThread(threadId, email, body) {
  try {
    const thread = GmailApp.getThreadById(threadId);
    if (!thread) {
      Logger.log(`⚠️ Ветка ${threadId} не найдена в Gmail.`);
      return false;
    }

    const messages   = thread.getMessages();
    const firstMsg   = messages[0];
    const firstMsgId = firstMsg.getId();

    const allMsgIds = messages.map(m => {
      const meta = Gmail.Users.Messages.get("me", m.getId(), {
        format: "metadata",
        metadataHeaders: ["Message-ID"]
      });
      return ((meta.payload.headers || []).find(h => h.name === "Message-ID") || {}).value || "";
    }).filter(Boolean);

    const firstMeta = Gmail.Users.Messages.get("me", firstMsgId, {
      format: "metadata",
      metadataHeaders: ["Message-ID", "Subject"]
    });

    const firstHeaders  = firstMeta.payload.headers || [];
    const getH          = name => (firstHeaders.find(h => h.name === name) || {}).value || "";
    const firstMsgIdHdr = getH("Message-ID");
    const oldSubject    = getH("Subject");

    if (!firstMsgIdHdr) {
      Logger.log(`⚠️ Не удалось получить Message-ID (threadId=${threadId}).`);
      return false;
    }

    const replySubject   = oldSubject.startsWith("Re: ") ? oldSubject : `Re: ${oldSubject}`;
    const encodedSubject = `=?UTF-8?B?${Utilities.base64Encode(replySubject, Utilities.Charset.UTF_8)}?=`;
    const references     = allMsgIds.join(" ");

    const rawEmail = [
      `To: ${email}`,
      `Subject: ${encodedSubject}`,
      `In-Reply-To: ${firstMsgIdHdr}`,
      `References: ${references}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=utf-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      Utilities.base64Encode(body, Utilities.Charset.UTF_8)
    ].join("\r\n");

    Gmail.Users.Messages.send("me", {
      raw: Utilities.base64EncodeWebSafe(rawEmail),
      threadId: threadId
    });

    Logger.log(`✅ Ответ отправлен в ветку ${threadId} → ${email}`);
    return true;

  } catch (err) {
    Logger.log(`❌ Ошибка ответа в ветку: ${err}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
//  РЕЗЕРВНАЯ ОТПРАВКА
// ═══════════════════════════════════════════════════════════
function sendFallbackEmail(email, purpose, amount, body) {
  try {
    const subject = `Оплата произведена: ${purpose}`;
    GmailApp.sendEmail(email, subject, body);
    Logger.log(`✅ Резервное письмо отправлено → ${email}`);
  } catch (err) {
    Logger.log(`❌ Ошибка резервной отправки: ${err}`);
  }
}

// ═══════════════════════════════════════════════════════════
//  MC OS — ПРИЁМ ЗАЯВОК НА ОПЛАТУ
//  Поиск колонок по заголовку — переставляй столбцы как угодно
// ═══════════════════════════════════════════════════════════

// Маппинг: поле из MC OS → точный заголовок в таблице "ук"
// Ключ — поле из формы, значение — начало заголовка колонки (до скобок)
// Колонки: 1-Отметка, 2-Подразделение, 3-ФИО, 4-Дата, 5-Сумма, 6-Поставщик,
//          7-Статья, 8-Назначение, 9-Статус(возмещение), 10-Основание,
//          11-Компания, 12-Режим, 13-Контакты, 14-Договор, 15-Комментарий,
//          16-Email, 18-Статус оплаты
const PAYMENT_MAP = {
  created:          'Отметка времени',
  dept:             'Подразделение',
  requester:        'Должность и ФИО',
  due_date:         'Дата оплаты',
  amount:           'Сумма',
  recipient:        'Наименование поставщика',
  category:         'Статья расходов',
  purpose:          'Назначение платежа',
  is_reimbursement: 'Возмещение',
  basis_file_url:   'Основание для оплаты',
  legal_entity:     'Компания',
  supplier_mode:    'Режим поставщика',
  supplier_contact: 'Контакты поставщика',
  contract_url:     'Договор',
  comment:          'Комментарий',
  email:            'Адрес электронной почты',
  tg_id:            'tg_id',   // добавить колонку в таблицу
  id:               'app_id',  // добавить колонку в таблицу
};

function handleAddPayment(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ук');
  if (!sheet) return { error: 'Лист "ук" не найден' };

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Склеиваем контакт поставщика
  data.supplier_contact = [
    data.supplier_contact_role,
    data.supplier_contact_name,
    data.supplier_contact_phone,
  ].filter(Boolean).join(', ');

  // Текущее время как отметка
  if (!data.created) {
    data.created = Utilities.formatDate(
      new Date(), 'Asia/Almaty', 'dd.MM.yyyy HH:mm:ss'
    );
  }

  // Нормализация: убираем переносы строк, скобки с пояснениями, лишние пробелы
  function norm(h) {
    return String(h || '')
      .replace(/\n/g, ' ')
      .replace(/\(.*?\)/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  // Строим строку по заголовкам — сравниваем нормализованные значения
  const row = headers.map(function(header) {
    const raw = String(header || '').toLowerCase();
    const nh  = norm(header);

    // кол.9: «Статус оплаты (Возмещение)» — определяем по слову "возмещение" в сыром тексте
    if (raw.indexOf('возмещение') !== -1) {
      return data['is_reimbursement'] !== undefined ? data['is_reimbursement'] : '';
    }

    for (var field in PAYMENT_MAP) {
      if (field === 'is_reimbursement') continue; // уже обработано выше
      const nm = norm(PAYMENT_MAP[field]);
      if (nh === nm || nh.indexOf(nm) === 0) {
        return data[field] !== undefined ? data[field] : '';
      }
    }
    return '';
  });

  const colA = sheet.getRange(2, 1, Math.max(sheet.getMaxRows() - 1, 1), 1).getValues();
  let targetRow = sheet.getLastRow() + 1;
  for (var i = 0; i < colA.length; i++) {
    if (colA[i][0] === '' || colA[i][0] === null) { targetRow = i + 2; break; }
  }
  sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
  Logger.log('✅ Заявка добавлена: ' + (data.recipient || '—') + ' — ' + (data.amount || '') + ' ₸');
  return { ok: true };
}

function handleUploadFile(data) {
  const folderName = 'MC OS — Основания оплат';
  const folders    = DriveApp.getFoldersByName(folderName);
  const folder     = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

  const blob = Utilities.newBlob(
    Utilities.base64Decode(data.base64),
    data.mimeType,
    data.name
  );
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  Logger.log('✅ Файл загружен: ' + data.name);
  return { ok: true, url: file.getUrl(), name: data.name };
}

// ═══════════════════════════════════════════════════════════
//  WEB APP — точка входа для MC OS
//  Развернуть → Веб-приложение → Доступ: Все
// ═══════════════════════════════════════════════════════════
// GET используется для addPayment — браузер при редиректе сохраняет GET (в отличие от POST)
function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === 'addPayment') {
      const data = JSON.parse(decodeURIComponent(e.parameter.data || '{}'));
      const result = handleAddPayment(data);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    Logger.log('❌ doGet error: ' + err);
    return ContentService
      .createTextOutput(JSON.stringify({ error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action;
    const data   = body.data || {};

    if (action === 'addPayment') {
      const result = handleAddPayment(data);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'uploadFile') {
      const result = handleUploadFile(data);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Неизвестный action: ' + action }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log('❌ doPost error: ' + err);
    return ContentService
      .createTextOutput(JSON.stringify({ error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
