/**
 * Форматирует любую дату в читаемый вид: "19 мая 2026"
 * Принимает ISO строку, DD.MM.YYYY, Date объект или пустое значение.
 */
export function fmtDate(value) {
  if (!value || value === '—') return '—';
  let d;
  const s = String(value).trim();
  // DD.MM.YYYY или DD.MM.YY
  if (/^\d{2}\.\d{2}\.\d{2,4}$/.test(s)) {
    const [day, mon, yr] = s.split('.');
    d = new Date(`${yr.length === 2 ? '20' + yr : yr}-${mon}-${day}`);
  } else {
    d = new Date(s);
  }
  if (isNaN(d.getTime())) return s; // не смогли распознать — вернуть как есть
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}
