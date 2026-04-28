import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { USERS, ROLE_LABELS, ROLE_ACCESS } from '../data/constants';

const BRAND = '#28798d';
const LOGO  = 'https://i.ibb.co/tT12Zg0C/4.png';

const PAGE_LABELS = {
  dashboard:"Дашборд", logistics:"Логистика", requests:"Заявки",
  tasks:"Задачи", coffee:"Кофе", payments:"Оплата",
};

function Logo({ size = 56, rounded = 16 }) {
  return (
    <img
      src={LOGO}
      alt="Master Coffee"
      style={{ width:size, height:size, objectFit:'contain', borderRadius:rounded }}
      onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
    />
  );
}

function LogoFallback({ size = 56, rounded = 16 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:rounded, background:`linear-gradient(135deg,#1a3a42,${BRAND})`,
      display:'none', alignItems:'center', justifyContent:'center', color:'white', fontSize:size*0.28, fontWeight:800 }}>
      MC
    </div>
  );
}

// ── Spinner ring ─────────────────────────────────────────────────────────────
function SpinnerRing({ size = 120, strokeWidth = 3 }) {
  const r   = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ position:'absolute', inset:0 }}>
      {/* Track */}
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e8f4f6" strokeWidth={strokeWidth}/>
      {/* Animated arc */}
      <motion.circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={BRAND} strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${circ * 0.25} ${circ * 0.75}`}
        style={{ originX:`${size/2}px`, originY:`${size/2}px`, rotate:-90 }}
        animate={{ rotate: ['-90deg','270deg'] }}
        transition={{ duration:1.1, repeat:Infinity, ease:'linear' }}
      />
    </svg>
  );
}

export default function Auth({ onLogin }) {
  const [sel,     setSel]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [dots,    setDots]    = useState('');

  // Animated dots for loading text
  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400);
    return () => clearInterval(id);
  }, [loading]);

  // ── Loading screen ───────────────────────────────────────────────────────────
  if (loading) return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }}
      style={{ minHeight:'100vh', background:'white', display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', gap:0 }}>

      {/* Turtle + spinner */}
      <div style={{ position:'relative', width:120, height:120, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:28 }}>
        <SpinnerRing size={120} strokeWidth={3} />
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration:1.8, repeat:Infinity, ease:'easeInOut' }}
          style={{ display:'flex' }}>
          <Logo size={64} rounded={18} />
          <LogoFallback size={64} rounded={18} />
        </motion.div>
      </div>

      <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}
        style={{ textAlign:'center' }}>
        <div style={{ fontSize:16, fontWeight:700, color:'#1a3a42', marginBottom:4 }}>
          Входим в систему{dots}
        </div>
        <div style={{ fontSize:13, color:'#94a3b8' }}>Проверка прав доступа</div>
        {sel && (
          <div style={{ marginTop:16, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            <div style={{ width:28, height:28, borderRadius:8, background:sel.color, display:'flex',
              alignItems:'center', justifyContent:'center', color:'white', fontSize:10, fontWeight:700 }}>
              {sel.av}
            </div>
            <span style={{ fontSize:13, color:'#64748b', fontWeight:500 }}>{sel.name}</span>
          </div>
        )}
      </motion.div>
    </motion.div>
  );

  // ── Auth screen ──────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>

      {/* Background accent blobs */}
      <div style={{ position:'fixed', inset:0, overflow:'hidden', pointerEvents:'none', zIndex:0 }}>
        <div style={{ position:'absolute', top:-120, right:-80, width:420, height:420, borderRadius:'50%',
          background:`radial-gradient(circle, ${BRAND}14 0%, transparent 70%)` }}/>
        <div style={{ position:'absolute', bottom:-100, left:-60, width:320, height:320, borderRadius:'50%',
          background:`radial-gradient(circle, ${BRAND}0e 0%, transparent 70%)` }}/>
      </div>

      <div style={{ width:'100%', maxWidth:380, position:'relative', zIndex:1 }}>

        {/* Logo area */}
        <motion.div initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }}
          style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:64, height:64, margin:'0 auto 12px', borderRadius:20, background:'white',
            boxShadow:`0 4px 24px ${BRAND}22, 0 1px 6px rgba(0,0,0,0.06)`,
            display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
            <Logo size={56} rounded={14} />
            <LogoFallback size={56} rounded={14} />
          </div>
          <div style={{ fontSize:20, fontWeight:800, color:'#1a3a42', letterSpacing:'-0.02em' }}>Master Coffee OS</div>
          <div style={{ fontSize:12, color:'#94a3b8', marginTop:3 }}>Procurement Management System</div>
        </motion.div>

        <AnimatePresence mode="wait">
          {!sel ? (
            /* ── User list ── */
            <motion.div key="list"
              initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-12 }}
              transition={{ duration:0.25 }}
              style={{ background:'white', borderRadius:24, boxShadow:'0 4px 32px rgba(40,121,141,0.10), 0 1px 4px rgba(0,0,0,0.04)', overflow:'hidden' }}>

              <div style={{ padding:'18px 20px 12px' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase',
                  letterSpacing:'0.08em', marginBottom:12 }}>Выберите аккаунт</div>
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {USERS.map((u, i) => (
                    <motion.button key={u.id}
                      initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
                      transition={{ delay: i * 0.06, duration:0.2 }}
                      onClick={() => setSel(u)}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:14,
                        background:'transparent', border:'1.5px solid transparent', cursor:'pointer', textAlign:'left',
                        transition:'all .15s', width:'100%' }}
                      onMouseEnter={e => { e.currentTarget.style.background='#f8fafc'; e.currentTarget.style.borderColor='#e8f4f6'; }}
                      onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='transparent'; }}>
                      <div style={{ width:38, height:38, borderRadius:12, background:u.color, flexShrink:0,
                        display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:11, fontWeight:800 }}>
                        {u.av}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:'#1a3a42', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.name}</div>
                        <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>{ROLE_LABELS[u.role]} · {u.dept}</div>
                      </div>
                      <div style={{ fontSize:11, color:'#cbd5e1', fontFamily:'monospace' }}>{u.tg}</div>
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#cbd5e1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
                        <path d="M7 5l5 5-5 5"/>
                      </svg>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div style={{ padding:'10px 20px 14px', borderTop:'1px solid #f1f5f9', textAlign:'center',
                fontSize:11, color:'#cbd5e1' }}>
                Закрытая система · Только сотрудники Master Coffee
              </div>
            </motion.div>

          ) : (
            /* ── Confirm ── */
            <motion.div key="confirm"
              initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-12 }}
              transition={{ duration:0.25 }}
              style={{ background:'white', borderRadius:24, boxShadow:'0 4px 32px rgba(40,121,141,0.10), 0 1px 4px rgba(0,0,0,0.04)', overflow:'hidden' }}>

              {/* Gradient header */}
              <div style={{ background:`linear-gradient(135deg, #1a3a42, ${BRAND})`, padding:'24px 20px 20px', textAlign:'center' }}>
                <div style={{ width:52, height:52, borderRadius:16, background:sel.color, margin:'0 auto 10px',
                  display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:16, fontWeight:800,
                  boxShadow:'0 4px 16px rgba(0,0,0,0.25)' }}>
                  {sel.av}
                </div>
                <div style={{ fontSize:16, fontWeight:700, color:'white' }}>{sel.name}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)', marginTop:2 }}>{ROLE_LABELS[sel.role]}</div>
              </div>

              <div style={{ padding:'16px 20px' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase',
                  letterSpacing:'0.07em', marginBottom:8 }}>Доступные разделы</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:20 }}>
                  {ROLE_ACCESS[sel.role].map(s => (
                    <span key={s} style={{ fontSize:11, fontWeight:500, padding:'4px 10px', borderRadius:20,
                      background:'#e8f4f6', color:BRAND }}>
                      {PAGE_LABELS[s]}
                    </span>
                  ))}
                </div>

                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => setSel(null)}
                    style={{ flex:1, padding:'12px', borderRadius:14, background:'#f8fafc', color:'#64748b',
                      fontSize:13, fontWeight:500, border:'1px solid #e2e8f0', cursor:'pointer', transition:'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background='#f1f5f9'}
                    onMouseLeave={e => e.currentTarget.style.background='#f8fafc'}>
                    Назад
                  </button>
                  <button
                    onClick={() => { setLoading(true); setTimeout(() => onLogin(sel), 2200); }}
                    style={{ flex:2, padding:'12px', borderRadius:14, background:BRAND, color:'white',
                      fontSize:13, fontWeight:700, border:'none', cursor:'pointer', transition:'opacity .15s' }}
                    onMouseEnter={e => e.currentTarget.style.opacity='0.9'}
                    onMouseLeave={e => e.currentTarget.style.opacity='1'}>
                    Войти в систему →
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
