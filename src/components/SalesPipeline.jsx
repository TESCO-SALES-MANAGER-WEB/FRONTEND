import React, { useState, useEffect, useMemo } from 'react';
import { Filter, Flame, Activity, Snowflake, XCircle, Eye, Pencil, Trash2, Plus, X } from 'lucide-react';
import { pipelineApi, leadsApi } from '../api/client';
import { notify } from '../utils/notify';
import { stageColor } from '../theme/statusColors';

const SERVICES = ['PEB Structure', 'Tensile Roofing', 'Other roofing'];
const STAGES = ['New', 'Hot', 'Warm', 'Cold', 'Appointment Fixed', 'Lost'];

// Delegate to the shared canonical palette so pipeline stages match statuses everywhere.
const getStageStyles = (stage) => stageColor(stage);

const parseAmount = (v) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return Number.isNaN(n) ? 0 : n; };
const formatINR = (num) => '₹' + Number(parseAmount(num)).toLocaleString('en-IN');

const selectArrowBg = `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748B%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`;

const PipelineStatCard = ({ title, value, subtitle, icon: Icon, color, bg, borderColor }) => (
  <div style={{ padding: '1.25rem 1.5rem', backgroundColor: bg, border: `1px solid ${borderColor}`, borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', minHeight: '150px', justifyContent: 'space-between' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '0.95rem', fontWeight: '500', color: 'var(--text-main)' }}>{title}</span>
      <Icon size={20} color={color} strokeWidth={2} />
    </div>
    <div style={{ fontSize: '2.25rem', fontWeight: '700', color: 'var(--text-main)', lineHeight: 1, letterSpacing: '-1px', margin: '0.75rem 0 0.5rem' }}>{value}</div>
    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{subtitle}</span>
  </div>
);

const filterSelectStyle = {
  padding: '0.6rem 2rem 0.6rem 0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)',
  backgroundColor: 'var(--surface-color)', outline: 'none', fontSize: '0.875rem', color: 'var(--text-muted)', cursor: 'pointer',
  appearance: 'none', WebkitAppearance: 'none', backgroundImage: selectArrowBg, backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.75rem center', backgroundSize: '0.55rem auto', fontFamily: 'inherit', minWidth: '190px'
};
const actionBtnStyle = (bg, color) => ({ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', border: 'none', backgroundColor: bg, color, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' });
const inputStyle = { width: '100%', padding: '0.7rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', fontSize: '0.9rem', backgroundColor: 'var(--surface-color)', color: 'var(--text-main)', fontFamily: 'inherit', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-main)' };

const emptyForm = { customer: '', company: '', service: 'PEB Structure', stage: 'New', assignedTo: '', expectedClose: '', value: '', followUp: '' };

const SalesPipeline = ({ goToLeadForm }) => {
  const mgrName = (localStorage.getItem('mgr_name') || '').trim();
  const [pipeline, setPipeline] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [stageFilter, setStageFilter] = useState('All');
  const [serviceFilter, setServiceFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortValueDir, setSortValueDir] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // ── Load opportunities from MongoDB (no hardcoded data) ──
  const loadPipeline = () => {
    return pipelineApi.list()
      .then((data) => { if (Array.isArray(data)) setPipeline(data); })
      .catch((e) => console.error('Failed to load pipeline:', e))
      .finally(() => setLoaded(true));
  };
  useEffect(() => { loadPipeline(); }, []);

  // Load this manager's leads so every lead with a Project Value shows up automatically.
  const [leads, setLeads] = useState([]);
  useEffect(() => {
    leadsApi.list().then((d) => { if (Array.isArray(d)) setLeads([...d].sort((a, b) => new Date(b.createdAt || b.updatedAt || b.date || 0) - new Date(a.createdAt || a.updatedAt || a.date || 0))); }).catch((e) => console.error('Failed to load leads:', e));
  }, []);

  const mgrKey = mgrName.toLowerCase();
  const opIdForLead = (l) => `OP-${parseInt(String(l.id || '').replace(/\D/g, '')) || l.id}`;
  // Resolve the REAL lead id to show in the pipeline's Lead ID column. Persisted pipeline docs
  // can lose their leadId on the server, leaving only an "OP-<num>" id — so recover the lead by
  // reversing OP-<numeric lead id>, then by customer name, before falling back to the raw id.
  const resolveLeadId = (op) => {
    if (op.leadId) return op.leadId;
    const byOp = (Array.isArray(leads) ? leads : []).find((l) => opIdForLead(l) === op.id);
    if (byOp) return byOp.id;
    const nm = String(op.customer || '').trim().toLowerCase();
    const byName = nm ? (Array.isArray(leads) ? leads : []).find((l) => String(l.name || '').trim().toLowerCase() === nm) : null;
    return byName ? byName.id : op.id;
  };
  const statusToStage = (s) => {
    const x = String(s || '').toLowerCase();
    if (x.includes('hot')) return 'Hot';
    if (x.includes('warm')) return 'Warm';
    if (x.includes('cold')) return 'Cold';
    if (x.includes('lost') || x.includes('junk')) return 'Lost';
    if (x.includes('appointment') || x.includes('appt')) return 'Appointment Fixed';
    return 'New';
  };

  // Turn every lead that has a valid Project Value into a pipeline opportunity.
  // Deterministic id (OP-<numeric lead id>) matches the id written when a lead is saved,
  // so a lead never shows up twice.
  const leadOpps = useMemo(() => (
    (Array.isArray(leads) ? leads : [])
      .filter((l) => (l.manager || '').trim().toLowerCase() === mgrKey && parseAmount(l.budget) > 0)
      .map((l) => ({
        id: opIdForLead(l),
        leadId: l.id,
        customer: l.name || 'Client',
        company: l.company || '',
        service: l.projectType || l.services || 'PEB Structure',
        stage: statusToStage(l.status),
        assignedTo: l.manager || mgrName || 'Unassigned',
        expectedClose: l.followUp || '',
        value: parseAmount(l.budget),
        lastActivity: 'Today',
        followUp: l.followUp || '',
        manager: mgrName,
      }))
  ), [leads, mgrKey, mgrName]);

  // Merge: saved pipeline opportunities take precedence; add derived lead-opps that aren't
  // already represented (matched by opportunity id or by leadId).
  const mergedPipeline = useMemo(() => {
    // Access control: a manager only sees THEIR OWN opportunities. The pipeline collection is
    // shared with the Coordinator and other managers, so filter the stored docs to this manager
    // (by the doc's manager, or by a lead assigned to this manager).
    const myLeadIds = new Set(
      (Array.isArray(leads) ? leads : [])
        .filter((l) => (l.manager || '').trim().toLowerCase() === mgrKey)
        .map((l) => l.id)
    );
    const myDocs = pipeline.filter((p) =>
      (p.manager || '').trim().toLowerCase() === mgrKey || (p.leadId && myLeadIds.has(p.leadId))
    );
    const docIds = new Set(myDocs.map((p) => p.id));
    const docLeadIds = new Set(myDocs.map((p) => p.leadId).filter(Boolean));
    const extra = leadOpps.filter((lo) => !docIds.has(lo.id) && !(lo.leadId && docLeadIds.has(lo.leadId)));
    return [...myDocs, ...extra];
  }, [pipeline, leadOpps, leads, mgrKey]);

  // Persist derived opportunities to MongoDB once loaded, so ALL pipeline rows live in the DB
  // (not just the ones a stage/follow-up was edited on). Idempotent upsert by opportunity id.
  const persistedRef = React.useRef(false);
  useEffect(() => {
    if (persistedRef.current || !loaded || leadOpps.length === 0) return;
    const docIds = new Set(pipeline.map((p) => p.id));
    const docLeadIds = new Set(pipeline.map((p) => p.leadId).filter(Boolean));
    const toPersist = leadOpps.filter((lo) => !docIds.has(lo.id) && !(lo.leadId && docLeadIds.has(lo.leadId)));
    persistedRef.current = true;
    if (toPersist.length === 0) return;
    pipelineApi.bulk(toPersist).then(() => loadPipeline()).catch((e) => console.error('Failed to persist pipeline opportunities:', e));
  }, [loaded, leadOpps, pipeline]);

  const updateStage = (id, newStage) => {
    const row = mergedPipeline.find((r) => r.id === id) || { id };
    const payload = { ...row, stage: newStage, manager: mgrName };
    setPipeline((prev) => (prev.some((p) => p.id === id) ? prev.map((p) => (p.id === id ? { ...p, stage: newStage } : p)) : [...prev, payload]));
    // Upsert so derived lead-rows become real, persisted opportunities on first edit.
    pipelineApi.bulk([payload]).catch((e) => { console.error(e); notify('Could not save stage to the server.', 'error'); });
  };
  const updateFollowUp = (id, date) => {
    const row = mergedPipeline.find((r) => r.id === id) || { id };
    const payload = { ...row, followUp: date, manager: mgrName };
    setPipeline((prev) => (prev.some((p) => p.id === id) ? prev.map((p) => (p.id === id ? { ...p, followUp: date } : p)) : [...prev, payload]));
    pipelineApi.bulk([payload]).catch((e) => { console.error(e); notify('Could not save follow-up to the server.', 'error'); });
  };
  const deleteRow = (id) => {
    setPipeline((prev) => prev.filter((op) => op.id !== id));
    setLeads((prev) => prev.filter((l) => opIdForLead(l) !== id)); // also hide a derived lead-row
    pipelineApi.remove(id).catch((e) => { console.error(e); notify('Could not delete on the server.', 'error'); });
  };

  const nextOpId = () => {
    let max = 1000;
    pipeline.forEach((op) => { const m = /(\d+)$/.exec(op.id || ''); if (m) max = Math.max(max, parseInt(m[1], 10)); });
    return `OP-${max + 1}`;
  };

  const openModal = () => { setForm({ ...emptyForm, assignedTo: mgrName }); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setForm(emptyForm); };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.customer.trim()) return;
    setSaving(true);
    const payload = {
      id: nextOpId(),
      customer: form.customer.trim(),
      company: form.company.trim(),
      service: form.service,
      stage: form.stage,
      assignedTo: (form.assignedTo || mgrName || '').trim(),
      expectedClose: form.expectedClose || '',
      value: parseAmount(form.value),
      lastActivity: 'Today',
      followUp: form.followUp || '',
      manager: mgrName,
    };
    try {
      await pipelineApi.create(payload);
      notify('Opportunity added', 'success');
      await loadPipeline();
      closeModal();
    } catch (err) {
      console.error('Failed to create opportunity:', err);
      notify('Could not save. Is the Manager backend running on :5001?', 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetFilters = () => { setStageFilter('All'); setServiceFilter('All'); setSearchQuery(''); setSortValueDir(null); };
  const toggleValueSort = () => setSortValueDir((d) => (d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc'));

  const filtered = useMemo(() => {
    let rows = mergedPipeline.filter((op) => {
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        if (!((op.customer || '').toLowerCase().includes(q) || (op.id || '').toLowerCase().includes(q))) return false;
      }
      if (stageFilter !== 'All' && op.stage !== stageFilter) return false;
      if (serviceFilter !== 'All' && op.service !== serviceFilter) return false;
      return true;
    });
    if (sortValueDir) rows = [...rows].sort((a, b) => (sortValueDir === 'asc' ? parseAmount(a.value) - parseAmount(b.value) : parseAmount(b.value) - parseAmount(a.value)));
    return rows;
  }, [mergedPipeline, searchQuery, stageFilter, serviceFilter, sortValueDir]);

  const countStage = (s) => mergedPipeline.filter((op) => (op.stage || '').toLowerCase() === s).length;
  // Total project value of all opportunities in a stage (for the Hot/Warm/Cold cards)
  const sumStage = (s) => mergedPipeline.filter((op) => (op.stage || '').toLowerCase() === s).reduce((t, op) => t + (parseAmount(op.value) || 0), 0);

  const thStyle = { padding: '0.85rem 1rem', fontWeight: '600', fontSize: '0.75rem', letterSpacing: '0.03em', textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'left', whiteSpace: 'nowrap' };
  const tdStyle = { padding: '1rem', fontSize: '0.875rem', color: 'var(--text-main)', whiteSpace: 'nowrap' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem' }}>
      <style>{`
        .pipeline-row { transition: background-color 0.15s ease; }
        .pipeline-row:hover { background-color: rgba(79, 70, 229, 0.03); }
        .pl-date { padding: 0.4rem 0.6rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.8rem; color: var(--text-main); font-family: inherit; outline: none; background: var(--surface-color); }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Pages / Sales Pipeline</div>
          <h2 style={{ margin: '0.25rem 0 0', fontSize: '1.75rem', fontWeight: '700' }}>Sales Pipeline</h2>
        </div>
        <button onClick={() => (goToLeadForm ? goToLeadForm() : openModal())} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--sidebar-bg)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '0.7rem 1.25rem', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
          <Plus size={16} /> Add New Opportunity
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
        <PipelineStatCard title="Total Pipeline" value={mergedPipeline.length} subtitle="All open deals"     icon={Filter}    color="#475569" bg="#EEF4FF" borderColor="#DBE4FF" />
        <PipelineStatCard title="Hot"            value={formatINR(sumStage('hot'))}   subtitle="Total value · high probability"   icon={Flame}     color="#EF4444" bg="#FEF2F2" borderColor="#FEE2E2" />
        <PipelineStatCard title="Warm"           value={formatINR(sumStage('warm'))}  subtitle="Total value · medium probability" icon={Activity}  color="#F97316" bg="#FFF7ED" borderColor="#FFEDD5" />
        <PipelineStatCard title="Cold"           value={formatINR(sumStage('cold'))}  subtitle="Total value · low probability"    icon={Snowflake} color="#64748B" bg="#EFF2F7" borderColor="#E2E8F0" />
        <PipelineStatCard title="Lost"           value={countStage('lost')}  subtitle="Closed deals"       icon={XCircle}   color="#DB2777" bg="#FDF2F8" borderColor="#FCE7F3" />
      </div>

      {/* Filters + table card */}
      <div style={{ padding: 0, overflow: 'hidden', backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', padding: '1.25rem 1.5rem' }}>
          <input type="text" placeholder="Search Opportunity..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', outline: 'none', fontSize: '0.875rem', minWidth: '200px', flex: '1 1 200px', fontFamily: 'inherit' }} />
          <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} style={filterSelectStyle}>
            <option value="All">Filter by Stage</option>
            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} style={filterSelectStyle}>
            <option value="All">Filter by Service</option>
            {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={resetFilters} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', padding: '0.6rem 0.5rem' }}>↻ Reset Filters</button>
        </div>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', minWidth: '1250px', borderCollapse: 'collapse' }}>
            <thead style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
              <tr>
                <th style={thStyle}>Lead ID</th>
                <th style={thStyle}>Customer</th>
                <th style={thStyle}>Company</th>
                <th style={thStyle}>Service</th>
                <th style={thStyle}>Stage</th>
                <th style={thStyle}>Assigned to</th>
                <th style={thStyle}>Expected close</th>
                <th style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }} onClick={toggleValueSort}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>Project value <span style={{ fontSize: '0.7rem', opacity: sortValueDir ? 1 : 0.6 }}>↑↓</span></span>
                </th>
                <th style={thStyle}>Last activity</th>
                <th style={thStyle}>Follow-up</th>
              </tr>
            </thead>
            <tbody>
              {loaded && filtered.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  {mergedPipeline.length === 0 ? 'No opportunities yet. Add a lead with a Project Value or click “Add New Opportunity”.' : 'No opportunities match your filters.'}
                </td></tr>
              ) : (
                filtered.map((op) => {
                  const st = getStageStyles(op.stage);
                  return (
                    <tr key={op._id || op.id} className="pipeline-row" style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ ...tdStyle, fontWeight: '700', color: 'var(--primary-color)' }}>{resolveLeadId(op)}</td>
                      <td style={{ ...tdStyle, fontWeight: '600' }}>{op.customer}</td>
                      <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{op.company || '-'}</td>
                      <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{op.service}</td>
                      <td style={tdStyle}>
                        <select value={op.stage} onChange={(e) => updateStage(op.id, e.target.value)} style={{ padding: '0.4rem 1.75rem 0.4rem 0.75rem', borderRadius: 'var(--radius-md)', border: `1px solid ${st.border}`, backgroundColor: st.bg, color: st.color, fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', outline: 'none', appearance: 'none', WebkitAppearance: 'none', backgroundImage: selectArrowBg, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.6rem center', backgroundSize: '0.5rem auto', fontFamily: 'inherit', minWidth: '130px' }}>
                          {STAGES.map((s) => <option key={s} value={s} style={{ color: 'var(--text-main)', backgroundColor: '#fff' }}>{s}</option>)}
                        </select>
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{op.assignedTo || '-'}</td>
                      <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{op.expectedClose || '-'}</td>
                      <td style={{ ...tdStyle, fontWeight: '700', color: 'var(--success-color)' }}>{formatINR(op.value)}</td>
                      <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{op.lastActivity || '-'}</td>
                      <td style={tdStyle}><input type="date" className="pl-date" value={op.followUp || ''} onChange={(e) => updateFollowUp(op.id, e.target.value)} /></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '1.25rem 1.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Showing {filtered.length} of {mergedPipeline.length} opportunities</span>
        </div>
      </div>

      {/* Add Opportunity modal */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}>
          <div style={{ backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '1rem', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: '620px', padding: '2rem', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>Add New Opportunity</h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={22} /></button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.1rem' }}>
                <div><label style={labelStyle}>Customer</label><input required value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} placeholder="e.g. Akash Kumar" style={inputStyle} /></div>
                <div><label style={labelStyle}>Company</label><input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="e.g. ABC Builders" style={inputStyle} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.1rem' }}>
                <div><label style={labelStyle}>Service</label><select value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} style={{ ...inputStyle, appearance: 'auto' }}>{SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
                <div><label style={labelStyle}>Stage</label><select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} style={{ ...inputStyle, appearance: 'auto' }}>{STAGES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.1rem' }}>
                <div><label style={labelStyle}>Assigned to</label><input value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} placeholder="Manager / executive" style={inputStyle} /></div>
                <div><label style={labelStyle}>Project value (₹)</label><input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} inputMode="numeric" placeholder="e.g. 850000" style={inputStyle} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.1rem' }}>
                <div><label style={labelStyle}>Expected close</label><input value={form.expectedClose} onChange={(e) => setForm({ ...form, expectedClose: e.target.value })} placeholder="e.g. 25 Jul 2026" style={inputStyle} /></div>
                <div><label style={labelStyle}>Follow-up date</label><input type="date" value={form.followUp} onChange={(e) => setForm({ ...form, followUp: e.target.value })} style={inputStyle} /></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={closeModal} style={{ background: 'var(--surface-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.6rem 1.4rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button type="submit" disabled={saving || !form.customer.trim()} style={{ background: 'var(--sidebar-bg)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '0.6rem 1.6rem', fontWeight: 600, cursor: (saving || !form.customer.trim()) ? 'not-allowed' : 'pointer', opacity: (saving || !form.customer.trim()) ? 0.5 : 1, fontFamily: 'inherit' }}>{saving ? 'Saving…' : 'Add Opportunity'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPipeline;
