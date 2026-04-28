import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'sonner';
import { ROLE_ACCESS } from './data/constants';
import { DataProvider } from './context/DataContext';

import Auth       from './pages/Auth';
import Splash     from './pages/Splash';
import Dashboard  from './pages/Dashboard';
import Logistics  from './pages/Logistics';
import Requests   from './pages/Requests';
import Payments   from './pages/Payments';
import Coffee     from './pages/Coffee';
import Tasks      from './pages/Tasks';
import Feedback   from './pages/Feedback';
import Sidebar    from './components/Sidebar';
import BottomNav  from './components/BottomNav';
import Avatar     from './components/Avatar';

const BRAND = '#28798d';
const LOGO  = '/logo.png';

const PAGE_META = {
  dashboard: { title:'Дашборд'        },
  logistics: { title:'Логистика'       },
  requests:  { title:'Заявки на закуп' },
  coffee:    { title:'Кофе-заказы'     },
  payments:  { title:'Оплата'          },
  tasks:     { title:'Задачи'          },
  feedback:  { title:'Обратная связь'  },
};

const pageVariants = {
  initial: { opacity:0, y:10 },
  animate: { opacity:1, y:0,  transition:{ duration:0.2, ease:'easeOut' } },
  exit:    { opacity:0, y:-6, transition:{ duration:0.12, ease:'easeIn' } },
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

  if (!user) return <Auth onLogin={u => { setUser(u); setPage('dashboard'); }} />;

  const access   = ROLE_ACCESS[user.role];
  const meta     = PAGE_META[page] || PAGE_META.dashboard;
  const safePage = p => { if (access.includes(p)) { setPage(p); setSidebarOpen(false); } };

  return (
    <div className="flex min-h-screen" style={{ background:'#f4f8f9' }}>
      <Toaster position="top-right" richColors closeButton />

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar user={user} page={page} setPage={safePage}
          onLogout={() => { setUser(null); setPage('dashboard'); }} />
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
              <Sidebar user={user} page={page} setPage={safePage}
                onLogout={() => { setUser(null); setPage('dashboard'); }} />
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

        <main className="flex-1 px-3 sm:px-4 lg:px-6 overflow-auto lg:pb-6 pb-24" style={{ paddingTop:8 }}>
          {!access.includes(page) ? (
            <div className="flex items-center justify-center h-64 flex-col gap-3">
              <div className="text-5xl">🔒</div>
              <div className="text-base font-medium text-gray-500">Нет доступа</div>
              <div className="text-sm text-gray-400">Обратитесь к администратору</div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={page} {...pageVariants}>
                {page === 'dashboard' && <Dashboard setPage={safePage} />}
                {page === 'logistics' && <Logistics user={user} />}
                {page === 'requests'  && <Requests  user={user} sidebarOpen={sidebarOpen} onCreateLogisticsOrder={() => safePage('logistics')} />}
                {page === 'coffee'    && <Coffee    user={user} />}
                {page === 'payments'  && <Payments />}
                {page === 'tasks'     && <Tasks     user={user} />}
                {page === 'feedback'  && <Feedback  user={user} />}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      <div className="lg:hidden">
        <BottomNav user={user} page={page} setPage={safePage} />
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
