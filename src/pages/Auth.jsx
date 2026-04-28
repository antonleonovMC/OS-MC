import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { USERS as DEFAULT_USERS, ADMIN_TG_ID } from '../data/constants';
import { useData } from '../context/DataContext';
import { sendAccessRequest, notifyTelegram } from '../lib/sheetsAPI';

const BRAND  = '#28798d';
const DARK   = '#1a3a42';
const TG_BOT = import.meta.env.VITE_TG_BOT || '';

// Find user by tg_id or @username across both lists
function findUser(lists, tgId, username) {
  const un = (username || '').toLowerCase();
  for (const list of lists) {
    const found = list.find(u =>
      (tgId  && u.tg_id && Number(u.tg_id) === tgId) ||
      (un    && u.tg?.replace('@', '').toLowerCase() === un)
    );
    if (found) return found;
  }
  return null;
}

export default function Auth({ onLogin }) {
  const { staff } = useData();

  // phase: 'init' | 'widget' | 'pending' | 'requested'
  const [phase,   setPhase]   = useState('init');
  const [tgUser,  setTgUser]  = useState(null);
  const widgetRef = useRef();
  const loggedIn  = useRef(false);

  function doLogin(appUser, rawTgUser) {
    if (loggedIn.current) return;
    loggedIn.current = true;
    localStorage.setItem('mc_tg_id', appUser.tg_id || rawTgUser?.id || '');
    onLogin({ ...appUser, photo_url: rawTgUser?.photo_url || null });
  }

  // ── Boot: Mini App → localStorage → widget ────────────────────────────────
  useEffect(() => {
    const users = staff?.length ? staff : DEFAULT_USERS;

    // 1. Telegram Mini App (requires telegram-web-app.js in index.html)
    const tg  = window.Telegram?.WebApp;
    const tgU = tg?.initDataUnsafe?.user;
    if (tgU?.id) {
      tg.ready();
      tg.expand();
      const found = findUser([users, DEFAULT_USERS], Number(tgU.id), tgU.username);
      if (found) { doLogin(found, tgU); return; }
      setTgUser(tgU);
      setPhase('pending');
      return;
    }

    // 2. localStorage auto-login
    const savedId = Number(localStorage.getItem('mc_tg_id'));
    if (savedId) {
      const found = findUser([users, DEFAULT_USERS], savedId, null);
      if (found) { doLogin(found, null); return; }
      localStorage.removeItem('mc_tg_id'); // stale id — clean up
    }

    // 3. Not in Telegram — redirect to bot
    window.location.href = 'https://t.me/MC_OS_bot';
  }, [staff]);

  // ── Telegram Login Widget ─────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'widget' || !TG_BOT) return;
    const users = staff?.length ? staff : DEFAULT_USERS;

    window._onTelegramAuth = (tgU) => {
      setTgUser(tgU);
      const found = findUser([users, DEFAULT_USERS], Number(tgU.id), tgU.username);
      if (found) { doLogin(found, tgU); }
      else        { setPhase('pending'); }
    };

    const container = widgetRef.current;
    if (container && !container.querySelector('script')) {
      const s = document.createElement('script');
      s.src = 'https://telegram.org/js/telegram-widget.js?22';
      s.setAttribute('data-telegram-login', TG_BOT);
      s.setAttribute('data-size', 'large');
      s.setAttribute('data-radius', '12');
      s.setAttribute('data-onauth', '_onTelegramAuth(user)');
      s.setAttribute('data-request-access', 'write');
      s.async = true;
      container.appendChild(s);
    }
    return () => { delete window._onTelegramAuth; };
  }, [phase, staff]);

  // ── Send access request ───────────────────────────────────────────────────
  async function submitRequest() {
    if (!tgUser) return;
    setPhase('init');
    const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || '—';
    const username = tgUser.username ? '@' + tgUser.username : '—';
    await sendAccessRequest({
      date: new Date().toLocaleString('ru-RU'),
      tg_id: tgUser.id, username,
      first_name: tgUser.first_name || '',
      last_name:  tgUser.last_name  || '',
      status: 'Ожидает', role: '',
    });
    const cbBase = `${tgUser.id}|${tgUser.username||''}|${tgUser.first_name||''}|${tgUser.last_name||''}`;
    await notifyTelegram(
      ADMIN_TG_ID,
      `🔐 Запрос на доступ\n\n👤 ${fullName}\n${username}\nID: ${tgUser.id}\n\nВыберите роль или отклоните:`,
      { inline_keyboard: [
        [
          { text: '👁 Читатель',    callback_data: `grant|reader|${cbBase}` },
          { text: '📦 Завскладом',  callback_data: `grant|warehouse|${cbBase}` },
        ],
        [
          { text: '🏢 Директор ТК', callback_data: `grant|director_tk|${cbBase}` },
          { text: '⚙️ Админ',       callback_data: `grant|admin|${cbBase}` },
        ],
        [
          { text: '❌ Отклонить',   callback_data: `deny|${cbBase}` },
        ],
      ]},
    );
    setPhase('requested');
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (phase === 'init') return (
    <div style={{ minHeight:'100vh', background:DARK, display:'flex',
      alignItems:'center', justifyContent:'center' }}>
      <Spinner />
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'#f4f8f9', display:'flex',
      alignItems:'center', justifyContent:'center', padding:20 }}>

      <div style={{ position:'fixed', inset:0, overflow:'hidden', pointerEvents:'none' }}>
        <div style={{ position:'absolute', top:-120, right:-80, width:400, height:400,
          borderRadius:'50%', background:`radial-gradient(circle,${BRAND}18 0%,transparent 70%)` }}/>
        <div style={{ position:'absolute', bottom:-80, left:-60, width:300, height:300,
          borderRadius:'50%', background:`radial-gradient(circle,${BRAND}10 0%,transparent 70%)` }}/>
      </div>

      <div style={{ width:'100%', maxWidth:360, position:'relative', zIndex:1 }}>

        {/* Logo */}
        <motion.div initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.35 }} style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:72, height:72, margin:'0 auto 14px', borderRadius:22,
            background:'white', boxShadow:`0 4px 24px ${BRAND}28`,
            display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
            <img src="/logo.png" style={{ width:56, height:56, objectFit:'contain' }}
              onError={e => { e.target.style.display='none'; }}/>
          </div>
          <div style={{ fontSize:22, fontWeight:800, color:DARK }}>Master Coffee OS</div>
          <div style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>Procurement Management System</div>
        </motion.div>

        <AnimatePresence mode="wait">

          {/* Telegram Login Widget */}
          {phase === 'widget' && (
            <motion.div key="widget"
              initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
              exit={{ opacity:0, y:-8 }} transition={{ duration:0.2 }}
              style={{ background:'white', borderRadius:20,
                boxShadow:'0 4px 32px rgba(40,121,141,0.10)', overflow:'hidden' }}>
              <div style={{ background:`linear-gradient(135deg,${DARK},${BRAND})`,
                padding:'20px 24px' }}>
                <div style={{ fontSize:15, fontWeight:700, color:'white' }}>Авторизация</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)', marginTop:3 }}>
                  Только для сотрудников Master Coffee
                </div>
              </div>
              <div style={{ padding:24, textAlign:'center' }}>
                <div style={{ fontSize:13, color:'#64748b', marginBottom:20, lineHeight:1.6 }}>
                  Войдите через Telegram — система определит ваш аккаунт и уровень доступа
                </div>
                {TG_BOT
                  ? <div ref={widgetRef} style={{ display:'flex', justifyContent:'center', minHeight:52 }}/>
                  : <a href={`https://t.me/${TG_BOT || 'MC_OS_bot'}`} target="_blank" rel="noreferrer"
                      style={{ display:'inline-flex', alignItems:'center', gap:8,
                        padding:'12px 24px', borderRadius:14, background:'#229ed9',
                        color:'white', fontSize:13, fontWeight:600, textDecoration:'none' }}>
                      Открыть через Telegram
                    </a>
                }
                <div style={{ marginTop:20, paddingTop:16, borderTop:'1px solid #f1f5f9' }}>
                  <a href={`https://t.me/MC_OS_bot`} target="_blank" rel="noreferrer"
                    style={{ fontSize:12, color:'#94a3b8', textDecoration:'none' }}>
                    или откройте бота @MC_OS_bot
                  </a>
                </div>
              </div>
            </motion.div>
          )}

          {/* Unknown user */}
          {phase === 'pending' && (
            <motion.div key="pending"
              initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
              exit={{ opacity:0, y:-8 }} transition={{ duration:0.2 }}
              style={{ background:'white', borderRadius:20,
                boxShadow:'0 4px 32px rgba(40,121,141,0.10)', padding:'28px 24px' }}>
              <div style={{ textAlign:'center', marginBottom:20 }}>
                <div style={{ fontSize:36, marginBottom:10 }}>🔐</div>
                <div style={{ fontSize:16, fontWeight:700, color:DARK, marginBottom:6 }}>Нет доступа</div>
                <div style={{ fontSize:13, color:'#64748b', lineHeight:1.6 }}>
                  Ваш аккаунт не найден в системе.<br/>
                  Отправьте запрос — администратор выдаст доступ.
                </div>
              </div>
              {tgUser && (
                <div style={{ background:'#f8fafc', borderRadius:12, padding:'12px 14px',
                  marginBottom:16, border:'1px solid #e2e8f0' }}>
                  <div style={{ fontSize:11, color:'#94a3b8', marginBottom:3 }}>Ваш аккаунт</div>
                  <div style={{ fontSize:13, fontWeight:600, color:DARK }}>
                    {[tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || '—'}
                  </div>
                  {tgUser.username && <div style={{ fontSize:12, color:BRAND }}>@{tgUser.username}</div>}
                </div>
              )}
              <motion.button onClick={submitRequest} whileTap={{ scale:0.98 }}
                style={{ width:'100%', padding:14, borderRadius:14, background:BRAND,
                  color:'white', fontSize:13, fontWeight:700, border:'none', cursor:'pointer' }}>
                Отправить запрос на доступ
              </motion.button>
            </motion.div>
          )}

          {/* Request sent */}
          {phase === 'requested' && (
            <motion.div key="requested"
              initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
              transition={{ duration:0.2 }}
              style={{ background:'white', borderRadius:20,
                boxShadow:'0 4px 32px rgba(40,121,141,0.10)',
                padding:'36px 24px', textAlign:'center' }}>
              <motion.div initial={{ scale:0 }} animate={{ scale:1 }}
                transition={{ type:'spring', stiffness:320, damping:20 }}
                style={{ fontSize:48, marginBottom:14 }}>✅</motion.div>
              <div style={{ fontSize:16, fontWeight:700, color:DARK, marginBottom:8 }}>Запрос отправлен</div>
              <div style={{ fontSize:13, color:'#64748b', lineHeight:1.7 }}>
                Администратор получил уведомление.<br/>
                После подтверждения откройте приложение заново.
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

function Spinner() {
  const r = 20, circ = 2 * Math.PI * r;
  return (
    <svg width="48" height="48" style={{ display:'block', margin:'0 auto' }}>
      <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3"/>
      <motion.svg width="48" height="48" style={{ position:'absolute', top:0, left:0 }}
        animate={{ rotate:360 }} transition={{ duration:1, repeat:Infinity, ease:'linear' }}>
        <circle cx="24" cy="24" r={r} fill="none" stroke={BRAND} strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${circ*0.25} ${circ*0.75}`}
          strokeDashoffset={circ*0.25}/>
      </motion.svg>
    </svg>
  );
}
