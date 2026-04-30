import { ROLE_ACCESS, ROLE_LABELS } from '../data/constants';
import Avatar from './Avatar';

export default function Sidebar({ user, page, setPage, onLogout }) {
  const access = ROLE_ACCESS[user.role];

  const nav = [
    { id:"dashboard", label:"Дашборд",        icon:"⊞", group:"Главное"     },
    { id:"logistics", label:"Логистика",       icon:"🚚", group:"Операции"   },
    { id:"requests",  label:"Заявки на закуп", icon:"📋", group:"Операции"   },
    { id:"coffee",    label:"Заказ КОФЕЕЕЕЕ",  icon:"☕", group:"Операции"   },
    { id:"payments",  label:"Оплата",          icon:"💳", group:"Финансы"    },
    { id:"tasks",     label:"Задачи отдела",   icon:"✓",  group:"Управление" },
    { id:"staff",     label:"Сотрудники",      icon:"👥", group:"Управление" },
    { id:"feedback",  label:"Обратная связь",  icon:"💬", group:"Прочее"     },
  ].filter(i => access.includes(i.id));

  const groups = [...new Set(nav.map(i => i.group))];

  return (
    <div className="w-52 bg-slate-900 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0">
      {/* Logo */}
      <button onClick={() => setPage("dashboard")} className="p-4 border-b border-slate-800 flex items-center gap-2.5 hover:bg-slate-800/50 transition-colors w-full text-left">
        <img
          src="/logo.png"
          alt="Master Coffee"
          className="w-9 h-9 rounded-xl object-contain bg-white p-0.5"
          onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
        />
        <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl items-center justify-center hidden">
          <span className="text-white text-xs font-black">MC</span>
        </div>
        <div>
          <div className="text-white font-bold text-xs">MASTER COFFEE</div>
          <div className="text-teal-500 text-[9px] tracking-widest">PROCUREMENT OS</div>
        </div>
      </button>

      {/* User */}
      <div className="p-3 border-b border-slate-800">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Avatar user={user} size={32} radius={8} />
          <div className="min-w-0">
            <div className="text-white text-xs font-medium truncate">{user.name}</div>
            <div className="text-teal-400 text-[9px] uppercase tracking-wide">{ROLE_LABELS[user.role]}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {groups.map(g => (
          <div key={g} className="mb-3 px-3">
            <div className="text-[9px] text-slate-600 uppercase tracking-widest mb-1.5 px-2">{g}</div>
            {nav.filter(i => i.group === g).map(item => (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all mb-0.5 ${
                  page === item.id
                    ? "text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              style={page === item.id ? { background:'rgba(40,121,141,0.35)', borderLeft:'2px solid #28798d', paddingLeft:8 } : {}}
              >
                <span className="text-sm w-4 text-center">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-slate-800 text-xs transition-colors"
        >
          <span>↩</span> Выйти
        </button>
        <div className="text-slate-700 text-[9px] mt-2 px-2">Master Coffee OS v4.0 · 2025</div>
      </div>
    </div>
  );
}
