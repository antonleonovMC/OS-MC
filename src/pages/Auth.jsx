import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ROLE_LABELS, ROLE_ACCESS, USERS as DEFAULT_USERS, ADMIN_TG_ID } from '../data/constants';
import { useData } from '../context/DataContext';
import { sendAccessRequest, notifyTelegram } from '../lib/sheetsAPI';

const BRAND = '#28798d';
const DARK  = '#1a3a42';
const LOGO  = '/logo.png';
// Замени на username своего бота (без @)
const TG_BOT = import.meta.env.VITE_TG_BOT || '';

const PAGE_LABELS = {
  dashboard:'Дашборд', logistics:'Логистика', requests:'Заявки',
  tasks:'Задачи', coffee:'Кофе', payments:'Оплата', feedback:'Обратная связь',
};

function Logo({ size=56, rounded=16 }) {
  return (
    <img src={LOGO} alt="MC"
      style={{ width:size, height:size, objectFit:'contain', borderRadius:rounded }}
      onError={e=>{ e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}/>
  );
}
function LogoFallback({ size=56, rounded=16 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:rounded,
      background:`linear-gradient(135deg,${DARK},${BRAND})`,
      display:'none', alignItems:'center', justifyContent:'center',
      color:'white', fontSize:size*0.28, fontWeight:800 }}>MC</div>
  );
}
function SpinnerRing({ size=120, strokeWidth=3 }) {
  const r    = (size - strokeWidth*2) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ position:'absolute', inset:0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e8f4f6" strokeWidth={strokeWidth}/>
      <motion.circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={BRAND} strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={`${circ*0.25} ${circ*0.75}`}
        style={{ originX:`${size/2}px`, originY:`${size/2}px`, rotate:-90 }}
        animate={{ rotate:['-90deg','270deg'] }}
        transition={{ duration:1.1, repeat:Infinity, ease:'linear' }}/>
    </svg>
  );
}

// ── Detect Telegram context ────────────────────────────────────────────────
function getTgWebAppUser() {
  try {
    const tg = window?.Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user?.id) return tg.initDataUnsafe.user;
  } catch {}
  return null;
}

export default function Auth({ onLogin }) {
  const { staff } = useData();
  const users = staff?.length ? staff : DEFAULT_USERS;

  const [phase,   setPhase]   = useState('detecting'); // detecting|login|confirm|pending|loading
  const [tgUser,  setTgUser]  = useState(null);   // raw telegram user object
  const [matched, setMatched] = useState(null);   // matched USERS entry
  const [dots,    setDots]    = useState('');
  const widgetRef = useRef();

  // Animated dots
  useEffect(() => {
    if (phase !== 'loading') return;
    const id = setInterval(() => setDots(d => d.length>=3?'':d+'.'), 400);
    return () => clearInterval(id);
  }, [phase]);

  // ── 1. Try Telegram Mini App auto-detect ──────────────────────────────────
  useEffect(() => {
    const tgU = getTgWebAppUser();
    if (tgU) {
      setTgUser(tgU);
      matchUser(tgU);
    } else {
      setPhase('login');
    }
  }, [users]);

  // ── Telegram Login Widget callback (browser) ──────────────────────────────
  useEffect(() => {
    if (phase !== 'login' || !TG_BOT) return;
    window._onTelegramAuth = (user) => {
      setTgUser(user);
      matchUser(user);
    };
    if (widgetRef.current && !widgetRef.current.querySelector('script')) {
      const s = document.createElement('script');
      s.src = 'https://telegram.org/js/telegram-widget.js?22';
      s.setAttribute('data-telegram-login', TG_BOT);
      s.setAttribute('data-size', 'large');
      s.setAttribute('data-radius', '12');
      s.setAttribute('data-onauth', '_onTelegramAuth(user)');
      s.setAttribute('data-request-access', 'write');
      s.async = true;
      widgetRef.current.appendChild(s);
    }
    return () => { delete window._onTelegramAuth; };
  }, [phase]);

  // ── Match Telegram user → system user ─────────────────────────────────────
  function matchUser(tgU) {
    const id  = Number(tgU.id);
    const un  = (tgU.username || '').toLowerCase();
    // Match by tg_id first, then by @username
    const found = users.find(u =>
      (u.tg_id && Number(u.tg_id) === id) ||
      (un && u.tg?.replace('@','').toLowerCase() === un)
    );
    if (found) {
      setMatched({ ...found, tg_id: id, photo_url: tgU.photo_url || null });
      setPhase('confirm');
    } else {
      setPhase('pending');
    }
  }

  // ── Submit access request ──────────────────────────────────────────────────
  async function submitRequest() {
    if (!tgUser) return;
    setPhase('loading');
    const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || '—';
    const username = tgUser.username ? '@' + tgUser.username : '—';
    await sendAccessRequest({
      date:       new Date().toLocaleString('ru-RU'),
      tg_id:      tgUser.id,
      username,
      first_name: tgUser.first_name || '',
      last_name:  tgUser.last_name  || '',
      status:     'Ожидает',
      role:       '',
    });
    await notifyTelegram(
      ADMIN_TG_ID,
      `🔐 <b>Новый запрос на доступ</b>\n\n👤 <b>${fullName}</b>\nTelegram: ${username}\nID: <code>${tgUser.id}</code>\n\nОткройте таблицу «Запросы» и добавьте пользователя в лист «Сотрудники» с нужной ролью.`,
    );
    setPhase('requested');
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  function doLogin() {
    setPhase('loading');
    setTimeout(() => onLogin(matched), 2200);
  }

  // ────────────────────────────────────────────────────────────────────────────
  const card = (children, key) => (
    <motion.div key={key}
      initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-12 }}
      transition={{ duration:0.25 }}
      style={{ background:'white', borderRadius:24,
        boxShadow:'0 4px 32px rgba(40,121,141,0.10), 0 1px 4px rgba(0,0,0,0.04)',
        overflow:'hidden' }}>
      {children}
    </motion.div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', display:'flex',
      alignItems:'center', justifyContent:'center', padding:16 }}>

      {/* Background blobs */}
      <div style={{ position:'fixed', inset:0, overflow:'hidden', pointerEvents:'none', zIndex:0 }}>
        <div style={{ position:'absolute', top:-120, right:-80, width:420, height:420, borderRadius:'50%',
          background:`radial-gradient(circle,${BRAND}14 0%,transparent 70%)` }}/>
        <div style={{ position:'absolute', bottom:-100, left:-60, width:320, height:320, borderRadius:'50%',
          background:`radial-gradient(circle,${BRAND}0e 0%,transparent 70%)` }}/>
      </div>

      <div style={{ width:'100%', maxWidth:380, position:'relative', zIndex:1 }}>

        {/* Logo */}
        <motion.div initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }}
          style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:64, height:64, margin:'0 auto 12px', borderRadius:20, background:'white',
            boxShadow:`0 4px 24px ${BRAND}22, 0 1px 6px rgba(0,0,0,0.06)`,
            display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
            <Logo size={56} rounded={14}/><LogoFallback size={56} rounded={14}/>
          </div>
          <div style={{ fontSize:20, fontWeight:800, color:DARK, letterSpacing:'-0.02em' }}>Master Coffee OS</div>
          <div style={{ fontSize:12, color:'#94a3b8', marginTop:3 }}>Procurement Management System</div>
        </motion.div>

        <AnimatePresence mode="wait">

          {/* ── Detecting ── */}
          {phase === 'detecting' && card(
            <div style={{ padding:32, textAlign:'center' }}>
              <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
                <div style={{ width:48, height:48, borderRadius:'50%', border:`3px solid ${BRAND}33`,
                  borderTopColor:BRAND, animation:'spin 1s linear infinite' }}/>
              </div>
              <div style={{ fontSize:14, color:'#64748b' }}>Определяем аккаунт…</div>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>,
          'detecting')}

          {/* ── Login (browser) ── */}
          {phase === 'login' && card(
            <div style={{ padding:'20px 20px 8px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase',
                letterSpacing:'0.08em', marginBottom:16 }}>Авторизация</div>

              {TG_BOT ? (
                <div>
                  <div style={{ fontSize:13, color:'#64748b', marginBottom:16, lineHeight:1.5 }}>
                    Войдите через Telegram — система автоматически определит ваш аккаунт
                  </div>
                  {/* Telegram Login Widget */}
                  <div ref={widgetRef} style={{ display:'flex', justifyContent:'center', minHeight:50 }}/>
                </div>
              ) : (
                <div style={{ padding:'16px', background:'#fffbeb', borderRadius:14,
                  border:'1px solid #fde68a', fontSize:13, color:'#92400e', lineHeight:1.5 }}>
                  Приложение работает только через Telegram.<br/>
                  Откройте ссылку в Telegram или попросите администратора добавить бота.
                </div>
              )}

              <div style={{ padding:'14px 0 6px', borderTop:'1px solid #f1f5f9', marginTop:16,
                textAlign:'center', fontSize:11, color:'#cbd5e1' }}>
                Закрытая система · Только сотрудники Master Coffee
              </div>
            </div>,
          'login')}

          {/* ── Confirm ── */}
          {phase === 'confirm' && matched && card(
            <div>
              <div style={{ background:`linear-gradient(135deg,${DARK},${BRAND})`,
                padding:'24px 20px 20px', textAlign:'center' }}>
                <div style={{ width:52, height:52, borderRadius:16, background:matched.color,
                  margin:'0 auto 10px', display:'flex', alignItems:'center', justifyContent:'center',
                  color:'white', fontSize:16, fontWeight:800,
                  boxShadow:'0 4px 16px rgba(0,0,0,0.25)' }}>{matched.av}</div>
                <div style={{ fontSize:16, fontWeight:700, color:'white' }}>{matched.name}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)', marginTop:2 }}>
                  {ROLE_LABELS[matched.role]}
                </div>
              </div>
              <div style={{ padding:'16px 20px' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase',
                  letterSpacing:'0.07em', marginBottom:8 }}>Доступные разделы</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:20 }}>
                  {(ROLE_ACCESS[matched.role] || []).map(s => (
                    <span key={s} style={{ fontSize:11, fontWeight:500, padding:'4px 10px',
                      borderRadius:20, background:'#e8f4f6', color:BRAND }}>
                      {PAGE_LABELS[s]}
                    </span>
                  ))}
                </div>
                <motion.button onClick={doLogin} whileTap={{ scale:0.98 }}
                  style={{ width:'100%', padding:'13px', borderRadius:14, background:BRAND,
                    color:'white', fontSize:13, fontWeight:700, border:'none', cursor:'pointer' }}>
                  Войти в систему →
                </motion.button>
              </div>
            </div>,
          'confirm')}

          {/* ── Unknown user — pending ── */}
          {phase === 'pending' && card(
            <div style={{ padding:'24px 20px' }}>
              <div style={{ textAlign:'center', marginBottom:20 }}>
                <div style={{ fontSize:32, marginBottom:10 }}>🔐</div>
                <div style={{ fontSize:16, fontWeight:700, color:DARK, marginBottom:6 }}>
                  Нет доступа
                </div>
                <div style={{ fontSize:13, color:'#64748b', lineHeight:1.5 }}>
                  Ваш Telegram аккаунт не найден в системе.<br/>
                  Отправьте запрос на подключение — администратор выдаст роль.
                </div>
              </div>
              {tgUser && (
                <div style={{ background:'#f8fafc', borderRadius:14, padding:'12px 14px',
                  marginBottom:16, border:'1px solid #e2e8f0' }}>
                  <div style={{ fontSize:11, color:'#94a3b8', marginBottom:4 }}>Ваши данные</div>
                  <div style={{ fontSize:13, fontWeight:600, color:DARK }}>
                    {[tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || '—'}
                  </div>
                  {tgUser.username && (
                    <div style={{ fontSize:12, color:BRAND }}>@{tgUser.username}</div>
                  )}
                </div>
              )}
              <motion.button onClick={submitRequest} whileTap={{ scale:0.98 }}
                style={{ width:'100%', padding:'13px', borderRadius:14, background:BRAND,
                  color:'white', fontSize:13, fontWeight:700, border:'none', cursor:'pointer' }}>
                Отправить запрос на доступ
              </motion.button>
            </div>,
          'pending')}

          {/* ── Request sent ── */}
          {phase === 'requested' && card(
            <div style={{ padding:'32px 20px', textAlign:'center' }}>
              <motion.div initial={{ scale:0 }} animate={{ scale:1 }}
                transition={{ type:'spring', stiffness:360, damping:22 }}
                style={{ fontSize:44, marginBottom:12 }}>✅</motion.div>
              <div style={{ fontSize:16, fontWeight:700, color:DARK, marginBottom:8 }}>
                Запрос отправлен
              </div>
              <div style={{ fontSize:13, color:'#64748b', lineHeight:1.6 }}>
                Администратор рассмотрит заявку и выдаст доступ.<br/>
                После подтверждения просто откройте приложение заново.
              </div>
            </div>,
          'requested')}

          {/* ── Loading ── */}
          {phase === 'loading' && (
            <motion.div key="loading" initial={{ opacity:0 }} animate={{ opacity:1 }}
              style={{ textAlign:'center', padding:40 }}>
              <div style={{ position:'relative', width:120, height:120, margin:'0 auto 24px',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <SpinnerRing size={120} strokeWidth={3}/>
                <motion.div animate={{ y:[0,-5,0] }}
                  transition={{ duration:1.8, repeat:Infinity, ease:'easeInOut' }}
                  style={{ display:'flex' }}>
                  <Logo size={64} rounded={18}/><LogoFallback size={64} rounded={18}/>
                </motion.div>
              </div>
              <div style={{ fontSize:16, fontWeight:700, color:DARK, marginBottom:4 }}>
                Входим в систему{dots}
              </div>
              <div style={{ fontSize:13, color:'#94a3b8' }}>Проверка прав доступа</div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
