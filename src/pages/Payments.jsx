import { useState, useRef } from 'react';
import DatePicker from '../components/DatePicker';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useData } from '../context/DataContext';
import { fmtDate } from '../lib/fmt';

const BRAND = '#28798d';
const DARK  = '#1a3a42';

const DEPTS = [
  'УК', 'ТК Астана', 'ТК Алматы', 'Обжарка', 'Маркетинг', 'Корпоративная сеть кофеен',
];

const LEGAL_ENTITIES = [
  'ТОО "Мастер Кофе"',
  'ИП Master Coffee Trade',
  'ИП Master Coffee Roasters',
  'ТОО "Mastercoffee.kz"',
];

const SUPPLIER_MODES = [
  'ОУР (общеустановленный режим)',
  'Упрощённый режим',
  'Самозанятый',
  'Командировочный',
  'Подходящий режим',
];

const CATEGORIES = [
  'Аренда помещения и ком.услуги',
  'Дорожные расходы',
  'Закуп товаров',
  'Услуги по доставке товаров',
  'Бонусы (премия)',
  'Интернет и камеры',
  'Канцтовары',
  'Командировочные',
  'Консалтинговые услуги',
  'Маркетинговые расходы',
  'Обучение',
  'Программное обеспечение (тех.поддержка)',
  'Ремонт и содержание',
  'Хозтовары',
  'Штрафы',
  'Развитие корпоративной культуры',
  'Отработки продуктов (тест)',
  'Заработная плата (ФОТ)',
  'Другое',
];

const CUR_SIGN = { KZT: '₸', USD: '$', EUR: '€', RUB: '₽' };

function isOverdue(req) {
  if (!req.due_date || ['Оплачена','Закрыта','Отклонена'].includes(req.status)) return false;
  return new Date(req.due_date) < new Date(new Date().toDateString());
}

const STATUS_STYLE = {
  'Новая':        { bg:'#eff6ff', color:'#2563eb', dot:'#3b82f6' },
  'Подтверждена': { bg:'#ecfdf5', color:'#059669', dot:'#10b981' },
  'Отклонена':    { bg:'#fff1f2', color:'#e11d48', dot:'#f43f5e' },
  'Оплачена':     { bg:'#f0f9ff', color:'#0284c7', dot:'#38bdf8' },
  'Закрыта':      { bg:'#f8fafc', color:'#64748b', dot:'#94a3b8' },
};

const EMPTY_FORM = {
  // Шаг 1 — Заявитель
  email: '',
  dept: DEPTS[0],
  // Шаг 2 — Поставщик
  recipient: '',
  supplier_mode: SUPPLIER_MODES[0],
  supplier_contact_name: '',
  supplier_contact_role: 'Директор',
  supplier_contact_phone: '',
  // Шаг 3 — Платёж
  legal_entity: LEGAL_ENTITIES[0],
  amount: '',
  due_date: '',
  category: CATEGORIES[0],
  category_other: '',
  purpose: '',
  is_reimbursement: 'Нет',
  // Шаг 4 — Документы
  basis_file_url: '',
  basis_file_name: '',
  contract_url: '',
  comment: '',
};

const STEPS = ['Заявитель', 'Поставщик', 'Платёж', 'Документы', 'Итого'];

function FL({ children, required }) {
  return (
    <div style={{ fontSize:11, fontWeight:600, color:'#94a3b8', textTransform:'uppercase',
      letterSpacing:'0.06em', marginBottom:6 }}>
      {children}{required && <span style={{color:'#e11d48',marginLeft:2}}>*</span>}
    </div>
  );
}

function StatusPill({ s }) {
  const st = STATUS_STYLE[s] || STATUS_STYLE['Новая'];
  return (
    <span style={{ fontSize:11, fontWeight:500, padding:'3px 10px', borderRadius:20,
      background:st.bg, color:st.color, display:'inline-flex', alignItems:'center', gap:5, whiteSpace:'nowrap' }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:st.dot, flexShrink:0 }}/>
      {s}
    </span>
  );
}

const INP = {
  width:'100%', padding:'10px 12px', border:'1px solid #e2e8f0', borderRadius:10,
  fontSize:14, outline:'none', boxSizing:'border-box', background:'white',
};

async function uploadToGoogleDrive(file) {
  const url = import.meta.env.VITE_PAYMENTS_URL;
  if (!url) return null;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result.split(',')[1];
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'uploadFile',
            data: { name: file.name, mimeType: file.type, base64 },
          }),
        });
        const json = await res.json();
        if (json.ok && json.url) {
          resolve({ name: file.name, url: json.url });
        } else {
          // CORS заблокирован — сохраняем имя файла, URL появится в таблице
          resolve({ name: file.name, url: '' });
        }
      } catch {
        resolve({ name: file.name, url: '' });
      }
    };
    reader.readAsDataURL(file);
  });
}

export default function Payments({ user }) {
  const { paymentRequests, addPaymentRequest, updatePaymentRequest } = useData();

  const [tab,          setTab]          = useState('all');
  const [showForm,     setShowForm]     = useState(false);
  const [step,         setStep]         = useState(1);
  const [submitted,    setSubmitted]    = useState(false);
  const [selected,     setSelected]     = useState(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject,   setShowReject]   = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [uploading,    setUploading]    = useState(false);
  const fileRef = useRef();

  const closeForm = () => { setShowForm(false); setStep(1); setForm(EMPTY_FORM); };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const canNext = () => {
    if (step === 1) return !!form.email.trim();
    if (step === 2) return !!form.recipient.trim();
    if (step === 3) return !!form.amount && !!form.due_date && !!form.purpose.trim();
    return true;
  };

  const isDirector = ['admin', 'director_tk'].includes(user?.role);
  const isAdmin    = user?.role === 'admin';
  const allRequests = paymentRequests || [];

  // Не-админ видит только свои заявки
  const myKey   = user?.name || user?.tg || '';
  const requests = isAdmin
    ? allRequests
    : allRequests.filter(r => r.requester === myKey || String(r.tg_id) === String(user?.tg_id));

  const filtered = requests.filter(r => {
    if (tab === 'new')       return r.status === 'Новая';
    if (tab === 'confirmed') return r.status === 'Подтверждена';
    if (tab === 'paid')      return ['Оплачена','Закрыта'].includes(r.status);
    if (tab === 'rejected')  return r.status === 'Отклонена';
    return true;
  });

  const totalNew       = requests.filter(r => r.status === 'Новая').length;
  const totalConfirmed = requests.filter(r => r.status === 'Подтверждена').length;
  const totalSum       = requests
    .filter(r => !['Отклонена','Закрыта'].includes(r.status))
    .reduce((a, r) => a + Number(r.amount || 0), 0);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const result = await uploadToGoogleDrive(file);
    setUploading(false);
    if (result) {
      set('basis_file_name', result.name);
      set('basis_file_url', result.url);
      toast.success(`Файл "${file.name}" загружен`);
    } else {
      toast.error('Ошибка загрузки файла');
    }
  };

  const now = () => new Date().toLocaleDateString('ru-RU', {
    day:'numeric', month:'long', year:'numeric', timeZone:'Asia/Almaty',
  });

  // DD.MM.YYYY для Google Sheets
  const fmtSheetDate = (isoDate) => {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-');
    return `${d}.${m}.${y}`;
  };

  const submit = () => {
    if (!form.recipient || !form.amount || !form.due_date || !form.purpose) {
      toast.error('Заполните все обязательные поля');
      return;
    }
    const id = `PAY-${String(requests.length + 1).padStart(3,'0')}`;
    const ts = now();
    addPaymentRequest({
      id,
      requester:              user?.name || user?.tg || '—',
      email:                  form.email,
      dept:                   form.dept,
      // Поставщик
      recipient:              form.recipient,
      supplier_mode:          form.supplier_mode,
      supplier_contact_name:  form.supplier_contact_name,
      supplier_contact_role:  form.supplier_contact_role,
      supplier_contact_phone: form.supplier_contact_phone,
      // Платёж
      legal_entity:           form.legal_entity,
      amount:                 Number(form.amount),
      currency:               'KZT',
      category:               form.category === 'Другое' ? (form.category_other || 'Другое') : form.category,
      due_date:               form.due_date,
      purpose:                form.purpose,
      is_reimbursement:       form.is_reimbursement,
      // Документы
      basis_file_url:         form.basis_file_url,
      basis_file_name:        form.basis_file_name,
      contract_url:           form.contract_url,
      comment:                form.comment,
      // Мета
      status:               'Новая',
      created:              ts,
      reject_reason:        '',
      confirmed_by:         '',
      confirmed_at:         '',
      paid_by:              '',
      paid_at:              '',
      history:              [{ status:'Новая', by: user?.name || user?.tg || '—', at: ts }],
    });
    // Отправить в Google Sheets
    const paymentsUrl = import.meta.env.VITE_PAYMENTS_URL;
    if (paymentsUrl) {
      const payload = encodeURIComponent(JSON.stringify({
        ...form,
        requester: user?.name || user?.tg,
        dept:      form.dept,
        due_date:  fmtSheetDate(form.due_date),
        tg_id:     user?.tg_id || '',
        id,
      }));
      fetch(`${paymentsUrl}?action=addPayment&data=${payload}`)
        .catch(() => {});
    }
    closeForm();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2500);
  };

  const confirm = (req) => {
    const ts = now();
    const by = user?.name || user?.tg || '—';
    const patch = {
      status: 'Подтверждена', confirmed_by: by, confirmed_at: ts,
      history: [...(req.history || []), { status:'Подтверждена', by, at: ts }],
    };
    updatePaymentRequest(req.id, patch);
    if (selected?.id === req.id) setSelected(p => ({ ...p, ...patch }));
    toast.success('Заявка подтверждена ✓');
  };

  const openReject = (req) => { setRejectTarget(req); setRejectReason(''); setShowReject(true); };

  const doReject = () => {
    if (!rejectReason.trim()) { toast.error('Укажите причину'); return; }
    const ts = now();
    const by = user?.name || user?.tg || '—';
    const patch = {
      status: 'Отклонена', reject_reason: rejectReason,
      history: [...(rejectTarget.history || []), { status:'Отклонена', by, at: ts, note: rejectReason }],
    };
    updatePaymentRequest(rejectTarget.id, patch);
    if (selected?.id === rejectTarget.id) setSelected(p => ({ ...p, ...patch }));
    setShowReject(false);
    setRejectTarget(null);
    toast.success('Заявка отклонена');
  };

  const markPaid = (req) => {
    const ts = now();
    const by = user?.name || user?.tg || '—';
    const patch = {
      status: 'Оплачена', paid_by: by, paid_at: ts,
      history: [...(req.history || []), { status:'Оплачена', by, at: ts }],
    };
    updatePaymentRequest(req.id, patch);
    if (selected?.id === req.id) setSelected(p => ({ ...p, ...patch }));
    toast.success('Оплата зафиксирована ✓');
  };

  // ── Reject modal ──────────────────────────────────────────────────────────────
  const RejectModal = (
    <AnimatePresence>
      {showReject && (
        <motion.div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
          initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
          style={{background:'rgba(0,0,0,0.5)'}} onClick={() => setShowReject(false)}>
          <motion.div initial={{y:32,opacity:0}} animate={{y:0,opacity:1}} exit={{y:20,opacity:0}}
            transition={{duration:0.22}} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"
            onClick={e => e.stopPropagation()}>
            <div style={{padding:'18px 20px 14px',borderBottom:'1px solid #f1f5f9',
              display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontSize:15,fontWeight:700,color:DARK}}>Причина отклонения</span>
              <button onClick={() => setShowReject(false)}
                style={{color:'#94a3b8',fontSize:18,background:'none',border:'none',cursor:'pointer'}}>✕</button>
            </div>
            <div style={{padding:'16px 20px'}}>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                rows={3} placeholder="Укажите причину…" style={{...INP,resize:'none'}}/>
            </div>
            <div style={{padding:'12px 20px 18px',display:'flex',gap:10}}>
              <button onClick={() => setShowReject(false)}
                style={{flex:1,padding:'11px',borderRadius:12,background:'#f1f5f9',color:'#64748b',fontSize:13,border:'none',cursor:'pointer'}}>
                Отмена
              </button>
              <button onClick={doReject}
                style={{flex:1,padding:'11px',borderRadius:12,background:'#e11d48',color:'white',fontSize:13,fontWeight:600,border:'none',cursor:'pointer'}}>
                Отклонить
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ── Detail view ───────────────────────────────────────────────────────────────
  if (selected) {
    const req = requests.find(r => r.id === selected.id) || selected;
    const overdue = isOverdue(req);
    const rows = [
      ['Подразделение',     req.dept],
      ['Компания оплаты',   req.legal_entity],
      ['Поставщик',         req.recipient],
      ['Режим поставщика',  req.supplier_mode],
      req.supplier_contact_name && ['Контакт поставщика', `${req.supplier_contact_role}: ${req.supplier_contact_name}${req.supplier_contact_phone ? ' · ' + req.supplier_contact_phone : ''}`],
      ['Категория',         req.category],
      ['Назначение',        req.purpose],
      ['Сумма',             `${Number(req.amount).toLocaleString('ru-RU')} ₸`],
      ['Дата оплаты',       req.due_date ? `${fmtDate(req.due_date)}${overdue ? '  ⚠️ просрочено' : ''}` : '—'],
      ['Возмещение',        req.is_reimbursement],
      req.basis_file_name && ['Основание (файл)',   req.basis_file_name],
      req.contract_url    && ['Договор (ссылка)',   req.contract_url],
      ['Подал(а)',          req.requester],
      req.email           && ['Email',              req.email],
      ['Дата заявки',       fmtDate(req.created)],
      req.confirmed_by    && ['Подтвердил(а)',       `${req.confirmed_by} · ${fmtDate(req.confirmed_at)}`],
      req.paid_by         && ['Оплатил(а)',          `${req.paid_by} · ${fmtDate(req.paid_at)}`],
      req.reject_reason   && ['Причина отклонения', req.reject_reason],
      req.comment         && ['Комментарий',        req.comment],
    ].filter(Boolean);

    return (
      <div className="space-y-4 max-w-xl mx-auto">
        <button onClick={() => setSelected(null)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5l-6 5 6 5"/>
          </svg>
          Назад
        </button>

        {/* Hero */}
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
          style={{background:'linear-gradient(135deg,#1a3a42 0%,#28798d 100%)',borderRadius:20,padding:'22px',color:'white'}}>
          <div style={{fontSize:11,opacity:.55,letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:4}}>{req.id}</div>
          <div style={{fontSize:18,fontWeight:700,marginBottom:6}}>{req.recipient}</div>
          <div style={{fontSize:30,fontWeight:800,lineHeight:1,marginBottom:8}}>
            {Number(req.amount).toLocaleString('ru-RU')}
            <span style={{fontSize:14,fontWeight:400,opacity:.6}}> ₸</span>
          </div>
          <div style={{fontSize:12,opacity:.7,marginBottom:8}}>{req.purpose}</div>
          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            <StatusPill s={req.status} />
            {req.is_reimbursement === 'Да' && (
              <span style={{fontSize:10,fontWeight:600,background:'rgba(251,191,36,0.2)',color:'#fbbf24',
                padding:'2px 8px',borderRadius:20}}>Возмещение</span>
            )}
          </div>
        </motion.div>

        {/* Details */}
        <div style={{background:'white',borderRadius:16,border:'1px solid #e8f4f6',overflow:'hidden'}}>
          {rows.map(([label, value], i) => (
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',
              padding:'12px 18px',borderBottom:i<rows.length-1?'1px solid #f8fafc':'none',gap:16}}>
              <span style={{fontSize:12,color:'#94a3b8',flexShrink:0}}>{label}</span>
              {label === 'Договор (ссылка)' ? (
                <a href={value} target="_blank" rel="noreferrer"
                  style={{fontSize:12,fontWeight:500,color:BRAND,textAlign:'right',wordBreak:'break-all'}}>{value}</a>
              ) : (
                <span style={{fontSize:12,fontWeight:500,
                  color:label==='Причина отклонения'?'#e11d48':DARK,
                  textAlign:'right',wordBreak:'break-word'}}>{value}</span>
              )}
            </div>
          ))}
        </div>

        {/* История */}
        {req.history?.length > 0 && (
          <div style={{background:'white',borderRadius:16,border:'1px solid #e8f4f6',padding:'14px 18px'}}>
            <div style={{fontSize:12,fontWeight:600,color:DARK,marginBottom:12}}>История</div>
            <div style={{display:'flex',flexDirection:'column',gap:0}}>
              {req.history.map((h, i) => {
                const st = STATUS_STYLE[h.status] || STATUS_STYLE['Новая'];
                const isLast = i === req.history.length - 1;
                return (
                  <div key={i} style={{display:'flex',gap:12,position:'relative'}}>
                    {!isLast && (
                      <div style={{position:'absolute',left:7,top:16,bottom:0,width:2,background:'#e8f4f6',zIndex:0}}/>
                    )}
                    <div style={{width:16,height:16,borderRadius:'50%',background:st.dot,
                      flexShrink:0,marginTop:2,zIndex:1,boxShadow:`0 0 0 3px ${st.bg}`}}/>
                    <div style={{paddingBottom:isLast?0:14,flex:1}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                        <span style={{fontSize:12,fontWeight:600,color:st.color}}>{h.status}</span>
                        <span style={{fontSize:10,color:'#94a3b8'}}>{h.at}</span>
                      </div>
                      <div style={{fontSize:11,color:'#94a3b8',marginTop:1}}>{h.by}</div>
                      {h.note && <div style={{fontSize:11,color:'#e11d48',marginTop:2}}>{h.note}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {req.status === 'Новая' && isDirector && (
          <div style={{display:'flex',gap:10}}>
            <button onClick={() => openReject(req)}
              style={{flex:1,padding:'13px',borderRadius:14,background:'#fff1f2',color:'#e11d48',
                fontSize:13,fontWeight:600,border:'none',cursor:'pointer'}}>
              Отклонить
            </button>
            <button onClick={() => confirm(req)}
              style={{flex:1,padding:'13px',borderRadius:14,background:'#059669',color:'white',
                fontSize:13,fontWeight:600,border:'none',cursor:'pointer'}}>
              Подтвердить ✓
            </button>
          </div>
        )}

        {req.status === 'Подтверждена' && isAdmin && (
          <button onClick={() => markPaid(req)}
            style={{width:'100%',padding:'13px',borderRadius:14,background:BRAND,color:'white',
              fontSize:13,fontWeight:600,border:'none',cursor:'pointer'}}>
            Отметить как оплачено
          </button>
        )}

        {RejectModal}
      </div>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* FAB */}
      <motion.button
        initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}}
        onClick={() => setShowForm(true)}
        className="fixed bottom-24 lg:bottom-8 inset-x-0 lg:inset-x-auto lg:left-52 lg:right-0 mx-auto w-fit z-40 flex items-center gap-2 px-5 py-3 text-white text-sm font-semibold rounded-full whitespace-nowrap"
        style={{background:'rgba(40,121,141,0.82)',backdropFilter:'blur(14px)',WebkitBackdropFilter:'blur(14px)',
          border:'1px solid rgba(255,255,255,0.25)',boxShadow:'0 8px 32px rgba(40,121,141,0.35)'}}
        whileTap={{scale:0.95}}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <path d="M10 4v12M4 10h12"/>
        </svg>
        Новая заявка
      </motion.button>

      {/* Hero stats */}
      <div style={{background:'linear-gradient(135deg,#1a3a42 0%,#28798d 100%)',borderRadius:20,padding:'20px 22px',color:'white'}}>
        <div style={{fontSize:11,opacity:.55,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>
          Заявки на оплату
        </div>
        <div style={{fontSize:28,fontWeight:800,lineHeight:1,marginBottom:14}}>
          {(totalSum/1_000_000).toFixed(2)}
          <span style={{fontSize:14,fontWeight:400,opacity:.6}}> млн ₸</span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
          {[
            { label:'Всего заявок', value: requests.length },
            { label:'Новых',        value: totalNew,       highlight: totalNew > 0 },
            { label:'Подтв.',       value: totalConfirmed },
          ].map((s, i) => (
            <div key={i} style={{background:'rgba(255,255,255,0.1)',borderRadius:12,padding:'10px 12px'}}>
              <div style={{fontSize:22,fontWeight:700,color:s.highlight?'#fbbf24':'white'}}>{s.value}</div>
              <div style={{fontSize:10,opacity:.65,marginTop:2}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',background:'white',borderRadius:14,padding:4,gap:3,
        border:'1px solid #e8f4f6',overflowX:'auto'}}>
        {[['all','Все'],['new','Новые'],['confirmed','Подтв.'],['paid','Оплачены'],['rejected','Откл.']].map(([id,lbl]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{flex:1,padding:'7px 6px',borderRadius:10,fontSize:11,fontWeight:500,
              border:'none',cursor:'pointer',whiteSpace:'nowrap',minWidth:0,
              background:tab===id?BRAND:'transparent',
              color:tab===id?'white':'#94a3b8',
              transition:'all .15s'}}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        <AnimatePresence>
          {filtered.map((req, i) => (
            <motion.div key={req.id}
              initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}
              transition={{duration:0.15}}
              onClick={() => setSelected(req)}
              style={{background:'white',borderRadius:16,padding:'16px 18px',border:'1px solid #e8f4f6',
                boxShadow:'0 1px 8px rgba(40,121,141,0.06)',cursor:'pointer'}}>

              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:8}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:DARK,marginBottom:2}}>{req.recipient}</div>
                  <div style={{fontSize:11,color:'#94a3b8'}}>{req.id} · {req.legal_entity}</div>
                </div>
                <div style={{textAlign:'right',flexShrink:0,marginLeft:12}}>
                  <div style={{fontSize:15,fontWeight:700,color:DARK}}>
                    {Number(req.amount).toLocaleString('ru-RU')} ₸
                  </div>
                  {req.is_reimbursement === 'Да' && (
                    <div style={{fontSize:9,color:'#f59e0b',fontWeight:600}}>возмещение</div>
                  )}
                </div>
              </div>

              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                marginBottom:(req.status==='Новая'&&isDirector)||(req.status==='Подтверждена'&&isAdmin)?10:0}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <StatusPill s={req.status} />
                  {isOverdue(req) && (
                    <span style={{fontSize:10,fontWeight:600,color:'#e11d48',background:'#fff1f2',
                      padding:'2px 8px',borderRadius:20}}>просрочено</span>
                  )}
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <span style={{fontSize:10,color:'#94a3b8'}}>{req.category}</span>
                  {req.due_date && (
                    <span style={{fontSize:10,color:isOverdue(req)?'#e11d48':'#94a3b8'}}>
                      📅 {fmtDate(req.due_date)}
                    </span>
                  )}
                </div>
              </div>

              {req.status === 'Новая' && isDirector && (
                <div style={{display:'flex',gap:8}} onClick={e => e.stopPropagation()}>
                  <button onClick={() => openReject(req)}
                    style={{flex:1,padding:'7px',borderRadius:10,background:'#fff1f2',color:'#e11d48',
                      fontSize:12,fontWeight:500,border:'none',cursor:'pointer'}}>
                    Отклонить
                  </button>
                  <button onClick={() => confirm(req)}
                    style={{flex:1,padding:'7px',borderRadius:10,background:'#ecfdf5',color:'#059669',
                      fontSize:12,fontWeight:500,border:'none',cursor:'pointer'}}>
                    Подтвердить ✓
                  </button>
                </div>
              )}

              {req.status === 'Подтверждена' && isAdmin && (
                <div onClick={e => e.stopPropagation()}>
                  <button onClick={() => markPaid(req)}
                    style={{width:'100%',padding:'7px',borderRadius:10,background:'#f0f9ff',color:BRAND,
                      fontSize:12,fontWeight:500,border:`1px solid ${BRAND}33`,cursor:'pointer'}}>
                    Отметить как оплачено
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div style={{textAlign:'center',padding:'40px 0',color:'#cbd5e1',fontSize:13}}>
            Нет заявок
          </div>
        )}
      </div>

      <div className="h-16 lg:hidden" />

      {/* Success overlay */}
      <AnimatePresence>
        {submitted && (
          <motion.div className="fixed inset-0 z-[60] flex items-center justify-center"
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{background:'rgba(0,0,0,0.45)',backdropFilter:'blur(4px)'}}>
            <motion.div initial={{scale:0.85,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.85,opacity:0}}
              transition={{duration:0.18,ease:"easeOut"}}
              style={{background:'white',borderRadius:24,padding:'44px 40px',textAlign:'center',minWidth:260}}>
              <motion.div initial={{scale:0}} animate={{scale:1}} transition={{duration:0.15,ease:"easeOut"}}
                style={{fontSize:52,marginBottom:14}}>✅</motion.div>
              <div style={{fontSize:18,fontWeight:800,color:DARK,marginBottom:6}}>Заявка отправлена!</div>
              <div style={{fontSize:13,color:'#6b7280'}}>Ожидайте подтверждения</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wizard form */}
      <AnimatePresence>
        {showForm && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{background:'rgba(0,0,0,0.5)'}} onClick={closeForm}>
            <motion.div initial={{y:32,opacity:0}} animate={{y:0,opacity:1}} exit={{y:20,opacity:0}}
              transition={{duration:0.22}}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>

              {/* Header + stepper */}
              <div style={{padding:'18px 20px 14px',borderBottom:'1px solid #f1f5f9'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                  <span style={{fontSize:15,fontWeight:700,color:DARK}}>Заявка на оплату</span>
                  <button onClick={closeForm}
                    style={{color:'#94a3b8',fontSize:18,background:'none',border:'none',cursor:'pointer'}}>✕</button>
                </div>
                <div style={{display:'flex',alignItems:'center'}}>
                  {STEPS.map((label, i) => (
                    <div key={i} style={{display:'flex',alignItems:'center',flex:1}}>
                      <div style={{width:26,height:26,borderRadius:'50%',display:'flex',alignItems:'center',
                        justifyContent:'center',fontSize:10,fontWeight:700,flexShrink:0,
                        background:step>i+1?'#10b981':step===i+1?BRAND:'#f1f5f9',
                        color:step>=i+1?'white':'#94a3b8'}}>
                        {step>i+1?'✓':i+1}
                      </div>
                      {i<STEPS.length-1&&<div style={{flex:1,height:2,margin:'0 3px',background:step>i+1?'#10b981':'#e2e8f0'}}/>}
                    </div>
                  ))}
                </div>
                <div style={{fontSize:11,color:'#94a3b8',marginTop:8}}>
                  Шаг {step} из {STEPS.length}: <b style={{color:DARK}}>{STEPS[step-1]}</b>
                </div>
              </div>

              {/* Step content */}
              <div style={{padding:'18px 20px',display:'flex',flexDirection:'column',gap:14}}>

                {/* ── Шаг 1: Заявитель ── */}
                {step===1 && <>
                  <div>
                    <FL>ФИО</FL>
                    <input value={user?.name||user?.tg||''} readOnly
                      style={{...INP,background:'#f8fafc',color:'#94a3b8'}}/>
                  </div>
                  <div>
                    <FL required>Email</FL>
                    <input type="email" value={form.email} onChange={e=>set('email',e.target.value)}
                      placeholder="example@mastercoffee.kz" style={INP} autoFocus/>
                  </div>
                  <div>
                    <FL required>Подразделение</FL>
                    <select value={form.dept} onChange={e=>set('dept',e.target.value)} style={INP}>
                      {DEPTS.map(d=><option key={d}>{d}</option>)}
                    </select>
                  </div>
                </>}

                {/* ── Шаг 2: Поставщик ── */}
                {step===2 && <>
                  <div>
                    <FL required>Наименование поставщика</FL>
                    <input value={form.recipient} onChange={e=>set('recipient',e.target.value)}
                      placeholder="ТОО / ИП / ФИО" style={INP} autoFocus/>
                  </div>
                  <div>
                    <FL>Режим поставщика</FL>
                    <select value={form.supplier_mode} onChange={e=>set('supplier_mode',e.target.value)} style={INP}>
                      {SUPPLIER_MODES.map(m=><option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div style={{background:'#f8fafc',borderRadius:12,padding:'12px 14px',display:'flex',flexDirection:'column',gap:10}}>
                    <div style={{fontSize:11,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.06em'}}>
                      Контакты поставщика
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'auto 1fr',gap:8,alignItems:'center'}}>
                      <select value={form.supplier_contact_role}
                        onChange={e=>set('supplier_contact_role',e.target.value)}
                        style={{...INP,width:'auto',padding:'8px 10px',fontSize:13}}>
                        <option>Директор</option>
                        <option>Бухгалтер</option>
                      </select>
                      <input value={form.supplier_contact_name}
                        onChange={e=>set('supplier_contact_name',e.target.value)}
                        placeholder="ФИО" style={{...INP,fontSize:13,padding:'8px 10px'}}/>
                    </div>
                    <input value={form.supplier_contact_phone}
                      onChange={e=>set('supplier_contact_phone',e.target.value)}
                      placeholder="Телефон: +7 …" style={{...INP,fontSize:13,padding:'8px 10px'}}/>
                  </div>
                </>}

                {/* ── Шаг 3: Платёж ── */}
                {step===3 && <>
                  <div>
                    <FL>Компания оплаты</FL>
                    <select value={form.legal_entity} onChange={e=>set('legal_entity',e.target.value)} style={INP}>
                      {LEGAL_ENTITIES.map(l=><option key={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <FL required>Сумма (тенге)</FL>
                    <div style={{position:'relative'}}>
                      <input type="number" value={form.amount} onChange={e=>set('amount',e.target.value)}
                        placeholder="0" style={{...INP,paddingRight:36}} autoFocus/>
                      <span style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',
                        fontSize:16,color:'#94a3b8',fontWeight:600}}>₸</span>
                    </div>
                  </div>
                  <div>
                    <FL required>Дата оплаты</FL>
                    <DatePicker value={form.due_date} onChange={v=>set('due_date',v)} style={INP}/>
                  </div>
                  <div>
                    <FL>Категория</FL>
                    <select value={form.category}
                      onChange={e=>{ set('category',e.target.value); set('category_other',''); }} style={INP}>
                      {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                    </select>
                    {form.category === 'Другое' && (
                      <input value={form.category_other}
                        onChange={e=>set('category_other',e.target.value)}
                        placeholder="Укажите категорию…"
                        style={{...INP, marginTop:8}}
                        autoFocus/>
                    )}
                  </div>
                  <div>
                    <FL required>Назначение платежа</FL>
                    <input value={form.purpose} onChange={e=>set('purpose',e.target.value)}
                      placeholder="За что платим" style={INP}/>
                  </div>
                  <div>
                    <FL>Статус оплаты (возмещение)</FL>
                    <div style={{display:'flex',gap:8}}>
                      {['Да','Нет'].map(v=>(
                        <button key={v} onClick={()=>set('is_reimbursement',v)}
                          style={{flex:1,padding:'10px',borderRadius:10,fontSize:13,fontWeight:500,
                            border:`2px solid ${form.is_reimbursement===v?BRAND:'#e2e8f0'}`,
                            background:form.is_reimbursement===v?`${BRAND}12`:'white',
                            color:form.is_reimbursement===v?BRAND:'#64748b',cursor:'pointer'}}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </>}

                {/* ── Шаг 4: Документы ── */}
                {step===4 && <>
                  <div>
                    <FL>Основание для оплаты</FL>
                    <div style={{fontSize:11,color:'#94a3b8',marginBottom:8}}>
                      Прикрепите счёт на оплату или реквизиты (PDF, фото)
                    </div>
                    <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileUpload} style={{display:'none'}}/>
                    {form.basis_file_name ? (
                      <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',
                        background:'#ecfdf5',borderRadius:10,border:'1px solid #bbf7d0'}}>
                        <span style={{fontSize:18}}>📎</span>
                        <span style={{fontSize:12,fontWeight:500,color:'#065f46',flex:1,overflow:'hidden',
                          textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{form.basis_file_name}</span>
                        <button onClick={()=>{set('basis_file_name','');set('basis_file_url','');}}
                          style={{color:'#94a3b8',background:'none',border:'none',cursor:'pointer',fontSize:14}}>✕</button>
                      </div>
                    ) : (
                      <button onClick={()=>fileRef.current?.click()} disabled={uploading}
                        style={{width:'100%',padding:'12px',borderRadius:10,border:'2px dashed #e2e8f0',
                          background:'#f8fafc',color:'#64748b',fontSize:13,cursor:'pointer',
                          display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                        {uploading ? '⏳ Загрузка…' : '📁 Выбрать файл'}
                      </button>
                    )}
                  </div>
                  <div>
                    <FL>Договор (ссылка)</FL>
                    <input type="url" value={form.contract_url}
                      onChange={e=>set('contract_url',e.target.value)}
                      placeholder="https://drive.google.com/…" style={INP}/>
                  </div>
                  <div>
                    <FL>Комментарий</FL>
                    <textarea value={form.comment} onChange={e=>set('comment',e.target.value)}
                      rows={3} placeholder="Дополнительная информация…"
                      style={{...INP,resize:'none'}}/>
                  </div>
                </>}

                {/* ── Шаг 5: Итого ── */}
                {step===5 && (
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    <div style={{background:'#f8fafc',borderRadius:14,padding:'14px 16px'}}>
                      {[
                        ['Заявитель',      user?.name||user?.tg||'—'],
                        ['Email',          form.email],
                        ['Подразделение',  form.dept],
                        ['Компания',       form.legal_entity],
                        ['Поставщик',      form.recipient],
                        ['Режим',          form.supplier_mode],
                        form.supplier_contact_name && ['Контакт', `${form.supplier_contact_role}: ${form.supplier_contact_name}`],
                        ['Сумма',          `${Number(form.amount||0).toLocaleString('ru-RU')} ₸`],
                        ['Дата оплаты',    fmtDate(form.due_date)],
                        ['Категория',      form.category === 'Другое' ? (form.category_other || 'Другое') : form.category],
                        ['Назначение',     form.purpose],
                        ['Возмещение',     form.is_reimbursement],
                        form.basis_file_name && ['Файл', form.basis_file_name],
                        form.contract_url && ['Договор', form.contract_url],
                        form.comment && ['Комментарий', form.comment],
                      ].filter(Boolean).map(([l,v],i)=>(
                        <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',
                          padding:'7px 0',borderBottom:'1px solid #e8f4f6',gap:12}}>
                          <span style={{fontSize:11,color:'#94a3b8',flexShrink:0}}>{l}</span>
                          <span style={{fontSize:12,fontWeight:600,color:DARK,textAlign:'right',
                            wordBreak:'break-word',maxWidth:'60%'}}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{fontSize:11,color:'#94a3b8',textAlign:'center'}}>
                      Данные будут сохранены в Google Таблицах
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{padding:'12px 20px 20px',borderTop:'1px solid #f1f5f9',display:'flex',gap:10}}>
                {step>1
                  ? <button onClick={()=>setStep(s=>s-1)}
                      style={{flex:1,padding:'12px',borderRadius:12,background:'#f1f5f9',color:'#64748b',
                        fontSize:13,border:'none',cursor:'pointer'}}>
                      Назад
                    </button>
                  : <button onClick={closeForm}
                      style={{flex:1,padding:'12px',borderRadius:12,background:'#f1f5f9',color:'#64748b',
                        fontSize:13,border:'none',cursor:'pointer'}}>
                      Отмена
                    </button>
                }
                {step<5
                  ? <button onClick={()=>{if(!canNext()){toast.error('Заполните обязательные поля');return;} setStep(s=>s+1);}}
                      style={{flex:1,padding:'12px',borderRadius:12,background:BRAND,color:'white',
                        fontSize:13,fontWeight:600,border:'none',cursor:'pointer'}}>
                      Далее →
                    </button>
                  : <button onClick={submit}
                      style={{flex:1,padding:'12px',borderRadius:12,background:'#059669',color:'white',
                        fontSize:13,fontWeight:700,border:'none',cursor:'pointer'}}>
                      ✓ Отправить
                    </button>
                }
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {RejectModal}
    </div>
  );
}
