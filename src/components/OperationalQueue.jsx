import React, { useState } from 'react';
import { MoreVertical, MessageCircle, FileText, Calendar, RefreshCcw, Search, Filter } from 'lucide-react';
import './OperationalQueue.css';

const OperationalQueue = () => {
  const queueData = [
    {
      id: 1,
      client: "Aditi Sharma",
      contact: "+91 98765 43210",
      project: "3BHK Residence",
      urgency: "hot",
      stage: "Awaiting Site Measurement",
      stagnant: 2,
    },
    {
      id: 2,
      client: "Rajiv Mehta",
      contact: "+91 98222 11333",
      project: "Office Interiors",
      urgency: "warm",
      stage: "Sent to Design Team",
      stagnant: 5,
    },
    {
      id: 3,
      client: "Sneha Kapoor",
      contact: "+91 99888 77666",
      project: "Villa Renovation",
      urgency: "cold",
      stage: "Coordinator Quote Pending",
      stagnant: 8,
    },
    {
      id: 4,
      client: "Vikram Singh",
      contact: "+91 97777 55555",
      project: "4BHK Duplex",
      urgency: "hot",
      stage: "Review Draft Ready",
      stagnant: 1,
    }
  ];

  return (
    <div className="operational-queue">
      <div className="queue-header">
        <h2 className="section-title">Cross-Team Operational Queue</h2>
        <div className="queue-actions">
          <div className="table-search">
            <Search size={16} />
            <input type="text" placeholder="Search queue..." />
          </div>
          <button className="queue-btn"><Filter size={16}/> Filters</button>
        </div>
      </div>
      
      <div className="table-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Client Identifier</th>
              <th>Lead Urgency</th>
              <th>Active Stage Status</th>
              <th>Bottleneck Timer</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {queueData.map(row => (
              <tr key={row.id}>
                <td>
                  <div className="client-id-cell">
                    <strong>{row.client}</strong>
                    <span className="client-subtext">{row.contact} • {row.project}</span>
                  </div>
                </td>
                <td>
                  <span className={`urgency-badge urgency-${row.urgency}`}>
                    {row.urgency === 'hot' && '🔥 Hot'}
                    {row.urgency === 'warm' && '☀️ Warm'}
                    {row.urgency === 'cold' && '❄️ Cold'}
                  </span>
                </td>
                <td>
                  <span className="stage-status">[{row.stage}]</span>
                </td>
                <td>
                  <div className={`bottleneck-timer ${row.stagnant > 3 ? 'critical' : ''}`}>
                    Stagnant for {row.stagnant} Days
                  </div>
                </td>
                <td>
                  <div className="context-actions">
                    <button className="cta-btn primary" title="Ping Team"><MessageCircle size={14}/> Ping</button>
                    <button className="cta-btn secondary" title="Schedule Meeting"><Calendar size={14}/></button>
                    <button className="cta-btn icon-only"><MoreVertical size={16}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OperationalQueue;
