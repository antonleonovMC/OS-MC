import { useState } from 'react';
import DatePicker from '../components/DatePicker';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useData } from '../context/DataContext';
import Badge from '../components/Badge';
import { fmtDate } from '../lib/fmt';

const BRAND = '#28798d';
const STEP_LABELS = ["Контакты","Структура","Товар","Логистика","Поставщик","Итого"];

function CheckmarkAnim() {
  return (
    <svg width="80" height="80" viewBox="0 0 72 72" fill="none">
      <motion.circle cx="36" cy="36" r="34" stroke={BRAND} strokeWidth="3" fill="white"
        initial={{ pathLength:0, opacity:0 }} animate={{ pathLength:1, opacity:1 }}
        transition={{ duration:0.5, ease:'easeOut' }} />
      <motion.path d="M20 37l11 11 21-22" stroke={BRAND} strokeWidth="4"
        strokeLinecap="round" strokeLinejoin="round" fill="none"
        initial={{ pathLength:0 }} animate={{ pathLength:1 }}
        transition={{ duration:0.45, delay:0.4, ease:'easeOut' }} />
    </svg>
  );
}
function SuccessConfetti() {
  const pieces = Array.from({ length:14 }, (_, i) => ({
    id:i, angle:(i/14)*360,
    color:[BRAND,'#1a3a42','#10b981','#f59e0b','#6366f1','#ef4444'][i%6],
    size: 6+(i%3)*3,
  }));
  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
      {pieces.map(p => {
        const rad = (p.angle*Math.PI)/180;
        return (
          <motion.div key={p.id}
            style={{ position:'absolute', top:'50%', left:'50%',
              width:p.size, height:p.size, borderRadius:p.size/3,
              background:p.color, marginLeft:-p.size/2, marginTop:-p.size/2 }}
            initial={{ x:0, y:0, opacity:1, scale:1 }}
            animate={{ x:Math.cos(rad)*90, y:Math.sin(rad)*90, opacity:0, scale:0 }}
            transition={{ duration:0.95, delay:0.35+p.id*0.02, ease:'easeOut' }} />
        );
      })}
    </div>
  );
}
const EMPTY_FORM = { fullName:"", email:"", dept:"", budgetDept:"", legalEntity:"", items:[{ name:'', qty:'' }], basis:"", url:"", deliveryDate:"", address:"", addressPreset:"", contact:"", supplierCompany:"", supplierPerson:"", supplierPhone:"", comment:"", urgency:"Обычная", category:"", fileName:"", categoryOther:"" };

const ADDRESS_PRESETS = [
  { label: 'Офис УК',       addr: 'ул. Туркестан 8',       value: 'ул. Туркестан 8 — Офис УК' },
  { label: 'Обжарка',       addr: 'ул. Тлендиева 347/1',   value: 'ул. Тлендиева 347/1 — Обжарка' },
  { label: 'Офис ТК',       addr: 'пер. Ташенова 4/2',     value: 'пер. Ташенова 4/2 — Офис ТК' },
  { label: 'Другой адрес',  addr: '',                       value: '__other__' },
];

// Вынесен на уровень модуля — иначе React пересоздаёт тип компонента
// при каждом keystroke и перемонтирует поля → закрывается клавиатура
function FormField({ label, children }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 block mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

const URGENCY_COLOR  = { "Критично":"bg-red-100 text-red-700", "Срочно":"bg-amber-100 text-amber-700", "Обычная":"bg-green-100 text-green-700" };
const URGENCY_BORDER = { "Критично":"#ef4444", "Срочно":"#f59e0b", "Обычная":"#22c55e" };

function notifyDirect(tgId, message) {
  const BASE = import.meta.env.VITE_SHEETS_URL;
  if (!BASE || !tgId) return;
  fetch(BASE, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'notify_direct', sheet: 'Заявки', data: { tg_id: tgId, message } }),
  }).catch(() => {});
}

export default function Requests({ user, sidebarOpen, onCreateLogisticsOrder }) {
  const { requests: reqs, addRequest, updateRequestStatus, deleteRequest, staff } = useData();
  const [showForm,    setShowForm]    = useState(false);
  const [selId,       setSelId]       = useState(null);
  const [step,        setStep]        = useState(1);
  const [statusF,     setStatusF]     = useState("Все");
  const [statusOpen,  setStatusOpen]  = useState(false);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [rejectedOpen, setRejectedOpen] = useState(false);
  const [submitted,    setSubmitted]    = useState(false);

  // sel всегда актуален: берём из reqs по id → Badge обновляется сразу
  const sel = selId ? (reqs.find(r => r.id === selId) || null) : null;

  // Только admin видит все заявки и может одобрять/отклонять.
  // Все остальные роли — только свои заявки, без действий.
  const isAdmin = user.role === 'admin';
  const myName  = user.name.split(" ").slice(0,2).join(" ");
  const visible = isAdmin ? reqs : reqs.filter(r => r.employee === myName);
  const filtered  = visible.filter(r => statusF === "Все" || r.status === statusF);

  const findEmployeeTgId = (employeeName) => {
    const found = (staff || []).find(s => s.name && s.name.startsWith(employeeName.split(' ')[0]));
    return found?.tg_id || null;
  };

  const canGoNext = () => {
    if (step === 4) {
      const addrOk = form.addressPreset !== '' && form.addressPreset !== '__other__'
        ? true
        : form.address.trim() !== '';
      return addrOk && form.contact.trim() !== '' && form.deliveryDate.trim() !== '';
    }
    return true;
  };

  const submit = () => {
    const validItems = form.items.filter(it => it.name.trim());
    const productStr = validItems.map(it => `${it.name}: ${it.qty}`).join('; ');
    const totalQty   = form.items.reduce((s, it) => s + (parseFloat(it.qty) || 0), 0);
    const req = {
      id: `REQ-0${reqs.length + 24}`,
      employee: user.name.split(' ').slice(0, 2).join(' '),
      dept: user.dept,
      category: form.category === 'Другое'
        ? (form.categoryOther || 'Другое')
        : form.category || 'Другое',
      product: productStr,
      qty: totalQty ? String(totalQty) : '',
      urgency: form.urgency,
      date: new Date().toLocaleDateString('ru-RU'),
      status: 'Ожидает',
      comment: form.comment,
      email: form.email,
      budgetDept: form.budgetDept,
      legalEntity: form.legalEntity,
      basis: form.basis,
      url: form.url,
      deliveryDate: form.deliveryDate,
      address: form.address,
      contact: form.contact,
      supplierCompany: form.supplierCompany,
      supplierPerson: form.supplierPerson,
      supplierPhone: form.supplierPhone,
    };
    addRequest(req);
    fetch(import.meta.env.VITE_SHEETS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'notify_requests',
        data: {
          employee: req.employee,
          dept: req.dept,
          category: req.category,
          items: validItems,
          comment: form.comment,
          urgency: req.urgency,
        },
      }),
    }).catch(() => {});
    setShowForm(false); setStep(1); setForm(EMPTY_FORM);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2800);
  };

  const approve = (req) => {
    updateRequestStatus(req.id, "Одобрена");
    onCreateLogisticsOrder?.(req);
    const tgId = findEmployeeTgId(req.employee);
    const msg =
      `✅ <b>Заявка одобрена!</b>\n\n` +
      `📦 <b>Товар:</b> ${req.product}\n` +
      `👤 <b>Сотрудник:</b> ${req.employee}\n` +
      `📁 <b>Категория:</b> ${req.category}\n\n` +
      `Заказ передан в логистику. Спасибо! 🙏`;
    notifyDirect(tgId, msg);
    toast.success("Заявка одобрена — заказ создан в логистике");
  };

  const openRejectModal = (req) => {
    setRejectModal(req);
    setRejectReason('');
  };

  const confirmReject = () => {
    if (!rejectModal) return;
    const reason = rejectReason.trim() || 'Не указана';
    updateRequestStatus(rejectModal.id, "Отклонена", { reject_reason: reason });

    const tgId = findEmployeeTgId(rejectModal.employee);
    const msg =
      `❌ <b>Заявка отклонена</b>\n${rejectModal.product}\n\n` +
      `👤 <b>Сотрудник:</b> ${rejectModal.employee}\n` +
      `💬 <b>Причина отказа:</b> ${reason}\n\n` +
      `Благодарю, хорошего дня 🙏`;
    notifyDirect(tgId, msg);

    setRejectModal(null);
    setRejectReason('');
    toast.error("Заявка отклонена");
  };

  const repeatOrder = (req) => {
    const items = req.product
      ? req.product.split(';').map(s => {
          const [name, qty] = s.split(':');
          return { name: (name||'').trim(), qty: (qty||'').trim() };
        }).filter(i => i.name)
      : [{ name: '', qty: '' }];
    const STANDARD_CATS = ["Обжарка","Упаковка","Сиропы","Оргтехника","Хозтовары","Химия","Этикетки для кофе","Другое"];
    const catMatch = STANDARD_CATS.includes(req.category) ? req.category : 'Другое';
    const catOther = catMatch === 'Другое' ? (req.category || '') : '';
    setForm({
      ...EMPTY_FORM,
      fullName: user.name || '',
      dept: req.dept || '',
      budgetDept: req.dept || '',
      category: catMatch,
      categoryOther: catOther,
      items: items.length ? items : [{ name:'', qty:'' }],
      urgency: req.urgency || 'Обычная',
      comment: req.comment || '',
    });
    setStep(1);
    setShowForm(true);
  };

  const set = (key, val) => setForm(p => ({...p, [key]: val}));
  const I = (key,ph,type="text") => <input type={type} placeholder={ph} value={form[key]} onChange={e=>set(key,e.target.value)} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2" style={{'--tw-ring-color':BRAND}}/>;
  const S = (key,opts) => <select value={form[key]} onChange={e=>set(key,e.target.value)} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2" style={{'--tw-ring-color':BRAND}}><option value="">Выберите…</option>{opts.map(o=><option key={o}>{o}</option>)}</select>;

  // ── Detail view ──────────────────────────────────────────────────────────────
  if (sel) return (
    <div className="space-y-4">
      <button onClick={() => setSelId(null)} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5l-6 5 6 5"/></svg>
        Назад к списку
      </button>

      <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.2}}
        className="max-w-xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">

        {/* Header */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-400 font-mono uppercase">{sel.id}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${URGENCY_COLOR[sel.urgency]||"bg-gray-100 text-gray-600"}`}>
                  {sel.urgency}
                </span>
              </div>
              <h2 className="text-lg font-bold text-gray-900 leading-snug">{sel.product}</h2>
              <div className="text-sm text-gray-500 mt-1">{sel.employee} · {sel.dept}</div>
            </div>
            <Badge s={sel.status} />
          </div>
        </div>

        {/* Details */}
        <div className="p-5 space-y-3 border-b border-gray-100">
          {[
            ["Категория",         sel.category],
            ["Дата заявки",       fmtDate(sel.date)],
            ["Подразделение",     sel.dept],
            ["Email",             sel.email],
            ["Бюджет. подр.",     sel.budgetDept],
            ["Юр. лицо",         sel.legalEntity],
            ["Основание",         sel.basis],
            ["Срок поставки",     fmtDate(sel.deliveryDate)],
            ["Адрес доставки",    sel.address],
            ["Контактное лицо",   sel.contact],
            ["Поставщик",         sel.supplierCompany],
            ["Контакт поставщ.",  sel.supplierPerson],
            ["Телефон поставщ.",  sel.supplierPhone],
          ].map(([l,v]) => v && (
            <div key={l} className="flex items-start justify-between gap-4">
              <span className="text-gray-400 text-sm flex-shrink-0">{l}</span>
              <span className="text-sm font-medium text-gray-800 text-right break-all">{v}</span>
            </div>
          ))}
          {sel.url && (
            <div className="flex items-start justify-between gap-4">
              <span className="text-gray-400 text-sm flex-shrink-0">Ссылка</span>
              <a href={sel.url} target="_blank" rel="noreferrer"
                className="text-sm font-medium text-right break-all"
                style={{color: '#28798d'}}>{sel.url}</a>
            </div>
          )}
          {sel.comment && (
            <div className="mt-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
              {sel.comment}
            </div>
          )}
        </div>

        {/* Товар */}
        {(() => {
          const isMulti = sel.product && sel.product.includes(';');
          const items = isMulti
            ? sel.product.split(';').map(s => { const [name, qty] = s.split(':'); return { name: (name||'').trim(), qty: (qty||'').trim() }; }).filter(i => i.name)
            : sel.product ? [{ name: sel.product, qty: sel.qty }] : [];
          if (!items.length) return null;
          return (
            <div className="border-b border-gray-100 px-5 py-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Товар</div>
              <div className="rounded-xl overflow-hidden border border-gray-100">
                <div className="grid grid-cols-2 bg-gray-50 px-4 py-2">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Наименование</span>
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide text-right">Кол-во</span>
                </div>
                {items.map((it, i) => (
                  <div key={i} className="grid grid-cols-2 px-4 py-2.5 border-t border-gray-50 hover:bg-gray-50">
                    <span className="text-sm text-gray-700">{it.name}</span>
                    <span className="text-sm font-medium text-gray-900 text-right">{it.qty}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Manager actions */}
        {isAdmin && sel.status === "Ожидает" && (
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider font-semibold">Действие</div>
            <div className="flex gap-2">
              <button onClick={() => approve(sel)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{background:BRAND}}>✓ Одобрить и создать заказ</button>
              <button onClick={() => openRejectModal(sel)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">✕ Отклонить</button>
            </div>
          </div>
        )}
        {sel.reject_reason && (
          <div className="px-5 py-3 border-b border-gray-100">
            <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Причина отказа</div>
            <div className="text-sm text-red-700 bg-red-50 rounded-xl p-3">{sel.reject_reason}</div>
          </div>
        )}

        <div className="px-5 py-4 flex gap-2">
          <button onClick={() => setSelId(null)}
            className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">
            Закрыть
          </button>
          <button onClick={() => { setSelId(null); repeatOrder(sel); }}
            className="flex-1 py-2.5 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 hover:opacity-90"
            style={{ background: BRAND }}>
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6"/><path d="M3.5 15A9 9 0 1 0 5 5.1L1 10"/></svg>
            Повторить
          </button>
          {isAdmin && (
            <button onClick={() => setDeleteConfirm(true)}
              className="py-2.5 px-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 border border-red-100">
              Удалить
            </button>
          )}
        </div>
      </motion.div>

      {/* Delete confirm modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{background:'rgba(0,0,0,0.5)'}} onClick={() => setDeleteConfirm(false)}>
            <motion.div initial={{y:40,opacity:0}} animate={{y:0,opacity:1}} exit={{y:40,opacity:0}}
              transition={{duration:0.18,ease:"easeOut"}}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
              onClick={e => e.stopPropagation()}>
              <div className="p-5">
                <div className="text-base font-bold text-gray-900 mb-1">Удалить заявку?</div>
                <div className="text-sm text-gray-500">Заявка <span className="font-medium text-gray-700">{sel?.id}</span> будет удалена безвозвратно.</div>
              </div>
              <div className="px-5 pb-5 flex gap-3">
                <button onClick={() => setDeleteConfirm(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">
                  Отмена
                </button>
                <button onClick={() => {
                  deleteRequest(sel.id);
                  setDeleteConfirm(false);
                  setSelId(null);
                  toast.success('Заявка удалена');
                }}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700">
                  Удалить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // ── List view ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Animated success overlay */}
      <AnimatePresence>
        {submitted && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ background:'rgba(0,0,0,0.45)', backdropFilter:'blur(4px)' }}>
            <motion.div
              initial={{ scale:0.8, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.8, opacity:0 }}
              transition={{duration:0.18,ease:"easeOut"}}
              style={{ background:'white', borderRadius:24, padding:'44px 40px', textAlign:'center',
                position:'relative', overflow:'hidden', minWidth:260 }}>
              <SuccessConfetti />
              <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
                <CheckmarkAnim />
              </div>
              <div style={{ fontSize:18, fontWeight:800, color:'#1a3a42', marginBottom:6 }}>
                Заявка отправлена!
              </div>
              <div style={{ fontSize:13, color:'#6b7280' }}>
                Ожидайте рассмотрения администратором
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating FAB — animated pulse ring */}
      <AnimatePresence>
        {!sidebarOpen && (
          <div className="fixed bottom-24 lg:bottom-8 inset-x-0 lg:inset-x-auto lg:left-52 lg:right-0 mx-auto w-fit z-40">
            {/* Pulse ring */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ background: `rgba(40,121,141,0.35)`, willChange:'transform,opacity' }}
              animate={{ scale:[1, 1.6, 1], opacity:[0.5, 0, 0.5] }}
              transition={{ duration:2.4, repeat:Infinity, ease:'easeInOut' }}
            />
            <motion.button
              initial={{opacity:0, scale:0.8, y:10}} animate={{opacity:1, scale:1, y:0}} exit={{opacity:0, scale:0.8, y:10}}
              transition={{duration:0.18}}
              onClick={() => setShowForm(true)}
              className="relative flex items-center gap-2 px-5 py-3 text-white text-sm font-semibold rounded-full whitespace-nowrap"
              style={{ background:'rgba(40,121,141,0.88)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)', border:'1px solid rgba(255,255,255,0.25)', boxShadow:'0 8px 32px rgba(40,121,141,0.4)' }}
              whileTap={{scale:0.95}}>
              <motion.svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"
                animate={{ rotate:[0, 90, 0] }} transition={{ duration:3, repeat:Infinity, ease:'easeInOut', repeatDelay:2 }}>
                <path d="M10 4v12M4 10h12"/>
              </motion.svg>
              Подать заявку
            </motion.button>
          </div>
        )}
      </AnimatePresence>

      {/* Status filters — iOS dark dropdown (same as Logistics) */}
      {(() => {
        const STATUS_DOT_REQ = { "Ожидает":"#f59e0b", "Одобрена":"#22c55e", "Отклонена":"#ef4444" };
        const isAll = statusF === "Все";
        const displayDot = isAll ? null : STATUS_DOT_REQ[statusF];
        const displayCnt = isAll ? visible.length : visible.filter(r => r.status === statusF).length;
        return (
          <div style={{ position:'relative' }}>
            <button onClick={() => setStatusOpen(v => !v)}
              style={{
                background:'white', borderRadius:14, padding:'9px 14px',
                display:'flex', alignItems:'center', justifyContent:'space-between',
                width:'100%', border:'1px solid #e5e7eb', cursor:'pointer',
                boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
              }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                {displayDot && (
                  <span style={{ width:8, height:8, borderRadius:'50%', background:displayDot, flexShrink:0,
                    boxShadow:`0 0 6px ${displayDot}88` }} />
                )}
                <span style={{ fontSize:13, fontWeight:700, color:'#1a3a42' }}>
                  {isAll ? 'Все заявки' : statusF}
                </span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:11, fontWeight:700, padding:'1px 8px', borderRadius:20,
                  background:'#f3f4f6', color:'#6b7280' }}>
                  {displayCnt}
                </span>
                <motion.svg width="14" height="14" viewBox="0 0 20 20" fill="none"
                  stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  animate={{ rotate: statusOpen ? 180 : 0 }} transition={{ duration:0.2 }}>
                  <path d="M5 7.5l5 5 5-5"/>
                </motion.svg>
              </div>
            </button>

            {statusOpen && <div className="fixed inset-0 z-20" onClick={() => setStatusOpen(false)} />}
            <AnimatePresence>
              {statusOpen && (
                <motion.div
                  initial={{ opacity:0, y:-6, scale:0.97 }}
                  animate={{ opacity:1, y:0, scale:1 }}
                  exit={{ opacity:0, y:-6, scale:0.97 }}
                  transition={{ duration:0.15, ease:'easeOut' }}
                  style={{
                    position:'absolute', top:'calc(100% + 6px)', left:0, right:0, zIndex:31,
                    background:'white', borderRadius:14, padding:8,
                    boxShadow:'0 8px 28px rgba(0,0,0,0.12)', border:'1px solid #e5e7eb',
                  }}>
                  {/* Все */}
                  <button onClick={() => { setStatusF("Все"); setStatusOpen(false); }}
                    style={{
                      width:'100%', background: isAll ? `${BRAND}12` : 'transparent',
                      border: isAll ? `1.5px solid ${BRAND}33` : '1.5px solid transparent',
                      borderRadius:10, padding:'8px 12px', cursor:'pointer',
                      display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4,
                    }}>
                    <span style={{ fontSize:12, fontWeight:700, color: isAll ? BRAND : '#374151' }}>
                      Все заявки
                    </span>
                    <span style={{ fontSize:11, fontWeight:700, padding:'1px 7px', borderRadius:20,
                      background: isAll ? `${BRAND}20` : '#f3f4f6',
                      color: isAll ? BRAND : '#6b7280' }}>
                      {visible.length}
                    </span>
                  </button>
                  {/* 3-col grid */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:4 }}>
                    {["Ожидает","Одобрена","Отклонена"].map(s => {
                      const cnt    = visible.filter(r => r.status === s).length;
                      const active = statusF === s;
                      const dot    = STATUS_DOT_REQ[s];
                      return (
                        <button key={s}
                          onClick={() => { setStatusF(active ? "Все" : s); setStatusOpen(false); }}
                          style={{
                            background: active ? `${BRAND}12` : '#f9fafb',
                            border: active ? `1.5px solid ${BRAND}33` : '1.5px solid #f3f4f6',
                            borderRadius:10, padding:'7px 4px',
                            display:'flex', flexDirection:'column', alignItems:'center', gap:3,
                            cursor:'pointer', transition:'all .12s',
                          }}>
                          <span style={{ width:7, height:7, borderRadius:'50%', background:dot,
                            boxShadow: cnt > 0 ? `0 0 5px ${dot}77` : 'none' }} />
                          <span style={{ fontSize:10, fontWeight:600, lineHeight:1.2, textAlign:'center',
                            color: active ? BRAND : '#374151' }}>{s}</span>
                          <span style={{ fontSize:10, fontWeight:800,
                            color: active ? BRAND : cnt > 0 ? '#1a3a42' : '#d1d5db' }}>
                            {cnt}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })()}

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={()=>setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-800">Новая заявка на закуп</h3>
                <button onClick={()=>setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="flex items-center gap-1">
                {STEP_LABELS.map((l,i)=>(
                  <div key={i} className="flex items-center flex-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${step>i+1?"bg-teal-500 text-white":step===i+1?"text-white":"bg-gray-100 text-gray-400"}`}
                      style={step===i+1?{background:BRAND}:{}}>{step>i+1?"✓":i+1}</div>
                    {i<STEP_LABELS.length-1&&<div className={`flex-1 h-0.5 mx-1 ${step>i+1?"bg-teal-400":"bg-gray-200"}`}/>}
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-500 mt-2">Шаг {step} из {STEP_LABELS.length}: <span className="font-semibold text-gray-700">{STEP_LABELS[step-1]}</span></div>
            </div>
            <div className="p-5 space-y-4">
              {step===1&&<><FormField label="ФИО">{I("fullName","Фамилия Имя Отчество")}</FormField><FormField label="Email">{I("email","email@mastercoffee.kz","email")}</FormField></>}
              {step===2&&<><FormField label="Подразделение">{S("dept",["УК","ТК","Обжарка","Цех","Кофейни"])}</FormField><FormField label="Бюджетное подразделение">{S("budgetDept",["УК","ТК","Обжарка","Цех","Кофейни"])}</FormField><FormField label="Юр. лицо">{S("legalEntity",["ТОО Мастер Кофе","ИП Master Coffee Trade","ИП Master Coffee Roasters","ТОО Mastercoffee.kz","Другое"])}</FormField></>}
              {step===3&&<>
                <FormField label="Категория">
                  <select value={form.category} onChange={e => { set('category', e.target.value); set('categoryOther', ''); set('items', [{ name:'', qty:'' }]); }} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2" style={{'--tw-ring-color':BRAND}}>
                    <option value="">Выберите…</option>
                    {["Обжарка","Упаковка","Сиропы","Оргтехника","Хозтовары","Химия","Этикетки для кофе","Другое"].map(o=><option key={o}>{o}</option>)}
                  </select>
                </FormField>
                {form.category === 'Другое' && (
                  <FormField label="Уточните категорию">{I("categoryOther","Введите категорию...")}</FormField>
                )}
                {form.category && (() => {
                  const total = form.items.reduce((s, it) => s + (parseFloat(it.qty) || 0), 0);
                  const isLabel = form.category === 'Этикетки для кофе';
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {isLabel ? 'Этикетки' : 'Товары'}
                        </label>
                        {total > 0 && (
                          <span className="text-xs text-gray-400">Итого: <span className="font-semibold text-gray-700">{total}</span></span>
                        )}
                      </div>
                      <div className="rounded-xl overflow-hidden border border-gray-100">
                        <div className="grid grid-cols-[1fr_90px_28px] bg-gray-50 px-3 py-2 gap-2">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Наименование</span>
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Кол-во</span>
                          <span/>
                        </div>
                        {form.items.map((item, idx) => (
                          <div key={idx} className="grid grid-cols-[1fr_90px_28px] gap-2 px-3 py-2 border-t border-gray-50 items-center">
                            <input
                              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2"
                              style={{'--tw-ring-color':BRAND}}
                              placeholder={isLabel ? "Название этикетки" : "Наименование товара"}
                              value={item.name}
                              onChange={e => set('items', form.items.map((it,i)=>i===idx?{...it,name:e.target.value}:it))}
                            />
                            <input
                              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-right focus:outline-none focus:ring-2"
                              style={{'--tw-ring-color':BRAND}}
                              placeholder="0"
                              value={item.qty}
                              onChange={e => set('items', form.items.map((it,i)=>i===idx?{...it,qty:e.target.value}:it))}
                            />
                            <button type="button"
                              onClick={() => form.items.length > 1 && set('items', form.items.filter((_,i)=>i!==idx))}
                              className={`flex items-center justify-center w-6 h-6 rounded-full text-sm transition-colors ${form.items.length > 1 ? 'text-red-400 hover:text-red-600 hover:bg-red-50' : 'text-gray-200 cursor-default'}`}>
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      <button type="button"
                        onClick={() => set('items', [...form.items, { name:'', qty:'' }])}
                        className="text-sm font-medium hover:underline"
                        style={{color:BRAND}}>
                        + Добавить {isLabel ? 'этикетку' : 'товар'}
                      </button>
                    </div>
                  );
                })()}
                <FormField label="Срочность">{S("urgency",["Обычная","Срочно","Критично"])}</FormField>
                <FormField label="Основание">{I("basis","Обоснование")}</FormField>
                <FormField label="Прикрепить файл (ТЗ, прайс, фото)">
                  <div style={{ border:'1.5px dashed #cbd5e1', borderRadius:12, padding:'12px 14px', background:'#f8fafc', display:'flex', alignItems:'center', gap:10 }}>
                    <input type="file" id="req-file" style={{ display:'none' }}
                      onChange={e => set('fileName', e.target.files?.[0]?.name || '')} />
                    <label htmlFor="req-file" style={{ cursor:'pointer', fontSize:12, fontWeight:600, color:BRAND, padding:'6px 14px', borderRadius:8, background:'#e8f4f6' }}>
                      Выбрать файл
                    </label>
                    <span style={{ fontSize:12, color: form.fileName ? '#1a3a42' : '#94a3b8', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {form.fileName || 'Файл не выбран'}
                    </span>
                  </div>
                </FormField>
              </>}
              {step===4&&<>
                <FormField label={<span>Срок поставки <span className="text-red-500">*</span></span>}>
                  <DatePicker value={form.deliveryDate} onChange={v => set('deliveryDate', v)}
                    style={{ borderColor: !form.deliveryDate ? '#fca5a5' : '#e5e7eb',
                      background: !form.deliveryDate ? '#fef2f2' : 'white' }}/>
                  {!form.deliveryDate.trim() && <p className="text-xs text-red-500 mt-1">Обязательное поле</p>}
                </FormField>
                <FormField label={<span>Адрес доставки <span className="text-red-500">*</span></span>}>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {ADDRESS_PRESETS.map(p => {
                      const isOther = p.value === '__other__';
                      const active = isOther
                        ? form.addressPreset === '__other__'
                        : form.addressPreset === p.value;
                      return (
                        <button key={p.value} type="button"
                          onClick={() => {
                            if (isOther) {
                              set('addressPreset', '__other__');
                              set('address', '');
                            } else {
                              set('addressPreset', p.value);
                              set('address', p.value);
                            }
                          }}
                          className="flex flex-col items-start px-3 py-2.5 rounded-xl border text-left transition-all"
                          style={active
                            ? { background: `${BRAND}12`, border: `1.5px solid ${BRAND}`, color: BRAND }
                            : { background: 'white', border: '1px solid #e5e7eb', color: '#374151' }}>
                          <span style={{ fontSize:11, fontWeight:700 }}>{p.label}</span>
                          {!isOther && <span style={{ fontSize:10, color: active ? `${BRAND}cc` : '#9ca3af', marginTop:1 }}>{p.addr}</span>}
                        </button>
                      );
                    })}
                  </div>
                  {form.addressPreset === '__other__' && (
                    <input placeholder="г. Астана, ул. …" value={form.address} onChange={e=>set('address',e.target.value)}
                      className={`w-full px-3.5 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 ${!form.address.trim() ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}
                      style={{'--tw-ring-color':BRAND}} autoFocus/>
                  )}
                  {!form.address.trim() && !form.addressPreset && <p className="text-xs text-red-500 mt-1">Выберите адрес доставки</p>}
                </FormField>
                <FormField label={<span>Контакт получателя <span className="text-red-500">*</span></span>}>
                  <input placeholder="+7 701 …" value={form.contact} onChange={e=>set('contact',e.target.value)}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 ${!form.contact.trim() ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}
                    style={{'--tw-ring-color':BRAND}}/>
                  {!form.contact.trim() && <p className="text-xs text-red-500 mt-1">Обязательное поле</p>}
                </FormField>
              </>}
              {step===5&&<><FormField label="Компания поставщика">{I("supplierCompany","Название")}</FormField><FormField label="Контактное лицо">{I("supplierPerson","Имя")}</FormField><FormField label="Телефон">{I("supplierPhone","+7 …")}</FormField></>}
              {step===6&&<div className="space-y-3">
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                  {[["Категория",form.category==='Другое'?(form.categoryOther||'Другое'):form.category],["Срочность",form.urgency],["Срок поставки",fmtDate(form.deliveryDate)],["Подразделение",form.dept],["Бюдж. подразделение",form.budgetDept],["Юр. лицо",form.legalEntity],["Адрес доставки",form.address],["Контакт",form.contact],["Поставщик",form.supplierCompany]].filter(([,v])=>v).map(([l,v])=>(
                    <div key={l} className="flex justify-between gap-4"><span className="text-gray-500 flex-shrink-0">{l}</span><span className="font-medium text-gray-800 text-right">{v}</span></div>
                  ))}
                </div>
                {form.items.some(it=>it.name.trim()) && (
                  <div className="rounded-xl overflow-hidden border border-gray-100 text-sm">
                    <div className="grid grid-cols-2 bg-gray-50 px-4 py-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase">Наименование</span>
                      <span className="text-xs font-semibold text-gray-500 uppercase text-right">Кол-во</span>
                    </div>
                    {form.items.filter(it=>it.name.trim()).map((it,i)=>(
                      <div key={i} className="grid grid-cols-2 px-4 py-2 border-t border-gray-50">
                        <span className="text-gray-700">{it.name}</span>
                        <span className="font-medium text-gray-900 text-right">{it.qty}</span>
                      </div>
                    ))}
                    <div className="grid grid-cols-2 px-4 py-2 border-t border-gray-200 bg-gray-50">
                      <span className="text-xs font-semibold text-gray-500">Итого</span>
                      <span className="text-xs font-semibold text-gray-800 text-right">{form.items.reduce((s,it)=>s+(parseFloat(it.qty)||0),0)}</span>
                    </div>
                  </div>
                )}
                <FormField label="Комментарий"><textarea value={form.comment} onChange={e=>setForm({...form,comment:e.target.value})} rows={3} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none resize-none" placeholder="Дополнительные детали…"/></FormField>
              </div>}
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-3">
              {step>1&&<button onClick={()=>setStep(s=>s-1)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium">Назад</button>}
              {step<6
                ? <button onClick={()=>{ if(!canGoNext()){toast.error('Заполните обязательные поля');return;} setStep(s=>s+1); }} className="flex-1 py-2.5 text-white rounded-xl text-sm font-semibold" style={{background:BRAND}}>Далее</button>
                : <button onClick={submit} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold">✓ Отправить</button>}
            </div>
          </div>
        </div>
      )}

      {/* Desktop table — only on true desktop (1024px+) */}
      {(() => {
        const activeReqs   = filtered.filter(r => r.status !== 'Отклонена');
        const rejectedReqs = filtered.filter(r => r.status === 'Отклонена');
        const fmtDateLocal = (d) => fmtDate(d);
        const cols = ["ID","Сотрудник","Категория","Товар","Кол-во","Срочность","Дата","Статус","Действия"];
        const renderRow = (r) => (
          <tr key={r.id} onClick={()=>setSelId(r.id)} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer">
            <td className="px-4 py-3 font-semibold text-gray-700"
              style={{ borderLeft: `4px solid ${URGENCY_BORDER[r.urgency] || '#e5e7eb'}` }}>{r.id}</td>
            <td className="px-4 py-3 text-gray-800">{r.employee}</td>
            <td className="px-4 py-3 text-gray-500 text-xs">{r.category}</td>
            <td className="px-4 py-3 text-gray-700 max-w-xs"><div className="truncate">{r.product}</div></td>
            <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{r.qty}</td>
            <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.urgency==="Критично"?"bg-red-100 text-red-800":r.urgency==="Срочно"?"bg-amber-100 text-amber-800":"bg-green-100 text-green-800"}`}>• {r.urgency}</span></td>
            <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{r.date ? fmtDateLocal(r.date) : '—'}</td>
            <td className="px-4 py-3 whitespace-nowrap"><Badge s={r.status}/></td>
            <td className="px-4 py-3 whitespace-nowrap" onClick={e=>e.stopPropagation()}>
              <div className="flex gap-1.5 items-center">
                <button onClick={() => repeatOrder(r)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors hover:opacity-80"
                  style={{ color: BRAND, borderColor: `${BRAND}33`, background: `${BRAND}0d` }}>
                  <svg width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6"/><path d="M3.5 15A9 9 0 1 0 5 5.1L1 10"/></svg>
                  Повторить
                </button>
                {isAdmin && r.status==="Ожидает" && <>
                  <button onClick={()=>approve(r)} className="px-2.5 py-1 text-white rounded-lg text-xs font-medium hover:opacity-90" style={{background:BRAND}}>Одобрить</button>
                  <button onClick={()=>openRejectModal(r)} className="px-2.5 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-300">Откл.</button>
                </>}
              </div>
            </td>
          </tr>
        );
        return (
          <div className="hidden lg:block space-y-3">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b border-gray-100">
                  {cols.map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {activeReqs.map(r => renderRow(r))}
                  {activeReqs.length === 0 && (
                    <tr><td colSpan={cols.length} className="px-4 py-10 text-center text-gray-400 text-sm">Нет заявок</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Collapsible rejected section */}
            {rejectedReqs.length > 0 && statusF !== "Ожидает" && statusF !== "Одобрена" && (
              <div>
                <button onClick={() => setRejectedOpen(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-2xl border border-gray-100 shadow-sm hover:bg-gray-50 transition-colors"
                  style={{ borderLeft: '4px solid #ef4444' }}>
                  <div className="flex items-center gap-2">
                    <span style={{ width:8, height:8, borderRadius:'50%', background:'#ef4444', flexShrink:0 }}/>
                    <span className="text-sm font-semibold text-gray-700">Отклонённые заявки</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">{rejectedReqs.length}</span>
                  </div>
                  <motion.svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                    animate={{ rotate: rejectedOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <path d="M5 7.5l5 5 5-5"/>
                  </motion.svg>
                </button>
                <AnimatePresence>
                  {rejectedOpen && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                      transition={{ duration:0.22, ease:'easeInOut' }} className="overflow-hidden">
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto mt-2">
                        <table className="w-full text-sm">
                          <thead><tr className="bg-red-50 border-b border-red-100">
                            {cols.map(h=>(
                              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                            ))}
                          </tr></thead>
                          <tbody>{rejectedReqs.map(r => renderRow(r))}</tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        );
      })()}

      {/* Mobile cards — up to 1024px */}
      {(() => {
        const fmtReqDate = (d) => fmtDate(d) || '';
        const activeReqs   = filtered.filter(r => r.status !== 'Отклонена');
        const rejectedReqs = filtered.filter(r => r.status === 'Отклонена');
        const renderCard = (r) => {
          const accent = URGENCY_BORDER[r.urgency] || '#e5e7eb';
          const initials = (r.employee||'').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
          return (
          <motion.div key={r.id}
            initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.18}}
            onClick={() => setSelId(r.id)}
            style={{
              background:'white', borderRadius:18,
              border:'1px solid #f0f4f5',
              boxShadow:'0 2px 12px rgba(40,121,141,0.07)',
              overflow:'hidden', cursor:'pointer',
              boxSizing:'border-box',
            }}>

            {/* Цветная полоска сверху */}
            <div style={{ height:3, background:`linear-gradient(90deg, ${accent}, ${accent}55)` }}/>

            {/* Основное содержимое */}
            <div style={{ padding:'12px 14px 10px', display:'flex', gap:10, alignItems:'flex-start' }}>

              {/* Аватарка сотрудника */}
              <div style={{
                width:34, height:34, borderRadius:10, flexShrink:0,
                background:`${accent}18`, border:`1px solid ${accent}33`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:11, fontWeight:800, color:accent, letterSpacing:-.3,
              }}>{initials || '?'}</div>

              {/* Текст */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:3 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:'#1a3a42', lineHeight:1.3,
                    display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                    {r.product}
                  </div>
                  <div style={{ flexShrink:0, marginTop:1 }}><Badge s={r.status}/></div>
                </div>
                <div style={{ fontSize:11, color:'#94a3b8', marginBottom:7 }}>
                  {r.employee}{r.dept ? ` · ${r.dept}` : ''}
                </div>

                {/* Теги */}
                <div style={{ display:'flex', gap:5, flexWrap:'nowrap', overflow:'hidden', alignItems:'center' }}>
                  {r.category && (
                    <span style={{ fontSize:10, background:'#f4f8f9', color:'#64748b', padding:'3px 8px',
                      borderRadius:20, maxWidth:100, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flexShrink:1 }}>
                      {r.category}
                    </span>
                  )}
                  {r.qty && (
                    <span style={{ fontSize:10, background:'#f4f8f9', color:'#1a3a42', padding:'3px 8px',
                      borderRadius:20, fontWeight:600, whiteSpace:'nowrap', flexShrink:0 }}>
                      {r.qty}
                    </span>
                  )}
                  <span style={{ fontSize:10, padding:'3px 8px', borderRadius:20, fontWeight:600, flexShrink:0,
                    background:`${accent}15`, color:accent }}>
                    {r.urgency}
                  </span>
                  <span style={{ fontSize:10, color:'#cbd5e1', marginLeft:'auto', whiteSpace:'nowrap', flexShrink:0 }}>
                    {fmtReqDate(r.date)}
                  </span>
                </div>
              </div>
            </div>

            {/* Кнопки */}
            <div style={{ display:'flex', gap:6, padding:'0 14px 12px' }} onClick={e=>e.stopPropagation()}>
              <button onClick={() => repeatOrder(r)}
                style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 12px',
                  borderRadius:10, fontSize:11, fontWeight:600, border:`1px solid ${BRAND}28`,
                  background:`${BRAND}0a`, color:BRAND, cursor:'pointer' }}>
                <svg width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6"/><path d="M3.5 15A9 9 0 1 0 5 5.1L1 10"/></svg>
                Повторить
              </button>
              {isAdmin && r.status==="Ожидает" && <>
                <button onClick={()=>approve(r)}
                  style={{ flex:1, padding:'6px 0', borderRadius:10, fontSize:11, fontWeight:700,
                    background:BRAND, color:'white', border:'none', cursor:'pointer' }}>
                  ✓ Одобрить
                </button>
                <button onClick={()=>openRejectModal(r)}
                  style={{ flex:1, padding:'6px 0', borderRadius:10, fontSize:11, fontWeight:600,
                    background:'#f8fafc', color:'#64748b', border:'1px solid #e2e8f0', cursor:'pointer' }}>
                  ✕ Откл.
                </button>
              </>}
            </div>
          </motion.div>
          );
        };
        return (
          <div className="lg:hidden space-y-2 max-w-full overflow-hidden">
            {activeReqs.map(r => renderCard(r))}
            {activeReqs.length === 0 && statusF === "Все" && rejectedReqs.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-sm">Нет заявок</div>
            )}
            {activeReqs.length === 0 && statusF !== "Все" && statusF !== "Отклонена" && (
              <div className="text-center py-12 text-gray-400 text-sm">Нет заявок</div>
            )}

            {/* Collapsible rejected section */}
            {rejectedReqs.length > 0 && statusF !== "Ожидает" && statusF !== "Одобрена" && (
              <div className="mt-2">
                <button
                  onClick={() => setRejectedOpen(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-2xl border border-gray-100 shadow-sm transition-all hover:bg-gray-50"
                  style={{ borderLeft: '4px solid #ef4444' }}>
                  <div className="flex items-center gap-2">
                    <span style={{ width:8, height:8, borderRadius:'50%', background:'#ef4444', flexShrink:0 }}/>
                    <span className="text-sm font-semibold text-gray-700">Отклонённые заявки</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">{rejectedReqs.length}</span>
                  </div>
                  <motion.svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                    animate={{ rotate: rejectedOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <path d="M5 7.5l5 5 5-5"/>
                  </motion.svg>
                </button>
                <AnimatePresence>
                  {rejectedOpen && (
                    <motion.div
                      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                      transition={{ duration:0.22, ease:'easeInOut' }}
                      className="overflow-hidden">
                      <div className="space-y-2 pt-2">
                        {rejectedReqs.map(r => renderCard(r))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        );
      })()}
      <div className="h-16 lg:hidden" />

      {/* Reject modal */}
      <AnimatePresence>
        {rejectModal && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{background:'rgba(0,0,0,0.5)'}} onClick={() => setRejectModal(null)}>
            <motion.div initial={{y:40,opacity:0}} animate={{y:0,opacity:1}} exit={{y:40,opacity:0}}
              transition={{duration:0.18,ease:"easeOut"}}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b border-gray-100">
                <div className="text-base font-bold text-gray-900 mb-0.5">Отклонить заявку</div>
                <div className="text-sm text-gray-500">{rejectModal.product}</div>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5 uppercase tracking-wide">Причина отказа</label>
                  <textarea
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    rows={3}
                    placeholder="Укажите причину отклонения заявки…"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none resize-none focus:ring-2"
                    style={{'--tw-ring-color':'#ef4444'}}
                    autoFocus
                  />
                  <div className="text-xs text-gray-400 mt-1">Сотруднику придёт уведомление в Telegram</div>
                </div>
              </div>
              <div className="p-5 pt-0 flex gap-3">
                <button onClick={() => setRejectModal(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">
                  Отмена
                </button>
                <button onClick={confirmReject}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700">
                  Отклонить и уведомить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
