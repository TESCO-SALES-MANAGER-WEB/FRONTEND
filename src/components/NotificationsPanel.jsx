import React from 'react';
import { Bell, CheckCircle, AlertCircle } from 'lucide-react';
import './NotificationsPanel.css';

const NotificationsPanel = () => {
  const notifications = [
    { id: 1, text: 'New lead assigned: Sharma Residence', time: '10m ago', type: 'info' },
    { id: 2, text: 'Payment received for Order #802', time: '1h ago', type: 'success' },
    { id: 3, text: 'Follow up required for Draft Quote', time: '2h ago', type: 'warning' },
  ];

  return (
    <div className="notifications-panel-card">
      <div className="notifications-header">
        <h3 className="notifications-title">Notifications</h3>
        <span className="notifications-badge">3 New</span>
      </div>
      <div className="notifications-list">
        {notifications.map(note => (
          <div key={note.id} className={`notification-item type-${note.type}`}>
            <div className="notification-icon">
              {note.type === 'info' && <Bell size={14} />}
              {note.type === 'success' && <CheckCircle size={14} />}
              {note.type === 'warning' && <AlertCircle size={14} />}
            </div>
            <div className="notification-content">
              <p>{note.text}</p>
              <span>{note.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationsPanel;
