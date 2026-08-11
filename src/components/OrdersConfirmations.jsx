import React, { useState } from 'react';
import { ClipboardCheck, FileText, CheckCircle, Clock, Truck, Printer, Eye, Search, Filter } from 'lucide-react';
import './OrdersConfirmations.css';

const OrdersConfirmations = () => {
  const [orders, setOrders] = useState([
    {
      id: 'ORD-501',
      client: 'Arjun Mehta',
      project: 'The Horizon Penthouse',
      value: 125000,
      signedDate: 'May 12, 2026',
      deliveryDate: 'July 20, 2026',
      status: 'Confirmed'
    },
    {
      id: 'ORD-502',
      client: 'Priya Sharma',
      project: 'Gourmet Kitchen Reno',
      value: 38000,
      signedDate: 'May 18, 2026',
      deliveryDate: 'June 30, 2026',
      status: 'In Production'
    },
    {
      id: 'ORD-503',
      client: 'Rahul Gupta',
      project: 'DLF Phase 5 Villa',
      value: 240000,
      signedDate: 'May 05, 2026',
      deliveryDate: 'August 15, 2026',
      status: 'Delivered'
    },
    {
      id: 'ORD-504',
      client: 'Siddharth Roy',
      project: 'Co-working Office Space',
      value: 85000,
      signedDate: 'May 20, 2026',
      deliveryDate: 'July 10, 2026',
      status: 'Drafting Contract'
    }
  ]);

  const getStatusBadgeClass = (status) => {
    switch (status.toLowerCase()) {
      case 'confirmed': return 'order-status-confirmed';
      case 'in production': return 'order-status-production';
      case 'delivered': return 'order-status-delivered';
      default: return 'order-status-draft';
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

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
              <input type="text" placeholder="Search orders, clients, or projects..." />
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
              {orders.map(order => (
                <tr key={order.id}>
                  <td className="order-id-text">{order.id}</td>
                  <td><strong>{order.client}</strong></td>
                  <td>{order.project}</td>
                  <td className="order-value-text">{formatCurrency(order.value)}</td>
                  <td>{order.signedDate}</td>
                  <td>{order.deliveryDate}</td>
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrdersConfirmations;
