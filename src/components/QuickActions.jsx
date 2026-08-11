import React from 'react';
import { CalendarPlus, UploadCloud, Banknote } from 'lucide-react';
import './QuickActions.css';

const QuickActions = () => {
  return (
    <div className="global-quick-action-dock">
      <button className="dock-btn">
        <CalendarPlus size={18} />
        <span>New Appointment</span>
      </button>
      <div className="dock-divider"></div>
      <button className="dock-btn">
        <UploadCloud size={18} />
        <span>Import Call List</span>
      </button>
      <div className="dock-divider"></div>
      <button className="dock-btn primary-dock-btn">
        <Banknote size={18} />
        <span>Log Collection</span>
      </button>
    </div>
  );
};

export default QuickActions;
