import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { INIT_TASKS, USERS, ROLE_LABELS } from '../data/constants';

const BRAND = '#28798d';

const PRIORITY_STYLE = {
  Critical: { bg:'#fff1f2', color:'#e11d48', dot:'#f43f5e' },
  High:     { bg:'#fff7ed', color:'#c2410c', dot:'#f97316' },
  Medium:   { bg:'#fffbeb', color:'#b45309', dot:'#f59e0b' },
  Low:      { bg:'#f0fdf4', color:'#15803d', dot:'#22c55e' },
};

const COL_STYLE = {
  todo:        { bg:'#f8fafc', label:'К делу',   icon:'○', accent:'#94a3b8' },
  in_progress: { bg:'#fffbeb', label:'В работе', icon:'⚡', accent:'#f59e0b' },
  review:      { bg:'#f5f3ff', label:'Проверка', icon:'👁', accent:'#8b5cf6' },
  done:        { bg:'#f0fdf4', label:'Готово',   icon:'✓', accent:'#22c55e' },
};

const PRIORITIES = ['Critical','High','Medium','Low'];
const EMPTY_FORM = { title:'', priority:'Medium', assignee:'manager', due:'', subtasks:[] };

function PBadge({ p }) {
  const s = PRIORITY_STYLE[p] || PRIORITY_STYLE.Low;
  return (
    <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20, background:s.bg, color:s.color,
      display:'inline-flex', alignItems:'center', gap:4, whiteSpace:'nowrap' }}>
      <span style={{ width:4, height:4, borderRadius:'50%', background:s.dot, display:'inline-block' }}/>
      {p}
    </span>
  );
}

function FieldLabel({ children }) {
  return <div style={{ fontSize:11, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>{children}</div>;
}

export default function Tasks({ user }) {
  const [tasks,     setTasks]     = useState(INIT_TASKS);
  const [modal,     setModal]     = useState(null);   // task detail modal
  const [createCol, setCreateCol] = useState(null);   // create modal, pre-set column
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [comment,   setComment]   = useState('');
  const [tag,       setTag]       = useState(false);
  const [activeCol, setActiveCol] = useState('todo');
  const fileRef = useRef();

  const other = USERS.find(u => u.role === (user.role === 'director' ? 'manager' : 'director'));
  const cols  = Object.entries(COL_STYLE).map(([id, s]) => ({ id, ...s }));

  // ── Task mutations ───────────────────────────────────────────────────────────
  const addComment = () => {
    if (!comment.trim() || !modal) return;
    const now   = new Date().toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' });
    const entry = `${user.name.split(' ')[0]}${tag&&other?' @'+other.name.split(' ')[0]:''}: ${comment}|${now}|unread`;
    const upd   = tasks.map(t => t.id === modal.id ? { ...t, comments:[...t.comments, entry] } : t);
    setTasks(upd); setModal(upd.find(t => t.id === modal.id)); setComment(''); setTag(false);
  };

  const markRead = (taskId, ci) => {
    const now = new Date().toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' });
    const upd = tasks.map(t => t.id !== taskId ? t : {
      ...t, comments: t.comments.map((c,i) => i===ci ? c.replace('|unread',`|✓✓ ${now}`) : c)
    });
    setTasks(upd); setModal(upd.find(t => t.id === modal.id));
  };

  const moveTask    = (id, status) => { const u=tasks.map(t=>t.id===id?{...t,status}:t); setTasks(u); setModal(u.find(t=>t.id===id)); };
  const toggleSub   = (id, si)    => { const u=tasks.map(t=>t.id===id?{...t,subtasks:t.subtasks.map((s,i)=>i===si?{...s,done:!s.done}:s)}:t); setTasks(u); setModal(u.find(t=>t.id===id)); };
  const removeSub   = (id, si)    => { const u=tasks.map(t=>t.id===id?{...t,subtasks:t.subtasks.filter((_,i)=>i!==si)}:t); setTasks(u); setModal(u.find(t=>t.id===id)); };
  const addSub      = (id)        => { const u=tasks.map(t=>t.id===id?{...t,subtasks:[...t.subtasks,{t:'',done:false}]}:t); setTasks(u); setModal(u.find(t=>t.id===id)); };
  const editSubText = (id, si, v) => { const u=tasks.map(t=>t.id===id?{...t,subtasks:t.subtasks.map((s,i)=>i===si?{...s,t:v}:s)}:t); setTasks(u); setModal(u.find(t=>t.id===id)); };
  const changeDate  = (id, due)   => { const u=tasks.map(t=>t.id===id?{...t,due}:t); setTasks(u); setModal(u.find(t=>t.id===id)); };
  const changePri   = (id, priority) => { const u=tasks.map(t=>t.id===id?{...t,priority}:t); setTasks(u); setModal(u.find(t=>t.id===id)); };

  const handleFile = e => {
    const f = e.target.files[0]; if (!f||!modal) return;
    const now = new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
    const entry = `${user.name.split(' ')[0]}: 📎 ${f.name}|${now}|✓✓ прикреплён`;
    const upd = tasks.map(t => t.id===modal.id?{...t,comments:[...t.comments,entry]}:t);
    setTasks(upd); setModal(upd.find(t=>t.id===modal.id));
  };

  const createTask = () => {
    if (!form.title.trim()) return;
    const newTask = {
      id: Date.now(), title: form.title.trim(), priority: form.priority,
      assignee: form.assignee, status: createCol,
      due: form.due || '—',
      subtasks: form.subtasks.filter(s => s.t.trim()).map(s => ({ t:s.t.trim(), done:false })),
      comments: [],
    };
    setTasks(p => [...p, newTask]);
    setCreateCol(null); setForm(EMPTY_FORM);
    toast.success('Задача создана');
  };

  // ── Shared input style ───────────────────────────────────────────────────────
  const inp = { width:'100%', padding:'8px 12px', border:'1px solid #e2e8f0', borderRadius:10, fontSize:13, outline:'none', boxSizing:'border-box', background:'white' };

  // ── Create modal ─────────────────────────────────────────────────────────────
  const CreateModal = () => (
    <AnimatePresence>
      {createCol && (
        <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
          style={{background:'rgba(0,0,0,0.5)'}} onClick={() => setCreateCol(null)}>
          <motion.div initial={{y:40,opacity:0}} animate={{y:0,opacity:1}} exit={{y:40,opacity:0}}
            transition={{type:'spring',stiffness:380,damping:38}}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:15, fontWeight:700, color:'#1a3a42' }}>
                Новая задача · {COL_STYLE[createCol]?.label}
              </span>
              <button onClick={() => setCreateCol(null)} style={{ color:'#94a3b8', fontSize:18, background:'none', border:'none', cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <FieldLabel>Название</FieldLabel>
                <textarea value={form.title} onChange={e => setForm({...form, title:e.target.value})}
                  placeholder="Описание задачи…" rows={2}
                  style={{ ...inp, resize:'none' }}/>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <FieldLabel>Приоритет</FieldLabel>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {PRIORITIES.map(p => {
                      const s = PRIORITY_STYLE[p];
                      return (
                        <button key={p} onClick={() => setForm({...form, priority:p})}
                          style={{ padding:'6px 10px', borderRadius:8, fontSize:11, fontWeight:600, border:'none', cursor:'pointer', textAlign:'left',
                            background: form.priority===p ? s.bg : '#f8fafc',
                            color:      form.priority===p ? s.color : '#94a3b8',
                            outline:    form.priority===p ? `1.5px solid ${s.dot}` : '1.5px solid transparent' }}>
                          <span style={{ width:5, height:5, borderRadius:'50%', background:s.dot, display:'inline-block', marginRight:5, verticalAlign:'middle' }}/>
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <div>
                    <FieldLabel>Срок</FieldLabel>
                    <input type="date" value={form.due} onChange={e => setForm({...form, due:e.target.value})}
                      style={inp}/>
                  </div>
                  <div>
                    <FieldLabel>Исполнитель</FieldLabel>
                    <select value={form.assignee} onChange={e => setForm({...form, assignee:e.target.value})}
                      style={inp}>
                      {USERS.map(u => <option key={u.role} value={u.role}>{u.name.split(' ')[0]}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <FieldLabel>Чеклист</FieldLabel>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {form.subtasks.map((s, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ width:14, height:14, borderRadius:4, border:'1.5px solid #e2e8f0', flexShrink:0 }}/>
                      <input value={s.t} onChange={e => setForm({...form, subtasks: form.subtasks.map((x,j)=>j===i?{...x,t:e.target.value}:x)})}
                        placeholder={`Пункт ${i+1}…`} style={{ ...inp, flex:1 }}/>
                      <button onClick={() => setForm({...form, subtasks: form.subtasks.filter((_,j)=>j!==i)})}
                        style={{ width:24, height:24, borderRadius:6, background:'#fff1f2', border:'none', cursor:'pointer', color:'#e11d48', fontSize:14, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setForm({...form, subtasks:[...form.subtasks,{t:'',done:false}]})}
                  style={{ marginTop:6, fontSize:12, color:BRAND, fontWeight:500, background:'none', border:'none', cursor:'pointer', padding:0 }}>
                  + Добавить пункт
                </button>
              </div>
            </div>
            <div style={{ padding:'12px 20px 18px', borderTop:'1px solid #f1f5f9', display:'flex', gap:10 }}>
              <button onClick={() => setCreateCol(null)}
                style={{ flex:1, padding:'11px', borderRadius:12, background:'#f1f5f9', color:'#64748b', fontSize:13, fontWeight:500, border:'none', cursor:'pointer' }}>
                Отмена
              </button>
              <button onClick={createTask}
                style={{ flex:1, padding:'11px', borderRadius:12, background: form.title.trim() ? BRAND : '#94a3b8', color:'white', fontSize:13, fontWeight:600, border:'none', cursor: form.title.trim() ? 'pointer' : 'default' }}>
                Создать задачу
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ── Task detail modal ────────────────────────────────────────────────────────
  const TaskModal = () => {
    if (!modal) return null;
    return (
      <AnimatePresence>
        <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
          style={{background:'rgba(0,0,0,0.5)'}} onClick={() => setModal(null)}>
          <motion.div initial={{y:40,opacity:0}} animate={{y:0,opacity:1}} exit={{y:40,opacity:0}}
            transition={{type:'spring',stiffness:380,damping:38}}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid #f1f5f9' }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
                <div style={{ flex:1 }}>
                  <div style={{ marginBottom:6 }}><PBadge p={modal.priority} /></div>
                  <div style={{ fontSize:15, fontWeight:700, color:'#1a3a42', lineHeight:'22px' }}>{modal.title}</div>
                  <div style={{ display:'flex', gap:10, marginTop:6, flexWrap:'wrap' }}>
                    <span style={{ fontSize:11, color:'#94a3b8' }}>👤 {ROLE_LABELS[modal.assignee]||modal.assignee}</span>
                  </div>
                </div>
                <button onClick={() => setModal(null)}
                  style={{ color:'#94a3b8', fontSize:18, background:'none', border:'none', cursor:'pointer', flexShrink:0 }}>✕</button>
              </div>
            </div>

            {/* Date + Priority edit */}
            <div style={{ padding:'12px 20px', borderBottom:'1px solid #f1f5f9', display:'flex', gap:12, flexWrap:'wrap' }}>
              <div style={{ flex:1, minWidth:140 }}>
                <FieldLabel>Срок выполнения</FieldLabel>
                <input type="date"
                  value={modal.due && modal.due !== '—' ? (modal.due.includes('.') ? modal.due.split('.').reverse().join('-') : modal.due) : ''}
                  onChange={e => {
                    const d = e.target.value;
                    const fmt = d ? new Date(d).toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric'}) : '—';
                    changeDate(modal.id, fmt);
                  }}
                  style={{ ...inp, fontSize:12 }}/>
              </div>
              <div style={{ flex:1, minWidth:140 }}>
                <FieldLabel>Приоритет</FieldLabel>
                <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                  {PRIORITIES.map(p => {
                    const s = PRIORITY_STYLE[p];
                    return (
                      <button key={p} onClick={() => changePri(modal.id, p)}
                        style={{ padding:'4px 10px', borderRadius:20, fontSize:10, fontWeight:600, border:'none', cursor:'pointer',
                          background: modal.priority===p ? s.bg : '#f8fafc',
                          color:      modal.priority===p ? s.color : '#94a3b8',
                          outline:    modal.priority===p ? `1.5px solid ${s.dot}` : '1.5px solid transparent' }}>
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Move */}
            <div style={{ padding:'12px 20px', borderBottom:'1px solid #f1f5f9' }}>
              <FieldLabel>Переместить</FieldLabel>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {cols.map(c => (
                  <button key={c.id} onClick={() => moveTask(modal.id, c.id)}
                    style={{ padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:500, border:'none', cursor:'pointer', transition:'all .15s',
                      background: modal.status===c.id ? BRAND : '#f0f9fa',
                      color:      modal.status===c.id ? 'white' : BRAND }}>
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Checklist */}
            <div style={{ padding:'12px 20px', borderBottom:'1px solid #f1f5f9' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <FieldLabel>Чеклист {modal.subtasks.length > 0 && `(${modal.subtasks.filter(s=>s.done).length}/${modal.subtasks.length})`}</FieldLabel>
                <button onClick={() => addSub(modal.id)}
                  style={{ fontSize:11, color:BRAND, fontWeight:500, background:'none', border:'none', cursor:'pointer', padding:0, marginBottom:6 }}>
                  + Добавить пункт
                </button>
              </div>
              {modal.subtasks.length > 0 && (
                <div style={{ height:3, background:'#f1f5f9', borderRadius:99, overflow:'hidden', marginBottom:10 }}>
                  <motion.div animate={{ width:`${modal.subtasks.length ? modal.subtasks.filter(s=>s.done).length/modal.subtasks.length*100 : 0}%` }}
                    transition={{duration:.4}} style={{ height:'100%', background:BRAND, borderRadius:99 }} />
                </div>
              )}
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {modal.subtasks.map((st, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <input type="checkbox" checked={st.done} onChange={() => toggleSub(modal.id, i)}
                      style={{ width:15, height:15, accentColor:BRAND, flexShrink:0 }}/>
                    <input value={st.t}
                      onChange={e => editSubText(modal.id, i, e.target.value)}
                      style={{ flex:1, fontSize:13, color: st.done ? '#94a3b8' : '#374151',
                        textDecoration: st.done ? 'line-through' : 'none',
                        background:'none', border:'none', outline:'none', padding:0 }}/>
                    <button onClick={() => removeSub(modal.id, i)}
                      style={{ width:20, height:20, borderRadius:6, background:'#fff1f2', border:'none', cursor:'pointer',
                        color:'#e11d48', fontSize:13, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                  </div>
                ))}
                {modal.subtasks.length === 0 && (
                  <div style={{ fontSize:12, color:'#cbd5e1', textAlign:'center', padding:'8px 0' }}>Нет пунктов</div>
                )}
              </div>
            </div>

            {/* Comments */}
            <div style={{ padding:'12px 20px' }}>
              <FieldLabel>Обсуждение</FieldLabel>
              <div style={{ maxHeight:180, overflowY:'auto', display:'flex', flexDirection:'column', gap:6, marginBottom:10 }}>
                {modal.comments.length === 0 && (
                  <div style={{ textAlign:'center', padding:'16px 0', color:'#cbd5e1', fontSize:12 }}>Нет комментариев</div>
                )}
                {modal.comments.map((c, i) => {
                  const [text, time, read] = c.split('|');
                  const mine = text.startsWith(user.name.split(' ')[0]);
                  return (
                    <div key={i} style={{ display:'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth:'82%', padding:'8px 12px', borderRadius:12,
                        background: mine ? BRAND : '#f8fafc', color: mine ? 'white' : '#374151' }}>
                        <div style={{ fontSize:13 }}>{text}</div>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginTop:3 }}>
                          <span style={{ fontSize:10, opacity:.65 }}>{time}</span>
                          <span style={{ fontSize:10 }}>
                            {read?.startsWith('✓✓') ? <span style={{ opacity:.65 }}>{read}</span> : (
                              <button onClick={() => markRead(modal.id, i)}
                                style={{ background:'none', border:'none', cursor:'pointer', fontSize:10, color: mine ? 'rgba(255,255,255,0.7)' : '#94a3b8' }}>
                                прочитать
                              </button>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <div style={{ flex:1, position:'relative' }}>
                  <input value={comment} onChange={e => setComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addComment()}
                    placeholder="Написать…"
                    style={{ ...inp, paddingRight:36 }}/>
                  <button onClick={() => setTag(t => !t)}
                    style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                      background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:700,
                      color: tag ? BRAND : '#94a3b8' }}>@</button>
                </div>
                <button onClick={addComment}
                  style={{ padding:'8px 14px', borderRadius:10, background:BRAND, color:'white', border:'none', cursor:'pointer' }}>↩</button>
                <button onClick={() => fileRef.current?.click()}
                  style={{ padding:'8px 12px', borderRadius:10, background:'#f8fafc', color:'#64748b', border:'none', cursor:'pointer' }}>📎</button>
                <input ref={fileRef} type="file" style={{ display:'none' }} onChange={handleFile}/>
              </div>
              {tag && other && <div style={{ fontSize:11, color:BRAND, marginTop:4 }}>Тег: @{other.name.split(' ')[0]}</div>}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  // ── Task card ────────────────────────────────────────────────────────────────
  const TaskCard = ({ task, compact = false }) => {
    const ps       = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.Low;
    const unread   = task.comments.filter(c => c.includes('|unread')).length;
    const subDone  = task.subtasks.filter(s => s.done).length;
    const subTotal = task.subtasks.length;
    const pct      = subTotal ? Math.round(subDone / subTotal * 100) : null;
    return (
      <motion.div whileHover={{ boxShadow:'0 4px 20px rgba(40,121,141,0.14)' }}
        onClick={() => setModal(task)}
        style={{ background:'white', borderRadius:14, padding: compact ? '12px 14px' : '14px 16px',
          borderLeft:`3px solid ${ps.dot}`, border:`1px solid #e8f4f6`, borderLeftWidth:3, borderLeftColor:ps.dot,
          boxShadow:'0 1px 6px rgba(40,121,141,0.05)', cursor:'pointer', transition:'box-shadow .15s' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:8 }}>
          <div style={{ fontSize: compact ? 12 : 13, fontWeight:600, color:'#1a3a42', lineHeight:'18px', flex:1 }}>{task.title}</div>
          <PBadge p={task.priority} />
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:11, color:'#94a3b8' }}>
          {task.due && task.due !== '—' && <span>📅 {task.due}</span>}
          {unread > 0 && (
            <span style={{ marginLeft:'auto', fontSize:10, fontWeight:600, color:'#f59e0b',
              background:'#fffbeb', padding:'1px 6px', borderRadius:20 }}>💬 {unread}</span>
          )}
        </div>
        {pct !== null && (
          <div style={{ marginTop:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#94a3b8', marginBottom:3 }}>
              <span>Прогресс</span><span>{subDone}/{subTotal}</span>
            </div>
            <div style={{ height:3, background:'#f1f5f9', borderRadius:99, overflow:'hidden' }}>
              <motion.div animate={{ width:`${pct}%` }} transition={{ duration:.5 }}
                style={{ height:'100%', background:BRAND, borderRadius:99 }} />
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  // ── FAB ──────────────────────────────────────────────────────────────────────
  const FAB = ({ defaultCol }) => (
    <motion.button
      initial={{ opacity:0, scale:0.8, y:10 }} animate={{ opacity:1, scale:1, y:0 }}
      onClick={() => { setCreateCol(defaultCol); setForm(EMPTY_FORM); }}
      className="fixed bottom-24 lg:bottom-8 inset-x-0 lg:inset-x-auto lg:left-52 lg:right-0 mx-auto w-fit z-40 flex items-center gap-2 px-5 py-3 text-white text-sm font-semibold rounded-full whitespace-nowrap"
      style={{ background:'rgba(40,121,141,0.82)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)',
        border:'1px solid rgba(255,255,255,0.25)', boxShadow:'0 8px 32px rgba(40,121,141,0.35)' }}
      whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}>
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M10 4v12M4 10h12"/></svg>
      Добавить задачу
    </motion.button>
  );

  // ── Mobile ───────────────────────────────────────────────────────────────────
  const MobileView = () => (
    <div>
      <div style={{ display:'flex', background:'white', borderRadius:14, padding:4, gap:4, border:'1px solid #e8f4f6', marginBottom:12 }}>
        {cols.map(col => {
          const cnt    = tasks.filter(t => t.status === col.id).length;
          const active = activeCol === col.id;
          return (
            <button key={col.id} onClick={() => setActiveCol(col.id)}
              style={{ flex:1, padding:'7px 4px', borderRadius:10, border:'none', cursor:'pointer', transition:'all .15s',
                background: active ? BRAND : 'transparent', color: active ? 'white' : '#94a3b8' }}>
              <div style={{ fontSize:13, lineHeight:1 }}>{col.icon}</div>
              <div style={{ fontSize:9, fontWeight:600, marginTop:2 }}>{col.label}</div>
              <div style={{ fontSize:12, fontWeight:700, marginTop:1 }}>{cnt}</div>
            </button>
          );
        })}
      </div>
      {cols.filter(c => c.id === activeCol).map(col => {
        const colTasks = tasks.filter(t => t.status === col.id);
        return (
          <div key={col.id} style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {colTasks.map(task => <TaskCard key={task.id} task={task} />)}
            {colTasks.length === 0 && (
              <div style={{ textAlign:'center', padding:'28px 0', color:'#cbd5e1', fontSize:13 }}>Нет задач</div>
            )}
          </div>
        );
      })}
      <FAB defaultCol={activeCol} />
    </div>
  );

  // ── Desktop ──────────────────────────────────────────────────────────────────
  const DesktopView = () => (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
      {cols.map(col => {
        const colTasks = tasks.filter(t => t.status === col.id);
        return (
          <div key={col.id} style={{ background:COL_STYLE[col.id].bg, borderRadius:16, padding:12, border:'1px solid #e8f4f6' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, padding:'0 2px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:13 }}>{col.icon}</span>
                <span style={{ fontSize:11, fontWeight:700, color:'#1a3a42', textTransform:'uppercase', letterSpacing:'0.06em' }}>{col.label}</span>
              </div>
              <span style={{ width:20, height:20, borderRadius:'50%', background:COL_STYLE[col.id].accent+'22', color:COL_STYLE[col.id].accent,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700 }}>
                {colTasks.length}
              </span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {colTasks.map(task => <TaskCard key={task.id} task={task} compact />)}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      <CreateModal />
      <TaskModal />
      <div className="lg:hidden"><MobileView /></div>
      <div className="hidden lg:block">
        <DesktopView />
        <FAB defaultCol="todo" />
      </div>
    </div>
  );
}
