import { useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

const BRAND   = '#28798d';
const DARK    = '#1a3a42';
const HERO    = '/hero.jpg';

const TRACK_W  = 280;
const THUMB_W  = 56;
const MAX_DRAG = TRACK_W - THUMB_W - 8;

export default function Splash({ onDone }) {
  const x = useMotionValue(0);
  const [done, setDone] = useState(false);

  const trackOpacity = useTransform(x, [0, MAX_DRAG * 0.5, MAX_DRAG], [1, 0.5, 0]);
  const thumbBg      = useTransform(x, [0, MAX_DRAG], [BRAND, '#10b981']);
  const fillWidth    = useTransform(x, v => Math.max(THUMB_W + 8, v + THUMB_W + 8));

  function handleDragEnd() {
    if (x.get() > MAX_DRAG * 0.72) {
      animate(x, MAX_DRAG, { type: 'spring', stiffness: 400, damping: 28 });
      setDone(true);
      setTimeout(onDone, 400);
    } else {
      animate(x, 0, { type: 'spring', stiffness: 420, damping: 36 });
    }
  }

  return (
    <motion.div
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', flexDirection: 'column',
        background: DARK, overflow: 'hidden',
      }}
    >
      {/* Hero — full screen */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <img
          src={HERO}
          alt=""
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center center',
            display: 'block',
          }}
        />
        {/* Bottom fade for swipe panel readability */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '35%',
          background: `linear-gradient(to bottom, transparent, ${DARK})`,
        }} />
      </div>

      {/* Swipe panel — pinned to bottom */}
      <div style={{ marginTop: 'auto', position: 'relative', zIndex: 1,
        padding: '20px 28px 44px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
      }}>
        {/* Label */}
        <motion.div style={{
          opacity: trackOpacity,
          fontSize: 12, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em',
        }}>
          Проведите вправо, чтобы войти
        </motion.div>

        {/* Track */}
        <div style={{
          position: 'relative', width: TRACK_W, height: THUMB_W + 8,
          borderRadius: 999,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.12)',
          overflow: 'hidden',
        }}>
          <motion.div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            borderRadius: 999,
            background: `linear-gradient(90deg, ${BRAND}55, #10b98155)`,
            width: fillWidth,
          }} />

          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center',
            paddingLeft: THUMB_W + 16, gap: 6, pointerEvents: 'none',
          }}>
            {[0, 1, 2].map(i => (
              <motion.div key={i}
                animate={{ opacity: [0.15, 0.55, 0.15], x: [0, 4, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
                style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1 }}
              >›</motion.div>
            ))}
          </div>

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

        {/* Dots */}
        <div style={{ display: 'flex', gap: 5 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: i === 0 ? 18 : 5, height: 5, borderRadius: 999,
              background: i === 0 ? BRAND : 'rgba(255,255,255,0.2)',
            }} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
