import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useData } from '../context/DataContext';

const BRAND = '#28798d';
const DARK  = '#1a3a42';

const LEGAL_ENTITIES = [
  'ТОО "Мастер Кофе"',
  'ТОО "МК Астана"',
  'ТОО "МК Алматы"',
  'ИП Аймаханова',
];

const CATEGORIES = [
  'Логистика', 'Кофе и сырьё', 'Аренда', 'Зарплата',
  'Оборудование', 'Маркетинг', 'Прочее',
];

const CURRENCIES = ['KZT', 'USD', 'EUR', 'CNY'];
const CUR_SIGN = { KZT: '₸', USD: '$', EUR: '€', CNY: '¥' };

const STATUS_STYLE = {
  'Новая':        { bg:'#eff6ff', color:'#2563eb', dot:'#3b82f6' },
  'Подтверждена': { bg:'#ecfdf5', color:'#059669', dot:'#10b981' },
  'Отклонена':    { bg:'#fff1f2', color:'#e11d48', dot:'#f43f5e' },
  'Оплачена':     { bg:'#f0f9ff', color:'#0284c7', dot:'#38bdf8' },
  'Закрыта':      { bg:'#f8fafc', color:'#64748b', dot:'#94a3b8' },
};

const EMPTY_FORM = {
  legal_entity: LEGAL_ENTITIES[0],
  recipient: '',
  amount: '',
  currency: 'KZT',
  category: CATEGORIES[0],
  due_date: '',
  purpose: '',
  comment: '',
};

function FL({ children }) {
  return (
    <div style={{ fontSize:11, fontWeight:600, color:'#94a3b8', textTransform:'uppercase',
      letterSpacing:'0.06em', marginBottom:6 }}>
      {children}
    </div>
  );
}

function StatusPill({ s }) {
  const st = STATUS_STYLE[s] || STATUS_STYLE['Новая'];
  return (
    <span style={{ fontSize:11, fontWeight:500, padding:'3px 10px', borderRadius:20,
      background:st.bg, color:st.color, display:'inline-flex', alignItems:'center', gap:5, whiteSpace:'nowrap' }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:st.dot, flexShrink:0 }}/>
      {s}
    </span>
  );
}

const INP = {
  width:'100%', padding:'10px 12px', border:'1px solid #e2e8f0', borderRadius:10,
  fontSize:14, outline:'none', boxSizing:'border-box', background:'white',
};

export default function Payments({ user }) {
  const { paymentRequests, addPaymentRequest, updatePaymentRequest } = useData();

  const [tab,          setTab]          = useState('all');
  const [showForm,     setShowForm]     = useState(false);
  const [selected,     setSelected]     = useState(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject,   setShowReject]   = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);

  const isDirector  = ['admin', 'director_tk'].includes(user?.role);
  const isAdmin     = user?.role === 'admin';
  const requests    = paymentRequests || [];

  const filtered = requests.filter(r => {
    if (tab === 'new')       return r.status === 'Новая';
    if (tab === 'confirmed') return r.status === 'Подтверждена';
    if (tab === 'paid')      return ['Оплачена','Закрыта'].includes(r.status);
    if (tab === 'rejected')  return r.status === 'Отклонена';
    return true;
  });

  const totalNew       = requests.filter(r => r.status === 'Новая').length;
  const totalConfirmed = requests.filter(r => r.status === 'Подтверждена').length;
  const totalSum       = requests
    .filter(r => !['Отклонена','Закрыта'].includes(r.status))
    .reduce((a, r) => a + (r.currency === 'KZT' ? Number(r.amount) : Number(r.amount) * 500), 0);

  const submit = () => {
    if (!form.recipient || !form.amount || !form.due_date || !form.purpose) {
      toast.error('Заполните все обязательные поля');
      return;
    }
    const id = `PAY-${String(requests.length + 1).padStart(3,'0')}`;
    addPaymentRequest({
      id,
      requester:    user?.name || user?.tg || '—',
      legal_entity: form.legal_entity,
      recipient:    form.recipient,
      amount:       Number(form.amount),
      currency:     form.currency,
      category:     form.category,
      due_date:     form.due_date,
      purpose:      form.purpose,
      comment:      form.comment,
      status:       'Новая',
      created:      new Date().toLocaleDateString('ru-RU'),
      reject_reason: '',
      confirmed_by:  '',
      confirmed_at:  '',
      paid_by:       '',
      paid_at:       '',
    });
    setShowForm(false);
    setForm(EMPTY_FORM);
    toast.success(`Заявка ${id} отправлена на рассмотрение`);
  };

  const confirm = (req) => {
    const patch = {
      status:       'Подтверждена',
      confirmed_by: user?.name || user?.tg || '—',
      confirmed_at: new Date().toLocaleDateString('ru-RU'),
    };
    updatePaymentRequest(req.id, patch);
    if (selected?.id === req.id) setSelected(p => ({ ...p, ...patch }));
    toast.success('Заявка подтверждена ✓');
  };

  const openReject = (req) => {
    setRejectTarget(req);
    setRejectReason('');
    setShowReject(true);
  };

  const doReject = () => {
    if (!rejectReason.trim()) { toast.error('Укажите причину'); return; }
    const patch = { status: 'Отклонена', reject_reason: rejectReason };
    updatePaymentRequest(rejectTarget.id, patch);
    if (selected?.id === rejectTarget.id) setSelected(p => ({ ...p, ...patch }));
    setShowReject(false);
    setRejectTarget(null);
    toast.success('Заявка отклонена');
  };

  const markPaid = (req) => {
    const patch = {
      status:  'Оплачена',
      paid_by: user?.name || user?.tg || '—',
      paid_at: new Date().toLocaleDateString('ru-RU'),
    };
    updatePaymentRequest(req.id, patch);
    if (selected?.id === req.id) setSelected(p => ({ ...p, ...patch }));
    toast.success('Оплата зафиксирована ✓');
  };

  // ── Reject modal ─────────────────────────────────────────────────────────────
  const RejectModal = (
    <AnimatePresence>
      {showReject && (
        <motion.div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
          initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
          style={{background:'rgba(0,0,0,0.5)'}} onClick={() => setShowReject(false)}>
          <motion.div initial={{y:32,opacity:0}} animate={{y:0,opacity:1}} exit={{y:20,opacity:0}}
            transition={{duration:0.22}} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"
            onClick={e => e.stopPropagation()}>
            <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid #f1f5f9',
              display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:15, fontWeight:700, color:DARK }}>Причина отклонения</span>
              <button onClick={() => setShowReject(false)}
                style={{ color:'#94a3b8', fontSize:18, background:'none', border:'none', cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ padding:'16px 20px' }}>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                rows={3} placeholder="Укажите причину…"
                style={{ ...INP, resize:'none' }}/>
            </div>
            <div style={{ padding:'12px 20px 18px', display:'flex', gap:10 }}>
              <button onClick={() => setShowReject(false)}
                style={{ flex:1, padding:'11px', borderRadius:12, background:'#f1f5f9', color:'#64748b', fontSize:13, border:'none', cursor:'pointer' }}>
                Отмена
              </button>
              <button onClick={doReject}
                style={{ flex:1, padding:'11px', borderRadius:12, background:'#e11d48', color:'white', fontSize:13, fontWeight:600, border:'none', cursor:'pointer' }}>
                Отклонить
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ── Detail view ──────────────────────────────────────────────────────────────
  if (selected) {
    const req = requests.find(r => r.id === selected.id) || selected;
    const rows = [
      ['Юр.лицо',          req.legal_entity],
      ['Получатель',        req.recipient],
      ['Категория',         req.category],
      ['Назначение',        req.purpose],
      ['Дата оплаты',       req.due_date],
      ['Подал(а)',          req.requester],
      ['Дата заявки',       req.created],
      req.confirmed_by && ['Подтвердил(а)', `${req.confirmed_by} · ${req.confirmed_at}`],
      req.paid_by      && ['Оплатил(а)',    `${req.paid_by} · ${req.paid_at}`],
      req.reject_reason && ['Причина отклонения', req.reject_reason],
      req.comment      && ['Комментарий',   req.comment],
    ].filter(Boolean);

    return (
      <div className="space-y-4 max-w-xl mx-auto">
        <button onClick={() => setSelected(null)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5l-6 5 6 5"/>
          </svg>
          Назад
        </button>

        {/* Hero */}
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
          style={{ background:'linear-gradient(135deg,#1a3a42 0%,#28798d 100%)', borderRadius:20, padding:'22px', color:'white' }}>
          <div style={{ fontSize:11, opacity:.55, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:4 }}>{req.id}</div>
          <div style={{ fontSize:18, fontWeight:700, marginBottom:6 }}>{req.recipient}</div>
          <div style={{ fontSize:30, fontWeight:800, lineHeight:1, marginBottom:8 }}>
            {CUR_SIGN[req.currency]}{Number(req.amount).toLocaleString('ru-RU')}
            <span style={{ fontSize:14, fontWeight:400, opacity:.6 }}> {req.currency}</span>
          </div>
          <div style={{ fontSize:12, opacity:.7, marginBottom:14 }}>{req.purpose}</div>
          <StatusPill s={req.status} />
        </motion.div>

        {/* Details */}
        <div style={{ background:'white', borderRadius:16, border:'1px solid #e8f4f6', overflow:'hidden' }}>
          {rows.map(([label, value], i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start',
              padding:'12px 18px', borderBottom: i < rows.length-1 ? '1px solid #f8fafc' : 'none', gap:16 }}>
              <span style={{ fontSize:12, color:'#94a3b8', flexShrink:0 }}>{label}</span>
              <span style={{ fontSize:12, fontWeight:500, color: label === 'Причина отклонения' ? '#e11d48' : DARK,
                textAlign:'right' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        {req.status === 'Новая' && isDirector && (
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => openReject(req)}
              style={{ flex:1, padding:'13px', borderRadius:14, background:'#fff1f2', color:'#e11d48',
                fontSize:13, fontWeight:600, border:'none', cursor:'pointer' }}>
              Отклонить
            </button>
            <button onClick={() => confirm(req)}
              style={{ flex:1, padding:'13px', borderRadius:14, background:'#059669', color:'white',
                fontSize:13, fontWeight:600, border:'none', cursor:'pointer' }}>
              Подтвердить ✓
            </button>
          </div>
        )}

        {req.status === 'Подтверждена' && isAdmin && (
          <button onClick={() => markPaid(req)}
            style={{ width:'100%', padding:'13px', borderRadius:14, background:BRAND, color:'white',
              fontSize:13, fontWeight:600, border:'none', cursor:'pointer' }}>
            Отметить как оплачено
          </button>
        )}

        {RejectModal}
      </div>
    );
  }

  // ── List view ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* FAB */}
      <motion.button
        initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}}
        onClick={() => setShowForm(true)}
        className="fixed bottom-24 lg:bottom-8 inset-x-0 lg:inset-x-auto lg:left-52 lg:right-0 mx-auto w-fit z-40 flex items-center gap-2 px-5 py-3 text-white text-sm font-semibold rounded-full whitespace-nowrap"
        style={{ background:'rgba(40,121,141,0.82)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)',
          border:'1px solid rgba(255,255,255,0.25)', boxShadow:'0 8px 32px rgba(40,121,141,0.35)' }}
        whileHover={{scale:1.05}} whileTap={{scale:0.95}}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <path d="M10 4v12M4 10h12"/>
        </svg>
        Новая заявка
      </motion.button>

      {/* Hero stats */}
      <div style={{ background:'linear-gradient(135deg,#1a3a42 0%,#28798d 100%)', borderRadius:20, padding:'20px 22px', color:'white' }}>
        <div style={{ fontSize:11, opacity:.55, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>
          Заявки на оплату
        </div>
        <div style={{ fontSize:28, fontWeight:800, lineHeight:1, marginBottom:14 }}>
          {(totalSum / 1_000_000).toFixed(2)}
          <span style={{ fontSize:14, fontWeight:400, opacity:.6 }}> млн ₸</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
          {[
            { label:'Всего заявок', value: requests.length },
            { label:'Новых',        value: totalNew,       highlight: totalNew > 0 },
            { label:'Подтв.',       value: totalConfirmed },
          ].map((s, i) => (
            <div key={i} style={{ background:'rgba(255,255,255,0.1)', borderRadius:12, padding:'10px 12px' }}>
              <div style={{ fontSize:22, fontWeight:700, color: s.highlight ? '#fbbf24' : 'white' }}>{s.value}</div>
              <div style={{ fontSize:10, opacity:.65, marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', background:'white', borderRadius:14, padding:4, gap:3,
        border:'1px solid #e8f4f6', overflowX:'auto' }}>
        {[['all','Все'], ['new','Новые'], ['confirmed','Подтв.'], ['paid','Оплачены'], ['rejected','Откл.']].map(([id,lbl]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ flex:1, padding:'7px 6px', borderRadius:10, fontSize:11, fontWeight:500,
              border:'none', cursor:'pointer', whiteSpace:'nowrap', minWidth:0,
              background: tab===id ? BRAND : 'transparent',
              color: tab===id ? 'white' : '#94a3b8',
              transition:'all .15s' }}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <AnimatePresence>
          {filtered.map((req, i) => (
            <motion.div key={req.id}
              initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}
              transition={{delay:i*0.04, duration:0.2}}
              onClick={() => setSelected(req)}
              style={{ background:'white', borderRadius:16, padding:'16px 18px', border:'1px solid #e8f4f6',
                boxShadow:'0 1px 8px rgba(40,121,141,0.06)', cursor:'pointer' }}
              whileHover={{ boxShadow:'0 4px 20px rgba(40,121,141,0.14)' }}>

              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:DARK, marginBottom:2 }}>{req.recipient}</div>
                  <div style={{ fontSize:11, color:'#94a3b8' }}>{req.id} · {req.legal_entity}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0, marginLeft:12 }}>
                  <div style={{ fontSize:15, fontWeight:700, color:DARK }}>
                    {CUR_SIGN[req.currency]}{Number(req.amount).toLocaleString('ru-RU')}
                  </div>
                  <div style={{ fontSize:10, color:'#94a3b8' }}>{req.currency}</div>
                </div>
              </div>

              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: (req.status==='Новая'&&isDirector)||(req.status==='Подтверждена'&&isAdmin) ? 10 : 0 }}>
                <StatusPill s={req.status} />
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <span style={{ fontSize:10, color:'#94a3b8' }}>{req.category}</span>
                  {req.due_date && (
                    <span style={{ fontSize:10, color:'#94a3b8' }}>📅 {req.due_date}</span>
                  )}
                </div>
              </div>

              {/* Inline actions */}
              {req.status === 'Новая' && isDirector && (
                <div style={{ display:'flex', gap:8 }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => openReject(req)}
                    style={{ flex:1, padding:'7px', borderRadius:10, background:'#fff1f2', color:'#e11d48',
                      fontSize:12, fontWeight:500, border:'none', cursor:'pointer' }}>
                    Отклонить
                  </button>
                  <button onClick={() => confirm(req)}
                    style={{ flex:1, padding:'7px', borderRadius:10, background:'#ecfdf5', color:'#059669',
                      fontSize:12, fontWeight:500, border:'none', cursor:'pointer' }}>
                    Подтвердить ✓
                  </button>
                </div>
              )}

              {req.status === 'Подтверждена' && isAdmin && (
                <div onClick={e => e.stopPropagation()}>
                  <button onClick={() => markPaid(req)}
                    style={{ width:'100%', padding:'7px', borderRadius:10, background:'#f0f9ff', color:BRAND,
                      fontSize:12, fontWeight:500, border:`1px solid ${BRAND}33`, cursor:'pointer' }}>
                    Отметить как оплачено
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:'40px 0', color:'#cbd5e1', fontSize:13 }}>
            Нет заявок
          </div>
        )}
      </div>

      <div className="h-16 lg:hidden" />

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{background:'rgba(0,0,0,0.5)'}} onClick={() => setShowForm(false)}>
            <motion.div initial={{y:32,opacity:0}} animate={{y:0,opacity:1}} exit={{y:20,opacity:0}}
              transition={{duration:0.22}}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid #f1f5f9',
                display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:15, fontWeight:700, color:DARK }}>Заявка на оплату</span>
                <button onClick={() => setShowForm(false)}
                  style={{ color:'#94a3b8', fontSize:18, background:'none', border:'none', cursor:'pointer' }}>✕</button>
              </div>

              <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:14 }}>
                <div>
                  <FL>Юр.лицо плательщика *</FL>
                  <select value={form.legal_entity} onChange={e => setForm(p => ({...p, legal_entity:e.target.value}))}
                    style={INP}>
                    {LEGAL_ENTITIES.map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>

                <div>
                  <FL>Получатель *</FL>
                  <input value={form.recipient} onChange={e => setForm(p => ({...p, recipient:e.target.value}))}
                    placeholder="Название компании / ФИО" style={INP}/>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div>
                    <FL>Сумма *</FL>
                    <input type="number" value={form.amount} onChange={e => setForm(p => ({...p, amount:e.target.value}))}
                      placeholder="0" style={INP}/>
                  </div>
                  <div>
                    <FL>Валюта</FL>
                    <select value={form.currency} onChange={e => setForm(p => ({...p, currency:e.target.value}))}
                      style={INP}>
                      {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <FL>Категория</FL>
                  <select value={form.category} onChange={e => setForm(p => ({...p, category:e.target.value}))}
                    style={INP}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <FL>Желаемая дата оплаты *</FL>
                  <input type="date" value={form.due_date} onChange={e => setForm(p => ({...p, due_date:e.target.value}))}
                    style={INP}/>
                </div>

                <div>
                  <FL>Назначение платежа *</FL>
                  <input value={form.purpose} onChange={e => setForm(p => ({...p, purpose:e.target.value}))}
                    placeholder="За что платим" style={INP}/>
                </div>

                <div>
                  <FL>Комментарий</FL>
                  <textarea value={form.comment} onChange={e => setForm(p => ({...p, comment:e.target.value}))}
                    rows={2} placeholder="Дополнительно…"
                    style={{ ...INP, resize:'none' }}/>
                </div>
              </div>

              <div style={{ padding:'12px 20px 20px', borderTop:'1px solid #f1f5f9', display:'flex', gap:10 }}>
                <button onClick={() => setShowForm(false)}
                  style={{ flex:1, padding:'12px', borderRadius:12, background:'#f1f5f9', color:'#64748b',
                    fontSize:13, border:'none', cursor:'pointer' }}>
                  Отмена
                </button>
                <button onClick={submit}
                  style={{ flex:1, padding:'12px', borderRadius:12, background:BRAND, color:'white',
                    fontSize:13, fontWeight:600, border:'none', cursor:'pointer',
                    opacity: (!form.recipient || !form.amount || !form.due_date || !form.purpose) ? 0.5 : 1 }}>
                  Отправить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {RejectModal}
    </div>
  );
}
