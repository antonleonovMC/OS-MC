import { useState, useRef, useEffect } from 'react';

const BRAND       = '#28798d';
const MONTH_NAMES = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const DAY_NAMES   = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

export default function DatePicker({ value, onChange, style, placeholder = 'Выберите дату', className = '' }) {
  const [open, setOpen]         = useState(false);
  const [viewDate, setViewDate] = useState(() => value ? new Date(value + 'T00:00:00') : new Date());
  const ref = useRef();

  useEffect(() => {
    if (value) setViewDate(new Date(value + 'T00:00:00'));
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toISO = (d) =>
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  const fmtDisplay = (v) => {
    if (!v) return '';
    const [y, m, d] = v.split('-');
    return `${d}.${m}.${y}`;
  };

  const getDays = () => {
    const y = viewDate.getFullYear(), mo = viewDate.getMonth();
    const first = new Date(y, mo, 1);
    const last  = new Date(y, mo + 1, 0);
    let dow = first.getDay(); dow = dow === 0 ? 6 : dow - 1;
    const days = [];
    for (let i = 0; i < dow; i++)
      days.push({ date: new Date(y, mo, i - dow + 1), cur: false });
    for (let i = 1; i <= last.getDate(); i++)
      days.push({ date: new Date(y, mo, i), cur: true });
    while (days.length < 42)
      days.push({ date: new Date(y, mo + 1, days.length - dow - last.getDate() + 1), cur: false });
    return days;
  };

  const todayISO = toISO(new Date());
  const INP_STYLE = {
    width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10,
    fontSize: 14, outline: 'none', boxSizing: 'border-box', background: 'white',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    ...style,
  };

  return (
    <div ref={ref} style={{ position: 'relative' }} className={className}>
      <div onClick={() => setOpen(v => !v)} style={INP_STYLE}>
        <span style={{ color: value ? '#1a3a42' : '#94a3b8', fontSize: 14 }}>
          {value ? fmtDisplay(value) : placeholder}
        </span>
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none"
          stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="14" height="14" rx="2"/>
          <path d="M3 8h14M7 2v4M13 2v4"/>
        </svg>
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 200,
          background: 'white', borderRadius: 16, padding: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.16)', border: '1px solid #e2e8f0', minWidth: 272,
        }}>
          {/* Навигация */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth()-1, 1))}
              style={{ border: 'none', background: '#f1f5f9', borderRadius: 8, width: 28, height: 28,
                cursor: 'pointer', fontSize: 16, color: '#64748b',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1a3a42' }}>
              {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <button onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth()+1, 1))}
              style={{ border: 'none', background: '#f1f5f9', borderRadius: 8, width: 28, height: 28,
                cursor: 'pointer', fontSize: 16, color: '#64748b',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
          </div>

          {/* Дни недели */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
            {DAY_NAMES.map((d, i) => (
              <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600,
                color: i >= 5 ? '#e11d48' : '#94a3b8', padding: '2px 0' }}>{d}</div>
            ))}
          </div>

          {/* Дни */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {getDays().map((item, i) => {
              const iso     = toISO(item.date);
              const sel     = iso === value;
              const tod     = iso === todayISO;
              const weekend = item.date.getDay() === 0 || item.date.getDay() === 6;
              return (
                <button key={i} onClick={() => { onChange(iso); setOpen(false); }}
                  style={{
                    border:        tod && !sel ? `1.5px solid ${BRAND}` : 'none',
                    borderRadius:  8,
                    padding:       '5px 0',
                    cursor:        'pointer',
                    fontSize:      12,
                    fontWeight:    sel ? 700 : 400,
                    background:    sel ? BRAND : 'transparent',
                    color:         sel ? 'white'
                                 : !item.cur ? '#d1d5db'
                                 : weekend   ? '#e11d48'
                                 : '#1a3a42',
                  }}>
                  {item.date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
