import React from 'react';
import './StatCard.css';

const StatCard = ({ 
  title, 
  icon, 
  value, 
  subtext, 
  badge, 
  chart, 
  customClass, 
  variant 
}) => {
  return (
    <div className={`stat-card ${customClass || ''} ${variant ? `variant-${variant}` : ''}`}>
      <div className="stat-header">
        <span className="stat-title">{title}</span>
        {icon && <div className="stat-icon">{icon}</div>}
      </div>
      
      <div className="stat-content">
        <div className="stat-value-container">
           {value && <div className="stat-value">{value}</div>}
        </div>
        
        {subtext && <div className="stat-subtext">{subtext}</div>}
        {badge && <div className={`stat-badge badge-${badge.type}`}>{badge.text}</div>}
        {chart && <div className="stat-chart-container">{chart}</div>}
      </div>

      {variant === 'pending' && <div className="alert-pulse-border"></div>}
      {variant === 'collection' && <div className="success-glow-bg"></div>}
    </div>
  );
};

export default StatCard;
