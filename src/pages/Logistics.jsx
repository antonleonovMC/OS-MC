import { useState } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { WAREHOUSES, STATUS_FLOW, STATUS_DOT, genCode, makeHistory, advanceHistory, nowAstanaStr } from '../data/constants';
import { useData } from '../context/DataContext';
import Badge from '../components/Badge';
import StatusTimeline from '../components/StatusTimeline';

const BRAND = '#28798d';

// ── Icon primitives ──────────────────────────────────────────────────────────
const IcoSearch = () => (
  <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="9" cy="9" r="6"/><path d="M15 15l3 3"/>
  </svg>
);
const IcoPlus = () => (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M10 4v12M4 10h12"/>
  </svg>
);
const IcoBell = ({ active }) => (
  <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
    <path d="M10 2a5 5 0 015 5c0 3 1 4 2 5H3c1-1 2-2 2-5a5 5 0 015-5z"
      fill={active ? BRAND : 'none'} stroke={active ? BRAND : '#9ca3af'} strokeWidth="1.6"/>
    <path d="M8.5 16.5a1.5 1.5 0 003 0" stroke={active ? BRAND : '#9ca3af'} strokeWidth="1.6" strokeLinecap="round"/>
    {active && <circle cx="15" cy="5" r="3" fill="#ef4444" stroke="white" strokeWidth="1.5"/>}
  </svg>
);
const IcoBack = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5l-6 5 6 5"/>
  </svg>
);
const IcoBox = () => (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="#9ca3af" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7l7-4 7 4v9l-7 4-7-4V7z"/><path d="M10 3v13M3 7l7 4 7-4"/>
  </svg>
);
const IcoCalendar = () => (
  <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="#9ca3af" strokeWidth="1.6" strokeLinecap="round">
    <rect x="3" y="4" width="14" height="14" rx="2"/><path d="M3 9h14M7 2v3M13 2v3"/>
  </svg>
);
const IcoPin = () => (
  <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="#9ca3af" strokeWidth="1.6" strokeLinecap="round">
    <path d="M10 11a4 4 0 100-8 4 4 0 000 8z"/><path d="M10 11v7"/>
  </svg>
);

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: i => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.22, ease: 'easeOut' } }),
};

export default function Logistics({ user }) {
  const { orders, addOrder, updateOrderStatus, updateOrder, subscriptions, toggleSubscription } = useData();
  const [sel, setSel]           = useState(null);
  const [search, setSearch]     = useState('');
  const [whFilter, setWhFilter] = useState('Все склады');
  const [statusFilter, setStatusFilter] = useState(null);
  const [showCreate, setShowCreate]     = useState(false);
  const [editMode,  setEditMode]  = useState(false);
  const [editData,  setEditData]  = useState(null);
  const [subOpen,   setSubOpen]   = useState(true);
  const [newOrder, setNewOrder] = useState({
    title:'', supplier:'', warehouse:'Астана', planDate:'', status:'Принят', comment:'',
    country:'РК', items:[{ name:'', qty:'', unit:'шт' }],
  });

  const isAdmin   = user.role === 'admin';
  const canCreate = isAdmin;
  const COUNTRIES = ['РК', 'РФ', 'Китай', 'Европа'];

  const visibleStatuses = order =>
    order?.country === 'РК' ? STATUS_FLOW.filter(s => s !== 'Таможня') : STATUS_FLOW;

  const isSubscribed = (orderId) =>
    subscriptions.some(s => s.tg_id === user.tg_id && s.order_id === orderId);

  const countFor = s => orders.filter(o =>
    o.status === s && (whFilter === 'Все склады' || o.warehouse === whFilter)
  ).length;

  const nearest = [...orders]
    .filter(o => o.status !== 'Архив' && o.status !== 'Доставлен' &&
      (whFilter === 'Все склады' || o.warehouse === whFilter))
    .sort((a, b) => b.id - a.id)[0];

  const filtered = orders.filter(o =>
    (whFilter === 'Все склады' || o.warehouse === whFilter) &&
    (!statusFilter || o.status === statusFilter) &&
    (search === '' ||
      o.title.toLowerCase().includes(search.toLowerCase()) ||
      o.supplier.toLowerCase().includes(search.toLowerCase()) ||
      o.code.toLowerCase().includes(search.toLowerCase()))
  );

  // Notify all subscribers about order change
  async function notifySubscribers(order, changeText) {
    const subs = subscriptions.filter(s => s.order_id === order.id);
    if (!subs.length) return;
    const msg = `Обновление по заказу ${order.code}\n${order.title}\n\n${changeText}`;
    await Promise.all(subs.map(s =>
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: s.tg_id, text: msg }),
      }).catch(() => {})
    ));
  }

  const createOrder = () => {
    const newId = orders.length + 18;
    const { date: today } = nowAstanaStr();
    const o = {
      ...newOrder, id: newId, code: genCode(newId),
      payments: [], created: today,
      items: newOrder.items.filter(i => i.name),
      history: advanceHistory([], 'Принят'),
    };
    addOrder(o);
    setShowCreate(false);
    setNewOrder({ title:'', supplier:'', warehouse:'Астана', planDate:'', status:'Принят', comment:'', country:'РК', items:[{name:'',qty:'',unit:'шт'}] });
    toast.success(`Заказ ${o.code} создан`);
  };

  const toggleSub = (order, e) => {
    e.stopPropagation();
    if (!order || !user.tg_id) return;
    const wasSub = isSubscribed(order.id);
    toggleSubscription(user.tg_id, order.id, order.title);
    toast(wasSub ? 'Подписка отменена' : 'Подписан на обновления', { duration: 2000 });
  };

  const changeStatus = (id, s) => {
    const order   = orders.find(o => o.id === id);
    const history = advanceHistory(order?.history, s);
    updateOrderStatus(id, s, history);
    setSel(prev => prev ? { ...prev, status: s, history } : prev);
    notifySubscribers(order, `Новый статус: ${s}`);
    toast.success(`Статус изменён → ${s}`);
  };

  const startEdit = () => {
    setEditData({ ...sel, items: sel.items.map(i => ({ ...i })) });
    setEditMode(true);
  };

  const saveEdit = () => {
    const patch = {
      title:     editData.title,
      supplier:  editData.supplier,
      planDate:  editData.planDate,
      country:   editData.country,
      warehouse: editData.warehouse,
      comment:   editData.comment,
      items:     editData.items.filter(i => i.name),
    };
    updateOrder(sel.id, patch);
    const updated = { ...sel, ...patch };
    setSel(updated);
    setEditMode(false);
    notifySubscribers(sel, `Данные заказа обновлены администратором`);
    toast.success('Заказ обновлён');
  };

  const setEditItem = (i, field, val) =>
    setEditData(p => ({ ...p, items: p.items.map((it, idx) => idx === i ? { ...it, [field]: val } : it) }));

  // ── Edit form (modal overlay) ────────────────────────────────────────────────
  if (sel && editMode && editData) return (
    <div className="space-y-4">
      <button onClick={() => setEditMode(false)} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors">
        <IcoBack /> Отмена
      </button>
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Редактирование · {sel.code}</div>
            <div className="text-lg font-bold text-gray-900">Изменить заказ</div>
          </div>
          <Badge s={sel.status} />
        </div>
        <div className="p-5 space-y-3">
          {[
            ['Название', 'title', 'text'],
            ['Поставщик', 'supplier', 'text'],
            ['Дата плана', 'planDate', 'text'],
          ].map(([label, field]) => (
            <div key={field}>
              <div className="text-xs text-gray-500 mb-1">{label}</div>
              <input value={editData[field] || ''} onChange={e => setEditData(p => ({ ...p, [field]: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2"
                style={{ '--tw-ring-color': BRAND }} />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">Страна</div>
              <select value={editData.country} onChange={e => setEditData(p => ({ ...p, country: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none">
                {COUNTRIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Склад</div>
              <select value={editData.warehouse} onChange={e => setEditData(p => ({ ...p, warehouse: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none">
                {WAREHOUSES.filter(w => w !== 'Все склады').map(w => <option key={w}>{w}</option>)}
              </select>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Комментарий</div>
            <textarea value={editData.comment || ''} onChange={e => setEditData(p => ({ ...p, comment: e.target.value }))}
              rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none resize-none focus:ring-2"
              style={{ '--tw-ring-color': BRAND }} />
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-2">Состав заказа</div>
            <div className="space-y-2">
              {editData.items.map((it, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input value={it.name} onChange={e => setEditItem(i, 'name', e.target.value)}
                    placeholder="Наименование" className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none" />
                  <input value={it.qty} onChange={e => setEditItem(i, 'qty', e.target.value)}
                    placeholder="Кол-во" className="w-20 px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none" />
                  <input value={it.unit} onChange={e => setEditItem(i, 'unit', e.target.value)}
                    placeholder="ед." className="w-14 px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none" />
                  <button onClick={() => setEditData(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }))}
                    className="text-red-400 hover:text-red-600 text-lg leading-none px-1">×</button>
                </div>
              ))}
              <button onClick={() => setEditData(p => ({ ...p, items: [...p.items, { name:'', qty:'', unit:'шт' }] }))}
                className="text-sm text-teal-600 hover:text-teal-800 font-medium">+ Добавить позицию</button>
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button onClick={() => setEditMode(false)}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors">
            Отмена
          </button>
          <button onClick={saveEdit}
            className="flex-1 py-3 text-white rounded-xl text-sm font-semibold transition-colors"
            style={{ background: BRAND }}>
            Сохранить и уведомить
          </button>
        </div>
      </div>
    </div>
  );

  // ── Detail view ─────────────────────────────────────────────────────────────
  if (sel) return (
    <div className="space-y-4">
      <button onClick={() => setSel(null)} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors">
        <IcoBack /> Назад к списку
      </button>

      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">ЗАЯВКА #{sel.id}</span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-mono rounded-lg">{sel.code}</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 truncate">{sel.title}</h2>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isAdmin && (
                <button onClick={startEdit}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600">
                  ✏️ Изменить
                </button>
              )}
              <button onClick={e => toggleSub(sel, e)} title={isSubscribed(sel.id) ? 'Отписаться' : 'Подписаться'}>
                <IcoBell active={isSubscribed(sel.id)} />
              </button>
              <Badge s={sel.status} />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="p-5 space-y-3 border-b border-gray-100">
          {[
            ["Поставщик",         sel.supplier],
            ["Страна отправления",sel.country || "—"],
            ["Склад",             sel.warehouse],
            ["Дата плана",        sel.planDate],
            ["Код заказа",        sel.code],
            ["Создан",            sel.created],
          ].map(([l, v]) => (
            <div key={l} className="flex items-start justify-between gap-4">
              <span className="text-gray-400 text-sm flex-shrink-0">{l}</span>
              <span className={`text-sm text-right font-medium ${l==="Код заказа"?"font-mono text-teal-700":"text-gray-800"}`}>{v}</span>
            </div>
          ))}
          {sel.comment && (
            <div className="mt-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
              {sel.comment}
            </div>
          )}
        </div>

        {/* Items */}
        {sel.items.length > 0 && (
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Состав заказа</div>
            <div className="rounded-xl overflow-hidden border border-gray-100">
              <div className="grid grid-cols-2 bg-gray-50 px-4 py-2">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Наименование</span>
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide text-right">Кол-во</span>
              </div>
              {sel.items.map((it, i) => (
                <div key={i} className="grid grid-cols-2 px-4 py-2.5 border-t border-gray-50 hover:bg-gray-50">
                  <span className="text-sm text-gray-700">{it.name}</span>
                  <span className="text-sm font-medium text-gray-900 text-right">{it.qty} {it.unit}</span>
                </div>
              ))}
              <div className="grid grid-cols-2 px-4 py-2.5 border-t border-gray-200 bg-gray-50">
                <span className="text-sm font-bold text-gray-800">ИТОГО:</span>
                <span className="text-sm font-bold text-gray-900 text-right">
                  {sel.items.reduce((a, b) => a + Number(b.qty || 0), 0)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="p-5 border-b border-gray-100">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">История статусов</div>
          <StatusTimeline history={sel.history} />
        </div>

        {/* Change status */}
        {isAdmin && (
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider font-semibold">Изменить статус</div>
            <div className="flex flex-wrap gap-1.5">
              {visibleStatuses(sel).map(s => (
                <button key={s} onClick={() => changeStatus(sel.id, s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${sel.status===s?"bg-teal-600 text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="px-5 py-4">
          <button onClick={() => setSel(null)} className="w-full py-3 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><IcoSearch /></span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Поиск…"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 bg-white"
              style={{ '--tw-ring-color': BRAND }} />
          </div>
          {canCreate && (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-white rounded-xl text-sm font-semibold flex-shrink-0 whitespace-nowrap transition-opacity hover:opacity-90"
              style={{ background: BRAND }}>
              <IcoPlus />
              <span className="hidden sm:inline">Создать заказ</span>
            </button>
          )}
        </div>
        <select value={whFilter} onChange={e => { setWhFilter(e.target.value); setStatusFilter(null); }}
          className="w-full sm:w-auto px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white">
          {WAREHOUSES.map(w => <option key={w}>{w}</option>)}
        </select>
      </div>

      {/* Nearest banner */}
      {nearest && (
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-4 cursor-pointer hover:from-slate-700 hover:to-slate-600 transition-all"
          onClick={() => setSel(nearest)}>
          <div className="text-slate-400 text-xs font-medium mb-1">Ближайшее поступление</div>
          <div className="text-white font-bold text-base">{nearest.supplier}</div>
          <div className="text-slate-400 text-sm mt-0.5">{nearest.title} · {nearest.planDate}</div>
          <div className="text-slate-500 text-xs mt-1 font-mono">{nearest.code}</div>
        </div>
      )}

      {/* Clickable status filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">
          Статус — Активные
          {statusFilter && (
            <button onClick={() => setStatusFilter(null)} className="ml-3 text-teal-600 normal-case tracking-normal font-medium hover:underline">
              сбросить ✕
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {STATUS_FLOW.map(s => {
            const cnt    = countFor(s);
            const dot    = STATUS_DOT[s] || "bg-gray-400";
            const active = statusFilter === s;
            return (
              <button key={s} onClick={() => setStatusFilter(active ? null : s)}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-xl transition-all text-left ${active ? "bg-teal-50 border border-teal-200 shadow-sm" : "hover:bg-gray-50 border border-transparent"}`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                <span className={`text-xs flex-1 ${active ? "text-teal-700 font-semibold" : "text-gray-600"}`}>{s}</span>
                <span className={`text-xs font-bold ml-auto ${active ? "text-teal-700" : cnt > 0 ? "text-gray-800" : "text-gray-300"}`}>{cnt}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Мои подписки */}
      {subscriptions.some(s => s.tg_id === user.tg_id) && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <button onClick={() => setSubOpen(v => !v)}
            className="px-5 py-3 border-b border-gray-50 flex items-center gap-2 w-full hover:bg-gray-50 transition-colors">
            <span style={{ width:22, height:22, borderRadius:7, background:'#e8f4f6', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <IcoBell active={true} />
            </span>
            <span className="text-sm font-semibold text-gray-700">Мои подписки</span>
            <span className="text-xs font-bold text-gray-400 ml-1">
              {subscriptions.filter(s => s.tg_id === user.tg_id).length}
            </span>
            <span className="ml-auto text-gray-400" style={{ transform: subOpen ? 'rotate(0deg)' : 'rotate(-90deg)', display:'inline-block', transition:'transform .2s' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
          </button>
          <AnimatePresence initial={false}>
            {subOpen && (
              <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
                transition={{ duration:0.22, ease:'easeInOut' }} style={{ overflow:'hidden' }}>
                <div className="divide-y divide-gray-50">
                  {orders.filter(o => isSubscribed(o.id)).map(o => (
                    <div key={o.id} onClick={() => setSel(o)}
                      className="px-5 py-3 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{o.title}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{o.supplier} · {o.planDate}</div>
                      </div>
                      <Badge s={o.status} />
                      <button onClick={e => toggleSub(o, e)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 flex-shrink-0">
                        <IcoBell active={true} />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Orders list */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">
            {statusFilter || "Все поставки"}
            {whFilter !== "Все склады" && <span className="text-gray-400 ml-1">· {whFilter}</span>}
          </span>
          <span className="text-sm font-bold text-gray-400">{filtered.length}</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">Нет поставок по выбранным фильтрам</div>
        ) : (
          <div className="divide-y divide-gray-50">
            <AnimatePresence initial={false}>
              {filtered.map((o, i) => (
                <motion.div key={o.id}
                  custom={i} variants={itemVariants} initial="hidden" animate="visible"
                  onClick={() => setSel(o)}
                  className="px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm" style={{ color: BRAND }}>#{o.id}</span>
                        <span className="text-gray-300 text-xs font-mono">{o.code}</span>
                      </div>
                      <div className="text-gray-800 font-medium text-sm mt-0.5">{o.title}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge s={o.status} />
                      <button onClick={e => toggleSub(o, e)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-gray-100"
                        title={isSubscribed(o.id) ? 'Отписаться' : 'Подписаться на обновления'}>
                        <IcoBell active={isSubscribed(o.id)} />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">{o.supplier}</div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><IcoBox /> {o.items.reduce((a,b) => a + Number(b.qty||0), 0)}</span>
                    <span className="flex items-center gap-1"><IcoCalendar /> {o.planDate}</span>
                    <span className="flex items-center gap-1 ml-auto"><IcoPin /> {o.warehouse}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && canCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-800">Новый заказ</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="space-y-3">
              {[["Название заказа","title","text"],["Поставщик","supplier","text"],["Дата плана","planDate","date"]].map(([l,k,t]) => (
                <div key={k}>
                  <label className="text-xs font-medium text-gray-600 block mb-1">{l}</label>
                  <input type={t} value={newOrder[k]} onChange={e => setNewOrder({...newOrder,[k]:e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"/>
                </div>
              ))}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Страна отправления</label>
                <div className="flex gap-1.5">
                  {COUNTRIES.map(c => (
                    <button key={c} type="button"
                      onClick={() => setNewOrder({...newOrder, country:c})}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${newOrder.country===c?"bg-slate-800 text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Склад / Город назначения</label>
                <select value={newOrder.warehouse} onChange={e => setNewOrder({...newOrder, warehouse:e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500">
                  {WAREHOUSES.filter(w => w !== "Все склады").map(w => <option key={w}>{w}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Комментарий</label>
                <textarea value={newOrder.comment} onChange={e => setNewOrder({...newOrder,comment:e.target.value})} rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 resize-none"/>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-2">Состав заказа</label>
                <div className="space-y-2">
                  {newOrder.items.map((it, i) => (
                    <div key={i} className="flex gap-2">
                      <input placeholder="Наименование" value={it.name}
                        onChange={e => setNewOrder({...newOrder, items:newOrder.items.map((x,j)=>j===i?{...x,name:e.target.value}:x)})}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"/>
                      <input placeholder="Кол-во" type="number" value={it.qty}
                        onChange={e => setNewOrder({...newOrder, items:newOrder.items.map((x,j)=>j===i?{...x,qty:e.target.value}:x)})}
                        className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"/>
                      <select value={it.unit}
                        onChange={e => setNewOrder({...newOrder, items:newOrder.items.map((x,j)=>j===i?{...x,unit:e.target.value}:x)})}
                        className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500">
                        {["шт","кг","л","уп"].map(u => <option key={u}>{u}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <button onClick={() => setNewOrder({...newOrder, items:[...newOrder.items,{name:"",qty:"",unit:"шт"}]})}
                  className="mt-2 text-teal-600 text-xs font-medium hover:text-teal-700">+ Добавить позицию</button>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium">Отмена</button>
                <button onClick={createOrder} className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700">Создать заказ</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
