import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle, Clock, AlertCircle, XCircle, Plus, Calendar, ChevronDown, X, Search, Eye, Pencil, CreditCard, Download, FileText, Upload, Bell, StickyNote, Save, ListChecks } from 'lucide-react';
import { paymentsApi, leadsApi, projectsApi } from '../api/client';
import { notify } from '../utils/notify';

const PER_PAGE = 8;
const METHODS = ['Bank Transfer', 'Cheque', 'Cash', 'UPI', 'Card', 'Other'];
// Payment method options for the Record Payment form
const PAYMENT_METHODS = ['Bank Transfer', 'UPI', 'Cheque', 'Cash'];
// Sales managers — mirrors the constant used across the Manager app (LeadsManagement.jsx)
const SALES_TEAM = ['Azar Abdullah A', 'Praveenraja P', 'Suresh P', 'Agsal A'];

// ── Money helpers ──────────────────────────────────────────────
const parseAmount = (val) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ''));
  return Number.isNaN(n) ? 0 : n;
};
const formatINR = (n) => '₹' + Math.round(parseAmount(n)).toLocaleString('en-IN');
const formatCompact = (val) => {
  const n = parseAmount(val);
  const trim = (v) => Number(v.toFixed(2)).toString();
  if (n >= 1e7) return '₹' + trim(n / 1e7) + 'Cr';
  if (n >= 1e5) return '₹' + trim(n / 1e5) + 'L';
  if (n >= 1e3) return '₹' + trim(n / 1e3) + 'K';
  return '₹' + Math.round(n);
};

// ── Date helpers ───────────────────────────────────────────────
const fmtDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const todayStr = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};
// Safe formatters that tolerate ISO strings, 'YYYY-MM-DD', or nothing.
const fmtAny = (d) => { if (!d) return ''; const dt = new Date(d); return Number.isNaN(dt.getTime()) ? String(d) : fmtDate(dt); };
const fmtDateTime = (d) => { if (!d) return ''; const dt = new Date(d); return Number.isNaN(dt.getTime()) ? String(d) : dt.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };

const RANGE_OPTIONS = [
  { key: 'all', label: 'All Time', days: null },
  { key: '7', label: 'Last 7 Days', days: 7 },
  { key: '30', label: 'Last 30 Days', days: 30 },
  { key: '90', label: 'Last 90 Days', days: 90 },
];
const rangeStart = (days) => {
  if (!days) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return start;
};

const deriveStatus = (p) => {
  if (p.status) return p.status;
  const invoice = Number(p.invoiceValue) || Number(p.orderValue) || 0;
  const collected = Number(p.amountCollected) || 0;
  if ((Number(p.overduePayments) || 0) > 0) return 'Overdue';
  if (invoice > 0 && collected >= invoice) return 'Paid';
  if (collected > 0) return 'Partial';
  return 'Pending';
};

const STATUS_OPTIONS = ['Paid', 'Partial', 'Pending', 'Overdue'];

// Status badge colours (drawer header / PDF)
const statusColor = (s) => ({ Paid: '#16A34A', Partial: '#2563EB', Pending: '#D97706', Overdue: '#DC2626' }[s] || '#64748B');
const statusBg = (s) => ({ Paid: '#DCFCE7', Partial: '#DBEAFE', Pending: '#FEF3C7', Overdue: '#FEE2E2' }[s] || '#F1F5F9');

// Build a timeline purely from the record's REAL data — no placeholder dates.
const buildTimeline = (p) => {
  const ev = [];
  if (p.createdAt) ev.push({ label: 'Invoice Generated', date: p.createdAt });
  const invoice = Number(p.invoiceValue) || Number(p.orderValue) || 0;
  const collected = Number(p.amountCollected) || 0;
  if (collected > 0 && invoice > 0 && collected < invoice && p.paymentDate)
    ev.push({ label: 'Partial Payment Received', date: p.paymentDate });
  if (invoice > 0 && collected >= invoice && (p.paymentDate || p.dueDate))
    ev.push({ label: 'Full Payment Cleared', date: p.paymentDate || p.dueDate });
  // Persisted timeline entries (e.g. reminders logged from the drawer)
  (Array.isArray(p.timeline) ? p.timeline : []).forEach((t) => { if (t && t.label && t.date) ev.push(t); });
  if (p.reminderSentAt && !ev.some((e) => e.label === 'Payment Reminder Sent' && e.date === p.reminderSentAt))
    ev.push({ label: 'Payment Reminder Sent', date: p.reminderSentAt });
  return ev.filter((e) => e.date).sort((a, b) => new Date(a.date) - new Date(b.date));
};

const DRAWER_TABS = [
  { key: 'overview', label: 'Payment Overview' },
  { key: 'billing', label: 'Billing Details' },
  { key: 'upload', label: 'Upload Invoice' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'notes', label: 'Notes' },
];

// ── Self-contained styles (Manager app has no global .card/.btn) ──
const cardStyle = { backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)' };
const btnPrimary = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'var(--sidebar-bg)', color: '#fff', border: 'none', borderRadius: 'var(--radius-lg)', padding: '0.8rem 1.4rem', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };
const btnOutline = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', background: 'var(--surface-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.6rem 1rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };
const inputStyle = { width: '100%', padding: '0.7rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', fontSize: '0.9rem', backgroundColor: 'var(--surface-color)', color: 'var(--text-main)', fontFamily: 'inherit', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-main)' };
const selectStyle = { appearance: 'none', WebkitAppearance: 'none', padding: '0.75rem 2.5rem 0.75rem 1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', outline: 'none', boxShadow: 'var(--shadow-sm)', fontFamily: 'inherit' };
const actionBtn = (bg, color) => ({ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', border: 'none', backgroundColor: bg, color, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' });

const KpiCard = ({ value, title, icon: Icon, color }) => (
  <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
    <div style={{ width: '52px', height: '52px', borderRadius: 'var(--radius-lg)', flexShrink: 0, backgroundColor: `${color}1A`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={26} />
    </div>
    <div>
      <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>{value}</h3>
      <p style={{ margin: '0.15rem 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{title}</p>
    </div>
  </div>
);

const emptyForm = {
  id: '', leadId: '', customer: '', orderValue: '', amountCollected: '',
  pendingPayments: '', upcomingDues: '', overduePayments: '', invoiceValue: '', dueDate: '',
  method: 'Bank Transfer', transactionId: '', cashPaidBy: '', paymentDate: '', notes: '', manager: '',
};

const Payments = () => {
  const mgrName = (localStorage.getItem('mgr_name') || '').trim();
  const [payments, setPayments] = useState([]);
  const [leads, setLeads] = useState([]);
  const [projects, setProjects] = useState([]); // order-confirmations — used to gate the Payment lead picker
  const [loaded, setLoaded] = useState(false);

  const [rangeKey, setRangeKey] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState('create'); // 'create' | 'edit' | 'view'
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // ── Payment Collection detail drawer ──
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('view'); // 'view' | 'edit'
  const [activeRecord, setActiveRecord] = useState(null);
  const [drawerForm, setDrawerForm] = useState({});
  const [activeTab, setActiveTab] = useState('overview');
  const [drawerSaving, setDrawerSaving] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [uploadFile, setUploadFile] = useState(null); // { name, data }

  // ── Load live payments (stored in MongoDB) ──
  const loadPayments = () => {
    return paymentsApi.list()
      .then((data) => { if (Array.isArray(data)) setPayments([...data].sort((a, b) => new Date(b.createdAt || b.paymentDate || b.dueDate || 0) - new Date(a.createdAt || a.paymentDate || a.dueDate || 0))); })
      .catch((err) => console.error('Failed to load payments:', err))
      .finally(() => setLoaded(true));
  };

  useEffect(() => { loadPayments(); }, []);
  useEffect(() => {
    leadsApi.list().then((d) => { if (Array.isArray(d)) setLeads(d); }).catch((e) => console.error('Failed to load leads:', e));
  }, []);
  useEffect(() => {
    projectsApi.list().then((d) => { if (Array.isArray(d)) setProjects(d); }).catch((e) => console.error('Failed to load order confirmations:', e));
  }, []);

  // ── Lifecycle gating for the Payment lead picker ──
  //   eligible = this manager's lead has a CONFIRMED order AND no payment record yet.
  const isOrderConfirmed = (p) => /confirm/i.test(String(p.status || ''));
  const leadHasOrderConfirmed = (leadId) => projects.some((p) => (p.leadId || '') === leadId && isOrderConfirmed(p));
  const leadHasPayment = (leadId) => payments.some((p) => p.leadId === leadId);
  const eligibleLeads = leads.filter((l) => (l.manager || '').trim() === mgrName && leadHasOrderConfirmed(l.id) && !leadHasPayment(l.id));

  const rangeDays = RANGE_OPTIONS.find((o) => o.key === rangeKey)?.days;
  const start = rangeStart(rangeDays);

  // Access control: a manager only sees payments for THEIR OWN assigned leads. The payments
  // collection is shared, so scope to this manager (by the payment's manager or its lead).
  const myLeadIds = useMemo(
    () => new Set((Array.isArray(leads) ? leads : []).filter((l) => (l.manager || '').trim() === mgrName).map((l) => l.id)),
    [leads, mgrName]
  );
  const mine = useMemo(
    () => payments.filter((p) => (p.manager || '').trim() === mgrName || (p.leadId && myLeadIds.has(p.leadId))),
    [payments, myLeadIds, mgrName]
  );

  // Rows after date range — drives the KPI totals
  const scoped = useMemo(() => mine.filter((p) => {
    const created = p.createdAt ? new Date(p.createdAt) : null;
    if (start && created && created < start) return false;
    return true;
  }), [mine, start]);

  const kpis = useMemo(() => {
    const sum = (key) => scoped.reduce((s, p) => s + (Number(p[key]) || 0), 0);
    return { collected: sum('amountCollected'), upcoming: sum('upcomingDues'), pending: sum('pendingPayments'), overdue: sum('overduePayments') };
  }, [scoped]);

  const filtered = useMemo(() => scoped.filter((p) => {
    if (statusFilter !== 'all' && deriveStatus(p) !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!((p.id || '').toLowerCase().includes(q) || (p.customer || '').toLowerCase().includes(q))) return false;
    }
    return true;
  }), [scoped, statusFilter, search]);

  useEffect(() => { setPage(1); }, [rangeKey, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PER_PAGE;
  const pageRows = filtered.slice(pageStart, pageStart + PER_PAGE);

  const nextInvoiceId = () => {
    let max = 1023;
    payments.forEach((p) => { const m = /(\d+)$/.exec(p.id || ''); if (m) max = Math.max(max, parseInt(m[1], 10)); });
    return `INV-${max + 1}`;
  };

  const openCreate = () => { setMode('create'); setForm({ ...emptyForm, id: nextInvoiceId(), paymentDate: todayStr(), manager: mgrName }); setModalOpen(true); };
  const openView = (p) => { setMode('view'); setForm({ ...emptyForm, ...p, paymentDate: p.paymentDate || p.dueDate || '' }); setModalOpen(true); };
  const openEdit = (p) => { setMode('edit'); setForm({ ...emptyForm, ...p, paymentDate: p.paymentDate || p.dueDate || '' }); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setForm(emptyForm); };

  const onLeadChange = (val) => {
    const lead = leads.find((l) => l.id === val || l.name === val);
    setForm((prev) => ({
      ...prev,
      leadId: lead?.id || prev.leadId,
      customer: lead?.name || val,
      manager: lead?.manager || prev.manager,
      orderValue: lead?.budget ? parseAmount(lead.budget) : prev.orderValue,
    }));
  };

  const buildPayload = () => ({
    id: (form.id || '').trim(),
    leadId: (form.leadId || '').trim(),
    customer: (form.customer || '').trim(),
    manager: (form.manager || '').trim(),
    orderValue: parseAmount(form.orderValue),
    amountCollected: parseAmount(form.amountCollected),
    pendingPayments: parseAmount(form.pendingPayments),
    upcomingDues: parseAmount(form.upcomingDues),
    overduePayments: parseAmount(form.overduePayments),
    invoiceValue: parseAmount(form.invoiceValue),
    method: form.method || '',
    transactionId: (form.transactionId || '').trim(),
    cashPaidBy: form.method === 'Cash' ? (form.cashPaidBy || '').trim() : '',
    paymentDate: form.paymentDate || '',
    // keep the table's Due Date column populated from the payment date when not set separately
    dueDate: form.dueDate || form.paymentDate || '',
    notes: (form.notes || '').trim(),
  });

  // ── Create / edit a payment (persists to Mongo) ──
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.id || !form.customer) return;
    // ── Enforce the strict lifecycle when recording a NEW payment ──
    if (mode === 'create') {
      if (!leadHasOrderConfirmed(form.leadId)) {
        notify('This lead has no confirmed order yet — confirm the order first.', 'warning');
        return;
      }
      if (leadHasPayment(form.leadId)) {
        notify('This lead already has a payment record. Only one payment collection is allowed per lead.', 'warning');
        return;
      }
    }
    setSaving(true);
    const payload = buildPayload();
    try {
      if (mode === 'edit') {
        await paymentsApi.update(payload.id, payload);
        notify('Payment updated', 'success');
      } else {
        await paymentsApi.create(payload);
        // Payment collected → this is the final stage. Lock it (leadHasPayment now excludes the
        // lead from the picker and blocks duplicates) and mark the lead Completed.
        if (payload.leadId) {
          leadsApi.update(payload.leadId, { status: 'Completed' })
            .catch((err) => console.error('Failed to mark lead Completed:', err));
        }
        notify('Payment recorded', 'success');
      }
      await loadPayments();
      closeModal();
    } catch (err) {
      console.error('Failed to save payment:', err);
      notify('Could not save. Is the Manager backend running on :5001?', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Inline due-date update (persists to Mongo) ──
  const handleDueDateChange = async (p, value) => {
    setPayments((prev) => prev.map((x) => (x.id === p.id ? { ...x, dueDate: value } : x)));
    try {
      await paymentsApi.update(p.id, { dueDate: value });
    } catch (err) {
      console.error('Failed to update due date:', err);
      notify('Could not update due date on the server.', 'error');
    }
  };

  // ── Quick "collect" action: mark fully collected (persists to Mongo) ──
  const handleCollect = async (p) => {
    const target = Number(p.invoiceValue) || Number(p.orderValue) || Number(p.amountCollected) || 0;
    const updated = { ...p, amountCollected: target, pendingPayments: 0, upcomingDues: 0, overduePayments: 0, status: 'Paid' };
    setPayments((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
    try {
      await paymentsApi.update(p.id, { amountCollected: target, pendingPayments: 0, upcomingDues: 0, overduePayments: 0, status: 'Paid' });
      notify(`Marked ${p.id} as fully collected`, 'success');
    } catch (err) {
      console.error('Failed to record collection:', err);
      notify('Could not save collection to the server.', 'error');
    }
  };

  // ── Drawer: pre-fill an editable/read-only copy from the record + linked lead ──
  //   Never invents values — falls back only to the record's own fields or the linked lead.
  const buildDrawerForm = (p) => {
    const lead = leads.find((l) => l.id === p.leadId) || {};
    const contact = [lead.phone, lead.email].filter(Boolean).join(' / ');
    return {
      ...p,
      customer: p.customer || lead.name || '',
      clientName: p.clientName || p.customer || lead.name || '',
      billingName: p.billingName || p.customer || lead.name || '',
      projectLocation: p.projectLocation || lead.location || '',
      contactDetails: p.contactDetails || contact || '',
      mobileNumber: p.mobileNumber || lead.phone || '',
      altMobile: p.altMobile || '',
      siteAddress: p.siteAddress || lead.location || '',
      billingAddress: p.billingAddress || '',
      gstNumber: p.gstNumber || '',
      email: p.email || lead.email || '',
      salesperson: p.salesperson || p.manager || '',
      orderValue: p.orderValue ?? '',
      amountCollected: p.amountCollected ?? '',
      pendingPayments: p.pendingPayments ?? '',
      upcomingDues: p.upcomingDues ?? '',
      overduePayments: p.overduePayments ?? '',
      invoiceValue: p.invoiceValue ?? '',
      dueDate: p.dueDate || '',
      method: p.method || '',
      status: deriveStatus(p),
    };
  };

  const openDrawer = (p, m) => {
    setActiveRecord(p);
    setDrawerForm(buildDrawerForm(p));
    setDrawerMode(m);
    setActiveTab('overview');
    setNoteText('');
    setUploadFile(null);
    setDrawerOpen(true);
  };
  const closeDrawer = () => { setDrawerOpen(false); setActiveRecord(null); setDrawerForm({}); };

  // Apply a patch to the table listing + drawer state, then persist to Mongo.
  const applyPatch = (id, patch) => {
    setPayments((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    setActiveRecord((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
    setDrawerForm((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
  };
  const persist = async (id, patch, msg) => {
    applyPatch(id, patch);
    try {
      await paymentsApi.update(id, patch);
      if (msg) notify(msg, 'success');
    } catch (err) {
      console.error('Failed to save payment change:', err);
      notify('Could not save to the server.', 'error');
    }
  };

  // Edit mode → persist the whole drawer form and drop back to read-only.
  const handleDrawerSave = async () => {
    if (!activeRecord) return;
    setDrawerSaving(true);
    const patch = {
      customer: (drawerForm.customer || '').trim(),
      orderValue: parseAmount(drawerForm.orderValue),
      amountCollected: parseAmount(drawerForm.amountCollected),
      pendingPayments: parseAmount(drawerForm.pendingPayments),
      upcomingDues: parseAmount(drawerForm.upcomingDues),
      overduePayments: parseAmount(drawerForm.overduePayments),
      invoiceValue: parseAmount(drawerForm.invoiceValue),
      dueDate: drawerForm.dueDate || '',
      method: drawerForm.method || '',
      cashPaidBy: drawerForm.method === 'Cash' ? (drawerForm.cashPaidBy || '').trim() : '',
      status: drawerForm.status || '',
      clientName: (drawerForm.clientName || '').trim(),
      projectLocation: (drawerForm.projectLocation || '').trim(),
      contactDetails: (drawerForm.contactDetails || '').trim(),
      billingName: (drawerForm.billingName || '').trim(),
      mobileNumber: (drawerForm.mobileNumber || '').trim(),
      altMobile: (drawerForm.altMobile || '').trim(),
      siteAddress: (drawerForm.siteAddress || '').trim(),
      billingAddress: (drawerForm.billingAddress || '').trim(),
      gstNumber: (drawerForm.gstNumber || '').trim(),
      email: (drawerForm.email || '').trim(),
      salesperson: (drawerForm.salesperson || '').trim(),
    };
    applyPatch(activeRecord.id, patch);
    try {
      await paymentsApi.update(activeRecord.id, patch);
      notify('Payment updated', 'success');
      setDrawerMode('view');
    } catch (err) {
      console.error('Failed to save payment:', err);
      notify('Could not save. Is the Manager backend running on :5001?', 'error');
    } finally {
      setDrawerSaving(false);
    }
  };

  // Footer: Reminder → append a real, now-dated timeline entry and persist.
  const handleReminder = () => {
    if (!activeRecord) return;
    const now = new Date().toISOString();
    const tl = Array.isArray(activeRecord.timeline) ? activeRecord.timeline : [];
    persist(activeRecord.id, { timeline: [...tl, { label: 'Payment Reminder Sent', date: now }], reminderSentAt: now }, 'Reminder logged');
  };

  // Notes tab: append a note to the record's notes log.
  const handleAddNote = () => {
    const text = noteText.trim();
    if (!text || !activeRecord) return;
    const log = Array.isArray(activeRecord.notesLog) ? activeRecord.notesLog : [];
    persist(activeRecord.id, { notesLog: [...log, { text, timestamp: new Date().toISOString() }] }, 'Note saved');
    setNoteText('');
  };

  // Upload Invoice tab: read the file as base64 and stage it.
  const onInvoiceFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setUploadFile({ name: f.name, data: reader.result });
    reader.readAsDataURL(f);
  };
  const handleUploadSubmit = () => {
    if (!activeRecord) return;
    const patch = { invoiceValue: parseAmount(drawerForm.invoiceValue) };
    if (uploadFile) { patch.invoiceFileName = uploadFile.name; patch.invoiceFileData = uploadFile.data; }
    persist(activeRecord.id, patch, 'Invoice saved');
    setUploadFile(null);
  };

  // Footer: Log Payment → reuse the existing Record Payment modal in edit mode.
  const handleLogPayment = () => { if (activeRecord) { openEdit(activeRecord); setDrawerOpen(false); } };

  // ── Download: dependency-free PDF via a new window + window.print() ──
  //   Populated ENTIRELY from live data (record + linked lead). No placeholders.
  const downloadPdf = (p) => {
    const d = buildDrawerForm(p);
    const st = deriveStatus(p);
    const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const row = (label, val) => `<tr><td class="lbl">${esc(label)}</td><td class="val">${esc(val || '—')}</td></tr>`;
    const money = (v) => formatINR(v);
    const overview = [
      row('Order Value', money(d.orderValue)),
      row('Invoice Value', money(d.invoiceValue)),
      row('Amount Collected', money(d.amountCollected)),
      row('Upcoming Dues', money(d.upcomingDues)),
      row('Pending Payments', money(d.pendingPayments)),
      row('Overdue Payments', money(d.overduePayments)),
      row('Due Date', d.dueDate ? fmtAny(d.dueDate) : '—'),
      row('Payment Method', d.method),
      ...(d.method === 'Cash' ? [row('Cash Paid By', d.cashPaidBy)] : []),
      row('Status', st),
    ].join('');
    const billing = [
      row('Client Name', d.clientName),
      row('Project Location', d.projectLocation),
      row('Contact Details', d.contactDetails),
      row('Billing Name', d.billingName),
      row('Mobile Number', d.mobileNumber),
      row('Alternate Mobile', d.altMobile),
      row('Site Address', d.siteAddress),
      row('Billing Address', d.billingAddress),
      row('GST Number', d.gstNumber),
      row('Email / WhatsApp', d.email),
      row('Salesperson', d.salesperson),
    ].join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(p.id || 'Invoice')}</title>
<style>
  *{box-sizing:border-box} body{font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;margin:0;padding:32px;background:#fff}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f172a;padding-bottom:16px;margin-bottom:24px}
  .head h1{margin:0;font-size:22px} .head .sub{color:#475569;font-size:13px;margin-top:4px}
  .badge{display:inline-block;padding:5px 14px;border-radius:999px;font-size:12px;font-weight:700;color:${statusColor(st)};background:${statusBg(st)}}
  h2{font-size:14px;text-transform:uppercase;letter-spacing:.05em;color:#059669;margin:24px 0 8px}
  table{width:100%;border-collapse:collapse;margin-bottom:8px}
  td{padding:9px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;vertical-align:top}
  td.lbl{color:#64748b;width:42%;font-weight:600} td.val{color:#0f172a;font-weight:600}
  .ft{margin-top:28px;color:#94a3b8;font-size:11px;text-align:center}
</style></head><body>
  <div class="head">
    <div><h1>Payment Collection — ${esc(p.id || '')}</h1>
    <div class="sub">${esc(d.billingName || d.customer || '')}${d.clientName ? ' · ' + esc(d.clientName) : ''}</div></div>
    <span class="badge">${esc(st)}</span>
  </div>
  <h2>Payment Overview</h2>
  <table>${overview}</table>
  <h2>Billing Details</h2>
  <table>${billing}</table>
  <div class="ft">Generated ${esc(fmtDate(new Date()))}</div>
  <scr` + `ipt>window.onload=function(){setTimeout(function(){window.print();},350);}</scr` + `ipt>
</body></html>`;
    const win = window.open('', '_blank');
    if (!win) { notify('Please allow pop-ups to download the invoice.', 'warning'); return; }
    win.document.write(html);
    win.document.close();
  };

  const th = { padding: '0.9rem 1.25rem', fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.03em', textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap', textAlign: 'left' };
  const td = { padding: '1.1rem 1.25rem', fontSize: '0.9rem', whiteSpace: 'nowrap', verticalAlign: 'middle' };
  const today = todayStr();
  const readOnly = mode === 'view';

  // ── Drawer field renderers (edit shows inputs, view shows values) ──
  const drawerEdit = drawerMode === 'edit';
  const setDF = (key, val) => setDrawerForm((f) => ({ ...f, [key]: val }));
  const valueBox = { fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', wordBreak: 'break-word' };
  const dLabel = { fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.3rem' };

  // A labelled field. money → format in view mode; select → options list.
  const dField = (label, key, opts = {}) => (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={dLabel}>{label}</span>
      {drawerEdit ? (
        opts.select ? (
          <select value={drawerForm[key] ?? ''} onChange={(e) => setDF(key, e.target.value)} style={{ ...inputStyle, appearance: 'auto' }}>
            {opts.select.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input
            value={drawerForm[key] ?? ''}
            onChange={(e) => setDF(key, e.target.value)}
            type={opts.type || 'text'}
            inputMode={opts.money ? 'numeric' : undefined}
            style={inputStyle}
          />
        )
      ) : (
        <span style={valueBox}>{opts.money ? formatINR(drawerForm[key]) : (opts.date ? (drawerForm[key] ? fmtAny(drawerForm[key]) : '—') : (drawerForm[key] || '—'))}</span>
      )}
    </div>
  );

  const drawerStatus = activeRecord ? deriveStatus({ ...activeRecord, ...drawerForm }) : 'Pending';
  const drawerTimeline = activeRecord ? buildTimeline(activeRecord) : [];
  const drawerNotes = activeRecord && Array.isArray(activeRecord.notesLog) ? activeRecord.notesLog : [];

  const drawerCard = { border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' };
  const cardTitle = { display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)' };
  const footBtn = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', flex: 1, border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-main)', borderRadius: 'var(--radius-md)', padding: '0.65rem 0.5rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Pages / Payment Collection</div>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>Payment Collection</h1>
        </div>
        <button onClick={openCreate} style={btnPrimary}>
          <Plus size={18} /> Record Payment
        </button>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        <KpiCard value={formatCompact(kpis.collected)} title="Total Collected" icon={CheckCircle} color="#22C55E" />
        <KpiCard value={formatCompact(kpis.upcoming)} title="Upcoming Dues" icon={Clock} color="#3B82F6" />
        <KpiCard value={formatCompact(kpis.pending)} title="Pending Payments" icon={AlertCircle} color="#F59E0B" />
        <KpiCard value={formatCompact(kpis.overdue)} title="Overdue Payments" icon={XCircle} color="#EF4444" />
      </div>

      {/* Table card */}
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', gap: '1rem', padding: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input type="text" placeholder="Search Invoice..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...inputStyle, paddingLeft: '2.4rem' }} />
          </div>
          <div style={{ position: 'relative' }}>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
              <option value="all">Filter by Status</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown size={16} style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          </div>
          <div style={{ position: 'relative' }}>
            <Calendar size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <select value={rangeKey} onChange={(e) => setRangeKey(e.target.value)} style={{ ...selectStyle, paddingLeft: '2.4rem' }}>
              {RANGE_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.days ? o.label : 'Date Range'}</option>)}
            </select>
            <ChevronDown size={16} style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1250px' }}>
            <thead>
              <tr style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={th}>Lead ID</th>
                <th style={th}>Customer</th>
                <th style={th}>Order Value</th>
                <th style={th}>Amount Collected</th>
                <th style={th}>Upcoming Dues</th>
                <th style={th}>Pending Payments</th>
                <th style={th}>Overdue Payments</th>
                <th style={th}>Invoice Value</th>
                <th style={th}>Due Date</th>
                <th style={th}>Method</th>
                <th style={{ ...th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loaded && filtered.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {payments.length === 0 ? 'No payments yet. Click “Record Payment” to add one.' : 'No invoices match the selected filters.'}
                  </td>
                </tr>
              )}
              {pageRows.map((p, i) => {
                const overdue = p.dueDate && p.dueDate < today;
                return (
                  <tr key={p._id || p.id || i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ ...td, fontWeight: 700, color: 'var(--primary-color)' }}>
                      {p.leadId || '—'}
                      {p.id && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>{p.id}</div>}
                    </td>
                    <td style={{ ...td, fontWeight: 700 }}>{p.customer || '—'}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{formatINR(p.orderValue)}</td>
                    <td style={{ ...td, fontWeight: 700, color: '#16A34A' }}>{formatINR(p.amountCollected)}</td>
                    <td style={{ ...td, color: 'var(--text-muted)' }}>{formatINR(p.upcomingDues)}</td>
                    <td style={{ ...td, color: 'var(--text-muted)' }}>{formatINR(p.pendingPayments)}</td>
                    <td style={{ ...td, color: 'var(--text-muted)' }}>{formatINR(p.overduePayments)}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{formatINR(p.invoiceValue)}</td>
                    <td style={td}>
                      <input
                        type="date"
                        value={p.dueDate || ''}
                        onChange={(e) => handleDueDateChange(p, e.target.value)}
                        style={{ padding: '0.5rem 0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.85rem', outline: 'none', color: overdue ? '#DC2626' : 'var(--text-main)', fontWeight: overdue ? 700 : 500, backgroundColor: 'var(--surface-color)', cursor: 'pointer', fontFamily: 'inherit' }}
                      />
                    </td>
                    <td style={{ ...td, color: 'var(--text-muted)' }}>{p.method || '-'}</td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        <button title="View" onClick={() => openDrawer(p, 'view')} style={actionBtn('#EFF3F9', '#475569')}><Eye size={16} /></button>
                        <button title="Edit" onClick={() => openDrawer(p, 'edit')} style={actionBtn('#F1F5F9', '#64748B')}><Pencil size={15} /></button>
                        <button title="Mark collected" onClick={() => handleCollect(p)} style={actionBtn('#EEF2FF', '#4F46E5')}><CreditCard size={16} /></button>
                        <button title="Download PDF" onClick={() => downloadPdf(p)} style={actionBtn('#ECFDF5', '#059669')}><Download size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '1rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Showing {pageStart + 1} to {Math.min(pageStart + PER_PAGE, filtered.length)} of {filtered.length} invoices
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} style={{ ...btnOutline, padding: '0.4rem 0.8rem', opacity: safePage === 1 ? 0.5 : 1, cursor: safePage === 1 ? 'not-allowed' : 'pointer' }}>‹</button>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((n) => (
                <button key={n} onClick={() => setPage(n)} style={{ minWidth: '38px', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: n === safePage ? 'var(--primary-color)' : 'transparent', color: n === safePage ? '#fff' : 'var(--text-main)', border: n === safePage ? 'none' : '1px solid var(--border-color)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{n}</button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} style={{ ...btnOutline, padding: '0.4rem 0.8rem', opacity: safePage === totalPages ? 0.5 : 1, cursor: safePage === totalPages ? 'not-allowed' : 'pointer' }}>›</button>
            </div>
          </div>
        )}
      </div>

      {/* Record / Edit / View Payment modal */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}>
          <div style={{ ...cardStyle, width: '100%', maxWidth: '620px', padding: '1.75rem', borderRadius: '1rem', margin: 'auto' }}>
            {/* Header: icon + title + subtitle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#DCFCE7', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CreditCard size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {mode === 'view' ? 'Payment Details' : mode === 'edit' ? 'Edit Payment' : 'Record Payment'}
                  </h3>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Log a new payment receipt.</p>
                </div>
              </div>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={22} /></button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.35rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: '#059669' }}>
                  <span>₹</span> TRANSACTION DETAILS
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.1rem' }}>
                  <div>
                    <label style={labelStyle}>Lead ID</label>
                    <select value={form.leadId} onChange={(e) => onLeadChange(e.target.value)} disabled={readOnly} style={{ ...inputStyle, appearance: 'auto' }}>
                      <option value="">Select Lead ID</option>
                      {(mode === 'create' ? eligibleLeads : leads).map((l) => <option key={l.id} value={l.id}>{l.name ? `${l.id} — ${l.name}` : l.id}</option>)}
                      {mode === 'create' && eligibleLeads.length === 0 && <option value="" disabled>No order-confirmed leads awaiting payment</option>}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Invoice ID</label>
                    <input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} disabled={readOnly || mode === 'edit'} type="text" placeholder="e.g. INV-1024" style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Customer</label>
                  <input value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} disabled={readOnly} type="text" placeholder="e.g. Akash Kumar" style={inputStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.1rem' }}>
                  <div><label style={labelStyle}>Order Value (₹)</label><input value={form.orderValue} onChange={(e) => setForm({ ...form, orderValue: e.target.value })} disabled={readOnly} type="text" inputMode="numeric" placeholder="e.g. 425000" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Invoice Value (₹)</label><input value={form.invoiceValue} onChange={(e) => setForm({ ...form, invoiceValue: e.target.value })} disabled={readOnly} type="text" inputMode="numeric" placeholder="e.g. 425000" style={inputStyle} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.1rem' }}>
                  <div><label style={labelStyle}>Amount Collected (₹)</label><input value={form.amountCollected} onChange={(e) => setForm({ ...form, amountCollected: e.target.value })} disabled={readOnly} type="text" inputMode="numeric" placeholder="e.g. 425000" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Pending Payments (₹)</label><input value={form.pendingPayments} onChange={(e) => setForm({ ...form, pendingPayments: e.target.value })} disabled={readOnly} type="text" inputMode="numeric" placeholder="e.g. 0" style={inputStyle} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.1rem' }}>
                  <div><label style={labelStyle}>Upcoming Dues (₹)</label><input value={form.upcomingDues} onChange={(e) => setForm({ ...form, upcomingDues: e.target.value })} disabled={readOnly} type="text" inputMode="numeric" placeholder="e.g. 0" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Overdue Payments (₹)</label><input value={form.overduePayments} onChange={(e) => setForm({ ...form, overduePayments: e.target.value })} disabled={readOnly} type="text" inputMode="numeric" placeholder="e.g. 0" style={inputStyle} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.1rem' }}>
                  <div>
                    <label style={labelStyle}>Payment Method</label>
                    <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} disabled={readOnly} style={{ ...inputStyle, appearance: 'auto' }}>
                      {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Transaction ID / Cheque No.</label><input value={form.transactionId} onChange={(e) => setForm({ ...form, transactionId: e.target.value })} disabled={readOnly} type="text" placeholder="e.g. TXN123456 / 004521" style={inputStyle} /></div>
                </div>
                {form.method === 'Cash' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.1rem' }}>
                    <div><label style={labelStyle}>Cash Received From (Paid By)</label><input value={form.cashPaidBy} onChange={(e) => setForm({ ...form, cashPaidBy: e.target.value })} disabled={readOnly} type="text" placeholder="Name of the person who paid the cash" style={inputStyle} /></div>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.1rem' }}>
                  <div><label style={labelStyle}>Payment Date</label><input value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} disabled={readOnly} type="date" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Due Date</label><input value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} disabled={readOnly} type="date" style={inputStyle} /></div>
                </div>
                <div>
                  <label style={labelStyle}>Manager</label>
                  <select value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} disabled={readOnly} style={{ ...inputStyle, appearance: 'auto' }}>
                    <option value="">Select Manager</option>
                    {SALES_TEAM.map((name) => <option key={name} value={name}>{name}</option>)}
                    {form.manager && !SALES_TEAM.includes(form.manager) && <option value={form.manager}>{form.manager}</option>}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Payment Notes &amp; Remarks</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} disabled={readOnly} rows={3} placeholder="Any remarks about this payment…" style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.25rem' }}>
                <button type="button" onClick={closeModal} style={{ ...btnOutline, padding: '0.7rem 1.6rem' }}>{readOnly ? 'Close' : 'Cancel'}</button>
                {!readOnly && (
                  <button type="submit" disabled={saving || !form.id || !form.customer} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#10B981', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '0.7rem 1.8rem', fontSize: '0.95rem', fontWeight: 700, cursor: (saving || !form.id || !form.customer) ? 'not-allowed' : 'pointer', opacity: (saving || !form.id || !form.customer) ? 0.5 : 1, fontFamily: 'inherit' }}>
                    {saving ? 'Saving…' : 'Record Payment'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Payment Collection detail drawer (slide-over) ── */}
      {drawerOpen && activeRecord && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 250 }}>
          {/* overlay */}
          <div onClick={closeDrawer} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)' }} />
          {/* panel */}
          <div style={{ position: 'absolute', top: 0, right: 0, height: '100%', width: '600px', maxWidth: '100%', backgroundColor: 'var(--surface-color)', boxShadow: '-8px 0 30px rgba(15,23,42,0.2)', display: 'flex', flexDirection: 'column' }}>
            {/* HEADER */}
            <div style={{ padding: '1.25rem 1.4rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>{activeRecord.id}</h3>
                    <span style={{ padding: '0.25rem 0.7rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, color: statusColor(drawerStatus), backgroundColor: statusBg(drawerStatus) }}>{drawerStatus}</span>
                  </div>
                  <div style={{ marginTop: '0.35rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{drawerForm.billingName || drawerForm.customer || '—'}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{drawerForm.clientName || drawerForm.customer || '—'}</div>
                </div>
                <button onClick={closeDrawer} title="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}><X size={22} /></button>
              </div>
              {drawerMode === 'view' && (
                <button onClick={() => setDrawerMode('edit')} style={{ ...btnOutline, marginTop: '0.9rem', padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}><Pencil size={14} /> Edit</button>
              )}
            </div>

            {/* TABS */}
            <div style={{ display: 'flex', gap: '0.15rem', padding: '0 0.5rem', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
              {DRAWER_TABS.map((t) => (
                <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ background: 'none', border: 'none', borderBottom: activeTab === t.key ? '2px solid var(--primary-color)' : '2px solid transparent', color: activeTab === t.key ? 'var(--primary-color)' : 'var(--text-muted)', fontWeight: 700, fontSize: '0.8rem', padding: '0.85rem 0.55rem', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>{t.label}</button>
              ))}
            </div>

            {/* BODY */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.2rem 1.4rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {/* Payment Overview */}
              {activeTab === 'overview' && (
                <>
                  <div style={drawerCard}>
                    <div style={cardTitle}><CreditCard size={16} /> Payment Status</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
                      {dField('Order Value', 'orderValue', { money: true })}
                      {dField('Amount Collected', 'amountCollected', { money: true })}
                      {dField('Upcoming Dues', 'upcomingDues', { money: true })}
                      {dField('Pending Payments', 'pendingPayments', { money: true })}
                      {dField('Overdue Payments', 'overduePayments', { money: true })}
                      {dField('Invoice Value', 'invoiceValue', { money: true })}
                      {dField('Due Date', 'dueDate', { type: 'date', date: true })}
                      {dField('Status', 'status', { select: STATUS_OPTIONS })}
                    </div>
                  </div>
                  <div style={drawerCard}>
                    <div style={cardTitle}><ListChecks size={16} /> Payment Method</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.9rem' }}>
                      {dField('Selected Method', 'method', { select: METHODS })}
                    </div>
                  </div>
                </>
              )}

              {/* Billing Details */}
              {activeTab === 'billing' && (
                <div style={drawerCard}>
                  <div style={cardTitle}><FileText size={16} /> Client &amp; Project Details</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
                    {dField('Client Name', 'clientName')}
                    {dField('Project Location', 'projectLocation')}
                    {dField('Contact Details', 'contactDetails')}
                    {dField('Billing Name', 'billingName')}
                    {dField('Mobile Number', 'mobileNumber')}
                    {dField('Alternate Mobile', 'altMobile')}
                    {dField('GST Number', 'gstNumber')}
                    {dField('Email ID / WhatsApp', 'email')}
                    {dField('Salesperson', 'salesperson')}
                  </div>
                  {dField('Site Address', 'siteAddress')}
                  {dField('Billing Address', 'billingAddress')}
                </div>
              )}

              {/* Upload Invoice */}
              {activeTab === 'upload' && (
                <div style={drawerCard}>
                  <div style={cardTitle}><Upload size={16} /> Upload Invoice</div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={dLabel}>Invoice Value (₹)</span>
                    <input value={drawerForm.invoiceValue ?? ''} onChange={(e) => setDF('invoiceValue', e.target.value)} type="text" inputMode="numeric" placeholder="e.g. 425000" style={inputStyle} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={dLabel}>Upload Document</span>
                    <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={onInvoiceFile} style={{ ...inputStyle, padding: '0.55rem' }} />
                    {(uploadFile || activeRecord.invoiceFileName) && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {uploadFile ? `Selected: ${uploadFile.name}` : `Stored: ${activeRecord.invoiceFileName}`}
                      </div>
                    )}
                  </div>
                  <button onClick={handleUploadSubmit} style={{ ...btnPrimary, alignSelf: 'flex-start', background: '#10B981' }}><Save size={15} /> Submit</button>
                </div>
              )}

              {/* Timeline */}
              {activeTab === 'timeline' && (
                <div style={drawerCard}>
                  <div style={cardTitle}><Clock size={16} /> Timeline</div>
                  {drawerTimeline.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No timeline events yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {drawerTimeline.map((ev, i) => (
                        <div key={i} style={{ display: 'flex', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', marginTop: '3px', flexShrink: 0 }} />
                            {i < drawerTimeline.length - 1 && <span style={{ width: '2px', flex: 1, backgroundColor: 'var(--border-color)', minHeight: '22px' }} />}
                          </div>
                          <div style={{ paddingBottom: '0.9rem' }}>
                            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>{ev.label}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{fmtDateTime(ev.date)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {activeTab === 'notes' && (
                <div style={drawerCard}>
                  <div style={cardTitle}><StickyNote size={16} /> Notes</div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={dLabel}>Add Note</span>
                    <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={3} placeholder="Write a note…" style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
                    <button onClick={handleAddNote} disabled={!noteText.trim()} style={{ ...btnPrimary, alignSelf: 'flex-start', marginTop: '0.6rem', background: '#10B981', opacity: noteText.trim() ? 1 : 0.5, cursor: noteText.trim() ? 'pointer' : 'not-allowed' }}><Save size={15} /> Save Note</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {drawerNotes.length === 0 ? (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No notes yet.</div>
                    ) : (
                      drawerNotes.slice().reverse().map((n, i) => (
                        <div key={i} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.7rem 0.85rem' }}>
                          <div style={{ fontSize: '0.87rem', color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>{n.text}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>{fmtDateTime(n.timestamp)}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div style={{ borderTop: '1px solid var(--border-color)', padding: '0.9rem 1.4rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {drawerEdit && (
                <button onClick={handleDrawerSave} disabled={drawerSaving} style={{ ...btnPrimary, background: '#10B981', width: '100%', opacity: drawerSaving ? 0.6 : 1, cursor: drawerSaving ? 'not-allowed' : 'pointer' }}>
                  <Save size={16} /> {drawerSaving ? 'Saving…' : 'Save Changes'}
                </button>
              )}
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button onClick={() => downloadPdf(activeRecord)} style={footBtn}><Download size={15} /> Invoice</button>
                <button onClick={handleReminder} style={footBtn}><Bell size={15} /> Reminder</button>
                <button onClick={handleLogPayment} style={footBtn}><CreditCard size={15} /> Log Payment</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
