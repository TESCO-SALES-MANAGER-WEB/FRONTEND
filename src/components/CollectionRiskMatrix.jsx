import React from 'react';
import './CollectionRiskMatrix.css';

const CollectionRiskMatrix = () => {
  const risks = [
    { id: 1, client: "Mr. Gupta", amount: "₹2,50,000", due: "2 Days Ago", status: "Overdue", priority: "high" },
    { id: 2, client: "Neha Verma", amount: "₹1,20,000", due: "Today", status: "Pending", priority: "medium" },
    { id: 3, client: "Rajiv Mehta", amount: "₹50,000", due: "In 3 Days", status: "Upcoming", priority: "low" },
    { id: 4, client: "Sneha Kapoor", amount: "₹4,00,000", due: "Last Week", status: "Critical", priority: "high" }
  ];

  return (
    <div className="collection-risk-matrix">
      <div className="matrix-header">
        <h3 className="section-title">Collection Risk</h3>
        <span className="total-risk">Total: ₹8,20,000</span>
      </div>
      
      <div className="risk-ledger">
        {risks.map(risk => (
          <div key={risk.id} className={`ledger-row priority-${risk.priority}`}>
            <div className="ledger-main">
              <span className="ledger-client">{risk.client}</span>
              <span className="ledger-amount">{risk.amount}</span>
            </div>
            <div className="ledger-sub">
              <span className={`ledger-status status-${risk.status.toLowerCase()}`}>
                {risk.status} ({risk.due})
              </span>
              <button className="follow-up-btn">Follow up</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CollectionRiskMatrix;
