import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Check } from 'lucide-react';
import './ProjectHandover.css';
import { projectsApi, leadsApi, quotationsApi } from '../api/client';
import { notify } from '../utils/notify';
import HandoverForm from './HandoverForm';

const parseAmount = (v) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return Number.isNaN(n) ? 0 : n; };
const formatINR = (v) => '₹' + Number(parseAmount(v)).toLocaleString('en-IN');

const DEFAULT_MILESTONES = [
  { term: '10% Advance with PO', percentage: '10' },
  { term: '30% after Drawing Approval', percentage: '30' },
  { term: '40% after Structure Work Complete', percentage: '40' },
  { term: '20% after Completion', percentage: '20' },
];

const rowFrom = (p) => ({
  id: p.id,
  client: p.clientName || p.client || '—',
  projectType: p.typeOfProject || p.projectType || p.type || '—',
  location: p.projectLocation || p.location || '—',
  salesperson: p.salespersonName || p.salesperson || p.team || p.manager || '—',
  value: (p.quotedPrice ?? p.value ?? '') !== '' ? (p.quotedPrice ?? p.value) : (p.quote || 0),
});

const milestonesOf = (p) => (Array.isArray(p.paymentTerms) && p.paymentTerms.length ? p.paymentTerms : DEFAULT_MILESTONES).map((m) => ({ ...m }));
const milestoneValue = (m, quoted) => (String(m.value ?? '') !== '' ? parseAmount(m.value) : (parseAmount(m.percentage) / 100) * parseAmount(quoted));

const cardStyle = { backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)' };
const btnPrimary = { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--sidebar-bg)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '0.8rem 1.4rem', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };

const ProjectHandover = () => {
  const [projects, setProjects] = useState([]);
  const [leads, setLeads] = useState([]);
  const [quotes, setQuotes] = useState([]); // quotations — used to gate the Order Confirmation lead picker
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState('list');
  const [editing, setEditing] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const mgrName = (localStorage.getItem('mgr_name') || '').trim();

  const load = () => projectsApi.list()
    .then((d) => { if (Array.isArray(d)) setProjects(d); })
    .catch((e) => console.error('Failed to load order confirmations:', e))
    .finally(() => setLoaded(true));
  useEffect(() => { load(); }, []);
  useEffect(() => { leadsApi.list().then((d) => { if (Array.isArray(d)) setLeads(d); }).catch((e) => console.error('Failed to load leads:', e)); }, []);
  useEffect(() => { quotationsApi.list().then((d) => { if (Array.isArray(d)) setQuotes(d); }).catch((e) => console.error('Failed to load quotations:', e)); }, []);

  // ── Lifecycle gating for the Order Confirmation lead picker ──
  //   eligible = this manager's lead has an APPROVED quotation AND has not been order-confirmed yet.
  const leadHasApprovedQuote = (leadId) => quotes.some((q) => q.leadId === leadId && String(q.approvalStatus || '') === 'Approved');
  const leadHasOrder = (leadId) => projects.some((p) => (p.leadId || '') === leadId);
  const eligibleLeads = leads.filter((l) => (l.manager || '').trim() === mgrName && leadHasApprovedQuote(l.id) && !leadHasOrder(l.id));

  // Access control: a manager only sees order confirmations for THEIR OWN assigned leads.
  const myLeadIds = new Set(leads.filter((l) => (l.manager || '').trim() === mgrName).map((l) => l.id));
  const myProjects = projects.filter((p) =>
    [p.manager, p.salesperson, p.salespersonName].some((v) => (v || '').trim() === mgrName) ||
    (p.leadId && myLeadIds.has(p.leadId))
  );

  const nextFileId = () => {
    let max = 1000;
    projects.forEach((p) => { const m = /(\d+)$/.exec(p.id || ''); if (m) max = Math.max(max, parseInt(m[1], 10)); });
    return `PF-${max + 1}`;
  };

  const openCreate = () => { setEditing(null); setView('form'); };
  const openEdit = (p) => { setEditing(p); setView('form'); };
  const backToList = () => { setView('list'); setEditing(null); };
  const handleSaved = () => { load(); backToList(); };

  // Find the lead linked to a project (by name or phone)
  const matchLead = (p) => {
    const name = (p.clientName || p.client || '').toLowerCase().trim();
    const phone = (p.mobileNumber || p.contactDetails || '').replace(/\D/g, '');
    return leads.find((l) =>
      (name && (l.name || '').toLowerCase().trim() === name) ||
      (phone && (l.phone || '').replace(/\D/g, '') && (l.phone || '').replace(/\D/g, '').includes(phone))
    );
  };

  // Toggle a milestone's collected state and persist to MongoDB
  const toggleMilestone = (proj, idx) => {
    const terms = milestonesOf(proj);
    terms[idx] = { ...terms[idx], collected: !terms[idx].collected };
    const updated = { ...proj, paymentTerms: terms };
    setProjects((prev) => prev.map((p) => (p.id === proj.id ? updated : p)));
    projectsApi.update(proj.id, { paymentTerms: terms }).catch((e) => { console.error(e); notify('Could not save milestone to the server.', 'error'); });
  };

  if (view === 'form') {
    return (
      <div className="project-handover-page">
        <HandoverForm record={editing} fileId={nextFileId()} leads={editing ? leads : eligibleLeads} isLeadOrdered={leadHasOrder} onCancel={backToList} onSaved={handleSaved} />
      </div>
    );
  }

  const th = { padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.03em', textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'left', whiteSpace: 'nowrap' };
  const td = { padding: '1.35rem 1.5rem', fontSize: '0.95rem', color: 'var(--text-main)', whiteSpace: 'nowrap', verticalAlign: 'middle' };
  const lblSm = { fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted)' };

  return (
    <div className="project-handover-page" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Pages / Projects</div>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>Order Confirmation</h1>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>Manage all sales to project handovers.</p>
        </div>
        <button onClick={openCreate} style={btnPrimary}><Plus size={18} /> New Handover Form</button>
      </div>

      <div style={{ ...cardStyle, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={th}>Lead ID</th>
                <th style={th}>Client Name</th>
                <th style={th}>Project Type</th>
                <th style={th}>Location</th>
                <th style={th}>Salesperson</th>
                <th style={th}>Value</th>
                <th style={{ ...th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loaded && myProjects.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                  No order confirmations yet. Click “New Handover Form” to add one.
                </td></tr>
              )}
              {myProjects.map((proj, i) => {
                const r = rowFrom(proj);
                const isOpen = expandedId === r.id;
                const quoted = r.value;
                const terms = milestonesOf(proj);
                const collectedPct = terms.reduce((s, t) => s + (t.collected ? parseAmount(t.percentage) : 0), 0);
                const collectedAmt = terms.reduce((s, t) => s + (t.collected ? milestoneValue(t, quoted) : 0), 0);
                const lead = matchLead(proj);
                const history = Array.isArray(lead?.history) ? lead.history.slice(-6) : [];
                return (
                  <React.Fragment key={r.id || i}>
                    <tr onClick={() => setExpandedId(isOpen ? null : r.id)} style={{ borderBottom: isOpen ? 'none' : '1px solid var(--border-color)', cursor: 'pointer', background: isOpen ? '#F8FAFC' : 'transparent' }}>
                      <td style={{ ...td, color: 'var(--secondary-color)', fontWeight: 700 }} title={r.id}>{proj.leadId || lead?.id || r.id}</td>
                      <td style={{ ...td, fontWeight: 700 }}>{r.client}</td>
                      <td style={{ ...td, color: 'var(--text-muted)' }}>{r.projectType}</td>
                      <td style={{ ...td, color: 'var(--text-muted)' }}>{r.location}</td>
                      <td style={{ ...td, color: 'var(--text-muted)' }}>{r.salesperson}</td>
                      <td style={{ ...td, fontWeight: 700, color: 'var(--success-color)' }}>{formatINR(r.value)}</td>
                      <td style={td}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button title="Edit" onClick={(e) => { e.stopPropagation(); openEdit(proj); }} style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid var(--border-color)', background: '#EEF2FF', color: 'var(--primary-color)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Pencil size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr>
                        <td colSpan={7} style={{ padding: 0, background: '#F8FAFC', borderBottom: '1px solid var(--border-color)' }}>
                          <div style={{ padding: '1.5rem' }}>
                            {/* Payment Collection Progress */}
                            <div style={{ ...cardStyle, padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Payment Collection Progress</span>
                                <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>{Math.round(collectedPct)}% Collected ({formatINR(collectedAmt)})</span>
                              </div>
                              <div style={{ height: '8px', borderRadius: '9999px', background: '#E2E8F0', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${Math.min(100, collectedPct)}%`, background: 'var(--success-color)', borderRadius: '9999px', transition: 'width 0.3s ease' }} />
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                              {/* Milestones */}
                              <div>
                                <h3 style={{ margin: '0 0 1rem', fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>Automatic Payment Milestones</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                  {terms.map((m, idx) => {
                                    const collected = !!m.collected;
                                    return (
                                      <div key={idx} onClick={() => toggleMilestone(proj, idx)} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', borderRadius: 'var(--radius-lg)', border: `1px solid ${collected ? '#BBF7D0' : 'var(--border-color)'}`, background: collected ? '#F0FDF4' : 'var(--surface-color)', cursor: 'pointer' }}>
                                        <span style={{ width: '24px', height: '24px', borderRadius: '6px', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: collected ? 'var(--success-color)' : 'transparent', border: collected ? 'none' : '2px solid var(--border-color)', color: '#fff' }}>
                                          {collected && <Check size={15} />}
                                        </span>
                                        <div style={{ flex: 1 }}>
                                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{m.term}</div>
                                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Rate: {parseAmount(m.percentage)}%</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                          <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{formatINR(milestoneValue(m, quoted))}</div>
                                          <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.04em', color: collected ? '#16A34A' : '#D97706' }}>{collected ? 'COLLECTED' : 'PENDING'}</div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Lead details + timeline */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div style={{ ...cardStyle, padding: '1.25rem 1.5rem' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.1rem 1rem' }}>
                                    {[
                                      ['Lead ID', lead?.id || '—'],
                                      ['Phone', proj.mobileNumber || lead?.phone || proj.contactDetails || '—'],
                                      ['Lead Source', (lead?.source || '—').toString().toUpperCase()],
                                      ['Dimensions', proj.dimensions || '—'],
                                      ['Site Area', proj.projectSize || '—'],
                                      ['Scope of Work', proj.scopeOfWork || '—'],
                                    ].map(([k, v]) => (
                                      <div key={k}>
                                        <div style={lblSm}>{k}</div>
                                        <div style={{ marginTop: '0.25rem', fontWeight: 700, color: 'var(--text-main)' }}>{v}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div style={{ ...cardStyle, padding: '1.25rem 1.5rem' }}>
                                  <div style={{ ...lblSm, marginBottom: '0.9rem' }}>Latest Activity Timeline</div>
                                  {history.length === 0 ? (
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No activity recorded yet.</div>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                      {history.map((h, hi) => (
                                        <div key={hi} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.85rem' }}>
                                          <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h.timestamp || h.date || ''}</span>
                                          <span style={{ color: 'var(--text-main)', textAlign: 'right' }}>{h.message || h.event || ''}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProjectHandover;
