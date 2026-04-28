import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  INIT_ORDERS, INIT_REQUESTS, INIT_INVOICES, INIT_COFFEE_ORDERS, INIT_TASKS, USERS,
  makeHistory, genCode,
} from '../data/constants';
import { fetchSheet, appendRow, updateRow, sheetsReady, parseRow } from '../lib/sheetsAPI';

const Ctx = createContext(null);
export const useData = () => useContext(Ctx);

// ── Helpers to map sheet rows → app objects ────────────────────────────────
function mapOrder(r) {
  const o = parseRow(r, ['items', 'history']);
  o.id    = Number(o.id) || o.id;
  if (!o.history || !o.history.length) o.history = makeHistory(o.status, o.created);
  return o;
}
function mapRequest(r) { return r; }
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
  const [loading,  setLoading]  = useState(true);
  const [orders,   setOrders]   = useState([]);
  const [requests, setRequests] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [coffees,  setCoffees]  = useState([]);
  const [tasks,    setTasks]    = useState([]);

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
      try {
        const [ordersRaw, reqRaw, invRaw, cofRaw, taskRaw] = await Promise.all([
          fetchSheet('Заказы'),
          fetchSheet('Заявки'),
          fetchSheet('Счета'),
          fetchSheet('Кофе'),
          fetchSheet('Задачи'),
        ]);
        setOrders(ordersRaw.map(mapOrder));
        setRequests(reqRaw.map(mapRequest));
        setInvoices(invRaw.map(mapInvoice));
        setCoffees(cofRaw.map(mapCoffee));
        setTasks(taskRaw.map(mapTask));
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

  // ── REQUESTS ────────────────────────────────────────────────────────────
  const addRequest = useCallback((req) => {
    setRequests(p => [req, ...p]);
    appendRow('Заявки', req);
  }, []);

  const updateRequestStatus = useCallback((id, status) => {
    setRequests(p => p.map(r => r.id === id ? { ...r, status } : r));
    updateRow('Заявки', id, { status });
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
      orders, requests, invoices, coffees, tasks,
      // raw setters (for complex mutations in pages)
      setOrders, setRequests, setInvoices, setCoffees, setTasks,
      // typed mutations (also sync to Sheets)
      addOrder, updateOrderStatus,
      addRequest, updateRequestStatus,
      addInvoice, updateInvoice,
      addCoffeeOrder, updateCoffeeOrder,
      addTask, updateTask, moveTask,
    }}>
      {children}
    </Ctx.Provider>
  );
}
