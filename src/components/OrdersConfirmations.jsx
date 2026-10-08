import React, { useState, useEffect } from 'react';
import { Printer, Eye, FileText, Search, Filter } from 'lucide-react';
import { projectsApi, isMine } from '../api/client';
import useAutoRefresh from '../hooks/useAutoRefresh';
import './OrdersConfirmations.css';

// Numeric amount from "₹1,25,000" / 125000 / "1.25L".
const parseAmount = (v) => {
  if (v == null || v === '') return 0;
  let s = String(v).toLowerCase().replace(/[₹,\s]/g, '');
  let x = 1;
  if (s.endsWith('cr')) { x = 1e7; s = s.slice(0, -2); }
  else if (s.endsWith('l')) { x = 1e5; s = s.slice(0, -1); }
  else if (s.endsWith('k')) { x = 1e3; s = s.slice(0, -1); }
  const n = parseFloat(s.replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n * x;
};

const fmtDate = (v) => {
  if (!v) return '-';
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
};

// Map a shared `projects` (Order-Confirmation / handover) record — the SAME collection the
// handover form saves to and the Head/Coordinator order pages read — into a table row.
const toOrder = (p) => ({
  id: p.id || p._id || '',
  leadId: p.leadId || '',
  client: p.client || p.clientName || p.name || '-',
  project: p.projectType || p.type || p.typeOfProject || '-',
  value: parseAmount(p.value != null && p.value !== '' ? p.value : (p.quotedPrice || p.quote || p.orderValue || 0)),
  signedDate: p.dateOfOrder || p.signedDate || p.date || p.createdAt || '',
  deliveryDate: p.tentativeCompletionDate || p.deliveryDate || p.expectedCompletion || p.completionDate || '',
  status: p.status || 'Confirmed',
  _mine: [p.manager, p.salesperson, p.salespersonName].some((v) => isMine(v)),
});

const OrdersConfirmations = () => {
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState('');

  // Load real order confirmations from the shared backend (no hardcoded rows). A manager
  // sees only their OWN order confirmations — the same scoping rule used across the app.
  const load = () => projectsApi.list()
    .then((d) => {
      const rows = (Array.isArray(d) ? d : [])
        .map(toOrder)
        .filter((o) => o._mine)
        .sort((a, b) => new Date(b.signedDate || 0) - new Date(a.signedDate || 0));
      setOrders(rows);
    })
    .catch((e) => console.error('Failed to load orders:', e));
  useEffect(() => { load(); }, []);
  useAutoRefresh(load);

  const getStatusBadgeClass = (status) => {
    switch (String(status || '').toLowerCase()) {
      case 'confirmed': return 'order-status-confirmed';
      case 'in production': return 'order-status-production';
      case 'delivered': return 'order-status-delivered';
      default: return 'order-status-draft';
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(val) || 0);

  const visible = orders.filter((o) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [o.id, o.leadId, o.client, o.project, o.status].some((x) => String(x).toLowerCase().includes(q));
  });

  return (
    <div className="orders-confirmations-page">
      <div className="page-header">
        <div>
          <h2>Orders & Confirmations</h2>
          <p>Track formal client agreements, production status, and final sign-offs</p>
        </div>
      </div>

      <div className="orders-workspace">
        <div className="workspace-header">
          <div className="search-and-filters">
            <div className="table-search-bar">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search orders, clients, or projects..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button className="filter-btn"><Filter size={14}/> Filter</button>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="enterprise-table orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Client Name</th>
                <th>Project Scope</th>
                <th>Contract Value</th>
                <th>Signed Date</th>
                <th>Est. Completion</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(order => (
                <tr key={order.id}>
                  <td className="order-id-text">{order.id}</td>
                  <td><strong>{order.client}</strong></td>
                  <td>{order.project}</td>
                  <td className="order-value-text">{formatCurrency(order.value)}</td>
                  <td>{fmtDate(order.signedDate)}</td>
                  <td>{fmtDate(order.deliveryDate)}</td>
                  <td>
                    <span className={`order-status-badge ${getStatusBadgeClass(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions-row">
                      <button className="action-icon" title="View Details"><Eye size={16}/></button>
                      <button className="action-icon" title="Print Invoice"><Printer size={16}/></button>
                      <button className="action-icon" title="Contract Details"><FileText size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8' }}>
                    No order confirmations yet. Create one from “Order Confirmation / Handover”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrdersConfirmations;
