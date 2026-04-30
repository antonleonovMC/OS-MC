import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ROLE_LABELS } from '../data/constants';
import { useData } from '../context/DataContext';
import Avatar from '../components/Avatar';

const BRAND = '#28798d';
const DARK  = '#1a3a42';

const ROLE_BADGE = {
  admin:         { bg:'#f3e8ff', color:'#6b21a8' },
  director_tk:   { bg:'#dbeafe', color:'#1e40af' },
  warehouse:     { bg:'#dcfce7', color:'#166534' },
  sales_manager: { bg:'#fef3c7', color:'#92400e' },
  roaster:       { bg:'#ffedd5', color:'#9a3412' },
  reader:        { bg:'#f1f5f9', color:'#475569' },
  '':            { bg:'#fef2f2', color:'#991b1b' },
};

const DEPT_PRESETS = [
  'Управляющая компания',
  'Отдел закупок',
  'Отдел продаж',
  'ТК Астана',
  'ТК Алматы',
  'Склад ТК Астана',
  'Склад ТК Алматы',
  'Обжарочный цех',
  'Прочее',
];

export default function Staff() {
  const { staff, updateStaffMember } = useData();
  const [search, setSearch] = useState('');
  const [edit,   setEdit]   = useState(null); // staff object being edited

  const filtered = (staff || []).filter(s => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      String(s.name || '').toLowerCase().includes(q) ||
      String(s.tg   || '').toLowerCase().includes(q) ||
      String(s.role || '').toLowerCase().includes(q) ||
      String(s.dept || '').toLowerCase().includes(q)
    );
  }).sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ru'));

  const groupByRole = filtered.reduce((acc, s) => {
    const k = s.role || '__none';
    (acc[k] ||= []).push(s);
    return acc;
  }, {});
  const ROLE_ORDER = ['admin','director_tk','warehouse','sales_manager','roaster','reader','__none'];
  const orderedRoles = ROLE_ORDER.filter(r => groupByRole[r]?.length);

  const save = () => {
    if (!edit) return;
    const patch = { role: edit.role, dept: edit.dept };
    updateStaffMember(edit.id, patch);
    toast.success(`Роль обновлена: ${ROLE_LABELS[edit.role] || '—'}`);
    setEdit(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
        <div style={{ width:36, height:36, borderRadius:12, background:'#e8f4f6',
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <span style={{ fontSize:18 }}>👥</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-gray-800">Сотрудники</div>
          <div className="text-xs text-gray-500">Всего: {staff?.length || 0} · Изменения сохраняются в Google Sheets</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по имени, @username, роли…"
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 bg-white"
          style={{ '--tw-ring-color': BRAND }}
        />
      </div>

      {/* List grouped by role */}
      {orderedRoles.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">Никого не найдено</div>
      ) : orderedRoles.map(roleKey => {
        const list = groupByRole[roleKey];
        const label = roleKey === '__none' ? 'Без роли (требует назначения)' : ROLE_LABELS[roleKey] || roleKey;
        return (
          <div key={roleKey} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color:DARK }}>{label}</span>
              <span className="text-xs font-bold text-gray-400">{list.length}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {list.map(s => {
                const badge = ROLE_BADGE[s.role || ''] || ROLE_BADGE[''];
                return (
                  <button key={s.id || s.tg_id || s.tg}
                    onClick={() => setEdit({ ...s })}
                    className="w-full px-5 py-3 hover:bg-gray-50 flex items-center gap-3 text-left transition-colors">
                    <Avatar user={s} size={36} radius={10} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{s.name || '—'}</div>
                      <div className="text-xs text-gray-400 truncate">
                        {s.tg || '—'}
                        {s.tg_id ? ` · ID ${s.tg_id}` : ''}
                        {s.dept ? ` · ${s.dept}` : ''}
                      </div>
                    </div>
                    <span style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:20,
                      background:badge.bg, color:badge.color, whiteSpace:'nowrap' }}>
                      {ROLE_LABELS[s.role] || 'Не назначена'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="h-16 lg:hidden" />

      {/* Edit modal */}
      <AnimatePresence>
        {edit && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ background:'rgba(0,0,0,0.5)' }} onClick={() => setEdit(null)}>
            <motion.div initial={{ y:40, opacity:0 }} animate={{ y:0, opacity:1 }} exit={{ y:40, opacity:0 }}
              transition={{ type:'spring', stiffness:380, damping:38 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={e => e.stopPropagation()}>

              <div className="p-5 border-b border-gray-100 flex items-center gap-3">
                <Avatar user={edit} size={42} radius={12} />
                <div className="flex-1 min-w-0">
                  <div className="text-base font-bold text-gray-900 truncate">{edit.name || '—'}</div>
                  <div className="text-xs text-gray-500 truncate">{edit.tg || '—'}{edit.tg_id ? ` · ID ${edit.tg_id}` : ''}</div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Роль</div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(ROLE_LABELS).map(([key, label]) => {
                      const active = edit.role === key;
                      const badge  = ROLE_BADGE[key] || ROLE_BADGE[''];
                      return (
                        <button key={key} onClick={() => setEdit(p => ({ ...p, role: key }))}
                          className="px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all"
                          style={{
                            background: active ? badge.bg : '#f8fafc',
                            color:      active ? badge.color : '#64748b',
                            border:     active ? `2px solid ${badge.color}33` : '2px solid transparent',
                          }}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Подразделение</div>
                  <input
                    value={edit.dept || ''}
                    onChange={e => setEdit(p => ({ ...p, dept: e.target.value }))}
                    list="dept-presets"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2"
                    style={{ '--tw-ring-color': BRAND }}
                    placeholder="Например, Отдел продаж"
                  />
                  <datalist id="dept-presets">
                    {DEPT_PRESETS.map(d => <option key={d} value={d} />)}
                  </datalist>
                </div>
              </div>

              <div className="p-5 border-t border-gray-100 flex gap-3">
                <button onClick={() => setEdit(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">
                  Отмена
                </button>
                <button onClick={save}
                  className="flex-1 py-2.5 text-white rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ background:BRAND }}>
                  Сохранить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
