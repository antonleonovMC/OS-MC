import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ROLE_LABELS, ROLE_ACCESS, USERS as DEFAULT_USERS, ADMIN_TG_ID } from '../data/constants';
import { useData } from '../context/DataContext';
import { sendAccessRequest, notifyTelegram } from '../lib/sheetsAPI';

const BRAND = '#28798d';
const DARK  = '#1a3a42';
const TG_BOT = import.meta.env.VITE_TG_BOT || '';

export default function Auth({ onLogin }) {
  const { staff } = useData();
  const users = staff?.length ? staff : DEFAULT_USERS;

  // phase: 'checking' | 'widget' | 'pending' | 'requested' | 'logging_in'
  const [phase, setPhase] = useState('checking');
  const [tgUser, setTgUser] = useState(null);
  const widgetRef = useRef();

  // ── On mount: try auto-login from localStorage or Telegram Mini App ────────
  useEffect(() => {
    if (!users?.length) return;

    // 1. Telegram Mini App auto-detect
    try {
      const tg = window?.Telegram?.WebApp;
      if (tg?.initDataUnsafe?.user?.id) {
        handleTgUser(tg.initDataUnsafe.user);
        return;
      }
    } catch {}

    // 2. localStorage saved tg_id
    const savedId = Number(localStorage.getItem('mc_tg_id'));
    if (savedId) {
      const found = users.find(u => u.tg_id && Number(u.tg_id) === savedId);
      if (found) {
        setPhase('logging_in');
        setTimeout(() => onLogin(found), 800);
        return;
      }
    }

    // 3. Show Telegram Login Widget
    setPhase('widget');
  }, [users]);

  // ── Inject Telegram Login Widget ───────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'widget' || !TG_BOT) return;
    window._onTelegramAuth = (user) => handleTgUser(user);
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
  }, [phase]);

  // ── Match Telegram user to known staff ─────────────────────────────────────
  function handleTgUser(tgU) {
    setTgUser(tgU);
    const id = Number(tgU.id);
    const un = (tgU.username || '').toLowerCase();
    const found = users.find(u =>
      (u.tg_id && Number(u.tg_id) === id) ||
      (un && u.tg?.replace('@', '').toLowerCase() === un)
    );
    if (found) {
      localStorage.setItem('mc_tg_id', id);
      setPhase('logging_in');
      setTimeout(() => onLogin({ ...found, tg_id: id, photo_url: tgU.photo_url || null }), 900);
    } else {
      setPhase('pending');
    }
  }

  // ── Unknown user — send access request + notify admin ──────────────────────
  async function submitRequest() {
    if (!tgUser) return;
    setPhase('checking');
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
      `🔐 Новый запрос на доступ\n\n👤 ${fullName}\nTelegram: ${username}\nID: ${tgUser.id}\n\nОткройте таблицу «Запросы» и добавьте пользователя в лист «Сотрудники» с нужной ролью.`,
    );
    setPhase('requested');
  }

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', background: '#f4f8f9',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      {/* Background blobs */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: -120, right: -80, width: 400, height: 400, borderRadius: '50%',
          background: `radial-gradient(circle,${BRAND}18 0%,transparent 70%)` }}/>
        <div style={{ position: 'absolute', bottom: -80, left: -60, width: 300, height: 300, borderRadius: '50%',
          background: `radial-gradient(circle,${BRAND}10 0%,transparent 70%)` }}/>
      </div>

      <div style={{ width: '100%', maxWidth: 360, position: 'relative', zIndex: 1 }}>

        {/* Logo header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 72, height: 72, margin: '0 auto 14px',
            borderRadius: 22, background: 'white',
            boxShadow: `0 4px 24px ${BRAND}28, 0 1px 6px rgba(0,0,0,0.06)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          }}>
            <img src="/logo.png" style={{ width: 56, height: 56, objectFit: 'contain' }}
              onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}/>
            <div style={{ width: 56, height: 56, display: 'none', alignItems: 'center', justifyContent: 'center',
              background: `linear-gradient(135deg,${DARK},${BRAND})`, color: 'white',
              fontSize: 18, fontWeight: 800 }}>MC</div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: DARK, letterSpacing: '-0.02em' }}>Master Coffee OS</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Procurement Management System</div>
        </motion.div>

        <AnimatePresence mode="wait">

          {/* Checking / logging in */}
          {(phase === 'checking' || phase === 'logging_in') && (
            <motion.div key="checking"
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.2 }}
              style={{ background: 'white', borderRadius: 20,
                boxShadow: '0 4px 32px rgba(40,121,141,0.10)', padding: 36, textAlign: 'center' }}>
              <Spinner />
              <div style={{ fontSize: 14, fontWeight: 600, color: DARK, marginTop: 16 }}>
                {phase === 'logging_in' ? 'Входим в систему…' : 'Проверяем аккаунт…'}
              </div>
            </motion.div>
          )}

          {/* Telegram Login Widget */}
          {phase === 'widget' && (
            <motion.div key="widget"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}
              style={{ background: 'white', borderRadius: 20,
                boxShadow: '0 4px 32px rgba(40,121,141,0.10)', overflow: 'hidden' }}>
              <div style={{ background: `linear-gradient(135deg,${DARK},${BRAND})`, padding: '20px 24px' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>Авторизация</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>
                  Только для сотрудников Master Coffee
                </div>
              </div>
              <div style={{ padding: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20, lineHeight: 1.6 }}>
                  Войдите через Telegram — система автоматически определит ваш аккаунт и уровень доступа
                </div>
                {TG_BOT ? (
                  <div ref={widgetRef} style={{ display: 'flex', justifyContent: 'center', minHeight: 52 }} />
                ) : (
                  <div style={{ padding: 14, background: '#fef3c7', borderRadius: 12,
                    fontSize: 13, color: '#92400e', lineHeight: 1.5 }}>
                    Откройте приложение через Telegram
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Unknown user */}
          {phase === 'pending' && (
            <motion.div key="pending"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}
              style={{ background: 'white', borderRadius: 20,
                boxShadow: '0 4px 32px rgba(40,121,141,0.10)', padding: '28px 24px' }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🔐</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: DARK, marginBottom: 6 }}>Нет доступа</div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                  Ваш аккаунт не найден в системе.<br/>
                  Отправьте запрос — администратор выдаст доступ.
                </div>
              </div>
              {tgUser && (
                <div style={{ background: '#f8fafc', borderRadius: 12, padding: '12px 14px',
                  marginBottom: 16, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>Ваш аккаунт</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: DARK }}>
                    {[tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || '—'}
                  </div>
                  {tgUser.username && <div style={{ fontSize: 12, color: BRAND }}>@{tgUser.username}</div>}
                </div>
              )}
              <motion.button onClick={submitRequest} whileTap={{ scale: 0.98 }}
                style={{ width: '100%', padding: 14, borderRadius: 14, background: BRAND,
                  color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                Отправить запрос на доступ
              </motion.button>
            </motion.div>
          )}

          {/* Request sent */}
          {phase === 'requested' && (
            <motion.div key="requested"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              style={{ background: 'white', borderRadius: 20,
                boxShadow: '0 4px 32px rgba(40,121,141,0.10)', padding: '36px 24px', textAlign: 'center' }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                style={{ fontSize: 48, marginBottom: 14 }}>✅</motion.div>
              <div style={{ fontSize: 16, fontWeight: 700, color: DARK, marginBottom: 8 }}>Запрос отправлен</div>
              <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7 }}>
                Администратор получил уведомление и выдаст доступ.<br/>
                После подтверждения просто откройте приложение заново.
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
    <svg width="48" height="48" style={{ display: 'block', margin: '0 auto' }}>
      <circle cx="24" cy="24" r={r} fill="none" stroke="#e8f4f6" strokeWidth="3"/>
      <motion.circle cx="24" cy="24" r={r} fill="none" stroke={BRAND} strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${circ * 0.25} ${circ * 0.75}`}
        style={{ originX: '24px', originY: '24px', rotate: -90 }}
        animate={{ rotate: ['-90deg', '270deg'] }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}/>
    </svg>
  );
}
