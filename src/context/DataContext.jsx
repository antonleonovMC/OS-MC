import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  INIT_ORDERS, INIT_REQUESTS, INIT_INVOICES, INIT_COFFEE_ORDERS, INIT_TASKS, USERS as DEFAULT_USERS,
  DASHBOARD_CITIES, PRODUCT_GROUPS,
  makeHistory, genCode,
} from '../data/constants';
import { fetchSheet, appendRow, updateRow, deleteRow, sheetsReady, parseRow } from '../lib/sheetsAPI';

const Ctx = createContext(null);
export const useData = () => useContext(Ctx);

// ── Helpers to map sheet rows → app objects ────────────────────────────────
function mapOrder(r) {
  const o = parseRow(r, ['items', 'history']);
  o.id    = Number(o.id) || o.id;
  if (!o.history || !o.history.length) o.history = makeHistory(o.status, o.created);
  return o;
}
function mapRequest(r) {
  return { ...r, reject_reason: r.reject_reason || '' };
}
function mapInvoice(r) {
  const o = parseRow(r, ['payments']);
  o.amount = Number(o.amount) || 0;
  o.paid   = Number(o.paid)   || 0;
  if (!o.payments) o.payments = [];
  return o;
}
function mapCoffee(r) {
  const o = parseRow(r, ['items']);
  if (!o.items) o.items = [];
  return o;
}
function mapTask(r) {
  const o = parseRow(r, ['subtasks', 'comments']);
  o.id = Number(o.id) || o.id;
  if (!o.subtasks)  o.subtasks  = [];
  if (!o.comments)  o.comments  = [];
  return o;
}

export function DataProvider({ children, onReady }) {
  const [loading,       setLoading]       = useState(true);
  const [staff,         setStaff]         = useState(DEFAULT_USERS);
  const [settings,      setSettings]      = useState({ cities: DASHBOARD_CITIES, groups: PRODUCT_GROUPS });
  const [dashData,      setDashData]      = useState([]);
  const [orders,        setOrders]        = useState([]);
  const [requests,      setRequests]      = useState([]);
  const [invoices,      setInvoices]      = useState([]);
  const [coffees,       setCoffees]       = useState([]);
  const [tasks,         setTasks]         = useState([]);
  const [subscriptions,    setSubscriptions]    = useState([]);
  const [coffeeProducts,   setCoffeeProducts]   = useState([]);
  const [paymentRequests,  setPaymentRequests]  = useState([]);

  // ── Load all data on mount ─────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      if (!sheetsReady()) {
        // No URL yet — use seed data
        setOrders(INIT_ORDERS);
        setRequests(INIT_REQUESTS);
        setInvoices(INIT_INVOICES.map(inv => ({ ...inv, payments: [], dueDate: '', comment: '' })));
        setCoffees(INIT_COFFEE_ORDERS.map(o => ({
          ...o, items: o.items.map(it => ({ ...it, shipped: it.shipped ?? 0 }))
        })));
        setTasks(INIT_TASKS);
        setLoading(false);
        onReady?.();
        return;
      }
      // Таймаут 12 секунд — если GAS не ответил, переходим на seed-данные
      const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 12000));
      try {
        const [ordersRaw, reqRaw, invRaw, cofRaw, taskRaw, staffRaw,
               subsRaw, settingsRaw, dashRaw, cofProductsRaw, payReqRaw] = await Promise.race([
          Promise.all([
            fetchSheet('Заказы'),
            fetchSheet('Заявки'),
            fetchSheet('Счета'),
            fetchSheet('Кофе'),
            fetchSheet('Задачи'),
            fetchSheet('Сотрудники'),
            fetchSheet('Подписки').catch(() => []),
            fetchSheet('Настройки').catch(() => []),
            fetchSheet('Данные дашборда').catch(() => []),
            fetchSheet('Настройки Кофе').catch(() => []),
            fetchSheet('Заявки на оплату').catch(() => []),
          ]),
          timeout,
        ]);

        setOrders(ordersRaw.map(mapOrder));
        setRequests(reqRaw.map(mapRequest));
        setInvoices(invRaw.map(mapInvoice));
        setCoffees(cofRaw.map(mapCoffee));
        setTasks(taskRaw.map(mapTask));
        setSubscriptions(subsRaw.map(r => ({ ...r, tg_id: Number(r.tg_id), order_id: Number(r.order_id) })));

        // Настройки → фильтры дашборда
        const cities = settingsRaw.map(r => r['Город']).filter(Boolean);
        const groups = settingsRaw.map(r => r['Категория товаров']).filter(Boolean);
        if (cities.length || groups.length) {
          setSettings({
            cities: cities.length ? cities : DASHBOARD_CITIES,
            groups: groups.length ? groups : PRODUCT_GROUPS,
          });
        }

        // Данные дашборда
        setDashData(dashRaw.filter(r => r.product_name || r.city));

        // Заявки на оплату
        setPaymentRequests(payReqRaw.map(r => ({ ...r, amount: Number(r.amount) || 0 })));

        // Товары кофе — колонки = группы обжарки, строки = названия
        if (cofProductsRaw.length) {
          const GROUPS = ['Светлая Обжарка','Средняя Обжарка','Тёмная Обжарка','Дрип Кофе'];
          const products = [];
          cofProductsRaw.forEach(row => {
            // Normalize row keys — trim whitespace to handle sheet header formatting
            const normRow = Object.fromEntries(
              Object.entries(row).map(([k, v]) => [k.trim(), typeof v === 'string' ? v.trim() : v])
            );
            GROUPS.forEach(g => {
              if (normRow[g]) products.push({ roast_type: g, name: normRow[g] });
            });
          });
          if (products.length) setCoffeeProducts(products);
        }

        // Merge sheet staff over defaults — sheet tg_id wins, else keep hardcoded
        if (staffRaw.length) {
          setStaff(staffRaw.map(r => {
            const def = DEFAULT_USERS.find(u =>
              u.tg?.replace('@','').toLowerCase() === (r.tg || '').replace('@','').toLowerCase()
            ) || {};
            return {
              ...def,
              ...r,
              tg_id: r.tg_id ? Number(r.tg_id) : (def.tg_id || null),
            };
          }));
        }
      } catch {
        // Fallback to seed on any fetch error
        setOrders(INIT_ORDERS);
        setRequests(INIT_REQUESTS);
        setInvoices(INIT_INVOICES.map(inv => ({ ...inv, payments: [], dueDate: '', comment: '' })));
        setCoffees(INIT_COFFEE_ORDERS.map(o => ({
          ...o, items: o.items.map(it => ({ ...it, shipped: it.shipped ?? 0 }))
        })));
        setTasks(INIT_TASKS);
      }
      setLoading(false);
      onReady?.();
    }
    load();
    // Real-time polling every 30s
    const poll = setInterval(async () => {
      if (!sheetsReady()) return;
      try {
        const [ordersRaw, reqRaw, cofRaw] = await Promise.all([
          fetchSheet('Заказы'), fetchSheet('Заявки'), fetchSheet('Кофе'),
        ]);
        setOrders(ordersRaw.map(mapOrder));
        setRequests(reqRaw.map(mapRequest));
        setCoffees(cofRaw.map(mapCoffee));
      } catch {}
    }, 30000);
    return () => clearInterval(poll);
  }, []);

  // ── ORDERS ─────────────────────────────────────────────────────────────
  const addOrder = useCallback((order) => {
    setOrders(p => [order, ...p]);
    appendRow('Заказы', { ...order, items: JSON.stringify(order.items), history: JSON.stringify(order.history) });
  }, []);

  const updateOrderStatus = useCallback((id, status, history) => {
    setOrders(p => p.map(o => o.id === id ? { ...o, status, history } : o));
    updateRow('Заказы', id, { status, history: JSON.stringify(history) });
  }, []);

  const updateOrder = useCallback((id, patch) => {
    setOrders(p => p.map(o => o.id === id ? { ...o, ...patch } : o));
    const sheetPatch = { ...patch };
    if (sheetPatch.items)   sheetPatch.items   = JSON.stringify(sheetPatch.items);
    if (sheetPatch.history) sheetPatch.history = JSON.stringify(sheetPatch.history);
    updateRow('Заказы', id, sheetPatch);
  }, []);

  const toggleSubscription = useCallback((tgId, orderId, orderTitle) => {
    const exists = subscriptions.find(s => s.tg_id === tgId && s.order_id === orderId);
    if (exists) {
      setSubscriptions(p => p.filter(s => !(s.tg_id === tgId && s.order_id === orderId)));
      deleteRow('Подписки', `${tgId}_${orderId}`);
    } else {
      const sub = { id: `${tgId}_${orderId}`, tg_id: tgId, order_id: orderId, order_title: orderTitle };
      setSubscriptions(p => [...p, sub]);
      appendRow('Подписки', sub);
    }
  }, [subscriptions]);

  // ── STAFF ───────────────────────────────────────────────────────────────
  const updateStaffMember = useCallback((id, patch) => {
    setStaff(p => p.map(s => String(s.id) === String(id) ? { ...s, ...patch } : s));
    updateRow('Сотрудники', id, patch);
  }, []);

  // ── REQUESTS ────────────────────────────────────────────────────────────
  const addRequest = useCallback((req) => {
    setRequests(p => [req, ...p]);
    appendRow('Заявки', req);
  }, []);

  const updateRequestStatus = useCallback((id, status, extra = {}) => {
    setRequests(p => p.map(r => r.id === id ? { ...r, status, ...extra } : r));
    updateRow('Заявки', id, { status, ...extra });
  }, []);

  // ── INVOICES ────────────────────────────────────────────────────────────
  const addInvoice = useCallback((inv) => {
    setInvoices(p => [inv, ...p]);
    appendRow('Счета', { ...inv, payments: JSON.stringify(inv.payments) });
  }, []);

  const updateInvoice = useCallback((id, patch) => {
    setInvoices(p => p.map(inv => inv.id === id ? { ...inv, ...patch } : inv));
    const sheetPatch = { ...patch };
    if (sheetPatch.payments) sheetPatch.payments = JSON.stringify(sheetPatch.payments);
    updateRow('Счета', id, sheetPatch);
  }, []);

  // ── COFFEE ──────────────────────────────────────────────────────────────
  const addCoffeeOrder = useCallback((order) => {
    setCoffees(p => [order, ...p]);
    appendRow('Кофе', { ...order, items: JSON.stringify(order.items) });
  }, []);

  const updateCoffeeOrder = useCallback((id, patch) => {
    setCoffees(p => p.map(o => o.id === id ? { ...o, ...patch } : o));
    const sheetPatch = { ...patch };
    if (sheetPatch.items) sheetPatch.items = JSON.stringify(sheetPatch.items);
    updateRow('Кофе', id, sheetPatch);
  }, []);

  // ── PAYMENT REQUESTS ────────────────────────────────────────────────────
  const addPaymentRequest = useCallback((req) => {
    setPaymentRequests(p => [req, ...p]);
    appendRow('Заявки на оплату', req);
  }, []);

  const updatePaymentRequest = useCallback((id, patch) => {
    setPaymentRequests(p => p.map(r => r.id === id ? { ...r, ...patch } : r));
    updateRow('Заявки на оплату', id, patch);
  }, []);

  // ── TASKS ───────────────────────────────────────────────────────────────
  const addTask = useCallback((task) => {
    setTasks(p => [...p, task]);
    appendRow('Задачи', { ...task, subtasks: JSON.stringify(task.subtasks), comments: JSON.stringify(task.comments) });
  }, []);

  const updateTask = useCallback((id, patch) => {
    setTasks(p => p.map(t => t.id === id ? { ...t, ...patch } : t));
    const sheetPatch = { ...patch };
    if (sheetPatch.subtasks) sheetPatch.subtasks = JSON.stringify(sheetPatch.subtasks);
    if (sheetPatch.comments) sheetPatch.comments = JSON.stringify(sheetPatch.comments);
    updateRow('Задачи', id, sheetPatch);
  }, []);

  const moveTask = useCallback((id, status) => {
    setTasks(p => p.map(t => t.id === id ? { ...t, status } : t));
    updateRow('Задачи', id, { status });
  }, []);

  return (
    <Ctx.Provider value={{
      loading,
      // data
      staff, settings, dashData, orders, requests, invoices, coffees, tasks, subscriptions, coffeeProducts, paymentRequests,
      // raw setters (for complex mutations in pages)
      setOrders, setRequests, setInvoices, setCoffees, setTasks,
      // typed mutations (also sync to Sheets)
      addOrder, updateOrderStatus, updateOrder, toggleSubscription,
      addRequest, updateRequestStatus,
      updateStaffMember,
      addInvoice, updateInvoice,
      addCoffeeOrder, updateCoffeeOrder,
      addTask, updateTask, moveTask,
      addPaymentRequest, updatePaymentRequest,
    }}>
      {children}
    </Ctx.Provider>
  );
}
