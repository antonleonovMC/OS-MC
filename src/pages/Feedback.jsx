import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

// ── Replace with your deployed Google Apps Script URL ──────────────────────
const FEEDBACK_SCRIPT_URL = 'YOUR_GOOGLE_SCRIPT_URL_HERE';

const BRAND = '#28798d';
const DARK  = '#1a3a42';

const TYPES = [
  { id:'bug',        emoji:'🐛', label:'Ошибка',      desc:'Что-то не работает',     color:'#ef4444', bg:'#fef2f2', border:'#fecaca' },
  { id:'suggestion', emoji:'💡', label:'Улучшение',   desc:'Идея или предложение',   color:'#f59e0b', bg:'#fffbeb', border:'#fde68a' },
  { id:'praise',     emoji:'⭐', label:'Похвала',     desc:'Что понравилось',        color:'#10b981', bg:'#ecfdf5', border:'#a7f3d0' },
  { id:'question',   emoji:'❓', label:'Вопрос',      desc:'Непонятный момент',      color:'#6366f1', bg:'#eef2ff', border:'#c7d2fe' },
];

const SECTIONS = [
  'Общее приложение', 'Дашборд', 'Логистика', 'Заявки на закуп',
  'Кофе-заказы', 'Оплата', 'Задачи', 'Авторизация',
];

const PRIORITIES = [
  { id:'low',    label:'Низкий',   color:'#22c55e' },
  { id:'medium', label:'Средний',  color:'#f59e0b' },
  { id:'high',   label:'Высокий',  color:'#ef4444' },
];

// ── Animated checkmark SVG ─────────────────────────────────────────────────
function CheckmarkAnim() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
      <motion.circle
        cx="36" cy="36" r="34"
        stroke={BRAND} strokeWidth="3" fill="white"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
      <motion.path
        d="M20 37l11 11 21-22"
        stroke={BRAND} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.45, delay: 0.4, ease: 'easeOut' }}
      />
    </svg>
  );
}

// ── Confetti burst ─────────────────────────────────────────────────────────
function Confetti() {
  const pieces = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    angle: (i / 12) * 360,
    color: [BRAND, '#1a3a42', '#10b981', '#f59e0b', '#6366f1', '#ef4444'][i % 6],
    size: 6 + (i % 3) * 3,
  }));
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {pieces.map(p => {
        const rad = (p.angle * Math.PI) / 180;
        const tx  = Math.cos(rad) * 80;
        const ty  = Math.sin(rad) * 80;
        return (
          <motion.div key={p.id}
            style={{ position:'absolute', top:'50%', left:'50%',
              width: p.size, height: p.size, borderRadius: p.size / 3,
              background: p.color, marginLeft: -p.size/2, marginTop: -p.size/2 }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: tx, y: ty, opacity: 0, scale: 0 }}
            transition={{ duration: 0.9, delay: 0.35 + p.id * 0.02, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
}

export default function Feedback({ user }) {
  const [type,     setType]     = useState('suggestion');
  const [section,  setSection]  = useState('Общее приложение');
  const [priority, setPriority] = useState('medium');
  const [title,    setTitle]    = useState('');
  const [body,     setBody]     = useState('');
  const [contact,  setContact]  = useState(user?.tg || '');
  const [sending,  setSending]  = useState(false);
  const [done,     setDone]     = useState(false);

  const selectedType = TYPES.find(t => t.id === type);

  async function submit() {
    if (!title.trim()) { toast.error('Добавьте краткое описание'); return; }
    if (!body.trim())  { toast.error('Напишите подробнее'); return; }
    setSending(true);
    try {
      const payload = {
        date:     new Date().toLocaleString('ru-RU'),
        user:     user?.name || '—',
        role:     user?.role || '—',
        type:     selectedType?.label,
        section,
        priority,
        title:    title.trim(),
        body:     body.trim(),
        contact:  contact.trim(),
      };
      if (FEEDBACK_SCRIPT_URL !== 'YOUR_GOOGLE_SCRIPT_URL_HERE') {
        await fetch(FEEDBACK_SCRIPT_URL, {
          method: 'POST',
          mode:   'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      // simulate slight delay even in demo mode
      await new Promise(r => setTimeout(r, 600));
      setDone(true);
    } catch {
      toast.error('Ошибка отправки, попробуйте позже');
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setType('suggestion'); setSection('Общее приложение');
    setPriority('medium'); setTitle(''); setBody('');
    setDone(false);
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', paddingBottom: 40 }}>

      {/* Hero */}
      <motion.div initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.3 }}
        style={{ background:`linear-gradient(135deg,${DARK},${BRAND})`, borderRadius:20, padding:'20px 20px 18px',
          marginBottom:16, color:'white' }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', opacity:0.6, textTransform:'uppercase', marginBottom:6 }}>
          Обратная связь
        </div>
        <div style={{ fontSize:20, fontWeight:800, marginBottom:4 }}>Помогите нам стать лучше</div>
        <div style={{ fontSize:12, opacity:0.65 }}>
          Сообщайте об ошибках, предлагайте улучшения — мы читаем каждое сообщение
        </div>
      </motion.div>

      {/* ── Success screen ── */}
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div key="success"
            initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.9 }}
            transition={{ type:'spring', stiffness:360, damping:30 }}
            style={{ background:'white', borderRadius:20, border:`1px solid #e8f4f6`,
              padding:'48px 24px', textAlign:'center', position:'relative', overflow:'hidden' }}>
            <Confetti />
            <div style={{ display:'flex', justifyContent:'center', marginBottom:20 }}>
              <CheckmarkAnim />
            </div>
            <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.6 }}>
              <div style={{ fontSize:18, fontWeight:800, color:DARK, marginBottom:8 }}>Спасибо за отзыв!</div>
              <div style={{ fontSize:13, color:'#64748b', marginBottom:28, lineHeight:1.5 }}>
                Ваше сообщение отправлено.<br/>Мы обязательно его рассмотрим.
              </div>
              <button onClick={reset}
                style={{ padding:'10px 28px', borderRadius:12, background:BRAND, color:'white',
                  fontSize:13, fontWeight:700, border:'none', cursor:'pointer' }}>
                Отправить ещё
              </button>
            </motion.div>
          </motion.div>

        ) : (
          <motion.div key="form" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>

            {/* Type selector */}
            <div style={{ background:'white', borderRadius:16, border:'1px solid #e8f4f6', padding:'14px 14px 10px', marginBottom:10 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase',
                letterSpacing:'0.08em', marginBottom:10 }}>Тип обращения</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                {TYPES.map(t => (
                  <motion.button key={t.id} whileTap={{ scale:0.97 }}
                    onClick={() => setType(t.id)}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderRadius:12,
                      background: type===t.id ? t.bg : '#f8fafc',
                      border: `1.5px solid ${type===t.id ? t.border : 'transparent'}`,
                      cursor:'pointer', textAlign:'left', transition:'all .15s' }}>
                    <span style={{ fontSize:18 }}>{t.emoji}</span>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color: type===t.id ? t.color : '#374151' }}>{t.label}</div>
                      <div style={{ fontSize:10, color:'#94a3b8', marginTop:1 }}>{t.desc}</div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Section + Priority row */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              {/* Section */}
              <div style={{ background:'white', borderRadius:16, border:'1px solid #e8f4f6', padding:'12px 14px' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase',
                  letterSpacing:'0.08em', marginBottom:8 }}>Раздел</div>
                <select value={section} onChange={e => setSection(e.target.value)}
                  style={{ width:'100%', fontSize:12, fontWeight:500, color:DARK,
                    background:'transparent', border:'none', outline:'none', cursor:'pointer' }}>
                  {SECTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              {/* Priority */}
              <div style={{ background:'white', borderRadius:16, border:'1px solid #e8f4f6', padding:'12px 14px' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase',
                  letterSpacing:'0.08em', marginBottom:8 }}>Важность</div>
                <div style={{ display:'flex', gap:4 }}>
                  {PRIORITIES.map(p => (
                    <button key={p.id} onClick={() => setPriority(p.id)}
                      style={{ flex:1, padding:'4px 0', borderRadius:8, fontSize:10, fontWeight:700,
                        border:'none', cursor:'pointer', transition:'all .15s',
                        background: priority===p.id ? p.color : '#f1f5f9',
                        color: priority===p.id ? 'white' : '#94a3b8' }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Title */}
            <div style={{ background:'white', borderRadius:16, border:'1px solid #e8f4f6', padding:'12px 14px', marginBottom:10 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase',
                letterSpacing:'0.08em', marginBottom:8 }}>Кратко</div>
              <input
                value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Например: кнопка не нажимается в разделе Задачи"
                style={{ width:'100%', fontSize:13, color:DARK, background:'transparent',
                  border:'none', outline:'none', fontFamily:'inherit' }}
              />
            </div>

            {/* Body */}
            <div style={{ background:'white', borderRadius:16, border:'1px solid #e8f4f6', padding:'12px 14px', marginBottom:10 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase',
                letterSpacing:'0.08em', marginBottom:8 }}>Подробнее</div>
              <textarea
                value={body} onChange={e => setBody(e.target.value)} rows={4}
                placeholder="Опишите подробно: что делали, что ожидали, что произошло. Чем подробнее — тем быстрее исправим."
                style={{ width:'100%', fontSize:13, color:DARK, background:'transparent',
                  border:'none', outline:'none', resize:'none', fontFamily:'inherit', lineHeight:1.5 }}
              />
              <div style={{ textAlign:'right', fontSize:10, color: body.length > 800 ? '#ef4444' : '#cbd5e1' }}>
                {body.length}/1000
              </div>
            </div>

            {/* Contact */}
            <div style={{ background:'white', borderRadius:16, border:'1px solid #e8f4f6', padding:'12px 14px', marginBottom:16 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase',
                letterSpacing:'0.08em', marginBottom:8 }}>Контакт для ответа <span style={{ fontWeight:400, textTransform:'none', letterSpacing:0 }}>(необязательно)</span></div>
              <input
                value={contact} onChange={e => setContact(e.target.value)}
                placeholder="@telegram или почта"
                style={{ width:'100%', fontSize:13, color:DARK, background:'transparent',
                  border:'none', outline:'none', fontFamily:'inherit' }}
              />
            </div>

            {/* Submit */}
            <motion.button
              onClick={submit} disabled={sending}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              style={{ width:'100%', padding:'14px', borderRadius:16,
                background: sending ? '#94a3b8' : BRAND, color:'white',
                fontSize:14, fontWeight:800, border:'none', cursor: sending ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              {sending ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }} transition={{ duration:0.8, repeat:Infinity, ease:'linear' }}
                    style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)',
                      borderTopColor:'white', borderRadius:'50%' }} />
                  Отправляем…
                </>
              ) : (
                <>Отправить отзыв →</>
              )}
            </motion.button>

            {/* Author line */}
            <div style={{ textAlign:'center', marginTop:12, fontSize:11, color:'#cbd5e1' }}>
              Отправляется от имени <span style={{ color:BRAND, fontWeight:600 }}>{user?.name}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
