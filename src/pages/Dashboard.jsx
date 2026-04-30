import { useState, useMemo } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Package, ClipboardList, Coffee, Truck } from 'lucide-react';
import { SALES } from '../data/constants';
import { useData } from '../context/DataContext';

const BRAND    = '#28798d';
const BRAND_LT = '#e8f4f6';
const TODAY    = new Date().toISOString().slice(0,10);
const M_START  = TODAY.slice(0,7) + '-01';

// ── Фильтры дашборда — вынесены на уровень модуля, чтобы React не
//    пересоздавал тип компонента при каждом рендере (иначе клавиатура
//    закрывается после 1 символа — classic inline-component bug)
function Filters({ from, to, setFrom, setTo, city, setCity, group, setGroup, cities, groups }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {/* Период */}
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ fontSize:11, color:'#94a3b8', width:52, flexShrink:0 }}>Период</span>
        <div style={{ display:'flex', alignItems:'center', gap:6, flex:1 }}>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)}
            style={{ flex:1, minWidth:0, padding:'6px 10px', background:'#f4f8f9', border:'1px solid #d0eaee',
              borderRadius:10, fontSize:11, outline:'none', color:'#1a3a42' }}/>
          <span style={{ color:'#cbd5e1', fontSize:11 }}>—</span>
          <input type="date" value={to} onChange={e=>setTo(e.target.value)}
            style={{ flex:1, minWidth:0, padding:'6px 10px', background:'#f4f8f9', border:'1px solid #d0eaee',
              borderRadius:10, fontSize:11, outline:'none', color:'#1a3a42' }}/>
        </div>
      </div>
      {/* Город */}
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ fontSize:11, color:'#94a3b8', width:52, flexShrink:0 }}>Город</span>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
          {["Все",...cities].map(c=>(
            <button key={c} onClick={()=>setCity(c)}
              style={{ padding:'4px 12px', borderRadius:20, fontSize:11, fontWeight:500, border:'none',
                background: city===c ? BRAND : '#f0f9fa',
                color: city===c ? 'white' : '#28798d', cursor:'pointer', transition:'all .15s' }}>
              {c}
            </button>
          ))}
        </div>
      </div>
      {/* Группа */}
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ fontSize:11, color:'#94a3b8', width:52, flexShrink:0 }}>Группа</span>
        <select value={group} onChange={e=>setGroup(e.target.value)}
          style={{ flex:1, padding:'6px 10px', background:'#f4f8f9', border:'1px solid #d0eaee',
            borderRadius:10, fontSize:11, outline:'none', color:'#1a3a42', cursor:'pointer' }}>
          <option value="Все">Все группы</option>
          {groups.map(g=><option key={g} value={g}>{g}</option>)}
        </select>
      </div>
    </div>
  );
}

// "DD.MM.YYYY" или "DD.MM.YY" → "YYYY-MM-DD" для сравнения
function toISO(d) {
  if (!d) return '';
  const s = String(d).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const p = s.split('.');
  if (p.length === 3) {
    const y = p[2].length === 2 ? '20' + p[2] : p[2];
    return `${y}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
  }
  return s;
}

const TREND = [
  { d:"01", c:420, p:380 }, { d:"05", c:510, p:430 }, { d:"09", c:480, p:460 },
  { d:"13", c:630, p:490 }, { d:"17", c:710, p:530 }, { d:"21", c:680, p:570 },
  { d:"25", c:820, p:610 }, { d:"28", c:890, p:650 },
];

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'white', border:'1px solid #e5e7eb', borderRadius:12, padding:'8px 12px', fontSize:11, boxShadow:'0 4px 16px rgba(0,0,0,0.08)' }}>
      <div style={{ color:'#9ca3af', marginBottom:4 }}>{label} апр.</div>
      {payload.map((p,i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:p.color, display:'inline-block' }}/>
          <span style={{ color:'#6b7280' }}>{p.dataKey==='c'?'Текущий':'Прошлый'}</span>
          <span style={{ fontWeight:600, color:'#1a3a42' }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

function Stat({ icon: Icon, label, value, delta, onClick }) {
  const up = delta >= 0;
  return (
    <button onClick={onClick} disabled={!onClick}
      className="text-left"
      style={{ background:'white', borderRadius:16, padding:'14px 16px', border:'1px solid #e8f4f6',
        boxShadow:'0 1px 6px rgba(40,121,141,0.05)', cursor: onClick ? 'pointer' : 'default',
        transition:'box-shadow .15s' }}
      onMouseEnter={e => onClick && (e.currentTarget.style.boxShadow='0 4px 16px rgba(40,121,141,0.13)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.boxShadow='0 1px 6px rgba(40,121,141,0.05)')}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ width:32, height:32, borderRadius:10, background:BRAND_LT,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={15} color={BRAND} />
        </div>
        {delta !== undefined && (
          <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20,
            background: up ? '#ecfdf5' : '#fff1f2', color: up ? '#059669' : '#e11d48',
            display:'flex', alignItems:'center', gap:3 }}>
            {up ? <TrendingUp size={9}/> : <TrendingDown size={9}/>}
            {up?'+':''}{delta}%
          </span>
        )}
      </div>
      <div style={{ fontSize:22, fontWeight:800, color:'#1a3a42', lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>{label}</div>
    </button>
  );
}

export default function Dashboard({ setPage }) {
  const [from,  setFrom]  = useState(M_START);
  const [to,    setTo]    = useState(TODAY);
  const [city,  setCity]  = useState("Все");
  const [group, setGroup] = useState("Все");
  const [tab,   setTab]   = useState("trend");
  const [open,  setOpen]  = useState(false); // mobile filter toggle

  const { orders, requests, coffees, settings, dashData } = useData();
  const DASHBOARD_CITIES = settings.cities;
  const PRODUCT_GROUPS   = settings.groups;

  // Если есть данные из Sheets — используем их, иначе seed-данные
  const SOURCE = useMemo(() => {
    if (dashData.length > 0) {
      return dashData.map(r => ({
        product:       String(r.product_name || ''),
        group:         String(r.product_group || ''),
        sold:          Number(r.sales_total)  || 0,
        stock:         Number(r.stock)        || 0,
        city:          String(r.city || ''),
        dateISO:       toISO(r.date_start),
        dateISOEnd:    toISO(r.date_end),
        sales_per_day: Number(r.sales_per_day) || 0,
      }));
    }
    return SALES.map(s => ({ ...s, dateISO: s.date, dateISOEnd: s.date }));
  }, [dashData]);

  const rows = useMemo(() => SOURCE.filter(s =>
    (city==="Все"||s.city===city) &&
    (group==="Все"||s.group===group) &&
    s.dateISO <= to && (s.dateISOEnd >= from || s.dateISO >= from)
  ), [city, group, from, to, SOURCE]);

  const sold  = rows.reduce((a,s)=>a+s.sold, 0);
  const stock = rows.reduce((a,s)=>a+s.stock, 0);
  const delta = 0; // без данных за прошлый период из таблицы
  const active = orders.filter(o=>!["Архив","Доставлен"].includes(o.status));
  const pReqs  = requests.filter(r=>r.status==="Ожидает");
  const pCoff  = coffees.filter(o=>o.status!=="Получен");

  const barData = useMemo(()=>{
    const m={};
    rows.forEach(s=>{
      if(!m[s.group]) m[s.group]={name:s.group.split(' ')[0],v:0};
      m[s.group].v+=s.sold;
    });
    return Object.values(m).sort((a,b)=>b.v-a.v).slice(0,6);
  },[rows]);

  const BAR = ['#28798d','#3a9db5','#5bbdd4','#82cfe0','#1d5f70','#0f3d4a'];
  const filtersProps = { from, to, setFrom, setTo, city, setCity, group, setGroup,
    cities: DASHBOARD_CITIES, groups: PRODUCT_GROUPS };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* ── KPI ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}
        className="sm:grid-cols-4" >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 col-span-2 sm:col-span-4">
          <Stat icon={Truck}        label="Активных поставок"  value={active.length}        delta={12}    onClick={()=>setPage("logistics")} />
          <Stat icon={ClipboardList} label="Заявок ожидает"    value={pReqs.length}         delta={-5}    onClick={()=>setPage("requests")}  />
          <Stat icon={TrendingUp}   label="Продано позиций"    value={sold.toLocaleString('ru')} delta={delta} />
          <Stat icon={Coffee}       label="Кофе-заказов"       value={pCoff.length}         delta={0}     onClick={()=>setPage("coffee")}    />
        </div>
      </div>

      {/* ── Chart card with filters inside ── */}
      <div style={{ background:'white', borderRadius:20, border:'1px solid #e8f4f6',
        boxShadow:'0 2px 12px rgba(40,121,141,0.07)', overflow:'hidden' }}>

        {/* Card header */}
        <div style={{ padding:'16px 18px 0', display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'#1a3a42' }}>Динамика продаж</div>
            <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>
              {city!=="Все"?city:"Все города"} · {group!=="Все"?group.split(' ')[0]:"Все группы"}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {/* Delta badge */}
            <span style={{ fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:20,
              background: delta>=0?'#ecfdf5':'#fff1f2', color: delta>=0?'#10b981':'#f43f5e',
              display:'flex', alignItems:'center', gap:3 }}>
              {delta>=0?<TrendingUp size={10}/>:<TrendingDown size={10}/>}
              {delta>0?'+':''}{delta}% vs пред.
            </span>
            {/* Mobile filter toggle */}
            <button className="lg:hidden" onClick={()=>setOpen(v=>!v)}
              style={{ padding:'5px 10px', borderRadius:10, background: open?BRAND:BRAND_LT,
                color: open?'white':BRAND, fontSize:11, fontWeight:500, border:'none', cursor:'pointer' }}>
              {open ? 'Скрыть ▲' : 'Фильтры ▼'}
            </button>
          </div>
        </div>

        {/* Desktop filters always visible */}
        <div className="hidden lg:block" style={{ padding:'12px 18px 0' }}>
          <Filters {...filtersProps} />
        </div>

        {/* Mobile filters collapsible */}
        {open && (
          <div className="lg:hidden" style={{ padding:'12px 18px 0' }}>
            <Filters {...filtersProps} />
          </div>
        )}

        {/* Chart tabs */}
        <div style={{ padding:'10px 18px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', gap:6 }}>
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ width:20, height:2, background:BRAND, borderRadius:2, display:'inline-block' }}/>
              <span style={{ fontSize:10, color:'#94a3b8' }}>Текущий</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ width:20, height:2, background:'#b2dde6', borderRadius:2, display:'inline-block',
                backgroundImage:'repeating-linear-gradient(90deg,#b2dde6 0,#b2dde6 4px,transparent 4px,transparent 7px)' }}/>
              <span style={{ fontSize:10, color:'#94a3b8' }}>Прошлый</span>
            </div>
          </div>
          <div style={{ display:'flex', background:'#f4f8f9', borderRadius:10, padding:2, gap:2 }}>
            {[['trend','Тренд'],['bar','Группы']].map(([id,lbl])=>(
              <button key={id} onClick={()=>setTab(id)}
                style={{ padding:'4px 12px', borderRadius:8, fontSize:11, fontWeight:500, border:'none', cursor:'pointer',
                  background: tab===id ? 'white' : 'transparent',
                  color: tab===id ? '#1a3a42' : '#94a3b8',
                  boxShadow: tab===id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div style={{ height:190, padding:'8px 8px 0' }}>
          {tab==='trend' ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TREND} margin={{top:4,right:12,left:-22,bottom:0}}>
                <defs>
                  <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={BRAND} stopOpacity={0.12}/>
                    <stop offset="100%" stopColor={BRAND} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f5" vertical={false}/>
                <XAxis dataKey="d" tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                <Tooltip content={<Tip/>}/>
                <Area type="monotone" dataKey="p" stroke="#b2dde6" strokeWidth={1.5}
                  strokeDasharray="5 3" fill="none" dot={false}/>
                <Area type="monotone" dataKey="c" stroke={BRAND} strokeWidth={2}
                  fill="url(#gc)" dot={false} activeDot={{r:4,fill:BRAND,strokeWidth:0}}/>
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{top:4,right:12,left:-22,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f5" vertical={false}/>
                <XAxis dataKey="name" tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                <Tooltip content={<Tip/>}/>
                <Bar dataKey="v" radius={[6,6,0,0]} maxBarSize={36}>
                  {barData.map((_,i)=><Cell key={i} fill={BAR[i%BAR.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div style={{ height:16 }}/>
      </div>

      {/* ── Остатки ── */}
      <div style={{ background:'white', borderRadius:20, border:'1px solid #e8f4f6',
        boxShadow:'0 2px 12px rgba(40,121,141,0.07)', padding:'16px 18px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <span style={{ fontSize:13, fontWeight:600, color:'#1a3a42' }}>Остатки</span>
          <span style={{ fontSize:11, color:'#94a3b8' }}>Склад: <b style={{color:'#1a3a42'}}>{stock.toLocaleString('ru')}</b></span>
        </div>
        {rows.length===0 ? (
          <div style={{ textAlign:'center', padding:'24px 0', color:'#cbd5e1', fontSize:13 }}>Нет данных</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {(group!=="Все" ? rows : Object.values(
              rows.reduce((m,s)=>{
                if(!m[s.group]) m[s.group]={name:s.group,sold:0,stock:0};
                m[s.group].sold+=s.sold; m[s.group].stock+=s.stock; return m;
              },{}))
            ).sort((a,b)=>b.sold-a.sold).map((item,i)=>{
              const name = item.product||item.name;
              const pct  = Math.round(item.sold/(item.sold+item.stock)*100);
              const col  = pct>80?'#f87171':pct>60?'#fbbf24':BRAND;
              return (
                <div key={i}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <span style={{ fontSize:12, color:'#374151', maxWidth:'65%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</span>
                    <span style={{ fontSize:11, color:'#94a3b8' }}>
                      <b style={{ color:col }}>{pct}%</b> · ост. {item.stock.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ height:5, background:'#f0f4f5', borderRadius:10, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:col, borderRadius:10, transition:'width .4s' }}/>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Быстрые переходы ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { icon:"🚚", label:"Логистика",  sub:`${active.length} активных`,   page:"logistics", dot:'#8b5cf6' },
          { icon:"📋", label:"Заявки",     sub:`${pReqs.length} ожидают`,     page:"requests",  dot:'#f59e0b' },
          { icon:"☕", label:"Кофе",       sub:`${pCoff.length} в работе`,    page:"coffee",    dot:'#f97316' },
          { icon:"✓",  label:"Задачи",     sub:"Канбан-доска",                page:"tasks",     dot:'#22c55e' },
        ].map(n=>(
          <button key={n.page} onClick={()=>setPage(n.page)}
            style={{ background:'white', borderRadius:16, padding:'14px', border:'1px solid #e8f4f6',
              boxShadow:'0 1px 6px rgba(40,121,141,0.05)', textAlign:'left', cursor:'pointer', transition:'box-shadow .15s' }}
            onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(40,121,141,0.14)'}
            onMouseLeave={e=>e.currentTarget.style.boxShadow='0 1px 6px rgba(40,121,141,0.05)'}>
            <div style={{ width:34, height:34, borderRadius:10, background:n.dot+'18',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, marginBottom:8 }}>
              {n.icon}
            </div>
            <div style={{ fontSize:13, fontWeight:700, color:'#1a3a42' }}>{n.label}</div>
            <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>{n.sub}</div>
          </button>
        ))}
      </div>

    </div>
  );
}
