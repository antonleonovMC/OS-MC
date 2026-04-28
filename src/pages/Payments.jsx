import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { CURRENCIES, CUR_SIGN, CUR_RATES } from '../data/constants';
import { useData } from '../context/DataContext';
import Badge from '../components/Badge';

const BRAND   = '#28798d';
const fmt     = (n, cur) => CUR_SIGN[cur] + Number(n).toLocaleString('ru-RU');
const toKzt   = (n, cur) => Number(n) * CUR_RATES[cur];
const fmtDate = d => new Date(d).toLocaleDateString('ru-RU', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });

const STATUS_STYLE = {
  'Оплачен':    { bg:'#ecfdf5', color:'#059669', dot:'#059669' },
  'Частично':   { bg:'#fffbeb', color:'#d97706', dot:'#f59e0b' },
  'Не оплачен': { bg:'#fff1f2', color:'#e11d48', dot:'#f43f5e' },
};

const EMPTY_INV = { supplier:'', desc:'', amount:'', cur:'KZT', dueDate:'', comment:'' };
const EMPTY_PAY = { amount:'', cur:'KZT', rate:'', date: new Date().toISOString().slice(0,16), comment:'' };

// ── Sparkline bar (mini chart) ────────────────────────────────────────────────
function ProgressArc({ pct }) {
  const col = pct === 100 ? '#059669' : pct > 0 ? '#f59e0b' : '#f43f5e';
  return (
    <div style={{ position:'relative', height:4, background:'#f1f5f9', borderRadius:99, overflow:'hidden' }}>
      <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ duration:0.6, ease:'easeOut' }}
        style={{ position:'absolute', inset:0, background:col, borderRadius:99 }} />
    </div>
  );
}

export default function Payments() {
  const { invoices, addInvoice, updateInvoice } = useData();
  const [payModal,  setPayModal]  = useState(null);
  const [showForm,  setShowForm]  = useState(false);
  const [selInv,    setSelInv]    = useState(null);
  const [payForm,   setPayForm]   = useState(EMPTY_PAY);
  const [newInv,    setNewInv]    = useState(EMPTY_INV);
  const [tab,       setTab]       = useState('all');   // all | pending | paid

  const totalKzt = invoices.reduce((a, b) => a + toKzt(b.amount, b.cur), 0);
  const paidKzt  = invoices.reduce((a, b) => a + toKzt(b.paid,   b.cur), 0);
  const debtKzt  = totalKzt - paidKzt;
  const pct      = totalKzt ? Math.round(paidKzt / totalKzt * 100) : 0;

  const filtered = invoices.filter(inv => {
    if (tab === 'pending') return inv.status !== 'Оплачен';
    if (tab === 'paid')    return inv.status === 'Оплачен';
    return true;
  });

  const submitPayment = () => {
    if (!payForm.amount) return;
    const rate     = Number(payForm.rate) || CUR_RATES[payForm.cur];
    const amtKzt   = Number(payForm.amount) * rate;
    const amtOrig  = amtKzt / CUR_RATES[payModal.cur];
    const payEntry = {
      amount:  Number(payForm.amount),
      cur:     payForm.cur,
      amtKzt,
      date:    payForm.date || new Date().toISOString(),
      comment: payForm.comment,
    };
    const inv = invoices.find(i => i.id === payModal.id);
    if (inv) {
      const newPaid    = Math.min(inv.paid + amtOrig, inv.amount);
      const status     = newPaid >= inv.amount ? 'Оплачен' : newPaid > 0 ? 'Частично' : 'Не оплачен';
      const newPayments = [...inv.payments, payEntry];
      updateInvoice(payModal.id, { paid: newPaid, status, payments: newPayments });
      if (selInv?.id === inv.id) setSelInv(p => p ? { ...p, paid: newPaid, status, payments: newPayments } : p);
    }
    toast.success('Оплата зафиксирована');
    setPayModal(null);
    setPayForm(EMPTY_PAY);
  };

  const createInvoice = () => {
    if (!newInv.supplier || !newInv.amount) return;
    const id  = `INV-${String(invoices.length + 24).padStart(2,'0')}`;
    const inv = { id, supplier: newInv.supplier, desc: newInv.desc, amount: Number(newInv.amount),
      paid: 0, cur: newInv.cur, status: 'Не оплачен',
      dueDate: newInv.dueDate, comment: newInv.comment, payments: [] };
    addInvoice(inv);
    setShowForm(false);
    setNewInv(EMPTY_INV);
    toast.success(`Счёт ${id} создан`);
  };

  const F = ({ label, children }) => (
    <div>
      <label style={{ fontSize:11, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:6 }}>{label}</label>
      {children}
    </div>
  );
  const inp = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 bg-white';

  // ── Pay modal — rendered globally so it works from detail view too ──────────
  const PayModal = payModal && (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
        initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        style={{background:'rgba(0,0,0,0.5)'}} onClick={()=>setPayModal(null)}>
        <motion.div initial={{y:32,opacity:0}} animate={{y:0,opacity:1}} exit={{y:20,opacity:0}}
          transition={{duration:0.22,ease:'easeOut'}}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
          onClick={e=>e.stopPropagation()}>
          <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:15, fontWeight:700, color:'#1a3a42' }}>Внести оплату</span>
            <button onClick={()=>setPayModal(null)} style={{ color:'#94a3b8', fontSize:18, background:'none', border:'none', cursor:'pointer' }}>✕</button>
          </div>
          <div style={{ margin:'14px 20px', background:'linear-gradient(135deg,#1a3a42,#28798d)', borderRadius:14, padding:'14px 16px', color:'white' }}>
            <div style={{ fontSize:13, fontWeight:700 }}>{payModal.supplier}</div>
            <div style={{ fontSize:11, opacity:0.65, marginBottom:8 }}>{payModal.id}{payModal.desc ? ' · ' + payModal.desc : ''}</div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
              <span style={{ opacity:0.7 }}>Остаток</span>
              <span style={{ fontWeight:700 }}>{fmt(payModal.amount - payModal.paid, payModal.cur)}</span>
            </div>
          </div>
          <div style={{ padding:'0 20px', display:'flex', flexDirection:'column', gap:12 }}>
            <F label="Валюта платежа">
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {CURRENCIES.map(c=>(
                  <button key={c} onClick={()=>setPayForm(p=>({...p,cur:c}))}
                    style={{ padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:600, border:'none', cursor:'pointer',
                      background: payForm.cur===c ? BRAND : '#f0f9fa', color: payForm.cur===c ? 'white' : BRAND, transition:'all .15s' }}>
                    {CUR_SIGN[c]} {c}
                  </button>
                ))}
              </div>
            </F>
            <F label={`Сумма (${payForm.cur})`}>
              <input type="number" value={payForm.amount} onChange={e=>setPayForm(p=>({...p,amount:e.target.value}))}
                placeholder="0" className={inp} style={{'--tw-ring-color':BRAND}}/>
              {payForm.amount && payForm.cur !== 'KZT' && (
                <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>
                  ≈ {(Number(payForm.amount)*(Number(payForm.rate)||CUR_RATES[payForm.cur])).toLocaleString('ru-RU')} ₸
                </div>
              )}
            </F>
            {payForm.cur !== 'KZT' && (
              <F label="Курс к ₸">
                <input type="number" value={payForm.rate} onChange={e=>setPayForm(p=>({...p,rate:e.target.value}))}
                  placeholder={String(CUR_RATES[payForm.cur])} className={inp} style={{'--tw-ring-color':BRAND}}/>
              </F>
            )}
            <F label="Дата и время оплаты">
              <input type="datetime-local" value={payForm.date} onChange={e=>setPayForm(p=>({...p,date:e.target.value}))}
                className={inp} style={{'--tw-ring-color':BRAND}}/>
            </F>
            <F label="Комментарий">
              <input value={payForm.comment} onChange={e=>setPayForm(p=>({...p,comment:e.target.value}))}
                placeholder="Назначение платежа…" className={inp} style={{'--tw-ring-color':BRAND}}/>
            </F>
          </div>
          <div style={{ padding:'14px 20px 18px', display:'flex', gap:10, marginTop:6 }}>
            <button onClick={()=>setPayModal(null)}
              style={{ flex:1, padding:'11px', borderRadius:12, background:'#f1f5f9', color:'#64748b', fontSize:13, fontWeight:500, border:'none', cursor:'pointer' }}>
              Отмена
            </button>
            <button onClick={submitPayment}
              style={{ flex:1, padding:'11px', borderRadius:12, background:'#059669', color:'white', fontSize:13, fontWeight:600, border:'none', cursor:'pointer', opacity:!payForm.amount?0.5:1 }}>
              Подтвердить
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  // ── Detail view ──────────────────────────────────────────────────────────────
  if (selInv) {
    const inv  = invoices.find(i => i.id === selInv.id) || selInv;
    const p2   = inv.amount ? Math.round(inv.paid / inv.amount * 100) : 0;
    const st   = STATUS_STYLE[inv.status] || STATUS_STYLE['Не оплачен'];
    return (
      <div className="space-y-4 max-w-xl mx-auto">
        <button onClick={() => setSelInv(null)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5l-6 5 6 5"/></svg>
          Назад
        </button>

        {/* Hero card */}
        <div style={{ background:'linear-gradient(135deg,#1a3a42 0%,#28798d 100%)', borderRadius:20, padding:'22px 22px 18px', color:'white' }}>
          <div style={{ fontSize:11, opacity:0.6, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:4 }}>{inv.id}</div>
          <div style={{ fontSize:18, fontWeight:700, marginBottom:2 }}>{inv.supplier}</div>
          <div style={{ fontSize:12, opacity:0.65, marginBottom:16 }}>{inv.desc}</div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
            <div>
              <div style={{ fontSize:11, opacity:0.6 }}>Итого</div>
              <div style={{ fontSize:26, fontWeight:800, lineHeight:1 }}>{fmt(inv.amount, inv.cur)}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:11, opacity:0.6 }}>Оплачено</div>
              <div style={{ fontSize:20, fontWeight:700 }}>{fmt(inv.paid, inv.cur)}</div>
            </div>
          </div>
          <div style={{ marginTop:14 }}>
            <div style={{ height:5, background:'rgba(255,255,255,0.2)', borderRadius:99, overflow:'hidden' }}>
              <motion.div initial={{ width:0 }} animate={{ width:`${p2}%` }} transition={{ duration:0.8, ease:'easeOut' }}
                style={{ height:'100%', background:'white', borderRadius:99 }} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontSize:10, opacity:0.6 }}>
              <span>{p2}% оплачено</span>
              <span>Остаток: {fmt(inv.amount - inv.paid, inv.cur)}</span>
            </div>
          </div>
        </div>

        {/* Status + due */}
        <div style={{ background:'white', borderRadius:16, padding:'14px 18px', border:'1px solid #e8f4f6' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:12, color:'#94a3b8' }}>Статус</span>
            <span style={{ fontSize:12, fontWeight:600, padding:'3px 10px', borderRadius:20, background:st.bg, color:st.color }}>{inv.status}</span>
          </div>
          {inv.dueDate && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:10 }}>
              <span style={{ fontSize:12, color:'#94a3b8' }}>Срок оплаты</span>
              <span style={{ fontSize:12, fontWeight:600, color:'#1a3a42' }}>{new Date(inv.dueDate).toLocaleDateString('ru-RU')}</span>
            </div>
          )}
          {inv.comment && (
            <div style={{ marginTop:10, padding:'10px 12px', background:'#fffbeb', borderRadius:10, fontSize:12, color:'#92400e' }}>{inv.comment}</div>
          )}
        </div>

        {/* Payment history */}
        <div style={{ background:'white', borderRadius:16, border:'1px solid #e8f4f6', overflow:'hidden' }}>
          <div style={{ padding:'14px 18px 10px', fontSize:12, fontWeight:600, color:'#1a3a42' }}>История платежей</div>
          {inv.payments.length === 0 ? (
            <div style={{ textAlign:'center', padding:'20px 0 24px', fontSize:12, color:'#cbd5e1' }}>Платежей ещё нет</div>
          ) : (
            <div>
              {inv.payments.map((p, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 18px', borderTop:'1px solid #f8fafc' }}>
                  <div style={{ width:32, height:32, borderRadius:10, background:'#ecfdf5', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M5 10l4 4 6-7" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'#1a3a42' }}>{CUR_SIGN[p.cur]}{Number(p.amount).toLocaleString('ru-RU')} {p.cur}</div>
                    <div style={{ fontSize:10, color:'#94a3b8', marginTop:1 }}>{p.comment || '—'}</div>
                  </div>
                  <div style={{ fontSize:10, color:'#94a3b8', textAlign:'right', flexShrink:0 }}>
                    {p.date ? fmtDate(p.date) : '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
          {inv.status !== 'Оплачен' && (
            <div style={{ padding:'12px 18px', borderTop:'1px solid #f8fafc' }}>
              <button onClick={() => { setPayModal(inv); setPayForm({...EMPTY_PAY, cur: inv.cur}); }}
                style={{ width:'100%', padding:'10px', borderRadius:12, background:BRAND, color:'white', fontSize:13, fontWeight:600, border:'none', cursor:'pointer' }}>
                Внести оплату
              </button>
            </div>
          )}
        </div>
        {PayModal}
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
        style={{ background:'rgba(40,121,141,0.82)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)', border:'1px solid rgba(255,255,255,0.25)', boxShadow:'0 8px 32px rgba(40,121,141,0.35)' }}
        whileHover={{scale:1.05}} whileTap={{scale:0.95}}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M10 4v12M4 10h12"/></svg>
        Создать счёт
      </motion.button>

      {/* Balance hero */}
      <div style={{ background:'linear-gradient(135deg,#1a3a42 0%,#28798d 100%)', borderRadius:20, padding:'20px 20px 16px', color:'white' }}>
        <div style={{ fontSize:11, opacity:0.55, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>Общий баланс</div>
        <div style={{ fontSize:32, fontWeight:800, lineHeight:1, marginBottom:4 }}>
          {(totalKzt / 1_000_000).toFixed(2)}<span style={{ fontSize:16, fontWeight:400, opacity:0.6 }}> млн ₸</span>
        </div>
        <div style={{ fontSize:11, opacity:0.55, marginBottom:14 }}>к оплате по всем счетам</div>
        <div style={{ height:5, background:'rgba(255,255,255,0.18)', borderRadius:99, overflow:'hidden', marginBottom:8 }}>
          <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ duration:0.9, ease:'easeOut' }}
            style={{ height:'100%', background:'white', borderRadius:99 }} />
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
          <span style={{ opacity:0.65 }}>Оплачено <b style={{opacity:1}}>{(paidKzt/1_000_000).toFixed(2)} млн ₸</b></span>
          <span style={{ opacity:0.65 }}>Долг <b style={{opacity:1, color:'#fca5a5'}}>{(debtKzt/1_000_000).toFixed(2)} млн ₸</b></span>
        </div>
      </div>

      {/* Quick stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
        {[
          { label:'Счетов всего',  value: invoices.length,                          sub: 'шт'  },
          { label:'Ожидают',       value: invoices.filter(i=>i.status!=='Оплачен').length, sub: 'шт' },
          { label:'Оплачено',      value: pct + '%',                                sub: 'от суммы' },
        ].map((s,i) => (
          <div key={i} style={{ background:'white', borderRadius:14, padding:'12px 14px', border:'1px solid #e8f4f6', boxShadow:'0 1px 6px rgba(40,121,141,0.05)' }}>
            <div style={{ fontSize:18, fontWeight:700, color:'#1a3a42', lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:10, color:'#94a3b8', marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tab filter */}
      <div style={{ display:'flex', background:'white', borderRadius:14, padding:4, gap:4, border:'1px solid #e8f4f6' }}>
        {[['all','Все'],['pending','Ожидают'],['paid','Оплачены']].map(([id,lbl])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{ flex:1, padding:'7px 0', borderRadius:10, fontSize:12, fontWeight:500, border:'none', cursor:'pointer',
              background: tab===id ? BRAND : 'transparent',
              color: tab===id ? 'white' : '#94a3b8',
              transition:'all .15s' }}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Invoice cards */}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <AnimatePresence>
          {filtered.map((inv, i) => {
            const p2 = inv.amount ? Math.round(inv.paid / inv.amount * 100) : 0;
            const st = STATUS_STYLE[inv.status] || STATUS_STYLE['Не оплачен'];
            return (
              <motion.div key={inv.id}
                initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}
                transition={{delay:i*0.04, duration:0.2}}
                onClick={() => setSelInv(inv)}
                style={{ background:'white', borderRadius:16, padding:'16px 18px', border:'1px solid #e8f4f6',
                  boxShadow:'0 1px 8px rgba(40,121,141,0.06)', cursor:'pointer', transition:'box-shadow .15s' }}
                whileHover={{ boxShadow:'0 4px 20px rgba(40,121,141,0.14)' }}>

                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#1a3a42', marginBottom:2 }}>{inv.supplier}</div>
                    <div style={{ fontSize:11, color:'#94a3b8' }}>{inv.id}{inv.desc ? ' · ' + inv.desc : ''}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0, marginLeft:12 }}>
                    <div style={{ fontSize:15, fontWeight:700, color:'#1a3a42' }}>{fmt(inv.amount, inv.cur)}</div>
                    <div style={{ fontSize:10, color:'#94a3b8' }}>{(toKzt(inv.amount,inv.cur)/1000).toFixed(0)}K ₸</div>
                  </div>
                </div>

                <ProgressArc pct={p2} />

                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:8 }}>
                  <span style={{ fontSize:11, padding:'3px 9px', borderRadius:20, background:st.bg, color:st.color, fontWeight:500 }}>
                    <span style={{ width:5, height:5, borderRadius:'50%', background:st.dot, display:'inline-block', marginRight:4, verticalAlign:'middle' }}/>
                    {inv.status}
                  </span>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    {inv.payments.length > 0 && (
                      <span style={{ fontSize:10, color:'#94a3b8' }}>
                        {inv.payments.length} платеж{inv.payments.length>1?'а':''}
                      </span>
                    )}
                    <span style={{ fontSize:11, color:'#94a3b8' }}>
                      {fmt(inv.paid, inv.cur)} / {fmt(inv.amount, inv.cur)}
                    </span>
                  </div>
                </div>

                {inv.dueDate && (
                  <div style={{ marginTop:8, fontSize:10, color:'#94a3b8', display:'flex', alignItems:'center', gap:4 }}>
                    <svg width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="14" height="14" rx="2"/><path d="M3 9h14M7 2v3M13 2v3"/></svg>
                    Срок: {new Date(inv.dueDate).toLocaleDateString('ru-RU')}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:'40px 0', color:'#cbd5e1', fontSize:13 }}>Нет счетов</div>
        )}
      </div>

      <div className="h-16 lg:hidden" />

      {/* ── Create modal ───────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{background:'rgba(0,0,0,0.5)'}} onClick={()=>setShowForm(false)}>
            <motion.div initial={{y:32,opacity:0}} animate={{y:0,opacity:1}} exit={{y:20,opacity:0}}
              transition={{duration:0.22,ease:'easeOut'}}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
              onClick={e=>e.stopPropagation()}>
              <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:15, fontWeight:700, color:'#1a3a42' }}>Новый счёт</span>
                <button onClick={()=>setShowForm(false)} style={{ color:'#94a3b8', fontSize:18, background:'none', border:'none', cursor:'pointer' }}>✕</button>
              </div>
              <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:14 }}>
                <F label="Поставщик">
                  <input value={newInv.supplier} onChange={e=>setNewInv({...newInv,supplier:e.target.value})}
                    placeholder="Название компании" className={inp} style={{'--tw-ring-color':BRAND}}/>
                </F>
                <F label="Описание / № счёта">
                  <input value={newInv.desc} onChange={e=>setNewInv({...newInv,desc:e.target.value})}
                    placeholder="INV-001 · Описание" className={inp} style={{'--tw-ring-color':BRAND}}/>
                </F>
                <F label="Сумма">
                  <input type="number" value={newInv.amount} onChange={e=>setNewInv({...newInv,amount:e.target.value})}
                    placeholder="0" className={inp} style={{'--tw-ring-color':BRAND}}/>
                </F>
                <F label="Валюта">
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {CURRENCIES.map(c=>(
                      <button key={c} onClick={()=>setNewInv({...newInv,cur:c})}
                        style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:600, border:'none', cursor:'pointer',
                          background: newInv.cur===c ? BRAND : '#f0f9fa',
                          color: newInv.cur===c ? 'white' : BRAND, transition:'all .15s' }}>
                        {CUR_SIGN[c]} {c}
                      </button>
                    ))}
                  </div>
                </F>
                <F label="Срок оплаты">
                  <input type="date" value={newInv.dueDate} onChange={e=>setNewInv({...newInv,dueDate:e.target.value})}
                    className={inp} style={{'--tw-ring-color':BRAND}}/>
                </F>
                <F label="Комментарий">
                  <textarea value={newInv.comment} onChange={e=>setNewInv({...newInv,comment:e.target.value})}
                    rows={2} placeholder="Дополнительно…"
                    className={inp + ' resize-none'} style={{'--tw-ring-color':BRAND}}/>
                </F>
              </div>
              <div style={{ padding:'12px 20px 18px', borderTop:'1px solid #f1f5f9', display:'flex', gap:10 }}>
                <button onClick={()=>setShowForm(false)}
                  style={{ flex:1, padding:'11px', borderRadius:12, background:'#f1f5f9', color:'#64748b', fontSize:13, fontWeight:500, border:'none', cursor:'pointer' }}>
                  Отмена
                </button>
                <button onClick={createInvoice}
                  style={{ flex:1, padding:'11px', borderRadius:12, background:BRAND, color:'white', fontSize:13, fontWeight:600, border:'none', cursor:'pointer', opacity: (!newInv.supplier||!newInv.amount)?0.5:1 }}>
                  Создать счёт
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {PayModal}
    </div>
  );
}
