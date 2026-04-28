import { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

const BRAND  = '#28798d';
const DARK   = '#1a3a42';
const LOGO   = 'https://i.ibb.co/tT12Zg0C/4.png';
const HERO   = 'https://i.ibb.co/whDnJ1FC/image.png';

const TRACK_W  = 280;
const THUMB_W  = 56;
const MAX_DRAG = TRACK_W - THUMB_W - 8; // 8 = 4px padding each side

export default function Splash({ onDone }) {
  const x        = useMotionValue(0);
  const [done,   setDone]   = useState(false);
  const [logoErr, setLogoErr] = useState(false);
  const [heroErr, setHeroErr] = useState(false);
  const dragging = useRef(false);

  // Derived values from drag position
  const progress    = useTransform(x, [0, MAX_DRAG], [0, 1]);
  const trackOpacity= useTransform(x, [0, MAX_DRAG * 0.5, MAX_DRAG], [1, 0.5, 0]);
  const thumbBg     = useTransform(x, [0, MAX_DRAG], [BRAND, '#10b981']);
  const fillWidth   = useTransform(x, v => Math.max(THUMB_W + 8, v + THUMB_W + 8));

  function handleDragEnd(_, info) {
    if (x.get() > MAX_DRAG * 0.72) {
      // Snap to end, then trigger
      animate(x, MAX_DRAG, { type: 'spring', stiffness: 400, damping: 28 });
      setDone(true);
      setTimeout(onDone, 520);
    } else {
      // Snap back
      animate(x, 0, { type: 'spring', stiffness: 420, damping: 36 });
    }
  }

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.45, ease: 'easeInOut' }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', flexDirection: 'column',
        background: DARK, overflow: 'hidden',
      }}
    >
      {/* ── Hero image ──────────────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {!heroErr ? (
          <motion.img
            src={HERO}
            alt=""
            onError={() => setHeroErr(true)}
            initial={{ scale: 1.06, opacity: 0 }}
            animate={{ scale: 1,    opacity: 1 }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center center', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: `linear-gradient(160deg, ${DARK} 0%, ${BRAND} 60%, #0d9488 100%)`,
          }} />
        )}

        {/* Dark overlay gradient bottom */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(26,58,66,0.0) 0%, rgba(26,58,66,0.25) 40%, rgba(26,58,66,0.82) 65%, rgba(26,58,66,0.98) 100%)',
        }} />

        {/* ── Logo + headline (overlaid on image) ── */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '0 28px 28px',
        }}>
          {/* Logo badge */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.55, ease: 'easeOut' }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'white',
              boxShadow: `0 4px 20px rgba(40,121,141,0.35)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', flexShrink: 0,
            }}>
              {!logoErr ? (
                <img src={LOGO} alt="MC" style={{ width: 38, height: 38, objectFit: 'contain' }}
                  onError={() => setLogoErr(true)} />
              ) : (
                <span style={{ fontSize: 14, fontWeight: 900, color: BRAND }}>MC</span>
              )}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'white', letterSpacing: '0.02em' }}>
                Master Coffee
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Procurement OS
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.55, ease: 'easeOut' }}
          >
            <div style={{ fontSize: 28, fontWeight: 900, color: 'white', lineHeight: 1.2, marginBottom: 8 }}>
              Управление<br />закупками
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.58)', lineHeight: 1.5 }}>
              Логистика, заявки, платежи и команда —<br />всё в одном месте
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Bottom panel ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75, duration: 0.45, ease: 'easeOut' }}
        style={{
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.10)',
          padding: '20px 28px 36px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
        }}
      >
        {/* Swipe label */}
        <motion.div style={{ opacity: trackOpacity, fontSize: 12, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.06em' }}>
          Проведите вправо, чтобы войти
        </motion.div>

        {/* ── Swipe track ── */}
        <div style={{
          position: 'relative', width: TRACK_W, height: THUMB_W + 8,
          borderRadius: 999,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.12)',
          overflow: 'hidden',
        }}>

          {/* Animated fill */}
          <motion.div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            borderRadius: 999,
            background: `linear-gradient(90deg, ${BRAND}55, #10b98155)`,
            width: fillWidth,
          }} />

          {/* Arrow hints */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center',
            paddingLeft: THUMB_W + 16,
            gap: 6, pointerEvents: 'none',
          }}>
            {[0, 1, 2].map(i => (
              <motion.div key={i}
                animate={{ opacity: [0.15, 0.55, 0.15], x: [0, 4, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
                style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1 }}
              >
                ›
              </motion.div>
            ))}
          </div>

          {/* Draggable thumb */}
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: MAX_DRAG }}
            dragElastic={0.05}
            dragMomentum={false}
            onDragEnd={handleDragEnd}
            style={{
              x,
              position: 'absolute', left: 4, top: 4,
              width: THUMB_W, height: THUMB_W,
              borderRadius: 999,
              background: thumbBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: done ? 'default' : 'grab',
              boxShadow: '0 4px 18px rgba(40,121,141,0.45)',
              zIndex: 2,
              touchAction: 'none',
            }}
            whileTap={{ scale: 0.95 }}
          >
            {done ? (
              <motion.svg
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 460, damping: 22 }}
                width="22" height="22" viewBox="0 0 22 22" fill="none"
              >
                <motion.path
                  d="M5 11.5l4.5 4.5 7.5-8"
                  stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                />
              </motion.svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7 10h6M10 7l3 3-3 3" stroke="white" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </motion.div>
        </div>

        {/* Dot indicators (decorative) */}
        <div style={{ display: 'flex', gap: 5 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: i === 0 ? 18 : 5, height: 5, borderRadius: 999,
              background: i === 0 ? BRAND : 'rgba(255,255,255,0.2)',
              transition: 'width 0.3s',
            }} />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
