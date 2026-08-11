import React, { useState } from 'react';
import {
  Users, Sparkles, Flame, Thermometer, Snowflake, Calendar,
  FileText, Edit3, CheckCircle, Trash2, Search, Filter, Plus,
  ChevronDown, X, CalendarCheck, UserPlus, XCircle, Activity, Download
} from 'lucide-react';
import './LeadsManagement.css';
import DateRangePicker from './DateRangePicker';
import AddLeadWizard from './AddLeadWizard';
import { leadsApi, pipelineApi, appointmentsApi, quotationsApi, projectsApi } from '../api/client';
import { notify } from '../utils/notify';
import { statusColor, sourceColor } from '../theme/statusColors';

// The 4 sales managers leads can be assigned to (Indhumathi assigns, so she is not a target)
const SALES_TEAM = ['Azar Abdullah A', 'Praveenraja P', 'Suresh P', 'Agsal A'];

// ── Mapping between the shared backend lead shape and this app's lead shape ──
const SOURCE_TO_API = {
  'WEBSITE ENQUIRY': 'Website Enquiry', 'REFERRAL': 'Referral', 'COLD CALLING': 'Cold Calling',
  'LINKEDIN LEADS': 'LinkedIn Leads', 'EMAIL': 'Email', 'WHATSAPP': 'WhatsApp',
  'META LEADS': 'Meta Leads', 'GOOGLE ADS': 'Google Ads',
};
const sourceToApi = (s) => SOURCE_TO_API[(s || '').toUpperCase()] || s || '';
// Canonicalise any stored source variant onto the exact dropdown option value so the
// <select> shows the right label (and colour) — e.g. "Google Leads" -> "GOOGLE ADS".
const SOURCE_FROM_API = {
  'website enquiry': 'WEBSITE ENQUIRY', 'referral': 'REFERRAL', 'cold calling': 'COLD CALLING',
  'linkedin leads': 'LINKEDIN LEADS', 'linkedin': 'LINKEDIN LEADS', 'email': 'EMAIL', 'whatsapp': 'WHATSAPP',
  'meta leads': 'META LEADS', 'meta': 'META LEADS', 'meta ads': 'META LEADS',
  'google ads': 'GOOGLE ADS', 'google leads': 'GOOGLE ADS', 'google': 'GOOGLE ADS',
  'organic leads': 'ORGANIC LEADS', 'organic': 'ORGANIC LEADS',
  // Removed sources fall back to a valid option so they never mislabel.
  'linkedin leads': 'WEBSITE ENQUIRY', 'linkedin': 'WEBSITE ENQUIRY', 'email': 'WEBSITE ENQUIRY', 'whatsapp': 'WEBSITE ENQUIRY',
};
const sourceFromApi = (s) => SOURCE_FROM_API[String(s || '').trim().toLowerCase()] || (s || '').toUpperCase();
const statusToApi = (s) => ({
  'NEW': 'New Lead', 'HOT': 'Hot', 'WARM': 'Warm', 'COLD': 'Cold', 'APPT FIXED': 'Appointment Fixed',
  'QUOTATION SEND': 'Quotation Send', 'NEGOTIATION': 'Negotiation', 'ORDER CONFIRMED': 'Order Confirmed', 'JUNK': 'Junk',
}[s] || s || 'New Lead');
const statusFromApi = (s) => {
  const x = (s || '').toLowerCase();
  if (x.includes('hot')) return 'HOT';
  if (x.includes('warm')) return 'WARM';
  if (x.includes('cold')) return 'COLD';
  if (x.includes('junk')) return 'JUNK';
  if (x.includes('appointment') || x.includes('appt')) return 'APPT FIXED';
  if (x.includes('quotation')) return 'QUOTATION SEND';
  if (x.includes('order')) return 'ORDER CONFIRMED';
  return 'NEW';
};
const leadFromApi = (l) => ({
  id: parseInt(String(l.id || '').replace(/\D/g, '')) || Math.floor(Math.random() * 1e9),
  leadId: l.id,
  date: l.date || '',
  name: l.name || '',
  company: l.company || '',
  email: l.email || '',
  location: l.location || '',
  budget: l.budget || '',
  source: sourceFromApi(l.source),
  services: l.projectType || l.services || 'PEB',
  workType: l.workType || l.projectType || l.services || '',
  followUp: l.followUp || '',
  designReq: l.designReq || '',
  phone: l.phone || '',
  status: statusFromApi(l.status),
  assignTo: l.manager || 'Unassigned',
  notes: l.notes || '',
  history: Array.isArray(l.history)
    ? l.history.map((h) => ({ date: h.timestamp || h.date || '', event: h.message || h.event || '', meetingRemarks: h.remark || h.meetingRemarks || '' }))
    : [],
});
const leadToApi = (m) => ({
  id: m.leadId,
  date: m.date || '',
  name: m.name || '',
  company: m.company || '',
  email: m.email || '',
  location: m.location || '',
  budget: m.budget || '',
  phone: m.phone || '',
  source: sourceToApi(m.source),
  projectType: m.services || '',
  workType: m.workType || '',
  followUp: m.followUp || '',
  designReq: m.designReq || '',
  status: statusToApi(m.status),
  manager: m.assignTo || 'Unassigned',
  notes: m.notes || '',
  history: Array.isArray(m.history)
    ? m.history.map((h) => ({ timestamp: h.date || '', message: h.event || '', remark: h.meetingRemarks || '' }))
    : [],
});

// Convert any stored follow-up value into a YYYY-MM-DD value for the date input
const toDateInputValue = (v) => {
  if (!v || typeof v !== 'string') return '';
  const s = v.trim();
  if (s === 'No Date' || s === 'Pending' || s === '') return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(s);
  return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
};

const getTimelineEventStyle = (eventText) => {
  const text = eventText.toLowerCase();
  if (text.includes('measurement') || text.includes('client visit') || text.includes('site visit') || text.includes('visit completed')) {
    return { class: 'status-measurement', dotColor: '#10b981' };
  }
  if (text.includes('created') || text.includes('added')) {
    return { class: 'creation', dotColor: '#3b82f6' };
  }
  if (text.includes('hot')) {
    return { class: 'status-hot', dotColor: '#ef4444' };
  }
  if (text.includes('cold')) {
    return { class: 'status-cold', dotColor: '#64748b' };
  }
  if (text.includes('warm')) {
    return { class: 'status-warm', dotColor: '#f97316' };
  }
  if (text.includes('appt fixed') || text.includes('appointment fixed')) {
    return { class: 'status-appt', dotColor: '#22c55e' };
  }
  if (text.includes('quotation send')) {
    return { class: 'status-quotation', dotColor: '#a855f7' };
  }
  if (text.includes('negotiation')) {
    return { class: 'status-negotiation', dotColor: '#eab308' };
  }
  if (text.includes('order confirmed')) {
    return { class: 'status-confirmed', dotColor: '#84cc16' };
  }
  if (text.includes('junk')) {
    return { class: 'status-junk', dotColor: '#6b7280' };
  }
  if (text.includes('edited') || text.includes('updated')) {
    return { class: 'edit', dotColor: '#8b5cf6' };
  }
  return { class: 'default', dotColor: '#3b82f6' };
};

const getTimelineEventIcon = (eventText, dotColor) => {
  const text = eventText.toLowerCase();
  const iconSize = 14;
  if (text.includes('created') || text.includes('added')) {
    return <UserPlus size={iconSize} style={{ color: dotColor }} />;
  }
  if (text.includes('status updated') || text.includes('status to') || text.includes('status changed')) {
    return <Thermometer size={iconSize} style={{ color: dotColor }} />;
  }
  return <CalendarCheck size={iconSize} style={{ color: dotColor }} />;
};

const LeadsManagement = ({ openAddSignal = 0 }) => {
  const [showAddModal, setShowAddModal] = useState(false);

  // Open the Add New Lead form when redirected here (e.g. from Sales Pipeline)
  React.useEffect(() => {
    if (openAddSignal > 0) setShowAddModal(true);
  }, [openAddSignal]);

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('03/05/2026');
  const [dateTo, setDateTo] = useState('02/06/2026');
  const [activeHistoryLead, setActiveHistoryLead] = useState(null);
  const [serviceFilter, setServiceFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [assigneeFilter, setAssigneeFilter] = useState('All');
  const [editingLead, setEditingLead] = useState(null);
  const [editWizardLead, setEditWizardLead] = useState(null); // lead being edited via the full wizard
  const [deleteTarget, setDeleteTarget] = useState(null); // lead pending "move to Junk" confirmation
  const [pendingStatusChange, setPendingStatusChange] = useState(null);

  const [leadsData, setLeadsData] = useState([]);
  const [leadsLoaded, setLeadsLoaded] = useState(false);

  // Real activity records so the overview cards reflect actual appointments / quotations /
  // order-confirmation documents (not just the lead status) — matches the Manager Dashboard.
  const [apptRecords, setApptRecords] = useState([]);
  const [quoteRecords, setQuoteRecords] = useState([]);
  const [projectRecords, setProjectRecords] = useState([]);
  React.useEffect(() => {
    appointmentsApi.list().then((d) => Array.isArray(d) && setApptRecords(d)).catch(() => {});
    quotationsApi.list().then((d) => Array.isArray(d) && setQuoteRecords(d)).catch(() => {});
    projectsApi.list().then((d) => Array.isArray(d) && setProjectRecords(d)).catch(() => {});
  }, []);

  // The Manager app only shows leads assigned to the currently logged-in manager
  const mgrName = (localStorage.getItem('mgr_name') || '').trim();
  const mgrKey = mgrName.toLowerCase();

  // Load this manager's leads from the shared backend (coordinator assigns; only theirs show here)
  React.useEffect(() => {
    leadsApi.list()
      .then((data) => {
        if (Array.isArray(data)) {
          const mine = data.map(leadFromApi).filter((l) => (l.assignTo || '').trim().toLowerCase() === mgrKey);
          setLeadsData(mine);
        }
      })
      .catch((e) => console.error('Failed to load leads:', e))
      .finally(() => setLeadsLoaded(true));
  }, []);

  // Sync local changes back to the shared backend
  React.useEffect(() => {
    if (!leadsLoaded) return;
    leadsApi.bulk(leadsData.map(leadToApi)).catch((e) => console.error('Failed to sync leads:', e));
  }, [leadsData, leadsLoaded]);




  const handleUpdateLeadField = (id, field, value) => {
    setLeadsData(prev => prev.map(lead => {
      if (lead.id === id) {
        if (lead[field] === value) return lead;
        const newHistory = lead.history ? [...lead.history] : [];
        newHistory.push({
          date: new Date().toLocaleString(),
          event: `Updated ${field} to: ${value}`
        });
        return { ...lead, [field]: value, history: newHistory };
      }
      return lead;
    }));
  };

  // ── Branded Tesco Structures lead document (same format as the Coordinator CRM) ──
  const buildLeadDocHtml = (lead) => {
    const w = lead._wizard || {};
    const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const or = (v, fb) => (v !== undefined && v !== null && String(v).trim() !== '' ? v : fb);
    // Hide 4 digits of a phone number in the exported PDF for privacy.
    const maskPhone = (v) => { const s = String(v ?? ''); const d = s.replace(/\D/g, ''); if (d.length < 6) return s; const a = d.length - 6, b = d.length - 2; let n = -1; return s.replace(/\d/g, (c) => { n += 1; return (n >= a && n < b) ? 'X' : c; }); };

    const idNum = String(lead.leadId || lead.id || '').replace(/\D/g, '') || '0000';
    const quoteNo = `TS-Q-${idNum}`;
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const budgetRaw = or(lead.budget, or(w.projectValue, ''));
    const budget = budgetRaw ? (String(budgetRaw).trim().startsWith('₹') ? String(budgetRaw) : `₹${budgetRaw}`) : '—';

    const clientName = or(lead.name, 'Client');
    const company = or(lead.company, clientName);
    const salesRep = (lead.assignTo && lead.assignTo !== 'Unassigned') ? lead.assignTo : 'Unassigned';

    // Design Services reflect the lead's Design Req selection (2D / 3D / Both)
    const dq = String(lead.designReq || '').toLowerCase();
    const has3d = dq.includes('3d') || dq === 'both';
    const has2d = dq.includes('2d') || dq === 'both';
    const designServices = `3D: ${has3d ? 'Yes' : 'No'} | 2D: ${has2d ? 'Yes' : 'No'}`;

    const detailRow = (a, b, c) => `
      <div class="grid3 drow">
        <div class="field"><div class="k">${esc(a[0])}</div><div class="v">${esc(a[1])}</div></div>
        <div class="field"><div class="k">${esc(b[0])}</div><div class="v">${esc(b[1])}</div></div>
        <div class="field"><div class="k">${esc(c[0])}</div><div class="v">${esc(c[1])}</div></div>
      </div>`;
    const milestone = (n, label, pct) => `
      <div class="mrow"><span>${n}. ${esc(label)}</span><b>${esc(pct)}</b></div>`;

    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(quoteNo)} - Tesco Structures</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1F2937; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .hdr { position: fixed; top: 0; left: 0; right: 0; height: 104px; padding: 26px 48px 0; display: flex; justify-content: space-between; align-items: flex-start; background: #fff; }
  .hdr::after { content: ''; position: absolute; left: 48px; right: 48px; bottom: 14px; height: 3px; background: #8DC63F; }
  .logo-wrap { display: flex; align-items: center; gap: 14px; }
  .logo-text .t1 { font-size: 22px; letter-spacing: 9px; font-weight: 800; color: #2B2B2B; line-height: 1; }
  .logo-text .t2 { font-size: 10px; letter-spacing: 6px; color: #6B7280; margin-top: 5px; }
  .hdr-email { color: #4B5563; font-size: 12px; margin-top: 12px; }
  .ftr { position: fixed; bottom: 0; left: 0; right: 0; background: #8DC63F; color: #fff; text-align: center; font-size: 11px; font-weight: 700; padding: 12px 8px; letter-spacing: 0.3px; }
  table.layout { width: 100%; border-collapse: collapse; }
  table.layout > thead td, table.layout > tbody td, table.layout > tfoot td { padding: 0; border: none; }
  .head-space { height: 122px; }
  .foot-space { height: 56px; }
  .content { padding: 0 48px; }
  .pagebreak { page-break-before: always; }
  .quotebox { border: 1px solid #E5E9F0; border-radius: 8px; padding: 15px 24px; display: flex; justify-content: space-between; font-size: 13px; color: #4B5563; margin-bottom: 8px; }
  .quotebox b { color: #111827; }
  .sec-title { color: #1E3A8A; font-size: 14px; font-weight: 800; letter-spacing: 0.3px; margin: 30px 0 7px; }
  .sec-rule { height: 2px; background: #E3E8F0; border-radius: 2px; margin-bottom: 20px; }
  .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .card2 { background: #F6F8FB; border: 1px solid #EBEFF5; border-radius: 10px; padding: 18px 22px; page-break-inside: avoid; }
  .card2 .lbl { font-size: 10px; letter-spacing: 1px; font-weight: 800; color: #64748B; text-transform: uppercase; margin-bottom: 12px; }
  .card2 .big { font-size: 16px; font-weight: 800; color: #111827; margin: 0 0 10px; }
  .card2 .row { font-size: 12.5px; color: #64748B; margin: 3px 0; }
  .card2 .row b { color: #374151; font-weight: 700; }
  .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px 26px; }
  .drow { padding: 14px 0; border-bottom: 1px solid #EEF1F5; }
  .field .k { font-size: 12px; color: #6B7280; margin-bottom: 5px; }
  .field .v { font-size: 13px; font-weight: 700; color: #1F2937; }
  .qtable { border: 1px solid #EBEFF5; border-radius: 10px; overflow: hidden; margin-top: 10px; page-break-inside: avoid; }
  .qhead { display: flex; justify-content: space-between; background: #F1F4F8; padding: 14px 20px; font-size: 12.5px; font-weight: 800; color: #475569; }
  .qbody { display: flex; justify-content: space-between; padding: 18px 20px; gap: 20px; }
  .qbody .desc-t { font-size: 14px; font-weight: 800; color: #111827; margin: 0 0 6px; }
  .qbody .desc-s { font-size: 11.5px; color: #94A3B8; line-height: 1.5; max-width: 460px; }
  .qbody .price { font-size: 14px; font-weight: 800; color: #111827; white-space: nowrap; }
  .qsub { display: flex; justify-content: flex-end; gap: 40px; background: #F6F8FB; padding: 14px 20px; font-size: 13px; color: #64748B; }
  .qsub b { color: #111827; }
  .qtotal { display: flex; justify-content: flex-end; gap: 40px; padding: 16px 20px; font-size: 15px; font-weight: 800; color: #0F9D8F; }
  .mtitle { font-size: 11.5px; font-weight: 800; letter-spacing: 0.6px; color: #334155; text-transform: uppercase; margin: 26px 0 10px; }
  .mhead { display: flex; justify-content: space-between; font-size: 12.5px; font-weight: 800; color: #475569; padding: 8px 4px 12px; border-bottom: 1px solid #E3E8F0; }
  .mrow { display: flex; justify-content: space-between; font-size: 13px; color: #374151; padding: 14px 4px; border-bottom: 1px dashed #E5E9F0; }
  .mrow b { color: #111827; }
  .sign { margin-top: 40px; display: flex; justify-content: flex-end; }
  .sign .box { border-top: 1px solid #CBD5E1; padding-top: 8px; width: 230px; text-align: center; font-size: 11px; letter-spacing: 1px; color: #94A3B8; }
</style></head><body>
  <div class="hdr">
    <div class="logo-wrap">
      <svg width="42" height="42" viewBox="0 0 42 42" aria-hidden="true">
        <g fill="#8DC63F">
          <polygon points="4,30 15,12 21,12 10,30"/>
          <polygon points="13,30 24,12 30,12 19,30"/>
          <polygon points="22,30 33,12 39,12 28,30"/>
        </g>
        <rect x="4" y="32" width="30" height="3" fill="#4B7A1E"/>
      </svg>
      <div class="logo-text"><div class="t1">TESCO</div><div class="t2">STRUCTURES</div></div>
    </div>
    <div class="hdr-email">tescostructures@gmail.com</div>
  </div>
  <div class="ftr">www.tescostructures.com&nbsp;&nbsp;|&nbsp;&nbsp;+91 90033 28229&nbsp;&nbsp;|&nbsp;&nbsp;37, 15th St, Gandhi Nagar, Ashok Nagar, Chennai, Tamil Nadu 600083</div>

  <table class="layout">
    <thead><tr><td><div class="head-space"></div></td></tr></thead>
    <tfoot><tr><td><div class="foot-space"></div></td></tr></tfoot>
    <tbody><tr><td>
      <div class="content">
        <div class="quotebox">
          <div><b>Quote No:</b> ${esc(quoteNo)}</div>
          <div><b>Date:</b> ${esc(today)}</div>
          <div><b>Validity:</b> 30 Days</div>
        </div>

        <div class="sec-title">1. BASIC INFO</div>
        <div class="sec-rule"></div>
        <div class="cards">
          <div class="card2">
            <div class="lbl">Client Details</div>
            <div class="big">${esc(clientName)}</div>
            <div class="row">Billing Name: ${esc(company)}</div>
            <div class="row">GST: ${esc(or(w.gst, '-'))}</div>
          </div>
          <div class="card2">
            <div class="lbl">Contact Info</div>
            <div class="row"><b>Mobile:</b> ${esc(maskPhone(or(lead.phone, '-')))}</div>
            <div class="row"><b>Alt Mobile:</b> ${esc(maskPhone(or(w.altPhone, '-')))}</div>
            <div class="row"><b>Email:</b> ${esc(or(lead.email, '-'))}</div>
          </div>
          <div class="card2">
            <div class="lbl">Location</div>
            <div class="row"><b>Site Location:</b> ${esc(or(lead.location, '-'))}</div>
            <div class="row"><b>Site Address:</b> ${esc(or(w.siteAddress, '-'))}</div>
            <div class="row"><b>Billing Address:</b> ${esc(or(w.billingAddress, 'Same as Site'))}</div>
          </div>
          <div class="card2">
            <div class="lbl">Sales Representative</div>
            <div class="big">${esc(salesRep)}</div>
            <div class="row">Tesco Structures Sales Division</div>
          </div>
        </div>

        <div class="sec-title">2. PROJECT DETAILS</div>
        <div class="sec-rule"></div>
        ${detailRow(
          ['Segment Category', or(w.service, or(lead.services, '-'))],
          ['Work Type / Segment', or(w.projectType, or(lead.workType, '-'))],
          ['Structure Type', or(w.structureType, '-')]
        )}
        ${detailRow(
          ['Plot Dimensions', or(w.plotDimensions, '-')],
          ['Roof Area / Size', w.approximateArea ? `${w.approximateArea} sq.ft` : '-'],
          ['Heights (Roof/Clearance/Eave)', or(w.heights, '-')]
        )}
        ${detailRow(
          ['Roof Covering Sheeting', or(w.roofCovering, '-')],
          ['Site Condition / Soil Test', (w.siteCondition || w.soilTest) ? `${or(w.siteCondition, '-')} / ${or(w.soilTest, '-')}` : '-'],
          ['Insulation Work', or(w.insulation, '-')]
        )}
        ${detailRow(
          ['Site Access (Road/Crane/HV)', or(w.siteAccess, '-')],
          ['Environment (Sun/Wind/Drain)', or(w.environment, '-')],
          ['Working Space', or(w.workingSpace, '-')]
        )}

        <div class="pagebreak"></div>

        <div class="sec-title">3. QUOTATIONS</div>
        <div class="sec-rule"></div>
        ${detailRow(
          ['Design Services', designServices],
          ['Transportation Scope', or(w.transportation, '-')],
          ['Scaffolding Scope', or(w.scaffolding, '-')]
        )}
        <div class="qtable">
          <div class="qhead"><span>Description of Work</span><span>Total Price (INR)</span></div>
          <div class="qbody">
            <div>
              <div class="desc-t">Design, Fabrication, Supply, and Erection work charges</div>
              <div class="desc-s">Charge covers design calculation, raw material sourcing, structural framework columns, rafters, primary/secondary purlins, bracing rods, roofing sheets, fasteners, and site erection.</div>
            </div>
            <div class="price">${esc(budget)}</div>
          </div>
          <div class="qsub"><span>Subtotal:</span><b>${esc(budget)}</b></div>
        </div>
        <div class="qtotal"><span>Grand Total (All-Inclusive):</span><span>${esc(budget)}</span></div>

        <div class="mtitle">Pricing &amp; Payment Milestones Schedule</div>
        <div class="mhead"><span>Billing Milestone Event Description</span><span>Percentage</span></div>
        ${milestone(1, 'Advance with Purchase Order (PO)', '10%')}
        ${milestone(2, 'Dispatch / after Drawing Approval', '30%')}
        ${milestone(3, 'Erection / after Structure Work Completion', '40%')}
        ${milestone(4, 'Handover / after Completion Sign-off', '20%')}

        <div class="sec-title">4. ORDER CONFIRM</div>
        <div class="sec-rule"></div>
        ${detailRow(
          ['Order Date', or(w.confirmationDate, '-')],
          ['Proposal Ref', or(w.proposalRef, '-')],
          ['Lead Time', or(w.leadTime, '-')]
        )}
        ${detailRow(
          ['Start Date', or(w.expectedStartDate, '-')],
          ['Completion Date', or(w.completionDate, '-')],
          ['Salesperson Declaration', or(w.orderStatus, '-')]
        )}
        <div class="sign"><div class="box">AUTHORIZED SIGNATURE</div></div>
      </div>
    </td></tr></tbody>
  </table>
  <scr` + `ipt>window.onload=function(){setTimeout(function(){window.print();},350);}</scr` + `ipt>
</body></html>`;
  };

  // Load html2pdf.js once (used to generate a real downloadable PDF file)
  const ensureHtml2Pdf = () => new Promise((resolve, reject) => {
    if (window.html2pdf) return resolve(window.html2pdf);
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js';
    s.onload = () => resolve(window.html2pdf);
    s.onerror = () => reject(new Error('Failed to load html2pdf.js'));
    document.head.appendChild(s);
  });

  // Branded lead document as { quoteNo, style, inner } using a normal (non-fixed) flow
  // layout so it renders cleanly as a downloadable PDF (matches the Coordinator CRM).
  const leadDocPartsPdf = (lead) => {
    const w = lead._wizard || {};
    const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const or = (v, fb) => (v !== undefined && v !== null && String(v).trim() !== '' ? v : fb);
    // Hide 4 digits of a phone number in the exported PDF for privacy.
    const maskPhone = (v) => { const s = String(v ?? ''); const d = s.replace(/\D/g, ''); if (d.length < 6) return s; const a = d.length - 6, b = d.length - 2; let n = -1; return s.replace(/\d/g, (c) => { n += 1; return (n >= a && n < b) ? 'X' : c; }); };

    const idNum = String(lead.leadId || lead.id || '').replace(/\D/g, '') || '0000';
    const quoteNo = `TS-Q-${idNum}`;
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const budgetRaw = or(lead.budget, or(w.projectValue, ''));
    const budget = budgetRaw ? (String(budgetRaw).trim().startsWith('₹') ? String(budgetRaw) : `₹${budgetRaw}`) : '—';

    const clientName = or(lead.name, 'Client');
    const company = or(lead.company, clientName);
    const salesRep = (lead.assignTo && lead.assignTo !== 'Unassigned') ? lead.assignTo : 'Unassigned';

    const dq = String(lead.designReq || '').toLowerCase();
    const has3d = dq.includes('3d') || dq === 'both';
    const has2d = dq.includes('2d') || dq === 'both';
    const designServices = `3D: ${has3d ? 'Yes' : 'No'} | 2D: ${has2d ? 'Yes' : 'No'}`;

    const detailRow = (a, b, c) => `
      <div class="grid3 drow">
        <div class="field"><div class="k">${esc(a[0])}</div><div class="v">${esc(a[1])}</div></div>
        <div class="field"><div class="k">${esc(b[0])}</div><div class="v">${esc(b[1])}</div></div>
        <div class="field"><div class="k">${esc(c[0])}</div><div class="v">${esc(c[1])}</div></div>
      </div>`;
    const milestone = (n, label, pct) => `
      <div class="mrow"><span>${n}. ${esc(label)}</span><b>${esc(pct)}</b></div>`;

    const style = `<style>
  @page { size: A4; margin: 0; }
  .tsdoc, .tsdoc * { box-sizing: border-box; }
  .tsdoc { font-family: Arial, Helvetica, sans-serif; color: #1F2937; background: #fff; width: 794px; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .tsdoc .hdr { padding: 26px 48px 14px; display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #8DC63F; }
  .tsdoc .logo-wrap { display: flex; align-items: center; gap: 14px; }
  .tsdoc .logo-text .t1 { font-size: 22px; letter-spacing: 9px; font-weight: 800; color: #2B2B2B; line-height: 1; }
  .tsdoc .logo-text .t2 { font-size: 10px; letter-spacing: 6px; color: #6B7280; margin-top: 5px; }
  .tsdoc .hdr-email { color: #4B5563; font-size: 12px; margin-top: 12px; }
  .tsdoc .ftr { margin-top: 36px; background: #8DC63F; color: #fff; text-align: center; font-size: 11px; font-weight: 700; padding: 12px 8px; letter-spacing: 0.3px; }
  .tsdoc .content { padding: 22px 48px 0; }
  .tsdoc .pagebreak { page-break-before: always; height: 0; }
  .tsdoc .quotebox { border: 1px solid #E5E9F0; border-radius: 8px; padding: 15px 24px; display: flex; justify-content: space-between; font-size: 13px; color: #4B5563; margin-bottom: 8px; }
  .tsdoc .quotebox b { color: #111827; }
  .tsdoc .sec-title { color: #1E3A8A; font-size: 14px; font-weight: 800; letter-spacing: 0.3px; margin: 30px 0 7px; }
  .tsdoc .sec-rule { height: 2px; background: #E3E8F0; border-radius: 2px; margin-bottom: 20px; }
  .tsdoc .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .tsdoc .card2 { background: #F6F8FB; border: 1px solid #EBEFF5; border-radius: 10px; padding: 18px 22px; page-break-inside: avoid; }
  .tsdoc .card2 .lbl { font-size: 10px; letter-spacing: 1px; font-weight: 800; color: #64748B; text-transform: uppercase; margin-bottom: 12px; }
  .tsdoc .card2 .big { font-size: 16px; font-weight: 800; color: #111827; margin: 0 0 10px; }
  .tsdoc .card2 .row { font-size: 12.5px; color: #64748B; margin: 3px 0; }
  .tsdoc .card2 .row b { color: #374151; font-weight: 700; }
  .tsdoc .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px 26px; }
  .tsdoc .drow { padding: 14px 0; border-bottom: 1px solid #EEF1F5; }
  .tsdoc .field .k { font-size: 12px; color: #6B7280; margin-bottom: 5px; }
  .tsdoc .field .v { font-size: 13px; font-weight: 700; color: #1F2937; }
  .tsdoc .qtable { border: 1px solid #EBEFF5; border-radius: 10px; overflow: hidden; margin-top: 10px; page-break-inside: avoid; }
  .tsdoc .qhead { display: flex; justify-content: space-between; background: #F1F4F8; padding: 14px 20px; font-size: 12.5px; font-weight: 800; color: #475569; }
  .tsdoc .qbody { display: flex; justify-content: space-between; padding: 18px 20px; gap: 20px; }
  .tsdoc .qbody .desc-t { font-size: 14px; font-weight: 800; color: #111827; margin: 0 0 6px; }
  .tsdoc .qbody .desc-s { font-size: 11.5px; color: #94A3B8; line-height: 1.5; max-width: 460px; }
  .tsdoc .qbody .price { font-size: 14px; font-weight: 800; color: #111827; white-space: nowrap; }
  .tsdoc .qsub { display: flex; justify-content: flex-end; gap: 40px; background: #F6F8FB; padding: 14px 20px; font-size: 13px; color: #64748B; }
  .tsdoc .qsub b { color: #111827; }
  .tsdoc .qtotal { display: flex; justify-content: flex-end; gap: 40px; padding: 16px 20px; font-size: 15px; font-weight: 800; color: #0F9D8F; }
  .tsdoc .mtitle { font-size: 11.5px; font-weight: 800; letter-spacing: 0.6px; color: #334155; text-transform: uppercase; margin: 26px 0 10px; }
  .tsdoc .mhead { display: flex; justify-content: space-between; font-size: 12.5px; font-weight: 800; color: #475569; padding: 8px 4px 12px; border-bottom: 1px solid #E3E8F0; }
  .tsdoc .mrow { display: flex; justify-content: space-between; font-size: 13px; color: #374151; padding: 14px 4px; border-bottom: 1px dashed #E5E9F0; }
  .tsdoc .mrow b { color: #111827; }
  .tsdoc .sign { margin-top: 40px; display: flex; justify-content: flex-end; }
  .tsdoc .sign .box { border-top: 1px solid #CBD5E1; padding-top: 8px; width: 230px; text-align: center; font-size: 11px; letter-spacing: 1px; color: #94A3B8; }
</style>`;

    const inner = `<div class="tsdoc">
  <div class="hdr">
    <div class="logo-wrap">
      <svg width="42" height="42" viewBox="0 0 42 42" aria-hidden="true">
        <g fill="#8DC63F">
          <polygon points="4,30 15,12 21,12 10,30"/>
          <polygon points="13,30 24,12 30,12 19,30"/>
          <polygon points="22,30 33,12 39,12 28,30"/>
        </g>
        <rect x="4" y="32" width="30" height="3" fill="#4B7A1E"/>
      </svg>
      <div class="logo-text"><div class="t1">TESCO</div><div class="t2">STRUCTURES</div></div>
    </div>
    <div class="hdr-email">tescostructures@gmail.com</div>
  </div>
  <div class="content">
    <div class="quotebox">
      <div><b>Quote No:</b> ${esc(quoteNo)}</div>
      <div><b>Date:</b> ${esc(today)}</div>
      <div><b>Validity:</b> 30 Days</div>
    </div>

    <div class="sec-title">1. BASIC INFO</div>
    <div class="sec-rule"></div>
    <div class="cards">
      <div class="card2">
        <div class="lbl">Client Details</div>
        <div class="big">${esc(clientName)}</div>
        <div class="row">Billing Name: ${esc(company)}</div>
        <div class="row">GST: ${esc(or(w.gst, '-'))}</div>
      </div>
      <div class="card2">
        <div class="lbl">Contact Info</div>
        <div class="row"><b>Mobile:</b> ${esc(maskPhone(or(lead.phone, '-')))}</div>
        <div class="row"><b>Alt Mobile:</b> ${esc(maskPhone(or(w.altPhone, '-')))}</div>
        <div class="row"><b>Email:</b> ${esc(or(lead.email, '-'))}</div>
      </div>
      <div class="card2">
        <div class="lbl">Location</div>
        <div class="row"><b>Site Location:</b> ${esc(or(lead.location, '-'))}</div>
        <div class="row"><b>Site Address:</b> ${esc(or(w.siteAddress, '-'))}</div>
        <div class="row"><b>Billing Address:</b> ${esc(or(w.billingAddress, 'Same as Site'))}</div>
      </div>
      <div class="card2">
        <div class="lbl">Sales Representative</div>
        <div class="big">${esc(salesRep)}</div>
        <div class="row">Tesco Structures Sales Division</div>
      </div>
    </div>

    <div class="sec-title">2. PROJECT DETAILS</div>
    <div class="sec-rule"></div>
    ${detailRow(
      ['Segment Category', or(w.service, or(lead.services, '-'))],
      ['Work Type / Segment', or(w.projectType, or(lead.workType, '-'))],
      ['Structure Type', or(w.structureType, '-')]
    )}
    ${detailRow(
      ['Plot Dimensions', or(w.plotDimensions, '-')],
      ['Roof Area / Size', w.approximateArea ? `${w.approximateArea} sq.ft` : '-'],
      ['Heights (Roof/Clearance/Eave)', or(w.heights, '-')]
    )}
    ${detailRow(
      ['Roof Covering Sheeting', or(w.roofCovering, '-')],
      ['Site Condition / Soil Test', (w.siteCondition || w.soilTest) ? `${or(w.siteCondition, '-')} / ${or(w.soilTest, '-')}` : '-'],
      ['Insulation Work', or(w.insulation, '-')]
    )}
    ${detailRow(
      ['Site Access (Road/Crane/HV)', or(w.siteAccess, '-')],
      ['Environment (Sun/Wind/Drain)', or(w.environment, '-')],
      ['Working Space', or(w.workingSpace, '-')]
    )}

    <div class="pagebreak"></div>

    <div class="sec-title">3. QUOTATIONS</div>
    <div class="sec-rule"></div>
    ${detailRow(
      ['Design Services', designServices],
      ['Transportation Scope', or(w.transportation, '-')],
      ['Scaffolding Scope', or(w.scaffolding, '-')]
    )}
    <div class="qtable">
      <div class="qhead"><span>Description of Work</span><span>Total Price (INR)</span></div>
      <div class="qbody">
        <div>
          <div class="desc-t">Design, Fabrication, Supply, and Erection work charges</div>
          <div class="desc-s">Charge covers design calculation, raw material sourcing, structural framework columns, rafters, primary/secondary purlins, bracing rods, roofing sheets, fasteners, and site erection.</div>
        </div>
        <div class="price">${esc(budget)}</div>
      </div>
      <div class="qsub"><span>Subtotal:</span><b>${esc(budget)}</b></div>
    </div>
    <div class="qtotal"><span>Grand Total (All-Inclusive):</span><span>${esc(budget)}</span></div>

    <div class="mtitle">Pricing &amp; Payment Milestones Schedule</div>
    <div class="mhead"><span>Billing Milestone Event Description</span><span>Percentage</span></div>
    ${milestone(1, 'Advance with Purchase Order (PO)', '10%')}
    ${milestone(2, 'Dispatch / after Drawing Approval', '30%')}
    ${milestone(3, 'Erection / after Structure Work Completion', '40%')}
    ${milestone(4, 'Handover / after Completion Sign-off', '20%')}

    <div class="sec-title">4. ORDER CONFIRM</div>
    <div class="sec-rule"></div>
    ${detailRow(
      ['Order Date', or(w.confirmationDate, '-')],
      ['Proposal Ref', or(w.proposalRef, '-')],
      ['Lead Time', or(w.leadTime, '-')]
    )}
    ${detailRow(
      ['Start Date', or(w.expectedStartDate, '-')],
      ['Completion Date', or(w.completionDate, '-')],
      ['Salesperson Declaration', or(w.orderStatus, '-')]
    )}
    <div class="sign"><div class="box">AUTHORIZED SIGNATURE</div></div>
  </div>
  <div class="ftr">www.tescostructures.com&nbsp;&nbsp;|&nbsp;&nbsp;+91 90033 28229&nbsp;&nbsp;|&nbsp;&nbsp;37, 15th St, Gandhi Nagar, Ashok Nagar, Chennai, Tamil Nadu 600083</div>
</div>`;

    return { quoteNo, style, inner };
  };

  // Download a single lead as a real branded PDF file (falls back to print-to-PDF)
  const downloadLead = async (lead) => {
    const { quoteNo, style, inner } = leadDocPartsPdf(lead);
    try {
      const html2pdf = await ensureHtml2Pdf();
      // Render into an on-screen host (height:0 + overflow hidden → invisible but fully laid
      // out) and capture the .tsdoc element itself. A far off-screen container can render blank.
      const host = document.createElement('div');
      // On-screen (top-left, briefly) at exactly A4 content width so html2canvas captures it
      // full and html2pdf fits it to the A4 page — no clipping, no oversized page.
      host.style.cssText = 'position:absolute;left:0;top:0;width:794px;background:#fff;';
      host.innerHTML = style + inner;
      document.body.appendChild(host);
      const target = host.querySelector('.tsdoc') || host;
      if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch {} }
      await new Promise((r) => setTimeout(r, 80));
      await html2pdf().set({
        margin: 0,
        filename: `${quoteNo}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] },
      }).from(target).save();
      document.body.removeChild(host);
      notify('Lead PDF downloaded', 'success');
    } catch (err) {
      console.error('PDF download failed, falling back to print:', err);
      const win = window.open('', '_blank');
      if (!win) { notify('Please allow pop-ups to download the lead.', 'warning'); return; }
      win.document.write(buildLeadDocHtml(lead));
      win.document.close();
    }
  };

  // Map a wizard "New/Hot/..." status to this app's internal status codes
  const WIZARD_STATUS_MAP = {
    'New': 'NEW', 'Hot': 'HOT', 'Warm': 'WARM', 'Cold': 'COLD',
    'Appt. Fixed': 'APPT FIXED', 'Quotation Send': 'QUOTATION SEND',
    'Order Confirmed': 'ORDER CONFIRMED', 'Junk': 'JUNK', 'Lost': 'JUNK',
  };

  // Save handler for editing an existing lead through the full multi-step wizard.
  // Updates the lead in place (the bulk-sync effect persists it to the shared DB).
  const handleWizardEditSave = (orig, data) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    const ts = `${new Date().toLocaleDateString('en-US', options)} - ${new Date().toLocaleTimeString()}`;
    setLeadsData(prev => prev.map(l => {
      if (l.id !== orig.id) return l;
      const newHistory = l.history ? [...l.history] : [];
      newHistory.push({ date: ts, event: 'Lead details edited' });
      const w = data._wizard || {};
      return {
        ...l,
        name: data.name,
        company: data.company || '',
        email: data.email || '',
        phone: data.phone,
        source: data.source || l.source,
        services: data.projectType || l.services,
        workType: w.projectType || l.workType,
        designReq: data.designReq || w.designReq || l.designReq,
        location: data.location || l.location,
        assignTo: data.manager || l.assignTo,
        followUp: data.followUp || l.followUp,
        status: WIZARD_STATUS_MAP[data.status] || l.status,
        budget: data.budget || l.budget,
        notes: data.notes || l.notes,
        _wizard: data._wizard || l._wizard,
        history: newHistory,
      };
    }));
    setEditWizardLead(null);
  };

  // Save handler for the multi-step Add New Lead wizard (matches the Sales Coordinator CRM form)
  const handleWizardSave = (data) => {
    // Globally-unique id so a manager-added lead never overwrites coordinator/other-manager leads
    const stamp = Date.now();
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    const formattedDate = new Date().toLocaleDateString('en-US', options);
    const ts = `${formattedDate} - ${new Date().toLocaleTimeString()}`;

    const history = [
      { date: ts, event: `Lead created manually (Source: ${data.source || 'WEBSITE ENQUIRY'})` }
    ];

    const w = data._wizard || {};
    history.push({
      date: ts,
      event: `Project details — Type: ${w.projectType || '-'}, Structure: ${w.structureType || '-'}, Site: ${w.siteCondition || '-'}, Soil test: ${w.soilTest || '-'}, Area: ${w.approximateArea || '-'} sq.ft, Site visit: ${w.siteVisit || '-'}, Start: ${w.expectedStartDate || '-'}`
    });
    if (w.projectValue) {
      history.push({ date: ts, event: `Quotation — ${w.quotationType}, Value: ₹${w.projectValue}${w.fileName ? `, File: ${w.fileName}` : ''}` });
    }
    if (w.orderStatus && w.orderStatus !== 'Pending') {
      history.push({ date: ts, event: `Order — ${w.orderStatus}, Advance: ₹${w.advanceAmount || '-'}, Terms: ${w.paymentTerms || '-'}` });
    }
    if (data.notes) {
      history.push({ date: ts, event: `Notes: ${data.notes}` });
    }

    // Project value can come from the dedicated budget field or the wizard's quotation step
    const projectValue = data.budget || w.projectValue || '';

    const leadToAdd = {
      id: stamp,
      leadId: `LD-${stamp}`,
      date: formattedDate,
      name: data.name,
      company: data.company || '',
      email: data.email || '',
      location: data.location || '',
      budget: projectValue,
      source: data.source || 'WEBSITE ENQUIRY',
      services: data.projectType || 'PEB',
      workType: w.projectType || data.projectType || '',
      designReq: data.designReq || w.designReq || '',
      followUp: data.followUp || '',
      _wizard: w,
      phone: data.phone,
      status: WIZARD_STATUS_MAP[data.status] || 'NEW',
      // A lead added inside the Manager app belongs to the logged-in manager
      assignTo: mgrName || data.manager || 'Unassigned',
      notes: data.notes || '',
      history,
    };

    setLeadsData([leadToAdd, ...leadsData]);
    setShowAddModal(false);

    // If a Project Value was entered, also create a Sales Pipeline opportunity so it shows up there
    const valueNum = parseFloat(String(projectValue).replace(/[^0-9.]/g, ''));
    if (valueNum > 0) {
      const PIPE_STAGE_MAP = {
        'NEW': 'New', 'HOT': 'Hot', 'WARM': 'Warm', 'COLD': 'Cold',
        'APPT FIXED': 'Appointment Fixed', 'JUNK': 'Lost', 'LOST': 'Lost',
      };
      const opportunity = {
        id: `OP-${stamp}`,
        leadId: `LD-${stamp}`,
        customer: data.name || 'Client',
        company: data.company || '',
        service: data.projectType || 'PEB Structure',
        stage: PIPE_STAGE_MAP[WIZARD_STATUS_MAP[data.status]] || 'New',
        assignedTo: mgrName || data.manager || 'Unassigned',
        expectedClose: w.expectedStartDate || '',
        value: valueNum,
        lastActivity: 'Today',
        followUp: data.followUp || '',
        manager: mgrName,
      };
      pipelineApi.create(opportunity).catch((err) => console.error('Failed to add pipeline opportunity:', err));
    }
  };

  // Upsert a Sales Pipeline opportunity for a lead that has a valid Project Value.
  // Uses a deterministic id (OP-<leadId>) so repeated saves update the SAME row
  // instead of creating duplicates, and matches the id the Add-Lead wizard uses.
  const syncLeadToPipeline = (lead) => {
    const valueNum = parseFloat(String(lead.budget || '').replace(/[^0-9.]/g, ''));
    if (!(valueNum > 0)) return;
    const PIPE_STAGE_MAP = {
      'NEW': 'New', 'HOT': 'Hot', 'WARM': 'Warm', 'COLD': 'Cold',
      'APPT FIXED': 'Appointment Fixed', 'JUNK': 'Lost', 'LOST': 'Lost',
    };
    const opportunity = {
      id: `OP-${lead.id}`,
      leadId: lead.leadId,
      customer: lead.name || 'Client',
      company: lead.company || '',
      service: lead.services || 'PEB Structure',
      stage: PIPE_STAGE_MAP[lead.status] || 'New',
      assignedTo: lead.assignTo || mgrName || 'Unassigned',
      expectedClose: lead.followUp || '',
      value: valueNum,
      lastActivity: 'Today',
      followUp: lead.followUp || '',
      manager: mgrName,
    };
    // bulk() upserts by id, so this creates the opportunity or updates it in place.
    pipelineApi.bulk([opportunity]).catch((err) => console.error('Failed to sync pipeline:', err));
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    const base = leadsData.find((l) => l.id === editingLead.id);
    const changes = [];
    if (base) {
      if (base.name !== editingLead.name) changes.push(`Name to: ${editingLead.name}`);
      if (base.phone !== editingLead.phone) changes.push(`Phone to: ${editingLead.phone}`);
      if (base.services !== editingLead.services) changes.push(`Services to: ${editingLead.services}`);
      if (base.source !== editingLead.source) changes.push(`Source to: ${editingLead.source}`);
      if (base.status !== editingLead.status) changes.push(`Status to: ${editingLead.status}`);
      if (base.assignTo !== editingLead.assignTo) changes.push(`Assignee to: ${editingLead.assignTo}`);
      if ((base.budget || '') !== (editingLead.budget || '')) changes.push(`Project Value to: ${editingLead.budget}`);
    }
    const newHistory = editingLead.history ? [...editingLead.history] : [];
    if (changes.length > 0) {
      const options = { year: 'numeric', month: 'short', day: 'numeric' };
      const formattedDate = new Date().toLocaleDateString('en-US', options);
      newHistory.push({
        date: `${formattedDate} - ${new Date().toLocaleTimeString()}`,
        event: `Edited details: ${changes.join(', ')}`,
      });
    }
    const updated = { ...editingLead, history: newHistory };
    // 1) Reflect immediately in the UI
    setLeadsData((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    // 2) Persist this lead to the shared DB right away (don't rely only on the bulk-sync effect)
    leadsApi.update(updated.leadId, leadToApi(updated)).catch((err) => console.error('Failed to save lead:', err));
    // 3) Make sure a lead with a Project Value shows up in the Sales Pipeline
    syncLeadToPipeline(updated);
    setEditingLead(null);
  };

  const handlePendingStatusSubmit = (e) => {
    e.preventDefault();
    setLeadsData(prev => prev.map(lead => {
      if (lead.id === pendingStatusChange.id) {
        const nextStatus = pendingStatusChange.status;
        const remark = pendingStatusChange.remark.trim();
        
        const newHistory = lead.history ? [...lead.history] : [];
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        const formattedDate = new Date().toLocaleDateString('en-US', options);
        
        let eventMessage = `Updated status to: ${nextStatus}`;
        if (nextStatus === 'APPT FIXED') {
          eventMessage = `Scheduled Appointment: Date: ${pendingStatusChange.apptDate}, Time: ${pendingStatusChange.apptTime}, Location: ${pendingStatusChange.apptLocation}`;
        } else if (nextStatus === 'QUOTATION SEND') {
          if (pendingStatusChange.showOwnQuotationUpload) {
            eventMessage = `Sent Own Quotation for ${pendingStatusChange.services || lead.services}`;
          } else {
            eventMessage = `Generated Quotation: Amount ₹${pendingStatusChange.amountExGST} (ex. GST), GST ₹${pendingStatusChange.gstAmount} for ${pendingStatusChange.services || lead.services}`;
          }

          // Sync quotation data to quotes list in localStorage
          const savedQuotes = localStorage.getItem('quotesData');
          let currentQuotes = [];
          const defaultQuotes = [
            { id: 1, leadId: 'LD-2026-089', customerName: 'Sarah Jenkins', approvals: 'Approved', quotationStatus: 'Sent' },
            { id: 2, leadId: 'LD-2026-090', customerName: 'Tom Hardy', approvals: null, quotationStatus: 'Draft' },
            { id: 3, leadId: 'LD-2026-085', customerName: 'Elena Rodriguez', approvals: 'Approved', quotationStatus: 'Accepted' },
            { id: 4, leadId: 'LD-2026-082', customerName: 'David Thompson', approvals: 'Pending', quotationStatus: 'Rejected' },
            { id: 5, leadId: 'LD-2026-077', customerName: 'Bruce Wayne', approvals: null, quotationStatus: 'Draft' }
          ];

          if (savedQuotes) {
            try {
              currentQuotes = JSON.parse(savedQuotes);
            } catch (e) {
              console.error(e);
              currentQuotes = defaultQuotes;
            }
          } else {
            currentQuotes = defaultQuotes;
          }

          const nextQuoteId = currentQuotes.length > 0 ? Math.max(...currentQuotes.map(q => q.id)) + 1 : 1;
          const newQuote = {
            id: nextQuoteId,
            leadId: pendingStatusChange.leadId,
            customerName: pendingStatusChange.name,
            approvals: 'Approved',
            quotationStatus: 'Sent',
            uploadedFileName: pendingStatusChange.showOwnQuotationUpload ? (pendingStatusChange.ownQuotationFile || 'Quotation.pdf') : null
          };

          currentQuotes.push(newQuote);
          localStorage.setItem('quotesData', JSON.stringify(currentQuotes));
          window.dispatchEvent(new Event('storage'));
        }
        
        newHistory.push({
          date: `${formattedDate} - ${new Date().toLocaleTimeString()}`,
          event: eventMessage,
          meetingRemarks: remark
        });
        
        return { 
          ...lead, 
          status: nextStatus, 
          history: newHistory 
        };
      }
      return lead;
    }));
    setPendingStatusChange(null);
  };

  // Open the styled confirmation popup (instead of the browser confirm)
  const handleDeleteLeadClick = (id) => {
    const target = leadsData.find(l => l.id === id);
    if (target) setDeleteTarget(target);
  };

  // Soft-delete: mark the lead as Junk (and keep it) so it is counted under Junk,
  // matching the Coordinator CRM. The bulk-sync effect persists this to the shared DB.
  const confirmDeleteLead = () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setLeadsData(prev => prev.map(l => {
      if (l.id !== id) return l;
      const newHistory = l.history ? [...l.history] : [];
      const options = { year: 'numeric', month: 'short', day: 'numeric' };
      const formattedDate = new Date().toLocaleDateString('en-US', options);
      newHistory.push({ date: `${formattedDate} - ${new Date().toLocaleTimeString()}`, event: 'Lead moved to Junk' });
      return { ...l, status: 'JUNK', history: newHistory };
    }));
    setDeleteTarget(null);
  };

  // Card calculation
  const totalLeads = leadsData.length;
  const newLeads = leadsData.filter(l => l.status === 'NEW').length;
  const hotLeads = leadsData.filter(l => l.status === 'HOT').length;
  const warmLeads = leadsData.filter(l => l.status === 'WARM').length;
  const coldLeads = leadsData.filter(l => l.status === 'COLD').length;
  // ── Record-based counts (match the Manager Dashboard) ──
  // Appt. Fixed = this manager's scheduled appointments (site visits excluded)
  const myApptRecords = apptRecords.filter(a => (a.manager || '').trim().toLowerCase() === mgrKey);
  const apptFixedLeads = myApptRecords.filter(a => a.type !== 'Visits').length;
  // Quotation Sent = quotations raised against this manager's own leads
  const myLeadIdSet = new Set(leadsData.map(l => l.leadId));
  const quotationSendLeads = quoteRecords.filter(q => myLeadIdSet.has(q.leadId)).length;
  const negotiationLeads = leadsData.filter(l => l.status === 'NEGOTIATION').length;
  // Order Confirmed = real Order Confirmation handover documents
  const orderConfirmedLeads = projectRecords.length;
  const junkLeads = leadsData.filter(l => l.status === 'JUNK').length;
  const lostDealLeads = leadsData.filter(l => l.status === 'LOST').length;

  const filteredLeads = leadsData.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.leadId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.services.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery);
      
    const matchesService = serviceFilter === 'All' || lead.services === serviceFilter;
    const matchesSource = sourceFilter === 'All' || lead.source === sourceFilter;
    const matchesStatus = statusFilter === 'All' || lead.status === statusFilter;
    const matchesAssignee = assigneeFilter === 'All' || lead.assignTo === assigneeFilter;
    
    return matchesSearch && matchesService && matchesSource && matchesStatus && matchesAssignee;
  });

  return (
    <div className="leads-page">
      {/* Top action header aligned with mockup */}
      <div className="leads-header-section">
        <h1 className="leads-section-title">Lead Management</h1>
        <div className="leads-header-controls">
          <div className="leads-header-search">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Search leads..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="leads-add-btn" onClick={() => setShowAddModal(true)}>
            Add New Lead
          </button>
        </div>
      </div>

      {/* Overview and Date Filter */}
      <div className="leads-overview-section">
        <h2 className="overview-title">Overview</h2>
        <DateRangePicker 
          fromDate={dateFrom} 
          toDate={dateTo} 
          onApply={(from, to) => {
            setDateFrom(from);
            setDateTo(to);
          }} 
        />
      </div>

      {/* Grid of 10 Cards to match screenshot */}
      <div className="leads-cards-grid">
        <div 
          className={`lead-kpi-card purple-theme ${statusFilter === 'All' ? 'active-filter' : ''}`}
          onClick={() => setStatusFilter('All')}
        >
          <div className="card-top">
            <div className="card-info">
              <span className="card-label">Total Leads</span>
              <span className="card-value">{totalLeads}</span>
            </div>
            <div className="card-icon-box">
              <Users size={20} />
            </div>
          </div>
          <div className="card-bottom">
            <span className="card-subtext">All leads in system</span>
          </div>
        </div>

        <div 
          className={`lead-kpi-card blue-theme ${statusFilter === 'NEW' ? 'active-filter' : ''}`}
          onClick={() => setStatusFilter('NEW')}
        >
          <div className="card-top">
            <div className="card-info">
              <span className="card-label">New Leads</span>
              <span className="card-value">{newLeads}</span>
            </div>
            <div className="card-icon-box">
              <Sparkles size={20} />
            </div>
          </div>
          <div className="card-bottom">
            <span className="card-subtext">Freshly received</span>
          </div>
        </div>

        <div 
          className={`lead-kpi-card pink-theme ${statusFilter === 'HOT' ? 'active-filter' : ''}`}
          onClick={() => setStatusFilter('HOT')}
        >
          <div className="card-top">
            <div className="card-info">
              <span className="card-label">Hot Leads</span>
              <span className="card-value">{hotLeads}</span>
            </div>
            <div className="card-icon-box">
              <Flame size={20} />
            </div>
          </div>
          <div className="card-bottom">
            <span className="card-subtext">High conversion chance</span>
          </div>
        </div>

        <div 
          className={`lead-kpi-card orange-theme ${statusFilter === 'WARM' ? 'active-filter' : ''}`}
          onClick={() => setStatusFilter('WARM')}
        >
          <div className="card-top">
            <div className="card-info">
              <span className="card-label">Warm Leads</span>
              <span className="card-value">{warmLeads}</span>
            </div>
            <div className="card-icon-box">
              <Thermometer size={20} />
            </div>
          </div>
          <div className="card-bottom">
            <span className="card-subtext">Nurturing in progress</span>
          </div>
        </div>

        <div 
          className={`lead-kpi-card ice-theme ${statusFilter === 'COLD' ? 'active-filter' : ''}`}
          onClick={() => setStatusFilter('COLD')}
        >
          <div className="card-top">
            <div className="card-info">
              <span className="card-label">Cold Leads</span>
              <span className="card-value">{coldLeads}</span>
            </div>
            <div className="card-icon-box">
              <Snowflake size={20} />
            </div>
          </div>
          <div className="card-bottom">
            <span className="card-subtext">Need re-engagement</span>
          </div>
        </div>

        {/* Row 2 */}
        <div 
          className={`lead-kpi-card green-theme ${statusFilter === 'APPT FIXED' ? 'active-filter' : ''}`}
          onClick={() => setStatusFilter('APPT FIXED')}
        >
          <div className="card-top">
            <div className="card-info">
              <span className="card-label">Appt. Fixed</span>
              <span className="card-value">{apptFixedLeads}</span>
            </div>
            <div className="card-icon-box">
              <CalendarCheck size={20} />
            </div>
          </div>
          <div className="card-bottom">
            <span className="card-subtext">Meetings scheduled</span>
          </div>
        </div>

        <div 
          className={`lead-kpi-card light-purple-theme ${statusFilter === 'QUOTATION SEND' ? 'active-filter' : ''}`}
          onClick={() => setStatusFilter('QUOTATION SEND')}
        >
          <div className="card-top">
            <div className="card-info">
              <span className="card-label">Quotation Sent</span>
              <span className="card-value">{quotationSendLeads}</span>
            </div>
            <div className="card-icon-box">
              <FileText size={20} />
            </div>
          </div>
          <div className="card-bottom">
            <span className="card-subtext">Awaiting response</span>
          </div>
        </div>

        <div
          className={`lead-kpi-card lime-green-theme ${statusFilter === 'ORDER CONFIRMED' ? 'active-filter' : ''}`}
          onClick={() => setStatusFilter('ORDER CONFIRMED')}
        >
          <div className="card-top">
            <div className="card-info">
              <span className="card-label">Order Confirmed</span>
              <span className="card-value">{orderConfirmedLeads}</span>
            </div>
            <div className="card-icon-box">
              <CheckCircle size={20} />
            </div>
          </div>
          <div className="card-bottom">
            <span className="card-subtext">Successfully closed</span>
          </div>
        </div>

        <div 
          className={`lead-kpi-card slate-theme ${statusFilter === 'JUNK' ? 'active-filter' : ''}`}
          onClick={() => setStatusFilter('JUNK')}
        >
          <div className="card-top">
            <div className="card-info">
              <span className="card-label">Junk</span>
              <span className="card-value">{junkLeads}</span>
            </div>
            <div className="card-icon-box">
              <Trash2 size={20} />
            </div>
          </div>
          <div className="card-bottom">
            <span className="card-subtext">Unqualified leads</span>
          </div>
        </div>

        <div
          className={`lead-kpi-card orange-theme ${statusFilter === 'LOST' ? 'active-filter' : ''}`}
          onClick={() => setStatusFilter('LOST')}
        >
          <div className="card-top">
            <div className="card-info">
              <span className="card-label">Lost Deal</span>
              <span className="card-value">{lostDealLeads}</span>
            </div>
            <div className="card-icon-box">
              <XCircle size={20} />
            </div>
          </div>
          <div className="card-bottom">
            <span className="card-subtext">Unsuccessful deals</span>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="leads-table-container">
        <table className="leads-mock-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Lead ID</th>
              <th>Customer Name</th>
              <th>Work Type</th>
              <th>Project Location</th>
              <th>
                <select
                  className="header-filter-select"
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                >
                  <option value="All">Services</option>
                  <option value="PEB">PEB</option>
                  <option value="Tensile">Tensile</option>
                  <option value="Other roofing">Other roofing</option>
                </select>
              </th>
              <th>Project Value</th>
              <th>Phone Number</th>
              <th>
                <select
                  className="header-filter-select"
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                >
                  <option value="All">Lead Source</option>
                  <option value="WEBSITE ENQUIRY">WEBSITE ENQUIRY</option>
                  <option value="REFERRAL">REFERRAL</option>
                  <option value="COLD CALLING">COLD CALLING</option>
                  <option value="META LEADS">META LEADS</option>
                  <option value="GOOGLE ADS">GOOGLE ADS</option>
                </select>
              </th>
              <th>
                <select
                  className="header-filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">Status</option>
                  <option value="NEW">NEW</option>
                  <option value="HOT">HOT</option>
                  <option value="WARM">WARM</option>
                  <option value="COLD">COLD</option>
                  <option value="APPT FIXED">APPT FIXED</option>
                  <option value="QUOTATION SEND">QUOTATION SEND</option>
                  <option value="ORDER CONFIRMED">ORDER CONFIRMED</option>
                  <option value="JUNK">JUNK</option>
                </select>
              </th>
              <th>Design Req</th>
              <th>
                <select
                  className="header-filter-select"
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                >
                  <option value="All">Assign To</option>
                  {SALES_TEAM.map((name) => (<option key={name} value={name}>{name}</option>))}
                  <option value="Unassigned">Unassigned</option>
                </select>
              </th>
              <th>Follow-up</th>
              <th>Action</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map(lead => {
              const isCurrentActive = activeHistoryLead?.id === lead.id;
              return (
                <React.Fragment key={lead.id}>
                  <tr 
                    className={isCurrentActive ? 'row-expanded-header' : ''}
                    onClick={() => setActiveHistoryLead(isCurrentActive ? null : lead)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="date-cell">{lead.date}</td>
                    <td className="lead-id-cell">{lead.leadId}</td>
                    <td className="customer-name-cell"><strong>{lead.name}</strong></td>
                    <td className="worktype-cell">{lead.workType || lead.projectType || lead.services || '-'}</td>
                    <td className="location-cell">{lead.location || '-'}</td>
                    <td className="services-cell">{lead.services}</td>
                    <td className="budget-cell">{lead.budget || '-'}</td>
                    <td className="phone-cell">{lead.phone}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="select-container source-container">
                        <select
                          className={`source-dropdown select-source-${lead.source.toLowerCase().replace(/ /g, '-')}`}
                          style={{ backgroundColor: sourceColor(lead.source).bg, color: sourceColor(lead.source).color, borderColor: sourceColor(lead.source).border }}
                          value={lead.source}
                          onChange={(e) => handleUpdateLeadField(lead.id, 'source', e.target.value)}
                        >
                          <option value="WEBSITE ENQUIRY">WEBSITE ENQUIRY</option>
                          <option value="REFERRAL">REFERRAL</option>
                          <option value="COLD CALLING">COLD CALLING</option>
                          <option value="META LEADS">META LEADS</option>
                          <option value="GOOGLE ADS">GOOGLE ADS</option>
                          <option value="ORGANIC LEADS">ORGANIC LEADS</option>
                        </select>
                        <ChevronDown className="select-chevron" size={12} />
                      </div>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="select-container status-container">
                        <select
                          className={`status-dropdown select-status-${lead.status.toLowerCase().replace(/ /g, '-')}`}
                          style={{ backgroundColor: statusColor(lead.status).bg, color: statusColor(lead.status).color, borderColor: statusColor(lead.status).border }}
                          value={lead.status}
                          onChange={(e) => setPendingStatusChange({
                            id: lead.id, 
                            name: lead.name, 
                            leadId: lead.leadId, 
                            status: e.target.value, 
                            services: lead.services,
                            remark: '',
                            apptDate: '',
                            apptTime: '',
                            apptLocation: '',
                            amountExGST: '',
                            gstAmount: '',
                            ownQuotationFile: null,
                            showOwnQuotationUpload: false
                          })}
                        >
                          <option value="NEW">NEW</option>
                          <option value="HOT">HOT</option>
                          <option value="WARM">WARM</option>
                          <option value="COLD">COLD</option>
                          <option value="APPT FIXED">APPT FIXED</option>
                          <option value="QUOTATION SEND">QUOTATION SEND</option>
                          <option value="ORDER CONFIRMED">ORDER CONFIRMED</option>
                          <option value="JUNK">JUNK</option>
                        </select>
                        <ChevronDown className="select-chevron" size={12} />
                      </div>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="select-container">
                        <select
                          className="assignee-dropdown"
                          value={lead.designReq || ''}
                          onChange={(e) => handleUpdateLeadField(lead.id, 'designReq', e.target.value)}
                        >
                          <option value="">Select</option>
                          <option value="2D Design">2D Design</option>
                          <option value="3D Design">3D Design</option>
                          <option value="Both">Both</option>
                        </select>
                        <ChevronDown className="select-chevron" size={12} />
                      </div>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="select-container assignee-container">
                        <select 
                          className="assignee-dropdown"
                          value={lead.assignTo}
                          onChange={(e) => handleUpdateLeadField(lead.id, 'assignTo', e.target.value)}
                        >
                          {SALES_TEAM.map((name) => (<option key={name} value={name}>{name}</option>))}
                          <option value="Unassigned">Unassigned</option>
                        </select>
                        <ChevronDown className="select-chevron" size={12} />
                      </div>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="date"
                        className="followup-input"
                        value={toDateInputValue(lead.followUp)}
                        onChange={(e) => handleUpdateLeadField(lead.id, 'followUp', e.target.value)}
                        style={{ padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', color: '#1e293b', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}
                      />
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="action-buttons-cell" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          className="btn-icon-action"
                          onClick={(e) => { e.stopPropagation(); setActiveHistoryLead(lead); }}
                          style={{ background: '#4f46e5', border: 'none', color: '#fff', cursor: 'pointer', width: '28px', height: '28px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Timeline & Notes"
                        >
                          <Activity size={14} />
                        </button>
                        <button
                          className="btn-icon-action edit-btn"
                          onClick={() => setEditWizardLead(lead)}
                          style={{ background: '#E0E7FF', border: 'none', color: '#4f46e5', cursor: 'pointer', width: '28px', height: '28px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Edit Lead"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          className="btn-icon-action"
                          onClick={(e) => { e.stopPropagation(); downloadLead(lead); }}
                          style={{ background: '#DCFCE7', border: 'none', color: '#166534', cursor: 'pointer', width: '28px', height: '28px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Download Lead PDF"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          className="btn-icon-action delete-btn"
                          onClick={() => handleDeleteLeadClick(lead.id)}
                          style={{ background: '#FEE2E2', border: 'none', color: '#dc2626', cursor: 'pointer', width: '28px', height: '28px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Delete Lead"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                    <td 
                      className="notes-cell" 
                      style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64748b' }} 
                      title={lead.notes || ''}
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextNote = window.prompt("Edit Notes:", lead.notes || "");
                        if (nextNote !== null) {
                          handleUpdateLeadField(lead.id, 'notes', nextNote);
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', cursor: 'pointer' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{lead.notes || '-'}</span>
                        <Edit3 size={12} style={{ color: '#94a3b8', flexShrink: 0 }} className="cell-edit-icon" />
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add New Lead Modal (multi-step wizard, matches Sales Coordinator CRM) */}
      <AddLeadWizard
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleWizardSave}
        defaultManager={mgrName}
      />
      {/* Edit an existing lead through the same full multi-step form (prefilled) */}
      {editWizardLead && (
        <AddLeadWizard
          key={`edit-${editWizardLead.id}`}
          isOpen={true}
          initialData={editWizardLead}
          defaultManager={mgrName}
          onClose={() => setEditWizardLead(null)}
          onSave={(data) => handleWizardEditSave(editWizardLead, data)}
        />
      )}
      {/* Move-to-Junk confirmation popup */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }} onClick={() => setDeleteTarget(null)}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '420px', borderRadius: '16px', boxShadow: '0 20px 48px rgba(15,23,42,0.25)', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '1.5rem 1.5rem 0.5rem', display: 'flex', gap: '0.9rem', alignItems: 'flex-start' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={22} />
              </div>
              <div>
                <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>Move lead to Junk?</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748B', lineHeight: 1.5 }}>
                  <strong style={{ color: '#111827' }}>{deleteTarget.name || deleteTarget.leadId}</strong> will be moved to Junk. You can still find it under the Junk filter.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1.25rem 1.5rem' }}>
              <button onClick={() => setDeleteTarget(null)} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#fff', color: '#334155', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem' }}>Cancel</button>
              <button onClick={confirmDeleteLead} style={{ padding: '0.6rem 1.4rem', borderRadius: '8px', border: 'none', background: '#DC2626', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem' }}>Move to Junk</button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Lead Modal */}
      {editingLead && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit Lead details</h2>
              <button className="close-btn" onClick={() => setEditingLead(null)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label>Customer Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    placeholder="Enter customer name"
                    value={editingLead.name}
                    onChange={(e) => setEditingLead({ ...editingLead, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Phone No</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    placeholder="Enter phone number"
                    value={editingLead.phone}
                    onChange={(e) => setEditingLead({ ...editingLead, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Services</label>
                  <select 
                    className="form-select"
                    value={editingLead.services}
                    onChange={(e) => setEditingLead({ ...editingLead, services: e.target.value })}
                  >
                    <option value="PEB">PEB</option>
                    <option value="Tensile">Tensile</option>
                    <option value="Other roofing">Other roofing</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Lead Source</label>
                  <select
                    className="form-select"
                    value={editingLead.source}
                    onChange={(e) => setEditingLead({ ...editingLead, source: e.target.value })}
                  >
                    <option value="WEBSITE ENQUIRY">WEBSITE ENQUIRY</option>
                    <option value="REFERRAL">REFERRAL</option>
                    <option value="COLD CALLING">COLD CALLING</option>
                    <option value="META LEADS">META LEADS</option>
                    <option value="GOOGLE ADS">GOOGLE ADS</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Project Value (₹)</label>
                  <input
                    type="text"
                    className="form-input"
                    inputMode="numeric"
                    placeholder="e.g. 250000"
                    value={editingLead.budget || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, budget: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select 
                    className="form-select"
                    value={editingLead.status}
                    onChange={(e) => setEditingLead({ ...editingLead, status: e.target.value })}
                  >
                    <option value="HOT">HOT</option>
                    <option value="APPT FIXED">APPT FIXED</option>
                    <option value="WARM">WARM</option>
                    <option value="COLD">COLD</option>
                    <option value="NEW">NEW</option>
                    <option value="QUOTATION SEND">QUOTATION SEND</option>
                    <option value="ORDER CONFIRMED">ORDER CONFIRMED</option>
                    <option value="JUNK">JUNK</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Assign To</label>
                  <select 
                    className="form-select"
                    value={editingLead.assignTo}
                    onChange={(e) => setEditingLead({ ...editingLead, assignTo: e.target.value })}
                  >
                    {SALES_TEAM.map((name) => (<option key={name} value={name}>{name}</option>))}
                    <option value="Unassigned">Unassigned</option>
                  </select>
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>Notes</label>
                  <textarea 
                    className="form-input" 
                    placeholder="Enter notes..."
                    value={editingLead.notes || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, notes: e.target.value })}
                    style={{ 
                      padding: '12px 16px', 
                      borderRadius: '12px', 
                      border: '1px solid #e2e8f0', 
                      fontSize: '14px',
                      minHeight: '80px', 
                      resize: 'vertical', 
                      fontFamily: 'inherit',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setEditingLead(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Status Update Remark Overlay / Schedule Appointment */}
      {pendingStatusChange && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '500px', borderRadius: '24px', padding: '12px' }}>
            {pendingStatusChange.status === 'APPT FIXED' ? (
              <>
                <div className="modal-header" style={{ borderBottom: 'none', padding: '24px 24px 8px 24px' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>Schedule Appointment</h2>
                  <button className="close-btn" onClick={() => setPendingStatusChange(null)} style={{ color: '#64748b' }}>
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handlePendingStatusSubmit}>
                  <div className="modal-body" style={{ padding: '0 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Date & Time Row */}
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>Appointment Date</label>
                        <input 
                          type="date" 
                          className="form-input" 
                          required 
                          value={pendingStatusChange.apptDate || ''}
                          onChange={(e) => setPendingStatusChange({ ...pendingStatusChange, apptDate: e.target.value })}
                          style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px' }}
                        />
                      </div>
                      
                      <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>Meeting timing (Time)</label>
                        <input 
                          type="time" 
                          className="form-input" 
                          required 
                          value={pendingStatusChange.apptTime || ''}
                          onChange={(e) => setPendingStatusChange({ ...pendingStatusChange, apptTime: e.target.value })}
                          style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px' }}
                        />
                      </div>
                    </div>

                    {/* Location */}
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>Location / Address</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        required 
                        placeholder="Office address or site location..."
                        value={pendingStatusChange.apptLocation || ''}
                        onChange={(e) => setPendingStatusChange({ ...pendingStatusChange, apptLocation: e.target.value })}
                        style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px' }}
                      />
                    </div>

                    {/* Remark */}
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>Remark</label>
                      <textarea 
                        className="form-textarea" 
                        placeholder="Any notes for the meeting..."
                        value={pendingStatusChange.remark || ''}
                        onChange={(e) => setPendingStatusChange({ ...pendingStatusChange, remark: e.target.value })}
                        style={{ 
                          padding: '12px 16px', 
                          borderRadius: '12px', 
                          border: '1px solid #e2e8f0', 
                          fontSize: '14px',
                          minHeight: '80px',
                          resize: 'vertical',
                          outline: 'none',
                          fontFamily: 'inherit'
                        }}
                        required
                      />
                    </div>
                  </div>

                  <div className="modal-footer" style={{ borderTop: 'none', background: 'transparent', padding: '0 24px 24px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      onClick={() => setPendingStatusChange(null)}
                      style={{
                        backgroundColor: 'white',
                        color: '#1e293b',
                        border: '1px solid #cbd5e1',
                        borderRadius: '12px',
                        padding: '12px 24px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn-primary"
                      style={{
                        backgroundColor: '#2e2a72',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '12px 24px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      Confirm Appointment
                    </button>
                  </div>
                </form>
              </>
            ) : pendingStatusChange.status === 'QUOTATION SEND' ? (
              <>
                <div className="modal-header" style={{ borderBottom: 'none', padding: '24px 24px 8px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Generate Quotation</h2>
                    <button 
                      type="button"
                      onClick={() => setPendingStatusChange(prev => ({ ...prev, showOwnQuotationUpload: !prev.showOwnQuotationUpload }))}
                      style={{
                        backgroundColor: pendingStatusChange.showOwnQuotationUpload ? '#2e2a72' : '#f1f5f9',
                        color: pendingStatusChange.showOwnQuotationUpload ? 'white' : '#334155',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Own Quotation
                    </button>
                  </div>
                  <button className="close-btn" onClick={() => setPendingStatusChange(null)} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handlePendingStatusSubmit}>
                  <div className="modal-body" style={{ padding: '0 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {pendingStatusChange.showOwnQuotationUpload ? (
                      <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>Upload Quotation Document</label>
                        <input 
                          type="file" 
                          required
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setPendingStatusChange(prev => ({ ...prev, ownQuotationFile: e.target.files[0].name }));
                            }
                          }}
                          style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px' }}
                        />
                      </div>
                    ) : (
                      <>
                        {/* Lead ID & Client Name Row */}
                        <div style={{ display: 'flex', gap: '16px' }}>
                          <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>Lead ID</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              disabled
                              value={pendingStatusChange.leadId || ''}
                              style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', backgroundColor: '#f8fafc' }}
                            />
                          </div>
                          
                          <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>Client Name</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              disabled
                              value={pendingStatusChange.name || ''}
                              style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', backgroundColor: '#f8fafc' }}
                            />
                          </div>
                        </div>

                        {/* Services */}
                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>Services</label>
                          <select 
                            className="form-select"
                            value={pendingStatusChange.services || ''}
                            onChange={(e) => setPendingStatusChange({ ...pendingStatusChange, services: e.target.value })}
                            style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', appearance: 'auto' }}
                          >
                            <option value="PEB">PEB</option>
                            <option value="Tensile">Tensile</option>
                            <option value="Other roofing">Other roofing</option>
                          </select>
                        </div>

                        {/* Amount & GST Row */}
                        <div style={{ display: 'flex', gap: '16px' }}>
                          <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>Amount (ex. GST)</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              required 
                              placeholder="e.g. ₹100,000"
                              value={pendingStatusChange.amountExGST || ''}
                              onChange={(e) => setPendingStatusChange({ ...pendingStatusChange, amountExGST: e.target.value })}
                              style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px' }}
                            />
                          </div>
                          
                          <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>GST Amount</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              required 
                              placeholder="e.g. ₹18,000"
                              value={pendingStatusChange.gstAmount || ''}
                              onChange={(e) => setPendingStatusChange({ ...pendingStatusChange, gstAmount: e.target.value })}
                              style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px' }}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="modal-footer" style={{ borderTop: 'none', background: 'transparent', padding: '0 24px 24px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      onClick={() => setPendingStatusChange(null)}
                      style={{
                        backgroundColor: 'white',
                        color: '#1e293b',
                        border: '1px solid #cbd5e1',
                        borderRadius: '12px',
                        padding: '12px 24px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn-primary"
                      style={{
                        backgroundColor: '#2e2a72',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '12px 24px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {pendingStatusChange.showOwnQuotationUpload ? 'Submit' : 'Generate'}
                    </button>
                  </div>
                </form>
              </>
            ) : ['HOT', 'WARM', 'COLD', 'NEGOTIATION', 'ORDER CONFIRMED', 'JUNK'].includes(pendingStatusChange.status) ? (
              <>
                <div className="modal-header" style={{ borderBottom: 'none', padding: '24px 24px 8px 24px' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>Status Update Remark</h2>
                  <button className="close-btn" onClick={() => setPendingStatusChange(null)} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handlePendingStatusSubmit}>
                  <div className="modal-body" style={{ padding: '0 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ fontSize: '15px', color: '#64748b', fontWeight: '500', marginBottom: '8px' }}>
                      You are changing the status to <span className={`select-status-${pendingStatusChange.status.toLowerCase().replace(/ /g, '-')}`} style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: '700', margin: '0 4px', textTransform: 'uppercase' }}>{pendingStatusChange.status} LEADS</span>.
                    </div>
                    
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>Add a Remark / Note for this transition:</label>
                      <textarea 
                        className="form-textarea" 
                        rows={4}
                        placeholder="e.g., Talked to client, they requested pricing details..."
                        value={pendingStatusChange.remark}
                        onChange={(e) => setPendingStatusChange({ ...pendingStatusChange, remark: e.target.value })}
                        style={{ 
                          padding: '12px 16px', 
                          borderRadius: '12px', 
                          border: '1px solid #e2e8f0', 
                          fontSize: '14px',
                          minHeight: '80px',
                          resize: 'vertical',
                          outline: 'none',
                          fontFamily: 'inherit'
                        }}
                        required
                      />
                    </div>
                  </div>
                  <div className="modal-footer" style={{ borderTop: 'none', background: 'transparent', padding: '0 24px 24px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      onClick={() => setPendingStatusChange(null)}
                      style={{
                        backgroundColor: 'white',
                        color: '#1e293b',
                        border: '1px solid #cbd5e1',
                        borderRadius: '12px',
                        padding: '12px 24px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn-primary"
                      style={{
                        backgroundColor: '#2e2a72',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '12px 24px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      Save Status
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="modal-header" style={{ borderBottom: 'none', padding: '24px 24px 8px 24px' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>Add Status Remark</h2>
                  <button className="close-btn" onClick={() => setPendingStatusChange(null)} style={{ color: '#64748b' }}>
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handlePendingStatusSubmit}>
                  <div className="modal-body" style={{ padding: '0 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Lead Information</div>
                      <div style={{ fontSize: '14px', color: '#0f172a', fontWeight: '700', marginTop: '4px' }}>
                        {pendingStatusChange.leadId} — {pendingStatusChange.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '13px' }}>
                        <span style={{ color: '#64748b' }}>Changing status to:</span>
                        <span className={`select-status-${pendingStatusChange.status.toLowerCase().replace(/ /g, '-')}`} style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>
                          {pendingStatusChange.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>Remarks / Notes</label>
                      <textarea 
                        className="form-textarea" 
                        rows={4}
                        placeholder="Enter details or reason for this status change..."
                        value={pendingStatusChange.remark}
                        onChange={(e) => setPendingStatusChange({ ...pendingStatusChange, remark: e.target.value })}
                        style={{ 
                          padding: '12px 16px', 
                          borderRadius: '12px', 
                          border: '1px solid #e2e8f0', 
                          fontSize: '14px',
                          minHeight: '80px',
                          resize: 'vertical',
                          outline: 'none',
                          fontFamily: 'inherit'
                        }}
                        required
                      />
                    </div>
                  </div>
                  <div className="modal-footer" style={{ borderTop: 'none', background: 'transparent', padding: '0 24px 24px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      onClick={() => setPendingStatusChange(null)}
                      style={{
                        backgroundColor: 'white',
                        color: '#1e293b',
                        border: '1px solid #cbd5e1',
                        borderRadius: '12px',
                        padding: '12px 24px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn-primary"
                      style={{
                        backgroundColor: '#2e2a72',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '12px 24px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      Update Status
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
      {/* Rightside Slide-over History Drawer */}
      {activeHistoryLead && (
        <div className="history-drawer-overlay" onClick={() => setActiveHistoryLead(null)}>
          <div className="history-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <h3>Lead Change History & Notes</h3>
                <p>{activeHistoryLead.leadId} — <strong>{activeHistoryLead.name}</strong></p>
              </div>
              <button className="drawer-close-btn" onClick={() => setActiveHistoryLead(null)} title="Close Drawer">
                <X size={20} />
              </button>
            </div>
            <div className="drawer-content">
              <h4 style={{ fontSize: '15px', color: '#0f172a', fontWeight: '700', marginBottom: '16px' }}>Change History & Logs</h4>
              {(!activeHistoryLead.history || activeHistoryLead.history.length === 0) ? (
                <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', marginTop: '40px' }}>
                  No history records available for this lead.
                </div>
              ) : (
                <div className="timeline-container">
                  {activeHistoryLead.history.map((h, i) => {
                    const styleInfo = getTimelineEventStyle(h.event);
                    return (
                      <div className={`timeline-item ${styleInfo.class}`} key={i} style={{ position: 'relative', marginBottom: '16px' }}>
                        <div 
                          className="timeline-dot" 
                          style={{ 
                            position: 'absolute',
                            left: '-34px',
                            top: '12px',
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            backgroundColor: '#ffffff',
                            border: `2px solid ${styleInfo.dotColor}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 2,
                            boxShadow: 'none'
                          }}
                        >
                          {getTimelineEventIcon(h.event, styleInfo.dotColor)}
                        </div>
                        <div 
                          className="timeline-event"
                          style={{ 
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                            padding: '14px 16px',
                            width: '100%',
                            boxSizing: 'border-box'
                          }}
                        >
                          <span style={{ fontSize: '11.5px', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>{h.date}</span>
                          <div style={{ fontSize: '14.5px', fontWeight: '600', color: '#1e293b' }}>{h.event}</div>
                          {h.measurementNote && (
                            <div style={{ marginTop: '6px', fontSize: '12px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', padding: '6px 10px', borderRadius: '6px', border: '1px solid #bbf7d0', width: 'fit-content' }}>
                              📐 <strong>Measurement Note:</strong> {h.measurementNote} Sq.ft
                            </div>
                          )}
                          {h.designRequest && h.designRequest !== 'None' && (
                            <div style={{ marginTop: '6px', fontSize: '12px', color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '6px', background: '#f5f3ff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #ddd6fe', width: 'fit-content' }}>
                              🎨 <strong>Design Request:</strong> {h.designRequest}
                            </div>
                          )}
                          {h.meetingRemarks && (
                            <div style={{ display: 'flex', alignItems: 'flex-start', borderLeft: '3px solid #3b82f6', paddingLeft: '8px', marginTop: '8px' }}>
                              <span style={{ fontSize: '13px', color: '#475569', fontStyle: 'italic' }}>
                                <strong><em>Remark:</em></strong> "{h.meetingRemarks}"
                              </span>
                            </div>
                          )}
                          {(h.measurementImage || h.siteImage) && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                              {h.measurementImage && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <img src={h.measurementImage} alt="Measurement" style={{ width: '60px', height: '60px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #cbd5e1' }} />
                                  <span style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>Measurement</span>
                                </div>
                              )}
                              {h.siteImage && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <img src={h.siteImage} alt="Site" style={{ width: '60px', height: '60px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #cbd5e1' }} />
                                  <span style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>Site Image</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadsManagement;
