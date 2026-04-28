import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useData } from '../context/DataContext';

const BRAND   = '#28798d';
const COFFEES = ["Эспрессо Бленд","Бразилия Можиана","Space Coffee","Колумбия Уила","Эфиопия Йиргачефф"];
const STATUSES = ["Принят","В обжарке","Отправлен","Получен"];
const CITIES  = ["Астана","Алматы"];

const STATUS_STYLE = {
  'Принят':    { bg:'#eff6ff', color:'#2563eb', dot:'#3b82f6' },
  'В обжарке': { bg:'#fff7ed', color:'#c2410c', dot:'#f97316' },
  'Отправлен': { bg:'#f5f3ff', color:'#7c3aed', dot:'#8b5cf6' },
  'Получен':   { bg:'#ecfdf5', color:'#059669', dot:'#10b981' },
};

function StatusPill({ s }) {
  const st = STATUS_STYLE[s] || { bg:'#f1f5f9', color:'#64748b', dot:'#94a3b8' };
  return (
    <span style={{ fontSize:11, fontWeight:500, padding:'3px 10px', borderRadius:20,
      background:st.bg, color:st.color, display:'inline-flex', alignItems:'center', gap:5, whiteSpace:'nowrap' }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:st.dot, flexShrink:0 }}/>
      {s}
    </span>
  );
}

function FieldLabel({ children }) {
  return <div style={{ fontSize:11, fontWeight:600, color:'#94a3b8', textTransform:'uppercase',
    letterSpacing:'0.06em', marginBottom:6 }}>{children}</div>;
}

export default function Coffee({ user }) {
  const { coffees: orders, addCoffeeOrder, updateCoffeeOrder } = useData();
  const [cityF,    setCityF]    = useState('Все');
  const [showForm, setShowForm] = useState(false);
  const [sel,      setSel]      = useState(null);
  const [shipModal, setShipModal] = useState(null); // { orderId, itemIdx }
  const [shipQty,  setShipQty]  = useState('');
  const [newCity,  setNewCity]  = useState('Астана');
  const [items,    setItems]    = useState([{ name:'', qty:'', unit:'кг' }]);

  const canCreate = ['director','manager','director_tk'].includes(user.role);
  const filtered  = orders.filter(o => cityF === 'Все' || o.city === cityF);

  // helpers
  const getOrder = id => orders.find(o => o.id === id);
  const totalShipped = order => order.items.reduce((a,it)=>a+Number(it.shipped||0),0);
  const totalQty     = order => order.items.reduce((a,it)=>a+Number(it.qty||0),0);
  const itemRemaining = it => Number(it.qty||0) - Number(it.shipped||0);

  const submit = () => {
    const valid = items.filter(i => i.name && i.qty);
    if (!valid.length) return;
    const newOrder = {
      id:     `COF-0${String(orders.length + 13).padStart(2,'0')}`,
      city:   newCity,
      date:   new Date().toLocaleDateString('ru-RU'),
      status: 'Принят',
      items:  valid.map(i => ({ ...i, qty: Number(i.qty), shipped: 0 })),
    };
    addCoffeeOrder(newOrder);
    setShowForm(false);
    setItems([{ name:'', qty:'', unit:'кг' }]);
    toast.success(`Заказ ${newOrder.id} отправлен в обжарку`);
  };

  const changeStatus = (id, s) => {
    updateCoffeeOrder(id, { status: s });
    setSel(p => p ? { ...p, status: s } : p);
    toast.success(`Статус → ${s}`);
  };

  // Отгрузить часть / всё
  const openShip = (orderId, itemIdx) => {
    setShipModal({ orderId, itemIdx });
    setShipQty('');
  };

  const confirmShip = () => {
    const { orderId, itemIdx } = shipModal;
    const qty = Number(shipQty);
    if (!qty || qty <= 0) return;
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const newItems = order.items.map((it, i) => {
      if (i !== itemIdx) return it;
      return { ...it, shipped: Math.min(Number(it.shipped||0) + qty, Number(it.qty)) };
    });
    const allShipped = newItems.every(it => Number(it.shipped||0) >= Number(it.qty));
    const patch = { items: newItems };
    if (allShipped && order.status !== 'Получен') patch.status = 'Отправлен';
    updateCoffeeOrder(orderId, patch);
    setSel(p => p?.id === orderId ? { ...p, ...patch } : p);
    toast.success(`Отгружено ${qty} ${order.items[itemIdx]?.unit}`);
    setShipModal(null);
    setShipQty('');
  };

  // После confirmShip обновляем sel из свежего state
  const openDetail = id => setSel(orders.find(o => o.id === id) || null);

  // ── Detail ───────────────────────────────────────────────────────────────────
  if (sel) {
    const order    = orders.find(o => o.id === sel.id) || sel;
    const st       = STATUS_STYLE[order.status] || STATUS_STYLE['Принят'];
    const shipped  = totalShipped(order);
    const total    = totalQty(order);
    const pct      = total > 0 ? Math.round(shipped / total * 100) : 0;

    return (
      <div className="space-y-4 max-w-xl mx-auto">
        <button onClick={() => setSel(null)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5l-6 5 6 5"/></svg>
          Назад
        </button>

        {/* Hero */}
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
          style={{ background:'linear-gradient(135deg,#1a3a42 0%,#28798d 100%)', borderRadius:20, padding:'22px', color:'white' }}>
          <div style={{ fontSize:11, opacity:.55, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:4 }}>{order.id}</div>
          <div style={{ fontSize:18, fontWeight:700, marginBottom:2 }}>☕ Заказ на обжарку</div>
          <div style={{ fontSize:12, opacity:.6, marginBottom:16 }}>📍 {order.city} · {order.date}</div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
            <div><div style={{ fontSize:11, opacity:.6 }}>Всего</div><div style={{ fontSize:26, fontWeight:800, lineHeight:1 }}>{total} кг</div></div>
            <div style={{ textAlign:'right' }}><div style={{ fontSize:11, opacity:.6 }}>Отгружено</div><div style={{ fontSize:26, fontWeight:800, lineHeight:1 }}>{shipped} кг</div></div>
          </div>
          <div style={{ height:5, background:'rgba(255,255,255,0.2)', borderRadius:99, overflow:'hidden', marginBottom:6 }}>
            <motion.div initial={{width:0}} animate={{width:`${pct}%`}} transition={{duration:.8,ease:'easeOut'}}
              style={{ height:'100%', background:'white', borderRadius:99 }}/>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, opacity:.6 }}>
            <span>{pct}% отгружено</span>
            <span>Остаток: {total - shipped} кг</span>
          </div>
        </motion.div>

        {/* Status */}
        <div style={{ background:'white', borderRadius:16, padding:'14px 18px', border:'1px solid #e8f4f6' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <span style={{ fontSize:12, color:'#94a3b8' }}>Статус</span>
            <StatusPill s={order.status} />
          </div>
          <FieldLabel>Изменить статус</FieldLabel>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {STATUSES.map(s => (
              <button key={s} onClick={() => changeStatus(order.id, s)}
                style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:500, border:'none', cursor:'pointer', transition:'all .15s',
                  background: order.status===s ? BRAND : '#f0f9fa', color: order.status===s ? 'white' : BRAND }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Items с отгрузкой */}
        <div style={{ background:'white', borderRadius:16, border:'1px solid #e8f4f6', overflow:'hidden' }}>
          <div style={{ padding:'14px 18px 10px', fontSize:12, fontWeight:700, color:'#1a3a42' }}>
            Состав заказа · Отгрузка
          </div>
          {order.items.map((it, i) => {
            const itPct = Number(it.qty) > 0 ? Math.round(Number(it.shipped||0)/Number(it.qty)*100) : 0;
            const rem   = itemRemaining(it);
            const done  = rem <= 0;
            return (
              <div key={i} style={{ padding:'12px 18px', borderTop:'1px solid #f8fafc' }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:10, background: done ? '#ecfdf5' : '#fff7ed',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>
                      {done ? '✅' : '☕'}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:'#1a3a42' }}>{it.name}</div>
                      <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>
                        {it.shipped||0} / {it.qty} {it.unit} отгружено
                      </div>
                    </div>
                  </div>
                  {!done ? (
                    <button onClick={() => openShip(order.id, i)}
                      style={{ padding:'5px 12px', borderRadius:20, fontSize:11, fontWeight:600, background:'#e8f4f6',
                        color:BRAND, border:`1px solid ${BRAND}33`, cursor:'pointer' }}>
                      Отгрузить
                    </button>
                  ) : (
                    <span style={{ fontSize:11, fontWeight:600, color:'#059669', background:'#ecfdf5',
                      padding:'3px 10px', borderRadius:20 }}>Готово</span>
                  )}
                </div>
                {/* Progress bar per item */}
                <div style={{ height:3, background:'#f1f5f9', borderRadius:99, overflow:'hidden' }}>
                  <motion.div animate={{width:`${itPct}%`}} transition={{duration:.5}}
                    style={{ height:'100%', background: done ? '#10b981' : BRAND, borderRadius:99 }}/>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#94a3b8', marginTop:3 }}>
                  <span>{itPct}%</span>
                  {!done && <span style={{ color:'#f97316', fontWeight:500 }}>Осталось: {rem} {it.unit}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Shipment modal */}
        <AnimatePresence>
          {shipModal && shipModal.orderId === order.id && (() => {
            const it = order.items[shipModal.itemIdx];
            const rem = itemRemaining(it);
            return (
              <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
                initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                style={{background:'rgba(0,0,0,0.5)'}} onClick={() => setShipModal(null)}>
                <motion.div initial={{y:40,opacity:0}} animate={{y:0,opacity:1}} exit={{y:40,opacity:0}}
                  transition={{type:'spring',stiffness:380,damping:38}}
                  className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"
                  onClick={e=>e.stopPropagation()}>
                  <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontSize:15, fontWeight:700, color:'#1a3a42' }}>Отгрузка</span>
                    <button onClick={() => setShipModal(null)} style={{ color:'#94a3b8', fontSize:18, background:'none', border:'none', cursor:'pointer' }}>✕</button>
                  </div>
                  <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:14 }}>
                    <div style={{ background:'linear-gradient(135deg,#1a3a42,#28798d)', borderRadius:12, padding:'12px 16px', color:'white' }}>
                      <div style={{ fontSize:13, fontWeight:600 }}>{it.name}</div>
                      <div style={{ fontSize:11, opacity:.7, marginTop:4 }}>
                        Отгружено: {it.shipped||0} / {it.qty} {it.unit} · Остаток: {rem} {it.unit}
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Количество к отгрузке ({it.unit})</FieldLabel>
                      <input type="number" value={shipQty} onChange={e=>setShipQty(e.target.value)}
                        placeholder={`макс. ${rem}`} max={rem} min={1}
                        style={{ width:'100%', padding:'10px 12px', border:'1px solid #e2e8f0', borderRadius:10,
                          fontSize:14, outline:'none', boxSizing:'border-box' }}/>
                      <div style={{ display:'flex', gap:6, marginTop:8 }}>
                        {[Math.ceil(rem/2), rem].map((v,i) => (
                          <button key={i} onClick={() => setShipQty(String(v))}
                            style={{ flex:1, padding:'6px', borderRadius:8, fontSize:11, fontWeight:600,
                              background:'#f0f9fa', color:BRAND, border:`1px solid ${BRAND}33`, cursor:'pointer' }}>
                            {i===0 ? `½ (${v})` : `Всё (${v})`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ padding:'12px 20px 18px', borderTop:'1px solid #f1f5f9', display:'flex', gap:10 }}>
                    <button onClick={() => setShipModal(null)}
                      style={{ flex:1, padding:'11px', borderRadius:12, background:'#f1f5f9', color:'#64748b', fontSize:13, fontWeight:500, border:'none', cursor:'pointer' }}>
                      Отмена
                    </button>
                    <button onClick={confirmShip}
                      style={{ flex:1, padding:'11px', borderRadius:12, background: shipQty&&Number(shipQty)>0&&Number(shipQty)<=rem ? BRAND : '#94a3b8',
                        color:'white', fontSize:13, fontWeight:600, border:'none', cursor:'pointer' }}>
                      Подтвердить
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>
    );
  }

  // ── List ─────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {canCreate && (
        <motion.button
          initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}}
          onClick={() => setShowForm(true)}
          className="fixed bottom-24 lg:bottom-8 inset-x-0 lg:inset-x-auto lg:left-52 lg:right-0 mx-auto w-fit z-40 flex items-center gap-2 px-5 py-3 text-white text-sm font-semibold rounded-full whitespace-nowrap"
          style={{ background:'rgba(40,121,141,0.82)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)',
            border:'1px solid rgba(255,255,255,0.25)', boxShadow:'0 8px 32px rgba(40,121,141,0.35)' }}
          whileHover={{scale:1.05}} whileTap={{scale:0.95}}>
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M10 4v12M4 10h12"/></svg>
          Новый заказ
        </motion.button>
      )}

      {/* City tab filter */}
      <div style={{ display:'flex', background:'white', borderRadius:14, padding:4, gap:4, border:'1px solid #e8f4f6' }}>
        {['Все','Астана','Алматы'].map(c => (
          <button key={c} onClick={() => setCityF(c)}
            style={{ flex:1, padding:'7px 0', borderRadius:10, fontSize:12, fontWeight:500, border:'none', cursor:'pointer',
              background: cityF===c ? BRAND : 'transparent', color: cityF===c ? 'white' : '#94a3b8', transition:'all .15s' }}>
            {c}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <AnimatePresence>
          {filtered.map((o, i) => {
            const st       = STATUS_STYLE[o.status] || STATUS_STYLE['Принят'];
            const shipped  = totalShipped(o);
            const total    = totalQty(o);
            const pct      = total > 0 ? Math.round(shipped / total * 100) : 0;
            const allDone  = pct === 100;

            return (
              <motion.div key={o.id}
                initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}
                transition={{delay:i*0.04,duration:0.2}}
                onClick={() => setSel(o)}
                style={{ background:'white', borderRadius:16, padding:'16px 18px', border:'1px solid #e8f4f6',
                  boxShadow:'0 1px 8px rgba(40,121,141,0.06)', cursor:'pointer', transition:'box-shadow .15s' }}
                whileHover={{ boxShadow:'0 4px 20px rgba(40,121,141,0.14)' }}>

                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:'#1a3a42' }}>{o.id}</div>
                    <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>📍 {o.city} · {o.date}</div>
                  </div>
                  <StatusPill s={o.status} />
                </div>

                {/* Items preview */}
                <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:10 }}>
                  {o.items.map((it, j) => {
                    const itRem = itemRemaining(it);
                    const itDone = itRem <= 0;
                    return (
                      <div key={j} style={{ display:'flex', justifyContent:'space-between', padding:'5px 10px',
                        background: itDone ? '#f0fdf4' : '#f8fafc', borderRadius:8 }}>
                        <span style={{ fontSize:12, color: itDone ? '#059669' : '#374151' }}>
                          {itDone ? '✅' : '☕'} {it.name}
                        </span>
                        <span style={{ fontSize:11, fontWeight:600, color: itDone ? '#059669' : BRAND }}>
                          {it.shipped||0}/{it.qty} {it.unit}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Total progress */}
                <div style={{ height:3, background:'#f1f5f9', borderRadius:99, overflow:'hidden', marginBottom:5 }}>
                  <motion.div animate={{width:`${pct}%`}} transition={{duration:.6}}
                    style={{ height:'100%', background: allDone ? '#10b981' : BRAND, borderRadius:99 }}/>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#94a3b8' }}>
                  <span>{pct}% отгружено · {o.items.length} поз.</span>
                  <span style={{ fontWeight:600, color: allDone ? '#059669' : BRAND }}>{shipped}/{total} кг</span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:'40px 0', color:'#cbd5e1', fontSize:13 }}>Нет заказов</div>
        )}
      </div>
      <div className="h-16 lg:hidden" />

      {/* Create modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{background:'rgba(0,0,0,0.5)'}} onClick={() => setShowForm(false)}>
            <motion.div initial={{y:40,opacity:0}} animate={{y:0,opacity:1}} exit={{y:40,opacity:0}}
              transition={{type:'spring',stiffness:380,damping:38}}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:15, fontWeight:700, color:'#1a3a42' }}>Новый заказ в обжарку</span>
                <button onClick={() => setShowForm(false)} style={{ color:'#94a3b8', fontSize:18, background:'none', border:'none', cursor:'pointer' }}>✕</button>
              </div>
              <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:14 }}>
                <div>
                  <FieldLabel>Город</FieldLabel>
                  <div style={{ display:'flex', gap:6 }}>
                    {CITIES.map(c => (
                      <button key={c} onClick={() => setNewCity(c)}
                        style={{ flex:1, padding:'9px', borderRadius:12, fontSize:13, fontWeight:500, border:'none', cursor:'pointer', transition:'all .15s',
                          background: newCity===c ? BRAND : '#f0f9fa', color: newCity===c ? 'white' : BRAND }}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <FieldLabel>Состав заказа</FieldLabel>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {items.map((it, i) => (
                      <div key={i} style={{ display:'flex', gap:8 }}>
                        <select value={it.name} onChange={e => setItems(p => p.map((x,j)=>j===i?{...x,name:e.target.value}:x))}
                          style={{ flex:1, padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:10, fontSize:12, outline:'none' }}>
                          <option value="">Сорт кофе…</option>
                          {COFFEES.map(p => <option key={p}>{p}</option>)}
                        </select>
                        <input type="number" value={it.qty} placeholder="кг"
                          onChange={e => setItems(p => p.map((x,j)=>j===i?{...x,qty:e.target.value}:x))}
                          style={{ width:64, padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:10, fontSize:12, outline:'none' }}/>
                        <select value={it.unit} onChange={e => setItems(p => p.map((x,j)=>j===i?{...x,unit:e.target.value}:x))}
                          style={{ width:90, padding:'8px 8px', border:'1px solid #e2e8f0', borderRadius:10, fontSize:11, outline:'none' }}>
                          {['кг','шт (250г)','шт (500г)','шт (1кг)'].map(u => <option key={u}>{u}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setItems(p => [...p,{name:'',qty:'',unit:'кг'}])}
                    style={{ marginTop:8, fontSize:12, color:BRAND, fontWeight:500, background:'none', border:'none', cursor:'pointer', padding:0 }}>
                    + Добавить позицию
                  </button>
                </div>
              </div>
              <div style={{ padding:'12px 20px 18px', borderTop:'1px solid #f1f5f9', display:'flex', gap:10 }}>
                <button onClick={() => setShowForm(false)}
                  style={{ flex:1, padding:'11px', borderRadius:12, background:'#f1f5f9', color:'#64748b', fontSize:13, fontWeight:500, border:'none', cursor:'pointer' }}>
                  Отмена
                </button>
                <button onClick={submit}
                  style={{ flex:1, padding:'11px', borderRadius:12, background:BRAND, color:'white', fontSize:13, fontWeight:600, border:'none', cursor:'pointer' }}>
                  Отправить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
