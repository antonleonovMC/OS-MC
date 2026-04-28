import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useData } from '../context/DataContext';
import Badge from '../components/Badge';

const BRAND = '#28798d';
const STEP_LABELS = ["Контакты","Структура","Товар","Логистика","Поставщик","Итого"];
const EMPTY_FORM = { fullName:"", email:"", dept:"", budgetDept:"", legalEntity:"", product:"", qty:"", basis:"", url:"", deliveryDate:"", address:"", contact:"", supplierCompany:"", supplierPerson:"", supplierPhone:"", comment:"", urgency:"Обычная", category:"", fileName:"" };

const URGENCY_COLOR = { "Критично":"bg-red-100 text-red-700", "Срочно":"bg-amber-100 text-amber-700", "Обычная":"bg-green-100 text-green-700" };

export default function Requests({ user, sidebarOpen, onCreateLogisticsOrder }) {
  const { requests: reqs, addRequest, updateRequestStatus } = useData();
  const [showForm, setShowForm] = useState(false);
  const [sel, setSel]           = useState(null);
  const [step, setStep]         = useState(1);
  const [statusF, setStatusF]   = useState("Все");
  const [form, setForm]         = useState(EMPTY_FORM);

  const isManager = ["director","manager"].includes(user.role);
  const myName    = user.name.split(" ").slice(0,2).join(" ");
  const visible   = isManager ? reqs : reqs.filter(r => r.employee === myName);
  const filtered  = visible.filter(r => statusF === "Все" || r.status === statusF);

  const submit = () => {
    const req = { id:`REQ-0${reqs.length+24}`, employee:user.name.split(" ").slice(0,2).join(" "), dept:user.dept, category:form.category||"Другое", product:form.product, qty:form.qty, urgency:form.urgency, date:new Date().toLocaleDateString("ru-RU"), status:"Ожидает", comment:form.comment };
    addRequest(req);
    setShowForm(false); setStep(1); setForm(EMPTY_FORM);
    toast.success("Заявка отправлена на рассмотрение");
  };
  const approve = id => { updateRequestStatus(id, "Одобрена");  setSel(p=>p?{...p,status:"Одобрена"}:p);  toast.success("Заявка одобрена"); };
  const reject  = id => { updateRequestStatus(id, "Отклонена"); setSel(p=>p?{...p,status:"Отклонена"}:p); toast.error("Заявка отклонена"); };

  const set = (key, val) => setForm(p => ({...p, [key]: val}));
  const I = (key,ph,type="text") => <input type={type} placeholder={ph} value={form[key]} onChange={e=>set(key,e.target.value)} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2" style={{'--tw-ring-color':BRAND}}/>;
  const S = (key,opts) => <select value={form[key]} onChange={e=>set(key,e.target.value)} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2" style={{'--tw-ring-color':BRAND}}><option value="">Выберите…</option>{opts.map(o=><option key={o}>{o}</option>)}</select>;
  const F = ({label,children}) => <div><label className="text-xs font-semibold text-gray-500 block mb-1.5 uppercase tracking-wide">{label}</label>{children}</div>;

  // ── Detail view ──────────────────────────────────────────────────────────────
  if (sel) return (
    <div className="space-y-4">
      <button onClick={() => setSel(null)} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5l-6 5 6 5"/></svg>
        Назад к списку
      </button>

      <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.2}}
        className="max-w-xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">

        {/* Header */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-400 font-mono uppercase">{sel.id}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${URGENCY_COLOR[sel.urgency]||"bg-gray-100 text-gray-600"}`}>
                  {sel.urgency}
                </span>
              </div>
              <h2 className="text-lg font-bold text-gray-900 leading-snug">{sel.product}</h2>
              <div className="text-sm text-gray-500 mt-1">{sel.employee} · {sel.dept}</div>
            </div>
            <Badge s={sel.status} />
          </div>
        </div>

        {/* Details */}
        <div className="p-5 space-y-3 border-b border-gray-100">
          {[
            ["Категория",    sel.category],
            ["Количество",   sel.qty],
            ["Дата заявки",  sel.date],
            ["Подразделение",sel.dept],
          ].map(([l,v]) => v && (
            <div key={l} className="flex items-start justify-between gap-4">
              <span className="text-gray-400 text-sm flex-shrink-0">{l}</span>
              <span className="text-sm font-medium text-gray-800 text-right">{v}</span>
            </div>
          ))}
          {sel.comment && (
            <div className="mt-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
              {sel.comment}
            </div>
          )}
        </div>

        {/* Manager actions */}
        {isManager && sel.status === "Ожидает" && (
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider font-semibold">Действие</div>
            <div className="flex gap-2">
              <button onClick={() => approve(sel.id)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{background:BRAND}}>Одобрить</button>
              <button onClick={() => reject(sel.id)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">Отклонить</button>
            </div>
          </div>
        )}
        {isManager && sel.status === "Одобрена" && (
          <div className="px-5 py-4 border-b border-gray-100">
            <button onClick={() => onCreateLogisticsOrder?.(sel)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{background:BRAND}}>
              Создать заказ в логистике →
            </button>
          </div>
        )}

        <div className="px-5 py-4">
          <button onClick={() => setSel(null)}
            className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">
            Закрыть
          </button>
        </div>
      </motion.div>
    </div>
  );

  // ── List view ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Floating FAB — hidden when sidebar open */}
      <AnimatePresence>
        {!sidebarOpen && (
          <motion.button
            initial={{opacity:0, scale:0.8, y:10}} animate={{opacity:1, scale:1, y:0}} exit={{opacity:0, scale:0.8, y:10}}
            transition={{duration:0.18}}
            onClick={() => setShowForm(true)}
            className="fixed bottom-24 lg:bottom-8 inset-x-0 lg:inset-x-auto lg:left-52 lg:right-0 mx-auto w-fit z-40 flex items-center gap-2 px-5 py-3 text-white text-sm font-semibold rounded-full whitespace-nowrap"
            style={{ background:'rgba(40,121,141,0.82)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)', border:'1px solid rgba(255,255,255,0.25)', boxShadow:'0 8px 32px rgba(40,121,141,0.35)' }}
            whileHover={{scale:1.05}} whileTap={{scale:0.95}}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M10 4v12M4 10h12"/></svg>
            Подать заявку
          </motion.button>
        )}
      </AnimatePresence>

      {/* Status filters */}
      <div className="flex gap-1.5 flex-wrap">
        {["Все","Ожидает","Одобрена","Отклонена"].map(s=>(
          <button key={s} onClick={()=>setStatusF(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusF===s?"text-white":"bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            style={statusF===s?{background:BRAND}:{}}>
            {s}
          </button>
        ))}
      </div>

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={()=>setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-800">Новая заявка на закуп</h3>
                <button onClick={()=>setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="flex items-center gap-1">
                {STEP_LABELS.map((l,i)=>(
                  <div key={i} className="flex items-center flex-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${step>i+1?"bg-teal-500 text-white":step===i+1?"text-white":"bg-gray-100 text-gray-400"}`}
                      style={step===i+1?{background:BRAND}:{}}>{step>i+1?"✓":i+1}</div>
                    {i<STEP_LABELS.length-1&&<div className={`flex-1 h-0.5 mx-1 ${step>i+1?"bg-teal-400":"bg-gray-200"}`}/>}
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-500 mt-2">Шаг {step} из {STEP_LABELS.length}: <span className="font-semibold text-gray-700">{STEP_LABELS[step-1]}</span></div>
            </div>
            <div className="p-5 space-y-4">
              {step===1&&<><F label="ФИО">{I("fullName","Фамилия Имя Отчество")}</F><F label="Email">{I("email","email@mastercoffee.kz","email")}</F></>}
              {step===2&&<><F label="Подразделение">{S("dept",["УК","ТК","Обжарка","Цех","Кофейни"])}</F><F label="Бюджетное подразделение">{I("budgetDept","Название")}</F><F label="Юр. лицо">{S("legalEntity",["ТОО Мастер Кофе","ИП Master Coffee Trade","ИП Master Coffee Roasters","ТОО Mastercoffee.kz","Другое"])}</F></>}
              {step===3&&<>
                <F label="Наименование товара">{I("product","Что нужно закупить?")}</F>
                <F label="Количество">{I("qty","100 шт")}</F>
                <F label="Категория">{S("category",["Обжарка","Упаковка","Сиропы","Оргтехника","Хозтовары","Химия","Другое"])}</F>
                <F label="Срочность">{S("urgency",["Обычная","Срочно","Критично"])}</F>
                <F label="Основание">{I("basis","Обоснование")}</F>
                <F label="Прикрепить файл (ТЗ, прайс, фото)">
                  <div style={{ border:'1.5px dashed #cbd5e1', borderRadius:12, padding:'12px 14px', background:'#f8fafc', display:'flex', alignItems:'center', gap:10 }}>
                    <input type="file" id="req-file" style={{ display:'none' }}
                      onChange={e => set('fileName', e.target.files?.[0]?.name || '')} />
                    <label htmlFor="req-file" style={{ cursor:'pointer', fontSize:12, fontWeight:600, color:BRAND, padding:'6px 14px', borderRadius:8, background:'#e8f4f6' }}>
                      Выбрать файл
                    </label>
                    <span style={{ fontSize:12, color: form.fileName ? '#1a3a42' : '#94a3b8', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {form.fileName || 'Файл не выбран'}
                    </span>
                  </div>
                </F>
              </>}
              {step===4&&<><F label="Срок поставки">{I("deliveryDate","","date")}</F><F label="Адрес доставки">{I("address","г. Астана, ул. …")}</F><F label="Контакты получателя">{I("contact","+7 701 …")}</F></>}
              {step===5&&<><F label="Компания поставщика">{I("supplierCompany","Название")}</F><F label="Контактное лицо">{I("supplierPerson","Имя")}</F><F label="Телефон">{I("supplierPhone","+7 …")}</F></>}
              {step===6&&<div className="space-y-3"><div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">{[["Товар",form.product],["Кол-во",form.qty],["Срочность",form.urgency],["Подразделение",form.dept],["Юр. лицо",form.legalEntity],["Поставщик",form.supplierCompany]].filter(([,v])=>v).map(([l,v])=><div key={l} className="flex justify-between"><span className="text-gray-500">{l}</span><span className="font-medium text-gray-800">{v}</span></div>)}</div><F label="Комментарий"><textarea value={form.comment} onChange={e=>setForm({...form,comment:e.target.value})} rows={3} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none resize-none" placeholder="Дополнительные детали…"/></F></div>}
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-3">
              {step>1&&<button onClick={()=>setStep(s=>s-1)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium">Назад</button>}
              {step<6
                ? <button onClick={()=>setStep(s=>s+1)} className="flex-1 py-2.5 text-white rounded-xl text-sm font-semibold" style={{background:BRAND}}>Далее</button>
                : <button onClick={submit} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold">✓ Отправить</button>}
            </div>
          </div>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-100">
            {["ID","Сотрудник","Категория","Товар","Кол-во","Срочность","Дата","Статус",...(isManager?["Действия"]:[])].map(h=>(
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.map(r=>(
              <tr key={r.id} onClick={()=>setSel(r)} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer">
                <td className="px-4 py-3 font-semibold text-gray-700">{r.id}</td>
                <td className="px-4 py-3 text-gray-800">{r.employee}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{r.category}</td>
                <td className="px-4 py-3 text-gray-700 max-w-xs"><div className="truncate">{r.product}</div></td>
                <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{r.qty}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.urgency==="Критично"?"bg-red-100 text-red-800":r.urgency==="Срочно"?"bg-amber-100 text-amber-800":"bg-green-100 text-green-800"}`}>• {r.urgency}</span></td>
                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{r.date}</td>
                <td className="px-4 py-3 whitespace-nowrap"><Badge s={r.status}/></td>
                {isManager && (
                  <td className="px-4 py-3" onClick={e=>e.stopPropagation()}>
                    {r.status==="Ожидает"
                      ? <div className="flex gap-1.5">
                          <button onClick={()=>approve(r.id)} className="px-3 py-1 text-white rounded-lg text-xs font-medium hover:opacity-90" style={{background:BRAND}}>Одобрить</button>
                          <button onClick={()=>reject(r.id)}  className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-300">Откл.</button>
                        </div>
                      : r.status==="Одобрена"
                        ? <button onClick={()=>onCreateLogisticsOrder?.(r)} className="text-xs font-medium hover:underline" style={{color:BRAND}}>Создать заказ →</button>
                        : <span className="text-xs text-gray-400">—</span>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {filtered.map(r => (
          <motion.div key={r.id}
            initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.18}}
            onClick={() => setSel(r)}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-pointer active:scale-[0.98] transition-transform">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-xs font-mono text-gray-400">{r.id}</span>
                <div className="font-semibold text-gray-800 text-sm mt-0.5">{r.product}</div>
                <div className="text-xs text-gray-500 mt-0.5">{r.employee} · {r.dept}</div>
              </div>
              <Badge s={r.status}/>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">{r.category}</span>
              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg font-medium">{r.qty}</span>
              <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${URGENCY_COLOR[r.urgency]||""}`}>{r.urgency}</span>
              <span className="text-xs text-gray-400 ml-auto">{r.date}</span>
            </div>
            {isManager && r.status==="Ожидает" && (
              <div className="flex gap-2 pt-2 border-t border-gray-50" onClick={e=>e.stopPropagation()}>
                <button onClick={()=>approve(r.id)} className="flex-1 py-2 text-white rounded-xl text-xs font-semibold" style={{background:BRAND}}>Одобрить</button>
                <button onClick={()=>reject(r.id)}  className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-medium">Отклонить</button>
              </div>
            )}
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">Нет заявок</div>
        )}
      </div>
      <div className="h-16 lg:hidden" />
    </div>
  );
}
