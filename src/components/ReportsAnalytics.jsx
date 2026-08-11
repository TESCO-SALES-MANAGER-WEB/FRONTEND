import React, { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, DollarSign, Target, CheckCircle } from 'lucide-react';
import './ReportsAnalytics.css';
import { leadsApi, quotationsApi } from '../api/client';

const parseAmt = (v) => { const n = parseFloat(String(v || '').replace(/[^0-9.]/g, '')); return Number.isNaN(n) ? 0 : n; };
const quoteTotal = (q) => parseAmt(q.amount) + parseAmt(q.gst);
const isReceived = (q) => q.approvalStatus === 'Approved' && q.quotationStatus === 'Prepared';

const ReportsAnalytics = () => {
  const [leads, setLeads] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const mgrName = (localStorage.getItem('mgr_name') || '').trim();

  // Load this manager's leads + quotations (no hardcoded data)
  useEffect(() => {
    Promise.all([leadsApi.list().catch(() => []), quotationsApi.list().catch(() => [])])
      .then(([ls, qs]) => {
        const mine = (Array.isArray(ls) ? ls : []).filter((l) => (l.manager || '').trim() === mgrName);
        const myLeadIds = new Set(mine.map((l) => l.id));
        setLeads(mine);
        setQuotes((Array.isArray(qs) ? qs : []).filter((q) => myLeadIds.has(q.leadId)));
      })
      .catch((e) => console.error('Failed to load reports:', e));
  }, []);

  const fmt = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
  const isClosed = (l) => /order|won|confirmed/i.test(l.status || '');
  const pipelineValue = quotes.filter((q) => !isReceived(q)).reduce((s, q) => s + quoteTotal(q), 0);
  const closedRevenue = quotes.filter(isReceived).reduce((s, q) => s + quoteTotal(q), 0);
  const closedLeads = leads.filter(isClosed).length;
  const convRate = leads.length ? (closedLeads / leads.length * 100).toFixed(1) : '0';

  // Lead sources & conversions
  const sourceMap = {};
  leads.forEach((l) => {
    const s = l.source || 'Other';
    if (!sourceMap[s]) sourceMap[s] = { leads: 0, closed: 0 };
    sourceMap[s].leads += 1;
    if (isClosed(l)) sourceMap[s].closed += 1;
  });
  const channelData = Object.entries(sourceMap).map(([source, v]) => ({
    source, leads: v.leads, closed: v.closed,
    conversion: v.leads ? `${(v.closed / v.leads * 100).toFixed(1)}%` : '0%',
  }));
  const maxLeads = Math.max(1, ...channelData.map((c) => c.leads));

  // Funnel stage counts
  const countKw = (kw) => leads.filter((l) => (l.status || '').toLowerCase().includes(kw)).length;
  const newLeads = leads.filter((l) => /new|received/i.test(l.status || '')).length;
  const warmCount = countKw('warm') + countKw('hot');
  const quotationCount = countKw('quot');
  const negotiationCount = countKw('negot');
  const funnelMax = Math.max(1, newLeads, warmCount, quotationCount, negotiationCount);

  return (
    <div className="reports-analytics-page">
      <div className="page-header">
        <div>
          <h2>Reports & Analytics</h2>
          <p>Analyze sales funnel performance, conversion rates, and revenue pipeline</p>
        </div>
      </div>

      <div className="analytics-overview-row">
        <div className="analytics-card">
          <div className="card-top">
            <span>Pipeline Value</span>
            <TrendingUp size={20} className="text-indigo" />
          </div>
          <h3>{fmt(pipelineValue)}</h3>
          <p className="sub-description">Expected value of active opportunities</p>
        </div>
        <div className="analytics-card">
          <div className="card-top">
            <span>Closed Revenue</span>
            <CheckCircle size={20} className="text-green" />
          </div>
          <h3>{fmt(closedRevenue)}</h3>
          <p className="sub-description">Receipts completed this month</p>
        </div>
        <div className="analytics-card">
          <div className="card-top">
            <span>Avg. Conversion Rate</span>
            <Target size={20} className="text-blue" />
          </div>
          <h3>{convRate}%</h3>
          <p className="sub-description">{closedLeads} of {leads.length} leads closed</p>
        </div>
      </div>

      <div className="analytics-split">
        {/* Sales Channel Chart */}
        <div className="analytics-main-panel">
          <div className="panel-header">
            <h3>Lead Sources & Conversions</h3>
          </div>
          <div className="channel-chart-container">
            {channelData.length === 0 && (
              <div style={{ padding: '1rem', color: '#94a3b8', fontSize: '13px' }}>No lead data yet.</div>
            )}
            {channelData.map(ch => (
              <div key={ch.source} className="channel-chart-bar-group">
                <div className="bar-label-info">
                  <span className="source-name">{ch.source}</span>
                  <span className="conversion-ratio">{ch.closed} / {ch.leads} Leads</span>
                </div>
                <div className="bar-visual-track">
                  <div className="bar-visual-fill-total" style={{ width: `${(ch.leads / maxLeads) * 100}%` }}>
                    <div className="bar-visual-fill-closed" style={{ width: `${(ch.closed / ch.leads) * 100}%` }}></div>
                  </div>
                  <span className="ratio-percentage">{ch.conversion}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Funnel breakdown */}
        <div className="analytics-side-panel">
          <div className="panel-header">
            <h3>Funnel Stage Count</h3>
          </div>
          <div className="funnel-breakdown">
            <div className="funnel-stage">
              <span className="stage-name">New Leads</span>
              <div className="stage-track"><div className="stage-fill" style={{ width: `${(newLeads / funnelMax) * 100}%` }}></div></div>
              <span className="stage-val">{newLeads}</span>
            </div>
            <div className="funnel-stage">
              <span className="stage-name">Contacted / Warm</span>
              <div className="stage-track"><div className="stage-fill" style={{ width: `${(warmCount / funnelMax) * 100}%`, backgroundColor: '#6366f1' }}></div></div>
              <span className="stage-val">{warmCount}</span>
            </div>
            <div className="funnel-stage">
              <span className="stage-name">Quotations Sent</span>
              <div className="stage-track"><div className="stage-fill" style={{ width: `${(quotationCount / funnelMax) * 100}%`, backgroundColor: '#a855f7' }}></div></div>
              <span className="stage-val">{quotationCount}</span>
            </div>
            <div className="funnel-stage">
              <span className="stage-name">Negotiations</span>
              <div className="stage-track"><div className="stage-fill" style={{ width: `${(negotiationCount / funnelMax) * 100}%`, backgroundColor: '#ec4899' }}></div></div>
              <span className="stage-val">{negotiationCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsAnalytics;
