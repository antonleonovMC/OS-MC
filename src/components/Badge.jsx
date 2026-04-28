import { SC } from '../data/constants';

const DOT = {
  'Принят':          '#3b82f6',
  'В работе':        '#f59e0b',
  'Оплачен':         '#0d9488',
  'В пути':          '#8b5cf6',
  'Таможня':         '#f97316',
  'Доставлен':       '#059669',
  'Ожидает':         '#f59e0b',
  'Одобрена':        '#059669',
  'Отклонена':       '#e11d48',
  'Не оплачен':      '#e11d48',
  'Частично':        '#d97706',
  'Изготавливается': '#3b82f6',
  'В обжарке':       '#f97316',
  'Отправлен':       '#8b5cf6',
  'Получен':         '#059669',
};

export default function Badge({ s }) {
  const dot = DOT[s] || '#94a3b8';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${SC[s] || 'bg-gray-100 text-gray-600'}`}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:dot, flexShrink:0, display:'inline-block' }} />
      {s}
    </span>
  );
}
