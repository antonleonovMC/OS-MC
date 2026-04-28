import { ROLE_ACCESS } from '../data/constants';

const BRAND = '#28798d';

const NAV_ITEMS = [
  { id:"dashboard", label:"Главная", icon:(a) => (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="2" width="7" height="7" rx="1.5" fill={a?"white":"none"} stroke={a?"white":BRAND} strokeWidth="1.5"/>
      <rect x="11" y="2" width="7" height="7" rx="1.5" fill={a?"white":"none"} stroke={a?"white":BRAND} strokeWidth="1.5"/>
      <rect x="2" y="11" width="7" height="7" rx="1.5" fill={a?"white":"none"} stroke={a?"white":BRAND} strokeWidth="1.5"/>
      <rect x="11" y="11" width="7" height="7" rx="1.5" fill={a?"white":"none"} stroke={a?"white":BRAND} strokeWidth="1.5"/>
    </svg>
  )},
  { id:"logistics", label:"Логистика", icon:(a) => (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <rect x="1" y="6" width="13" height="8" rx="1.5" fill={a?"white":"none"} stroke={a?"white":BRAND} strokeWidth="1.5"/>
      <path d="M14 9h2.5L18 12v2h-4V9z" fill={a?"white":"none"} stroke={a?"white":BRAND} strokeWidth="1.5" strokeLinejoin="round"/>
      <circle cx="5" cy="15.5" r="1.5" fill={a?BRAND:"white"} stroke={a?"white":BRAND} strokeWidth="1.5"/>
      <circle cx="15" cy="15.5" r="1.5" fill={a?BRAND:"white"} stroke={a?"white":BRAND} strokeWidth="1.5"/>
    </svg>
  )},
  { id:"requests", label:"Заявки", icon:(a) => (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="2" width="14" height="16" rx="2" fill={a?"white":"none"} stroke={a?"white":BRAND} strokeWidth="1.5"/>
      <path d="M7 7h6M7 10h6M7 13h4" stroke={a?BRAND:"#9ca3af"} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )},
  { id:"coffee", label:"Кофе", icon:(a) => (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path d="M4 8h9v6a3 3 0 01-3 3H7a3 3 0 01-3-3V8z" fill={a?"white":"none"} stroke={a?"white":BRAND} strokeWidth="1.5"/>
      <path d="M13 9.5h1.5a2 2 0 010 4H13" stroke={a?"white":BRAND} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M7 5c0-1 1-1.5 1-2.5M10 5c0-1 1-1.5 1-2.5" stroke={a?"white":BRAND} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )},
  { id:"tasks", label:"Задачи", icon:(a) => (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="3" width="14" height="14" rx="2" fill={a?"white":"none"} stroke={a?"white":BRAND} strokeWidth="1.5"/>
      <path d="M7 10l2 2 4-4" stroke={a?BRAND:"#9ca3af"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  { id:"payments", label:"Оплата", icon:(a) => (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="5" width="16" height="11" rx="2" fill={a?"white":"none"} stroke={a?"white":BRAND} strokeWidth="1.5"/>
      <path d="M2 9h16" stroke={a?BRAND:"#9ca3af"} strokeWidth="1.5"/>
      <rect x="5" y="12" width="4" height="1.5" rx="0.75" fill={a?BRAND:"#9ca3af"}/>
    </svg>
  )},
];

export default function BottomNav({ user, page, setPage }) {
  const access = ROLE_ACCESS[user.role];
  const items  = NAV_ITEMS.filter(i => access.includes(i.id));

  return (
    <div className="fixed bottom-4 left-0 right-0 z-30 flex justify-center pointer-events-none px-4">
      <div
        className="pointer-events-auto flex items-center gap-1 px-3 py-2"
        style={{
          background: 'white',
          borderRadius: 999,
          border: '1px solid rgba(40,121,141,0.14)',
          boxShadow: '0 8px 32px rgba(40,121,141,0.18), 0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        {items.map(item => {
          const active = page === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className="flex flex-col items-center transition-all"
              style={{
                padding: active ? '7px 14px' : '6px 10px',
                borderRadius: 999,
                background: active ? BRAND : 'transparent',
                minWidth: active ? 64 : 40,
              }}
            >
              <div style={{ opacity: active ? 1 : 0.5 }}>
                {item.icon(active)}
              </div>
              {active && (
                <span className="text-[9px] font-semibold mt-0.5 leading-none" style={{ color: 'white' }}>
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
