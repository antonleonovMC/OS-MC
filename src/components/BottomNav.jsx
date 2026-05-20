import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import { ROLE_ACCESS } from '../data/constants';

const BRAND = '#28798d';

// line-md animated icons — animate on mount (SVG draw effect)
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Главная',   icon: 'line-md:home'           },
  { id: 'logistics', label: 'Логистика', icon: 'line-md:compass'         },
  { id: 'requests',  label: 'Закуп',     icon: 'line-md:clipboard-list'  },
  { id: 'coffee',    label: 'Кофе',      icon: 'line-md:coffee'          },
  { id: 'tasks',     label: 'Задачи',    icon: 'line-md:check-list-3'    },
  { id: 'payments',  label: 'Оплата',    icon: 'solar:wallet-2-bold', static: true },
];

// Отключаем CSS-анимации для неактивных иконок
const INACTIVE_CSS = `
  .nav-icon-inactive * {
    animation: none !important;
    transition-duration: 0s !important;
  }
`;

const SPRING = { type: 'spring', stiffness: 420, damping: 32 };
const EASE   = { duration: 0.18, ease: 'easeOut' };

export default function BottomNav({ user, page, setPage }) {
  const access = ROLE_ACCESS[user.role];
  const items  = NAV_ITEMS.filter(i => access.includes(i.id));

  return (
    <>
      <style>{INACTIVE_CSS}</style>
      <div
        className="fixed bottom-4 left-0 right-0 z-30 flex justify-center pointer-events-none px-4"
        style={{ willChange: 'transform' }}
      >
        <div
          className="pointer-events-auto flex items-center gap-1 px-2 py-2"
          style={{
            background: 'white',
            borderRadius: 999,
            border: '1px solid rgba(40,121,141,0.14)',
            boxShadow: '0 8px 32px rgba(40,121,141,0.18), 0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          {items.map(item => {
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 999,
                  border: 'none',
                  cursor: 'pointer',
                  background: 'transparent',
                  padding: 0,
                  overflow: 'hidden',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {/* Фоновая пилюля */}
                <motion.div
                  style={{
                    position: 'absolute', inset: 0,
                    borderRadius: 999,
                    background: BRAND,
                    zIndex: 0,
                    willChange: 'transform, opacity',
                  }}
                  animate={{ opacity: active ? 1 : 0, scale: active ? 1 : 0.55 }}
                  transition={SPRING}
                />

                <div style={{
                  position: 'relative', zIndex: 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  paddingLeft: 12, paddingRight: 12,
                  paddingTop: 9, paddingBottom: 9,
                  minWidth: 44,
                }}>
                  {/* Иконка */}
                  <motion.div
                    animate={
                      item.static
                        ? { scale: active ? [1, 1.3, 0.9, 1.08] : 1, opacity: active ? 1 : 0.52 }
                        : { scale: active ? 1.08 : 1, opacity: active ? 1 : 0.52 }
                    }
                    transition={item.static && active
                      ? { duration: 0.35, times: [0, 0.4, 0.7, 1], ease: 'easeOut' }
                      : SPRING
                    }
                    style={{ willChange: 'transform, opacity' }}
                  >
                    <div
                      key={active ? `on-${item.id}` : `off-${item.id}`}
                      className={active ? '' : 'nav-icon-inactive'}
                    >
                      <Icon
                        icon={item.icon}
                        width={22}
                        height={22}
                        style={{ color: active ? 'white' : BRAND, display: 'block' }}
                      />
                    </div>
                  </motion.div>

                  {/* Подпись под активным элементом */}
                  <AnimatePresence initial={false}>
                    {active && (
                      <motion.span
                        key="lbl"
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 13, marginTop: 3 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={EASE}
                        style={{
                          display: 'block',
                          fontSize: 10,
                          fontWeight: 700,
                          lineHeight: '13px',
                          color: 'white',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          willChange: 'opacity',
                        }}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
