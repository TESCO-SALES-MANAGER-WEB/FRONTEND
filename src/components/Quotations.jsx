import React, { useState } from 'react';
import { 
  Plus, 
  FileText,
  CheckCircle,
  XCircle,
  Send,
  Download,
  Clock,
  FileUp
} from 'lucide-react';
import './Quotations.css';
import { quotationsApi, leadsApi, appointmentsApi } from '../api/client';
import { notify } from '../utils/notify';

// Map the shared backend quotation onto this view's shape
const quoteFromApi = (q) => ({
  id: parseInt(String(q.id || '').replace(/\D/g, '')) || Math.floor(Math.random() * 1e9),
  qid: q.id,
  leadId: q.leadId || '',
  customerName: q.client || '',
  approvals: q.approvalStatus === 'Approved' ? 'Approved' : q.approvalStatus === 'Rejected' ? 'Rejected' : q.approvalStatus === 'Changes Requested' ? 'Changes Requested' : q.approvalStatus === 'Pending' ? 'Pending' : null,
  rejectionReason: q.rejectionReason || '',
  quotationStatus: q.quotationStatus === 'Prepared' ? 'Sent' : 'Draft',
  uploadedFileName: q.fileName || null,
  fileData: q.fileData || null,
});

const Quotations = () => {
  const [quotesList, setQuotesList] = useState([]);
  const [myLeads, setMyLeads] = useState([]);
  const [allLeads, setAllLeads] = useState([]); // every lead — used to resolve a visit's lead
  const [appts, setAppts] = useState([]); // appointments/visits — used to gate the Lead dropdown
  const [showUpload, setShowUpload] = useState(false);
  const emptyForm = { leadId: '', customer: '', project: '', amount: '', gst: '', fileName: null, fileData: null };
  const [form, setForm] = useState(emptyForm);
  const mgrName = (localStorage.getItem('mgr_name') || '').trim();

  // Load only quotations for leads assigned to the logged-in manager
  React.useEffect(() => {
    Promise.all([quotationsApi.list(), leadsApi.list()])
      .then(([quotes, leads]) => {
        const all = Array.isArray(leads) ? leads : [];
        setAllLeads(all);
        const myLeadsArr = all.filter((l) => (l.manager || '').trim() === mgrName);
        setMyLeads(myLeadsArr);
        const myLeadIds = new Set(myLeadsArr.map((l) => l.id));
        const mine = (Array.isArray(quotes) ? quotes : [])
          .filter((q) => myLeadIds.has(q.leadId))
          .map(quoteFromApi)
          .sort((a, b) => (b.id || 0) - (a.id || 0)); // newest first
        setQuotesList(mine);
      })
      .catch((e) => console.error('Failed to load quotations:', e));
  }, []);

  // Load appointments/visits so we only offer leads whose VISIT is completed
  // (strict lifecycle: Visit completed → Quotation).
  React.useEffect(() => {
    appointmentsApi.list()
      .then((data) => { if (Array.isArray(data)) setAppts(data); })
      .catch((e) => console.error('Failed to load appointments:', e));
  }, []);

  // ── Lifecycle gating (Visit completed → Quotation) ──
  //   Eligible = lead has a COMPLETED visit and no ACTIVE (Pending/Approved) quotation.
  //   A Rejected quotation does not block a new upload; rejected ones are kept for audit.
  const mgrKey = (mgrName || '').trim().toLowerCase();
  const isVisitDone = (a) => a.progressStatus === 'completed' || /complet/i.test(String(a.status || '')) || !!a.completedAt;
  const isSelfCreated = (a) => (a.createdBy || '').trim().toLowerCase() === mgrKey;
  // A record counts as a "visit" for quotation purposes if it is shown in the manager's Visit
  // section — a Site Visit OR a coordinator-assigned appointment (not self-created here).
  const isVisitRecord = (a) => a.type === 'Visits' || /visit/i.test(String(a.visitType || '')) || !isSelfCreated(a);
  const digits = (s) => String(s || '').replace(/\D/g, '');
  const norm = (s) => String(s || '').trim().toLowerCase();
  // Completed visit records that belong to THIS manager (assigned to them or self-created).
  // Eligibility is keyed off the visit RECORDS — not the lead's `manager` field — because a
  // coordinator-assigned visit can point to a lead whose manager field was never set, which
  // previously kept the completed visit out of the dropdown.
  const myCompletedVisits = (Array.isArray(appts) ? appts : []).filter((a) =>
    isVisitRecord(a) && isVisitDone(a) &&
    ((a.manager || '').trim().toLowerCase() === mgrKey || isSelfCreated(a))
  );
  // Resolve the lead a visit record refers to: by id, then phone, then name. Falls back to a
  // lightweight lead built from the record so a quotation can still be uploaded if the lead is
  // not in this manager's own list.
  const resolveLead = (a) => {
    if (a.leadId) { const byId = allLeads.find((l) => l.id === a.leadId); if (byId) return byId; }
    const ap = digits(a.phone);
    if (ap) { const byPhone = allLeads.find((l) => { const lp = digits(l.phone); return lp && lp.slice(-10) === ap.slice(-10); }); if (byPhone) return byPhone; }
    const nm = norm(a.client || a.customerName || a.title);
    const byName = nm ? allLeads.find((l) => norm(l.name) === nm) : null;
    if (byName) return byName;
    return a.leadId ? { id: a.leadId, name: a.client || a.customerName || a.title || 'Customer', phone: a.phone || '' } : null;
  };
  const leadActiveQuote = (leadId) => quotesList.find((q) => q.leadId === leadId && q.approvals && q.approvals !== 'Rejected');
  // Eligible leads = leads with a completed visit for this manager and no active quotation.
  const eligibleLeadsMap = new Map();
  myCompletedVisits.forEach((a) => {
    const l = resolveLead(a);
    if (!l || !l.id || leadActiveQuote(l.id) || eligibleLeadsMap.has(l.id)) return;
    eligibleLeadsMap.set(l.id, l);
  });
  const eligibleLeads = Array.from(eligibleLeadsMap.values());
  const leadIdHasCompletedVisit = (leadId) => myCompletedVisits.some((a) => { const l = resolveLead(a); return l && l.id === leadId; });

  // ── Upload Quotation (create a new quotation with a PDF) — same as the Coordinator ──
  const onLeadSelect = (val) => {
    const lead = eligibleLeads.find((l) => l.id === val) || allLeads.find((l) => l.id === val) || myLeads.find((l) => l.id === val);
    setForm((f) => ({ ...f, leadId: val, customer: lead?.name || f.customer, project: lead?.projectType || lead?.services || f.project }));
  };
  // Only PDF quotations are accepted — an image (or any non-PDF) can never be used to
  // bypass the Sales Head's approval.
  const isPdfFile = (file) => file && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name || ''));
  const onFilePick = (e) => {
    const file = e.target.files[0];
    if (!file) { setForm((f) => ({ ...f, fileName: null, fileData: null })); return; }
    if (!isPdfFile(file)) {
      notify('Only PDF files are allowed. Please upload the quotation as a PDF.', 'error');
      e.target.value = '';
      setForm((f) => ({ ...f, fileName: null, fileData: null }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { const tooBig = file.size > 5 * 1024 * 1024; setForm((f) => ({ ...f, fileName: file.name, fileData: tooBig ? null : reader.result })); };
    reader.readAsDataURL(file);
  };
  const handleCreateQuote = (e) => {
    e.preventDefault();
    if (!form.leadId || !form.customer) { notify('Select a Lead ID and enter the customer.', 'warning'); return; }
    // ── Enforce the strict lifecycle before uploading ──
    if (!leadIdHasCompletedVisit(form.leadId)) {
      notify('This lead has no completed visit yet — complete the site visit first.', 'warning');
      return;
    }
    const active = leadActiveQuote(form.leadId);
    if (active) {
      notify(`This lead already has a ${String(active.approvals).toLowerCase()} quotation. A new one is allowed only after it is rejected.`, 'warning');
      return;
    }
    // PDF is mandatory — a quotation cannot be created without a PDF document.
    if (!form.fileName) {
      notify('A PDF quotation file is required before uploading.', 'warning');
      return;
    }
    const qid = `QT-${Date.now()}`;
    const amount = form.amount ? (String(form.amount).startsWith('₹') ? form.amount : `₹${form.amount}`) : '';
    const gst = form.gst ? (String(form.gst).startsWith('₹') ? form.gst : `₹${form.gst}`) : '';
    const payload = { id: qid, leadId: form.leadId, client: form.customer, project: form.project, amount, gst, approvalStatus: 'Pending', quotationStatus: form.fileName ? 'Prepared' : 'In Preparation', revision: 'Rev 0', fileName: form.fileName, fileData: form.fileData };
    quotationsApi.create(payload)
      .then(() => notify('Quotation uploaded.', 'success'))
      .catch((err) => { console.error(err); notify('Uploaded locally, but saving to the server failed.', 'error'); });
    setQuotesList((prev) => [quoteFromApi(payload), ...prev]);
    setShowUpload(false);
    setForm(emptyForm);
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Accepted': return <span className="status-badge success"><CheckCircle size={12} /> Accepted</span>;
      case 'Rejected': return <span className="status-badge error"><XCircle size={12} /> Rejected</span>;
      case 'Sent': return <span className="status-badge primary"><Send size={12} /> Sent</span>;
      default: return <span className="status-badge secondary"><FileText size={12} /> Draft</span>;
    }
  };

  const getApprovalBadge = (appStatus) => {
    if (appStatus === 'Approved') {
      return (
        <span className="status-badge success" style={{ background: '#dcfce7', color: '#15803d' }}>
          <CheckCircle size={12} /> Approved
        </span>
      );
    } else if (appStatus === 'Pending') {
      return (
        <span className="status-badge warning" style={{ background: '#fef3c7', color: '#d97706' }}>
          <Clock size={12} /> In progress
        </span>
      );
    } else if (appStatus === 'Rejected') {
      return (
        <span className="status-badge error" style={{ background: '#fee2e2', color: '#b91c1c' }}>
          <XCircle size={12} /> Rejected
        </span>
      );
    } else if (appStatus === 'Changes Requested') {
      return (
        <span className="status-badge warning" style={{ background: '#fef3c7', color: '#b45309' }}>
          <Clock size={12} /> Changes Requested
        </span>
      );
    } else {
      // Render nothing for null / unrequested status
      return null;
    }
  };

  // Live metrics from real quotations
  const requestedCount = quotesList.length;
  const pendingCount = quotesList.filter(q => q.approvals !== 'Approved').length;
  const approvedCount = quotesList.filter(q => q.approvals === 'Approved').length;

  const metricsCards = [
    {
      title: "Requested Quotation",
      value: String(requestedCount),
      sub: "All quotation requests",
      color: "#eff6ff",
      textColor: "#1d4ed8",
      icon: <FileText size={18} />
    },
    {
      title: "Pending Quotation",
      value: String(pendingCount),
      sub: "Awaiting approval",
      color: "#fff7ed",
      textColor: "#ea580c",
      icon: <Clock size={18} />
    },
    {
      title: "Approved Quotation",
      value: String(approvedCount),
      sub: "Approved quotations",
      color: "#f0fdf4",
      textColor: "#15803d",
      icon: <CheckCircle size={18} />
    }
  ];

  // Once a quotation is APPROVED, permanently move its lead to the Order Confirmation stage
  // so the Order Confirmation page can pick it up (record-driven eligibility uses the approved
  // quotation, but we also reflect the stage on the lead itself).
  const moveLeadToOrderConfirmation = (leadId) => {
    if (!leadId) return;
    leadsApi.update(leadId, { status: 'Order Confirmed' })
      .catch((e) => console.error('Failed to move lead to Order Confirmation stage:', e));
  };

  // Request approval: null -> Pending. The quotation now awaits the Sales Head's decision.
  // It is NEVER auto-approved here — only the Sales Head can approve it.
  const handleRequestClick = (id) => {
    const quote = quotesList.find(q => q.id === id);
    if (!quote || quote.approvals) return;
    if (!quote.qid) { notify('Cannot save to server: this quotation has no backend ID.', 'error'); return; }
    setQuotesList(prev => prev.map(q => (q.id === id ? { ...q, approvals: 'Pending' } : q)));
    quotationsApi.update(quote.qid, { approvalStatus: 'Pending', quotationStatus: 'Prepared' })
      .then(() => notify('Approval requested — awaiting Sales Head approval.', 'info'))
      .catch(e => { console.error(e); notify('Failed to save approval request to the server.', 'error'); });
  };

  // Download Click
  const handleDownloadClick = (quote) => {
    // Download the actual uploaded document
    if (quote.fileData) {
      const a = document.createElement('a');
      a.href = quote.fileData;
      a.download = quote.uploadedFileName || 'quotation';
      document.body.appendChild(a); a.click(); a.remove();
      return;
    }
    notify(quote.uploadedFileName ? `"${quote.uploadedFileName}" isn't available — please re-upload it.` : 'No file uploaded for this quotation yet.', 'warning');
  };

  // Upload Click
  const handleUploadClick = (id) => {
    // Once APPROVED the quotation is permanently locked — no re-upload/editing.
    const existing = quotesList.find(q => q.id === id);
    if (existing && existing.approvals === 'Approved') {
      notify('This quotation is approved and locked. It can no longer be edited.', 'warning');
      return;
    }
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/pdf,.pdf';
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        if (!isPdfFile(file)) {
          notify('Only PDF files are allowed. Please upload the quotation as a PDF.', 'error');
          return;
        }
        const quote = quotesList.find(q => q.id === id);
        // Read the file as a base64 data URI so the Sales Head can preview/download it.
        // Skip very large files to keep the payload reasonable (name is still saved).
        const reader = new FileReader();
        reader.onload = () => {
          const tooBig = file.size > 3 * 1024 * 1024;
          const fileData = (!tooBig && typeof reader.result === 'string') ? reader.result : null;
          // Uploading a document does NOT approve it. Approval is the Sales Head's decision,
          // so the quotation is marked Prepared + Pending and enters the Head's approval queue.
          const nextApproval = quote?.approvals === 'Approved' ? 'Approved' : 'Pending';
          setQuotesList(prev => prev.map(q => (
            q.id === id ? { ...q, uploadedFileName: file.name, fileData, approvals: nextApproval } : q
          )));
          if (quote?.qid) {
            quotationsApi.update(quote.qid, { fileName: file.name, fileData, approvalStatus: nextApproval, quotationStatus: 'Prepared' })
              .then(() => notify(`Quotation "${file.name}" uploaded — awaiting Sales Head approval.`, 'success'))
              .catch(err => { console.error(err); notify('Uploaded locally, but saving to the server failed. Please retry.', 'error'); });
          } else {
            notify('Cannot save to server: this quotation has no backend ID.', 'error');
          }
        };
        reader.readAsDataURL(file);
      }
    };
    fileInput.click();
  };

  // Filter listings by search
  const filteredQuotes = quotesList;

  return (
    <div className="quotations-dashboard">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Quotations</h2>
          <p>Generate, send, and track project estimates</p>
        </div>
        <button onClick={() => setShowUpload(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, padding: '0.7rem 1.2rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem' }}>
          <Plus size={16} /> Upload Quotation
        </button>
      </div>

      {/* METRICS SECTION */}
      <div className="metrics-row-mockup" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {metricsCards.map((c, i) => (
          <div key={i} style={{
            backgroundColor: c.color,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${c.textColor}22`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '130px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>{c.title}</span>
              <div style={{ color: c.textColor }}>{c.icon}</div>
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: '4px 0' }}>{c.value}</div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>{c.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* DATA TABLE */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Lead ID</th>
              <th>Customer name</th>
              <th>Approvals</th>
              <th style={{ textAlign: 'center' }}>Quotation Upload</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredQuotes.map(quote => (
              <tr key={quote.id}>
                <td className="font-medium text-primary">{quote.leadId}</td>
                <td className="font-medium">
                  {quote.customerName}
                  {quote.uploadedFileName && (
                    <div style={{ fontSize: '11px', color: '#059669', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      📎 {quote.uploadedFileName}
                    </div>
                  )}
                </td>
                <td style={{ minHeight: '34px' }}>
                  {getApprovalBadge(quote.approvals)}
                  {(quote.approvals === 'Rejected' || quote.approvals === 'Changes Requested') && quote.rejectionReason && (
                    <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '4px', maxWidth: '220px' }}>
                      Reason: {quote.rejectionReason}
                    </div>
                  )}
                </td>
                <td style={{ textAlign: 'center' }}>
                  {/* Upload Button */}
                  <button
                    onClick={() => handleUploadClick(quote.id)}
                    disabled={quote.approvals === 'Approved'}
                    title={quote.approvals === 'Approved' ? 'Approved & locked' : 'Upload Quotation Document'}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: quote.uploadedFileName ? '#ecfdf5' : '#f8fafc',
                      color: quote.uploadedFileName ? '#059669' : '#4f46e5',
                      cursor: quote.approvals === 'Approved' ? 'not-allowed' : 'pointer',
                      opacity: quote.approvals === 'Approved' ? 0.6 : 1,
                      transition: 'all 0.2s',
                      margin: '0 auto',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}
                  >
                    <FileUp size={14} />
                    <span>{quote.approvals === 'Approved' ? 'Locked' : quote.uploadedFileName ? 'Uploaded' : 'Upload PDF'}</span>
                  </button>
                </td>
                <td>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    {/* Request approval button — becomes Requested (pending) then Approved */}
                    <button
                      onClick={() => handleRequestClick(quote.id)}
                      disabled={!!quote.approvals}
                      title={quote.approvals === 'Approved' ? 'Approved by Sales Head' : quote.approvals === 'Pending' ? 'Awaiting approval' : 'Request approval'}
                      style={{
                        padding: '6px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: '600',
                        minWidth: '92px',
                        cursor: quote.approvals ? 'default' : 'pointer',
                        backgroundColor: quote.approvals ? '#e2e8f0' : '#4f46e5',
                        color: quote.approvals ? '#64748b' : '#ffffff',
                        transition: 'all 0.2s'
                      }}
                    >
                      {quote.approvals === 'Approved' ? 'Approved' : quote.approvals === 'Pending' ? 'Requested' : 'Request'}
                    </button>
                    {/* Download — active only once approved */}
                    <button
                      onClick={() => handleDownloadClick(quote)}
                      disabled={quote.approvals !== 'Approved'}
                      title={quote.approvals === 'Approved' ? 'Download PDF' : 'Available after approval'}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: quote.approvals === 'Approved' ? '#166534' : '#cbd5e1',
                        cursor: quote.approvals === 'Approved' ? 'pointer' : 'default',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Download size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Upload Quotation modal (create a new quotation with a PDF) */}
      {showUpload && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }} onClick={() => setShowUpload(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleCreateQuote} style={{ background: '#fff', width: '100%', maxWidth: '520px', borderRadius: '14px', boxShadow: '0 20px 48px rgba(15,23,42,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #EEF1F5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#111827' }}>Upload Quotation</h3>
              <button type="button" onClick={() => setShowUpload(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: '1.2rem', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Lead ID</label>
                <select required value={form.leadId} onChange={(e) => onLeadSelect(e.target.value)} style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: 'inherit', fontSize: '0.9rem' }}>
                  <option value="">Select Lead ID</option>
                  {eligibleLeads.map((l) => (<option key={l.id} value={l.id}>{l.name ? `${l.id} — ${l.name}` : l.id}</option>))}
                  {eligibleLeads.length === 0 && <option value="" disabled>No leads with a completed visit awaiting a quotation</option>}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Customer</label>
                  <input required value={form.customer} onChange={(e) => setForm((f) => ({ ...f, customer: e.target.value }))} placeholder="Customer name" style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: 'inherit', fontSize: '0.9rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Service / Project</label>
                  <input value={form.project} onChange={(e) => setForm((f) => ({ ...f, project: e.target.value }))} placeholder="e.g. PEB" style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: 'inherit', fontSize: '0.9rem' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Amount (₹)</label>
                  <input value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="e.g. 230000" style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: 'inherit', fontSize: '0.9rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>GST (₹)</label>
                  <input value={form.gst} onChange={(e) => setForm((f) => ({ ...f, gst: e.target.value }))} placeholder="Optional" style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: 'inherit', fontSize: '0.9rem' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Quotation PDF</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.7rem 0.9rem', borderRadius: 8, border: '1px dashed #cbd5e1', background: form.fileName ? '#ecfdf5' : '#f8fafc', color: form.fileName ? '#059669' : '#4f46e5', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                  <FileUp size={16} /> {form.fileName || 'Choose PDF to upload'}
                  <input type="file" accept="application/pdf,.pdf" onChange={onFilePick} style={{ display: 'none' }} />
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1rem 1.5rem', borderTop: '1px solid #EEF1F5' }}>
              <button type="button" onClick={() => setShowUpload(false)} style={{ padding: '0.6rem 1.2rem', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#334155', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button type="submit" style={{ padding: '0.6rem 1.4rem', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Upload Quotation</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Quotations;
