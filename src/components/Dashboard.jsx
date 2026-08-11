import React, { useState, useEffect } from 'react';
import {
  Users,
  Flame,
  Thermometer,
  Snowflake,
  XCircle,
  Trash2,
  CalendarDays,
  Activity,
  CheckCircle2,
  Clock,
  FileText,
  FolderOpen,
  AlertCircle
} from 'lucide-react';
import './Dashboard.css';
import DateRangePicker from './DateRangePicker';
import { leadsApi, quotationsApi, appointmentsApi, projectsApi, pipelineApi, paymentsApi } from '../api/client';

// ── money helpers ──
const parseAmount = (v) => {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return Number.isNaN(n) ? 0 : n;
};
const quoteTotal = (q) => parseAmount(q.amount) + parseAmount(q.gst);
const formatCompact = (n) => {
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2) + 'Cr';
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(1) + 'L';
  if (n >= 1e3) return '₹' + Math.round(n / 1e3) + 'K';
  return '₹' + Math.round(n).toLocaleString('en-IN');
};
const invoiceStatus = (q) =>
  q.approvalStatus === 'Approved' && q.quotationStatus === 'Prepared' ? 'Received'
    : q.approvalStatus === 'Approved' ? 'Advance Received'
    : 'Pending';

const Dashboard = ({ setActivePage }) => {
  const [fromDate, setFromDate] = useState('2026-05-02');
  const [toDate, setToDate] = useState('2026-06-01');
  const [, setCalendarFilter] = useState('June');

  const [leads, setLeads] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [pipeline, setPipeline] = useState([]); // Sales Pipeline opportunities (same source as the page)
  const [payments, setPayments] = useState([]); // Payment Collection records (same source as the page)

  useEffect(() => {
    leadsApi.list().then((d) => Array.isArray(d) && setLeads(d)).catch((e) => console.error(e));
    quotationsApi.list().then((d) => Array.isArray(d) && setQuotes(d)).catch((e) => console.error(e));
    appointmentsApi.list().then((d) => Array.isArray(d) && setAppointments(d)).catch((e) => console.error(e));
    projectsApi.list().then((d) => Array.isArray(d) && setProjects(d)).catch((e) => console.error(e));
    pipelineApi.list().then((d) => Array.isArray(d) && setPipeline(d)).catch((e) => console.error(e));
    paymentsApi.list().then((d) => Array.isArray(d) && setPayments(d)).catch((e) => console.error(e));
  }, []);

  const monthsMap = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // ── Scope everything to the logged-in manager's own data ──
  const mgrName = (localStorage.getItem('mgr_name') || '').trim();
  const mgrKey = mgrName.toLowerCase();
  const myAppts = appointments.filter((a) => (a.manager || '').trim().toLowerCase() === mgrKey);
  const myLeads = leads.filter((l) => (l.manager || '').trim().toLowerCase() === mgrKey);
  const myLeadIds = new Set(myLeads.map((l) => l.id));
  const myQuotes = quotes.filter((q) => myLeadIds.has(q.leadId));

  const todayStr = new Date().toISOString().split('T')[0];
  const nowMs = Date.now();
  const statusHas = (l, kw) => (l.status || '').toLowerCase().includes(kw);

  // ── Lead Management metrics ──
  const totalLeads = myLeads.length;
  const newLeads = myLeads.filter((l) => statusHas(l, 'new')).length;
  const hotLeads = myLeads.filter((l) => statusHas(l, 'hot')).length;
  const warmLeads = myLeads.filter((l) => statusHas(l, 'warm')).length;
  const coldLeads = myLeads.filter((l) => statusHas(l, 'cold')).length;
  const lostLeads = myLeads.filter((l) => statusHas(l, 'lost')).length;
  const junkLeads = myLeads.filter((l) => statusHas(l, 'junk')).length;

  // ── Appointment metrics ──
  const totalAppointments = myAppts.filter((a) => a.type !== 'Visits').length;
  const visitPlanned = myAppts.filter((a) => a.type === 'Visits').length;
  const appointmentComplete = myAppts.filter((a) => a.status === 'Completed' && a.type !== 'Visits').length;
  const visitCompleted = myAppts.filter((a) => a.type === 'Visits' && a.status === 'Completed').length;
  const rescheduled = myAppts.filter((a) => a.rescheduledAt).length;
  const completedToday = myAppts.filter((a) => a.status === 'Completed' && a.date === todayStr).length;

  // ── Quotation metrics ──
  const requestedQuotation = myQuotes.length;
  const pendingQuotation = myQuotes.filter((q) => q.approvalStatus !== 'Approved').length;
  const approvedQuotation = myQuotes.filter((q) => q.approvalStatus === 'Approved').length;

  // ── Order Confirmation / Sales Pipeline metrics ──
  // Access control: count only THIS manager's order confirmations (by salesperson/manager or lead).
  const myProjects = projects.filter((p) =>
    [p.manager, p.salesperson, p.salespersonName].some((v) => (v || '').trim().toLowerCase() === mgrKey) ||
    (p.leadId && myLeadIds.has(p.leadId))
  );
  const orderConfirmationDocs = myProjects.length;

  // ── Sales Pipeline value — SAME merged source as the Sales Pipeline page ──
  // (every valued lead becomes an opportunity, overlaid by this manager's saved pipeline docs).
  const leadOpps = myLeads
    .filter((l) => parseAmount(l.budget) > 0 && !statusHas(l, 'junk'))
    .map((l) => ({ id: `OP-${parseInt(String(l.id || '').replace(/\D/g, '')) || l.id}`, leadId: l.id, value: parseAmount(l.budget) }));
  const myPipeDocs = pipeline.filter((p) =>
    (p.manager || '').trim().toLowerCase() === mgrKey || (p.leadId && myLeadIds.has(p.leadId))
  );
  const pipeDocIds = new Set(myPipeDocs.map((p) => p.id));
  const pipeDocLeadIds = new Set(myPipeDocs.map((p) => p.leadId).filter(Boolean));
  const mergedPipeline = [
    ...myPipeDocs,
    ...leadOpps.filter((lo) => !pipeDocIds.has(lo.id) && !(lo.leadId && pipeDocLeadIds.has(lo.leadId))),
  ];
  const pipelineCount = mergedPipeline.length;
  const pipelineValue = mergedPipeline.reduce((s, o) => s + (Number(o.value) || 0), 0);
  const ordersClosed = myLeads.filter((l) => statusHas(l, 'order')).length;
  const orderConfirmed = myLeads.filter((l) => statusHas(l, 'confirm')).length;
  const closedToday = myLeads.filter((l) => statusHas(l, 'order') && (l.updatedAt || '').startsWith(todayStr)).length;

  // ── Payment Collection metrics — SAME real payments collection as the page ──
  const myPayments = payments.filter((p) =>
    (p.manager || '').trim().toLowerCase() === mgrKey || (p.leadId && myLeadIds.has(p.leadId))
  );
  const sumPay = (key) => myPayments.reduce((s, p) => s + (Number(p[key]) || 0), 0);
  const totalCollected = sumPay('amountCollected');
  const upcomingDues = sumPay('upcomingDues');
  const pendingPayment = sumPay('pendingPayments');
  const overduePayment = sumPay('overduePayments');

  // ── Sections config ──
  const sections = [
    {
      title: 'Lead Management',
      cards: [
        { title: 'Total Leads', value: totalLeads, sub: 'All leads in system', bg: '#f4f3ff', color: '#7c3aed', icon: <Users size={20} />, page: 'leads' },
        { title: 'New Leads', value: newLeads, sub: 'Freshly received', bg: '#eef4ff', color: '#2563eb', icon: <Users size={20} />, page: 'leads' },
        { title: 'Hot Leads', value: hotLeads, sub: 'High conversion chance', bg: '#fdf1f0', color: '#ef4444', icon: <Flame size={20} />, page: 'leads' },
        { title: 'Warm Leads', value: warmLeads, sub: 'Nurturing in progress', bg: '#ffffff', color: '#f97316', icon: <Thermometer size={20} />, page: 'leads' },
        { title: 'Cold Leads', value: coldLeads, sub: 'Need re-engagement', bg: '#eff5fb', color: '#0ea5e9', icon: <Snowflake size={20} />, page: 'leads' },
        { title: 'Lost Deal', value: lostLeads, sub: 'Unsuccessful deals', bg: '#fef4ec', color: '#f97316', icon: <XCircle size={20} />, page: 'leads' },
        { title: 'Junk', value: junkLeads, sub: 'Unqualified leads', bg: '#ffffff', color: '#64748b', icon: <Trash2 size={20} />, page: 'leads' }
      ]
    },
    {
      title: 'Appointments',
      cards: [
        { title: 'Total Appointments', value: totalAppointments, sub: 'Scheduled this month', bg: '#f4f6ff', color: '#2563eb', icon: <CalendarDays size={20} />, page: 'appointments' },
        { title: 'Total Visit Planned', value: visitPlanned, sub: 'Planned site visits', bg: '#f6f4fe', color: '#7c3aed', icon: <Activity size={20} />, page: 'appointments' },
        { title: 'Appointment Complete', value: appointmentComplete, sub: `+${completedToday} Completed Today`, bg: '#eefdf3', color: '#16a34a', icon: <Users size={20} />, page: 'appointments' },
        { title: 'Total Visit Completed', value: visitCompleted, sub: 'Done this week', bg: '#ffffff', color: '#f59e0b', icon: <CheckCircle2 size={20} />, page: 'appointments' },
        { title: 'Rescheduled Appointment', value: rescheduled, sub: 'Needs follow-up', bg: '#f8fafc', color: '#64748b', icon: <Clock size={20} />, page: 'appointments' }
      ]
    },
    {
      title: 'Quotations',
      cards: [
        { title: 'Requested Quotation', value: requestedQuotation, sub: 'New requests this week', bg: '#eef4ff', color: '#2563eb', icon: <FileText size={20} />, page: 'quotations' },
        { title: 'Pending Quotation', value: pendingQuotation, sub: 'Awaiting approval', bg: '#fef4ec', color: '#ea580c', icon: <Clock size={20} />, page: 'quotations' },
        { title: 'Approved Quotation', value: approvedQuotation, sub: 'Signed this month', bg: '#eefdf3', color: '#16a34a', icon: <CheckCircle2 size={20} />, page: 'quotations' }
      ]
    },
    {
      title: 'Order Confirmation',
      cards: [
        { title: 'Order Confirmation', value: orderConfirmationDocs, sub: 'Documents & filing', bg: '#fefce8', color: '#ca8a04', icon: <FolderOpen size={20} />, page: 'projects' }
      ]
    },
    {
      title: 'Sales Pipeline',
      cards: [
        { title: 'Sales Pipeline Value', value: formatCompact(pipelineValue), sub: 'Active opportunities', bg: '#fef4ec', color: '#ea580c', icon: <FileText size={20} />, page: 'quotations' },
        { title: 'Order Closed', value: ordersClosed, sub: `+${closedToday} Closed Today`, bg: '#fefce8', color: '#f97316', icon: <Flame size={20} />, page: 'projects' },
        { title: 'Order Confirmed', value: orderConfirmed, sub: 'Successfully closed', bg: '#eefdf3', color: '#16a34a', icon: <CheckCircle2 size={20} />, page: 'projects' }
      ]
    },
    {
      title: 'Payment Collection',
      cards: [
        { title: 'Total Collected', value: formatCompact(totalCollected), sub: 'Amount received', bg: '#eefdf3', color: '#16a34a', icon: <CheckCircle2 size={20} />, page: 'payments' },
        { title: 'Upcoming Dues', value: formatCompact(upcomingDues), sub: 'Due this month', bg: '#eff4ff', color: '#2563eb', icon: <Clock size={20} />, page: 'payments' },
        { title: 'Pending Payments', value: formatCompact(pendingPayment), sub: 'Awaiting clearance', bg: '#fef4ec', color: '#ea580c', icon: <AlertCircle size={20} />, page: 'payments' },
        { title: 'Overdue Payments', value: formatCompact(overduePayment), sub: 'Past due date', bg: '#fdf1f0', color: '#ef4444', icon: <XCircle size={20} />, page: 'payments' }
      ]
    }
  ];

  return (
    <div className="dashboard">

      {/* Centered Date Range Filter */}
      <div className="dashboard-date-row" style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
        <DateRangePicker
          fromDate={fromDate}
          toDate={toDate}
          onApply={(from, to) => {
            const toISO = (dateStr) => {
              const [d, m, y] = dateStr.split('/');
              return `${y}-${m}-${d}`;
            };
            const fISO = toISO(from);
            const tISO = toISO(to);
            setFromDate(fISO);
            setToDate(tISO);
            const dateObj = new Date(fISO);
            if (!isNaN(dateObj.getTime())) setCalendarFilter(monthsMap[dateObj.getMonth()]);
          }}
        />
      </div>

      {/* Sections */}
      {sections.map((section, si) => (
        <div className="dash-section" key={si} style={{ marginBottom: '28px' }}>
          <div className="dash-section-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ display: 'inline-block', width: '4px', height: '18px', borderRadius: '4px', background: '#6366f1' }} />
            <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#334155', margin: 0 }}>{section.title}</h2>
          </div>

          <div className="dash-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {section.cards.map((c, ci) => (
              <div
                key={ci}
                onClick={() => c.page && setActivePage && setActivePage(c.page)}
                style={{
                  backgroundColor: c.bg,
                  borderRadius: '16px',
                  padding: '20px 22px',
                  border: `1px solid ${c.color}22`,
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '128px',
                  cursor: c.page ? 'pointer' : 'default'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '14px', color: '#475569', fontWeight: '600' }}>{c.title}</span>
                  <div style={{ color: c.color, flexShrink: 0 }}>{c.icon}</div>
                </div>
                <div>
                  <div style={{ fontSize: '30px', fontWeight: '800', color: '#0f172a', margin: '6px 0 4px', lineHeight: '1.1' }}>{c.value}</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>{c.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Dashboard;
