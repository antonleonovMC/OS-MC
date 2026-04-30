import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useData } from '../context/DataContext';

const BRAND   = '#28798d';
const DARK    = '#1a3a42';
const STATUSES = ['Принят','В обжарке','Отправлен','Получен'];
const CITIES   = ['Астана','Алматы'];
const ROAST_TYPES = ['Светлая Обжарка','Средняя Обжарка','Тёмная Обжарка','Дрип Кофе'];

const ROAST_STYLE = {
  'Светлая Обжарка': { bg:'#fff8f0', color:'#c2410c', dot:'#fb923c', icon:'🌅' },
  'Средняя Обжарка': { bg:'#fef3c7', color:'#92400e', dot:'#d97706', icon:'☕' },
  'Тёмная Обжарка':  { bg:'#1c1917', color:'#e7e5e4', dot:'#78716c', icon:'🖤' },
  'Дрип Кофе':       { bg:'#f0f9ff', color:'#0284c7', dot:'#38bdf8', icon:'💧' },
};

const UNITS_BY_ROAST = {
  'Дрип Кофе': ['шт'],
  default:     ['шт(250г)','шт(500г)','шт(1кг)'],
};
function getUnits(roastType) {
  return UNITS_BY_ROAST[roastType] || UNITS_BY_ROAST.default;
}

const STATUS_STYLE = {
  'Принят':    { bg:'#eff6ff', color:'#2563eb', dot:'#3b82f6' },
  'В обжарке': { bg:'#fff7ed', color:'#c2410c', dot:'#f97316' },
  'Отправлен': { bg:'#f5f3ff', color:'#7c3aed', dot:'#8b5cf6' },
  'Получен':   { bg:'#ecfdf5', color:'#059669', dot:'#10b981' },
};

const FALLBACK_PRODUCTS = [
  { roast_type:'Светлая Обжарка', name:'Эфиопия Йиргачефф' },
  { roast_type:'Светлая Обжарка', name:'Кения АА' },
  { roast_type:'Средняя Обжарка', name:'Бразилия Можиана' },
  { roast_type:'Средняя Обжарка', name:'Колумбия Уила' },
  { roast_type:'Тёмная Обжарка',  name:'Эспрессо Бленд' },
  { roast_type:'Тёмная Обжарка',  name:'Space Coffee' },
  { roast_type:'Дрип Кофе',       name:'Дрип Эфиопия' },
  { roast_type:'Дрип Кофе',       name:'Дрип Бразилия' },
];

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

// Группировать товары по типу обжарки
function groupProducts(products) {
  return ROAST_TYPES.reduce((acc, rt) => {
    const names = products.filter(p => p.roast_type === rt).map(p => p.name);
    if (names.length) acc[rt] = names;
    return acc;
  }, {});
}

export default function Coffee({ user }) {
  const { coffees: orders, addCoffeeOrder, updateCoffeeOrder, coffeeProducts } = useData();

  const products = coffeeProducts?.length ? coffeeProducts : FALLBACK_PRODUCTS;
  const grouped  = groupProducts(products);

  const [cityF,      setCityF]      = useState('Все');
  const [showForm,   setShowForm]   = useState(false);
  const [sel,        setSel]        = useState(null);
  const [shipModal,  setShipModal]  = useState(null);
  const [shipQty,    setShipQty]    = useState('');

  // Form state
  const [newCity,         setNewCity]         = useState('Астана');
  const [newDeliveryDate, setNewDeliveryDate] = useState('');
  const [items,           setItems]           = useState([{ name:'', roast_type:'', qty:'', unit:'' }]);

  const canCreate = ['admin','director','manager','director_tk','warehouse','sales_manager','roaster'].includes(user.role);
  // sales_manager после отправки заказа не может его редактировать;
  // обжарщик — может менять статусы и отгружать.
  const canEdit   = user.role !== 'sales_manager';
  const filtered  = orders.filter(o => cityF === 'Все' || o.city === cityF);

  const totalShipped  = order => order.items.reduce((a,it) => a + Number(it.shipped||0), 0);
  const totalQty      = order => order.items.reduce((a,it) => a + Number(it.qty||0), 0);
  const itemRemaining = it    => Number(it.qty||0) - Number(it.shipped||0);

  const getRoastType = name => products.find(p => p.name === name)?.roast_type || '';

  const resetForm = () => {
    setNewCity('Астана');
    setNewDeliveryDate('');
    setItems([{ name:'', roast_type:'', qty:'', unit:'' }]);
  };

  const submit = () => {
    const valid = items.filter(i => i.name && i.qty);
    if (!valid.length) { toast.error('Добавьте хотя бы одну позицию'); return; }
    if (!newDeliveryDate) { toast.error('Укажите желаемую дату получения'); return; }

    const newOrder = {
      id:           `COF-${String(orders.length + 1).padStart(3,'0')}`,
      city:         newCity,
      date:         new Date().toLocaleDateString('ru-RU'),
      deliveryDate: newDeliveryDate,
      status:       'Принят',
      items:        valid.map(i => ({
        name:       i.name,
        roast_type: i.roast_type || getRoastType(i.name),
        qty:        Number(i.qty),
        unit:       i.unit,
        shipped:    0,
      })),
    };
    addCoffeeOrder(newOrder);
    setShowForm(false);
    resetForm();
    toast.success(`Заказ ${newOrder.id} отправлен в обжарку`);
  };

  const changeStatus = (id, s) => {
    updateCoffeeOrder(id, { status: s });
    setSel(p => p ? { ...p, status: s } : p);
    toast.success(`Статус → ${s}`);
  };

  const openShip = (orderId, itemIdx) => { setShipModal({ orderId, itemIdx }); setShipQty(''); };

  const confirmShip = () => {
    const { orderId, itemIdx } = shipModal;
    const qty   = Number(shipQty);
    const order = orders.find(o => o.id === orderId);
    if (!qty || qty <= 0 || !order) return;
    const newItems  = order.items.map((it, i) =>
      i !== itemIdx ? it : { ...it, shipped: Math.min(Number(it.shipped||0) + qty, Number(it.qty)) }
    );
    const allDone = newItems.every(it => Number(it.shipped||0) >= Number(it.qty));
    const patch   = { items: newItems, ...(allDone && order.status !== 'Получен' ? { status: 'Отправлен' } : {}) };
    updateCoffeeOrder(orderId, patch);
    setSel(p => p?.id === orderId ? { ...p, ...patch } : p);
    toast.success(`Отгружено ${qty} ${order.items[itemIdx]?.unit}`);
    setShipModal(null);
  };

  // ── Detail ──────────────────────────────────────────────────────────────────
  if (sel) {
    const order   = orders.find(o => o.id === sel.id) || sel;
    const shipped = totalShipped(order);
    const total   = totalQty(order);
    const pct     = total > 0 ? Math.round(shipped / total * 100) : 0;

    // Группируем items по roast_type для отображения
    const itemsByRoast = ROAST_TYPES.reduce((acc, rt) => {
      const its = order.items.map((it, i) => ({ ...it, _idx: i }))
        .filter(it => (it.roast_type || getRoastType(it.name)) === rt);
      if (its.length) acc[rt] = its;
      return acc;
    }, {});

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
          <div style={{ fontSize:12, opacity:.6, marginBottom:4 }}>📍 {order.city} · Подан: {order.date}</div>
          {order.deliveryDate && (
            <div style={{ fontSize:12, opacity:.8, marginBottom:16, background:'rgba(255,255,255,0.12)', display:'inline-flex',
              alignItems:'center', gap:5, padding:'4px 10px', borderRadius:20 }}>
              📅 Получить: {order.deliveryDate}
            </div>
          )}
          {!order.deliveryDate && <div style={{ marginBottom:16 }}/>}
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
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: canEdit ? 12 : 0 }}>
            <span style={{ fontSize:12, color:'#94a3b8' }}>Статус</span>
            <StatusPill s={order.status} />
          </div>
          {canEdit && (
            <>
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
            </>
          )}
        </div>

        {/* Items по группам */}
        {Object.entries(itemsByRoast).map(([rt, its]) => {
          const rs = ROAST_STYLE[rt] || ROAST_STYLE['Средняя Обжарка'];
          return (
            <div key={rt} style={{ background:'white', borderRadius:16, border:'1px solid #e8f4f6', overflow:'hidden' }}>
              <div style={{ padding:'12px 18px 10px', display:'flex', alignItems:'center', gap:8,
                borderBottom:'1px solid #f8fafc' }}>
                <span style={{ fontSize:14 }}>{rs.icon}</span>
                <span style={{ fontSize:12, fontWeight:700, color:DARK }}>{rt}</span>
                <span style={{ fontSize:11, color:'#94a3b8', marginLeft:'auto' }}>{its.length} поз.</span>
              </div>
              {its.map(it => {
                const itPct = Number(it.qty) > 0 ? Math.round(Number(it.shipped||0)/Number(it.qty)*100) : 0;
                const rem   = itemRemaining(it);
                const done  = rem <= 0;
                return (
                  <div key={it._idx} style={{ padding:'12px 18px', borderTop:'1px solid #f8fafc' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:32, height:32, borderRadius:10,
                          background: done ? '#ecfdf5' : rs.bg,
                          display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>
                          {done ? '✅' : rs.icon}
                        </div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:600, color:'#1a3a42' }}>{it.name}</div>
                          <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>
                            {it.shipped||0} / {it.qty} {it.unit} отгружено
                          </div>
                        </div>
                      </div>
                      {!done ? (
                        canEdit ? (
                          <button onClick={() => openShip(order.id, it._idx)}
                            style={{ padding:'5px 12px', borderRadius:20, fontSize:11, fontWeight:600, background:'#e8f4f6',
                              color:BRAND, border:`1px solid ${BRAND}33`, cursor:'pointer' }}>
                            Отгрузить
                          </button>
                        ) : (
                          <span style={{ fontSize:11, fontWeight:500, color:'#94a3b8', background:'#f1f5f9',
                            padding:'3px 10px', borderRadius:20 }}>В работе</span>
                        )
                      ) : (
                        <span style={{ fontSize:11, fontWeight:600, color:'#059669', background:'#ecfdf5',
                          padding:'3px 10px', borderRadius:20 }}>Готово</span>
                      )}
                    </div>
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
          );
        })}

        {/* Shipment modal */}
        <AnimatePresence>
          {shipModal && shipModal.orderId === order.id && (() => {
            const it  = order.items[shipModal.itemIdx];
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
                      style={{ flex:1, padding:'11px', borderRadius:12,
                        background: shipQty&&Number(shipQty)>0&&Number(shipQty)<=rem ? BRAND : '#94a3b8',
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

      {/* City filter */}
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
            const shipped = totalShipped(o);
            const total   = totalQty(o);
            const pct     = total > 0 ? Math.round(shipped / total * 100) : 0;
            const allDone = pct === 100;

            // Группы в этом заказе
            const roastSummary = [...new Set(o.items.map(it =>
              it.roast_type || getRoastType(it.name)
            ))].filter(Boolean);

            return (
              <motion.div key={o.id}
                initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}
                transition={{delay:i*0.04,duration:0.2}}
                onClick={() => setSel(o)}
                style={{ background:'white', borderRadius:16, padding:'16px 18px', border:'1px solid #e8f4f6',
                  boxShadow:'0 1px 8px rgba(40,121,141,0.06)', cursor:'pointer' }}
                whileHover={{ boxShadow:'0 4px 20px rgba(40,121,141,0.14)' }}>

                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:'#1a3a42' }}>{o.id}</div>
                    <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>📍 {o.city} · {o.date}</div>
                    {o.deliveryDate && (
                      <div style={{ fontSize:11, color:BRAND, marginTop:2, fontWeight:500 }}>
                        📅 Получить: {o.deliveryDate}
                      </div>
                    )}
                  </div>
                  <StatusPill s={o.status} />
                </div>

                {/* Обжарки-теги */}
                {roastSummary.length > 0 && (
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:8 }}>
                    {roastSummary.map(rt => {
                      const rs = ROAST_STYLE[rt] || ROAST_STYLE['Средняя Обжарка'];
                      return (
                        <span key={rt} style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20,
                          background: rt === 'Тёмная Обжарка' ? '#292524' : rs.bg,
                          color: rt === 'Тёмная Обжарка' ? '#e7e5e4' : rs.color }}>
                          {rs.icon} {rt}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Items preview */}
                <div style={{ display:'flex', flexDirection:'column', gap:3, marginBottom:10 }}>
                  {o.items.map((it, j) => {
                    const itDone = itemRemaining(it) <= 0;
                    return (
                      <div key={j} style={{ display:'flex', justifyContent:'space-between', padding:'4px 10px',
                        background: itDone ? '#f0fdf4' : '#f8fafc', borderRadius:8 }}>
                        <span style={{ fontSize:12, color: itDone ? '#059669' : '#374151' }}>
                          {itDone ? '✅' : '•'} {it.name}
                        </span>
                        <span style={{ fontSize:11, fontWeight:600, color: itDone ? '#059669' : BRAND }}>
                          {it.shipped||0}/{it.qty} {it.unit}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Progress */}
                <div style={{ height:3, background:'#f1f5f9', borderRadius:99, overflow:'hidden', marginBottom:5 }}>
                  <motion.div animate={{width:`${pct}%`}} transition={{duration:.6}}
                    style={{ height:'100%', background: allDone ? '#10b981' : BRAND, borderRadius:99 }}/>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#94a3b8' }}>
                  <span>{pct}% · {o.items.length} поз.</span>
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
            style={{background:'rgba(0,0,0,0.5)'}} onClick={() => { setShowForm(false); resetForm(); }}>
            <motion.div initial={{y:40,opacity:0}} animate={{y:0,opacity:1}} exit={{y:40,opacity:0}}
              transition={{type:'spring',stiffness:380,damping:38}}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>

              <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:15, fontWeight:700, color:'#1a3a42' }}>Новый заказ в обжарку</span>
                <button onClick={() => { setShowForm(false); resetForm(); }}
                  style={{ color:'#94a3b8', fontSize:18, background:'none', border:'none', cursor:'pointer' }}>✕</button>
              </div>

              <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:16 }}>

                {/* Город */}
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

                {/* Желаемая дата получения */}
                <div>
                  <FieldLabel>Желаемая дата получения</FieldLabel>
                  <input
                    type="date"
                    value={newDeliveryDate}
                    onChange={e => setNewDeliveryDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    style={{ width:'100%', padding:'9px 12px', border:'1px solid #e2e8f0', borderRadius:12,
                      fontSize:13, outline:'none', boxSizing:'border-box', color:'#1a3a42' }}
                  />
                </div>

                {/* Состав по группам обжарки */}
                <div>
                  <FieldLabel>Состав заказа</FieldLabel>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {items.map((it, i) => (
                      <div key={i} style={{ background:'#f8fafc', borderRadius:12, padding:'10px 12px', display:'flex', flexDirection:'column', gap:8 }}>
                        {/* Степень обжарки */}
                        <select
                          value={it.roast_type}
                          onChange={e => {
                            const rt    = e.target.value;
                            const units = getUnits(rt);
                            setItems(p => p.map((x,j) => j===i ? {...x, roast_type: rt, name: '', unit: units[0]} : x));
                          }}
                          style={{ width:'100%', padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:10, fontSize:13, outline:'none', background:'white' }}>
                          <option value="">Степень обжарки…</option>
                          {ROAST_TYPES.map(rt => (
                            <option key={rt} value={rt}>{ROAST_STYLE[rt]?.icon} {rt}</option>
                          ))}
                        </select>
                        {/* Наименование — только из выбранной группы */}
                        <select
                          value={it.name}
                          disabled={!it.roast_type}
                          onChange={e => {
                            setItems(p => p.map((x,j) => j===i ? {...x, name: e.target.value} : x));
                          }}
                          style={{ width:'100%', padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:10, fontSize:13, outline:'none',
                            background: it.roast_type ? 'white' : '#f1f5f9', color: it.roast_type ? '#1a3a42' : '#94a3b8' }}>
                          <option value="">Наименование…</option>
                          {(grouped[it.roast_type] || []).map(n => <option key={n} value={n}>{n}</option>)}
                        </select>

                        {/* Кол-во и единица */}
                        <div style={{ display:'flex', gap:8 }}>
                          <input
                            type="number" value={it.qty} placeholder="Количество"
                            onChange={e => setItems(p => p.map((x,j) => j===i ? {...x,qty:e.target.value} : x))}
                            style={{ flex:1, padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:10, fontSize:13, outline:'none' }}/>
                          {it.roast_type === 'Дрип Кофе' ? (
                            <div style={{ width:100, padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:10,
                              fontSize:12, background:'#f8fafc', color:'#64748b', display:'flex', alignItems:'center' }}>
                              шт
                            </div>
                          ) : (
                            <select
                              value={it.unit}
                              onChange={e => setItems(p => p.map((x,j) => j===i ? {...x,unit:e.target.value} : x))}
                              style={{ width:100, padding:'8px 8px', border:'1px solid #e2e8f0', borderRadius:10, fontSize:12, outline:'none' }}>
                              {getUnits(it.roast_type).map(u => <option key={u}>{u}</option>)}
                            </select>
                          )}
                          {items.length > 1 && (
                            <button onClick={() => setItems(p => p.filter((_,j) => j!==i))}
                              style={{ width:34, height:34, borderRadius:10, background:'#fee2e2', color:'#ef4444',
                                border:'none', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setItems(p => [...p, {name:'',roast_type:'',qty:'',unit:''}])}
                    style={{ marginTop:8, fontSize:12, color:BRAND, fontWeight:600, background:'none', border:'none', cursor:'pointer', padding:0 }}>
                    + Добавить позицию
                  </button>
                </div>
              </div>

              <div style={{ padding:'12px 20px 20px', borderTop:'1px solid #f1f5f9', display:'flex', gap:10 }}>
                <button onClick={() => { setShowForm(false); resetForm(); }}
                  style={{ flex:1, padding:'11px', borderRadius:12, background:'#f1f5f9', color:'#64748b', fontSize:13, fontWeight:500, border:'none', cursor:'pointer' }}>
                  Отмена
                </button>
                <button onClick={submit}
                  style={{ flex:1, padding:'11px', borderRadius:12, background:BRAND, color:'white', fontSize:13, fontWeight:600, border:'none', cursor:'pointer' }}>
                  Отправить заказ
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
