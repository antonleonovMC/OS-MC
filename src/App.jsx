import { useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'sonner';
import { ROLE_ACCESS, ROLE_LABELS, genCode, advanceHistory } from './data/constants';
import { DataProvider, useData } from './context/DataContext';

import Auth       from './pages/Auth';
import Splash     from './pages/Splash';
import Dashboard  from './pages/Dashboard';
import Logistics  from './pages/Logistics';
import Requests   from './pages/Requests';
import Payments   from './pages/Payments';
import Coffee     from './pages/Coffee';
import Tasks      from './pages/Tasks';
import Feedback   from './pages/Feedback';
import Staff      from './pages/Staff';
import Sidebar    from './components/Sidebar';
import BottomNav  from './components/BottomNav';
import Avatar     from './components/Avatar';

const BRAND = '#28798d';
const LOGO  = '/logo.png';

const PAGE_META = {
  dashboard: { title:'Дашборд'        },
  logistics: { title:'Логистика'       },
  requests:  { title:'Заявки на закуп' },
  coffee:    { title:'Заказ КОФЕЕЕЕЕ'  },
  payments:  { title:'Оплата'          },
  tasks:     { title:'Задачи'          },
  staff:     { title:'Сотрудники'      },
  feedback:  { title:'Обратная связь'  },
};

const PAGE_ORDER = ['dashboard','logistics','requests','coffee','payments','tasks','staff','feedback'];

// Десктоп: вертикальный fade. Мобильный: горизонтальный слайд
const makeVariants = (dir) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  if (!isMobile) return {
    initial: { opacity:0, y:10 },
    animate: { opacity:1, y:0,  transition:{ duration:0.2, ease:'easeOut' } },
    exit:    { opacity:0, y:-6, transition:{ duration:0.14, ease:'easeIn' } },
  };
  const x = dir > 0 ? '55%' : '-55%';
  const xExit = dir > 0 ? '-30%' : '30%';
  return {
    initial: { opacity:0, x },
    animate: { opacity:1, x:0, transition:{ duration:0.26, ease:[0.25,0.46,0.45,0.94] } },
    exit:    { opacity:0, x:xExit, transition:{ duration:0.18, ease:'easeIn' } },
  };
};

// ── Loading screen while Sheets data is fetching ───────────────────────────
function DataLoader() {
  const r = 46, circ = 2 * Math.PI * r;
  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
      style={{ minHeight:'100vh', background:'white', display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center' }}>
      <div style={{ position:'relative', width:120, height:120,
        display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24 }}>
        {/* Track */}
        <svg width="120" height="120" style={{ position:'absolute', top:0, left:0 }}>
          <circle cx="60" cy="60" r={r} fill="none" stroke="#e8f4f6" strokeWidth="3"/>
        </svg>
        {/* Spinning arc */}
        <motion.svg width="120" height="120" style={{ position:'absolute', top:0, left:0 }}
          animate={{ rotate: 360 }}
          transition={{ duration:1.1, repeat:Infinity, ease:'linear' }}>
          <circle cx="60" cy="60" r={r} fill="none" stroke={BRAND} strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${circ * 0.25} ${circ * 0.75}`}
            strokeDashoffset={circ * 0.25}/>
        </motion.svg>
        {/* Logo */}
        <motion.img src={LOGO}
          style={{ width:56, height:56, objectFit:'contain', borderRadius:16, position:'relative', zIndex:1 }}
          animate={{ y:[0,-6,0] }}
          transition={{ duration:1.8, repeat:Infinity, ease:'easeInOut' }}/>
      </div>
      <div style={{ fontSize:15, fontWeight:700, color:'#1a3a42', marginBottom:4 }}>Загружаем данные…</div>
      <div style={{ fontSize:12, color:'#94a3b8' }}>Синхронизация с Google Sheets</div>
    </motion.div>
  );
}

// ── Inner app (after data ready) ───────────────────────────────────────────
function Inner() {
  const [user, setUser]               = useState(null);
  const [page, setPage]               = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navDir, setNavDir]           = useState(1);
  // Админ может временно смотреть приложение глазами другой роли (для проверки прав)
  const [viewAsRole, setViewAsRole]   = useState(null);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const { orders, addOrder } = useData();

  if (!user) return <Auth onLogin={u => { setUser(u); setPage('dashboard'); }} />;

  const isRealAdmin   = user.role === 'admin';
  const effectiveRole = isRealAdmin && viewAsRole ? viewAsRole : user.role;
  const effectiveUser = effectiveRole === user.role ? user : { ...user, role: effectiveRole };
  const access   = ROLE_ACCESS[effectiveRole] || [];
  const meta     = PAGE_META[page] || PAGE_META.dashboard;
  const safePage = p => {
    if (access.includes(p)) {
      const dir = PAGE_ORDER.indexOf(p) >= PAGE_ORDER.indexOf(page) ? 1 : -1;
      setNavDir(dir);
      setPage(p);
      setSidebarOpen(false);
    }
  };

  const handleCreateLogisticsOrder = (req) => {
    const newId = (orders.length ? Math.max(...orders.map(o => Number(o.id) || 0)) : 0) + 1;
    const today = new Date().toLocaleDateString('ru-RU');
    const order = {
      id: newId,
      code: genCode(newId),
      title: req.product || req.title || '—',
      supplier: req.supplierCompany || '—',
      warehouse: req.address || 'Астана',
      planDate: req.deliveryDate || '',
      status: 'Принят',
      country: 'РК',
      comment: req.comment || '',
      items: [{ name: req.product || '—', qty: req.qty || '', unit: 'шт' }],
      created: today,
      history: advanceHistory([], 'Принят'),
      payments: [],
      from_request: req.id,
    };
    addOrder(order);
    safePage('logistics');
  };

  return (
    <div className="flex min-h-screen" style={{ background:'#f4f8f9' }}>
      <Toaster position="top-right" richColors closeButton />

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar user={effectiveUser} page={page} setPage={safePage}
          onLogout={() => { setUser(null); setViewAsRole(null); setPage('dashboard'); }} />
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div className="lg:hidden fixed inset-0 z-40 flex"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            transition={{ duration:0.18 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <motion.div className="relative z-50 w-64"
              initial={{ x:-260 }} animate={{ x:0 }} exit={{ x:-260 }}
              transition={{ type:'spring', stiffness:340, damping:34 }}>
              <Sidebar user={effectiveUser} page={page} setPage={safePage}
                onLogout={() => { setUser(null); setViewAsRole(null); setPage('dashboard'); }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-52">
        <header className="px-4 lg:px-7 flex items-center justify-between sticky top-0 z-20"
          style={{ height:52, background:'rgba(244,248,249,0.92)', backdropFilter:'blur(12px)' }}>
          <div className="flex items-center gap-2.5">
            <button className="lg:hidden w-7 h-7 flex items-center justify-center rounded-xl hover:bg-black/5 transition-colors"
              onClick={() => setSidebarOpen(true)}>
              <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
                <rect width="14" height="1.5" rx="0.75" fill="#6b7280"/>
                <rect y="5" width="10" height="1.5" rx="0.75" fill="#6b7280"/>
                <rect y="10" width="14" height="1.5" rx="0.75" fill="#6b7280"/>
              </svg>
            </button>
            <span className="text-sm font-semibold" style={{ color:'#1a3a42' }}>{meta.title}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Admin: переключатель «Смотрю как…» */}
            {isRealAdmin && (
              <div className="relative">
                <button onClick={() => setRoleMenuOpen(v => !v)}
                  className="flex items-center gap-1.5 px-2.5 h-7 rounded-xl text-xs font-semibold transition-colors"
                  style={{
                    background: viewAsRole ? '#fef3c7' : '#e8f4f6',
                    color:      viewAsRole ? '#92400e' : BRAND,
                    border: '1px solid ' + (viewAsRole ? '#fcd34d' : 'transparent'),
                  }}
                  title="Просмотр от имени другой роли">
                  <span style={{ fontSize:12 }}>👁</span>
                  <span className="hidden sm:inline">{viewAsRole ? ROLE_LABELS[viewAsRole] : 'Роль'}</span>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <AnimatePresence>
                  {roleMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setRoleMenuOpen(false)} />
                      <motion.div
                        initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }}
                        transition={{ duration:0.15 }}
                        className="absolute right-0 top-full mt-1 z-40 bg-white rounded-xl border border-gray-100 overflow-hidden"
                        style={{ minWidth:200, boxShadow:'0 8px 28px rgba(0,0,0,0.12)' }}>
                        <div className="px-3 py-2 border-b border-gray-50 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                          Смотреть как
                        </div>
                        <button onClick={() => { setViewAsRole(null); setRoleMenuOpen(false); }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center justify-between"
                          style={{ color: !viewAsRole ? BRAND : '#374151', fontWeight: !viewAsRole ? 700 : 500 }}>
                          <span>⚙️ Себя (Администратор)</span>
                          {!viewAsRole && <span>✓</span>}
                        </button>
                        <div className="border-t border-gray-50" />
                        {Object.entries(ROLE_LABELS)
                          .filter(([k]) => k !== 'admin')
                          .map(([key, label]) => {
                            const active = viewAsRole === key;
                            return (
                              <button key={key}
                                onClick={() => { setViewAsRole(key); setRoleMenuOpen(false); }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center justify-between"
                                style={{ color: active ? BRAND : '#374151', fontWeight: active ? 700 : 500 }}>
                                <span>{label}</span>
                                {active && <span>✓</span>}
                              </button>
                            );
                          })}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
            <button className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-black/5 relative transition-colors">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M10 2a6 6 0 016 6c0 3 1 4 2 5H2c1-1 2-2 2-5a6 6 0 016-6z" stroke="#6b7280" strokeWidth="1.5"/>
                <path d="M8.5 17a1.5 1.5 0 003 0" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full border border-white" style={{ background:'#ef4444' }}/>
            </button>
            <button onClick={() => safePage('dashboard')}
              className="hover:ring-2 transition-all rounded-xl overflow-hidden"
              style={{ '--tw-ring-color':BRAND }}>
              <Avatar user={user} size={28} radius={8} />
            </button>
          </div>
        </header>

        {/* Баннер режима «Смотрю как…» — только для админа в импер-режиме */}
        {isRealAdmin && viewAsRole && (
          <div style={{ background:'#fef3c7', borderBottom:'1px solid #fcd34d', padding:'8px 16px',
            display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:14 }}>👁</span>
            <span style={{ fontSize:12, color:'#92400e', flex:1 }}>
              Смотрите как <b>{ROLE_LABELS[viewAsRole]}</b> · действия и доступы ограничены этой ролью
            </span>
            <button onClick={() => setViewAsRole(null)}
              style={{ fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:8,
                background:'#92400e', color:'white', border:'none', cursor:'pointer' }}>
              Вернуться
            </button>
          </div>
        )}

        <main className="flex-1 px-3 sm:px-4 lg:px-6 overflow-auto lg:pb-6 pb-24" style={{ paddingTop:8 }}>
          {!access.includes(page) ? (
            <div className="flex items-center justify-center h-64 flex-col gap-3">
              <div className="text-5xl">🔒</div>
              <div className="text-base font-medium text-gray-500">Нет доступа</div>
              <div className="text-sm text-gray-400">Обратитесь к администратору</div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={page} {...makeVariants(navDir)} style={{ overflow: 'hidden' }}>
                {page === 'dashboard' && <Dashboard setPage={safePage} />}
                {page === 'logistics' && <Logistics user={effectiveUser} />}
                {page === 'requests'  && <Requests  user={effectiveUser} sidebarOpen={sidebarOpen} onCreateLogisticsOrder={handleCreateLogisticsOrder} />}
                {page === 'coffee'    && <Coffee    user={effectiveUser} />}
                {page === 'payments'  && <Payments  user={effectiveUser} />}
                {page === 'tasks'     && <Tasks     user={effectiveUser} />}
                {page === 'staff'     && <Staff />}
                {page === 'feedback'  && <Feedback  user={effectiveUser} />}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      <div className="lg:hidden">
        <BottomNav user={effectiveUser} page={page} setPage={safePage} />
      </div>
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────
export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const [dataReady,  setDataReady]  = useState(false);

  if (!splashDone) return (
    <AnimatePresence mode="wait">
      <Splash key="splash" onDone={() => setSplashDone(true)} />
    </AnimatePresence>
  );

  return (
    <DataProvider onReady={() => setDataReady(true)}>
      <AnimatePresence mode="wait">
        {!dataReady
          ? <motion.div key="loader" exit={{ opacity:0 }} transition={{ duration:0.3 }}><DataLoader /></motion.div>
          : <motion.div key="app" initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.25 }}><Inner /></motion.div>
        }
      </AnimatePresence>
    </DataProvider>
  );
}
