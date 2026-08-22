import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, AlertCircle } from 'lucide-react';
import './NotificationsPanel.css';
import { notificationsApi } from '../api/client';

// Compact notifications widget — real, DB-backed, scoped to the logged-in manager.
const iconFor = (entityType) => {
  if (entityType === 'payment' || entityType === 'order') return <CheckCircle size={14} />;
  if (entityType === 'quotation') return <AlertCircle size={14} />;
  return <Bell size={14} />;
};

const NotificationsPanel = () => {
  const recipient = (typeof localStorage !== 'undefined' && localStorage.getItem('mgr_name')) || '';
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!recipient) return;
    let alive = true;
    const load = async () => {
      try {
        const data = await notificationsApi.getNotifications(recipient);
        if (!alive) return;
        setNotifications(Array.isArray(data?.notifications) ? data.notifications.slice(0, 6) : []);
        setUnreadCount(Number(data?.unreadCount) || 0);
      } catch { /* keep last-known state */ }
    };
    load();
    const iv = setInterval(load, 30000);
    return () => { alive = false; clearInterval(iv); };
  }, [recipient]);

  return (
    <div className="notifications-panel-card">
      <div className="notifications-header">
        <h3 className="notifications-title">Notifications</h3>
        {unreadCount > 0 && <span className="notifications-badge">{unreadCount} New</span>}
      </div>
      <div className="notifications-list">
        {notifications.length === 0 ? (
          <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>You're all caught up.</div>
        ) : (
          notifications.map((note) => (
            <div key={note._id} className={`notification-item ${note.isRead ? '' : 'is-unread'}`}>
              <div className="notification-icon">
                {iconFor(note.entityType)}
              </div>
              <div className="notification-content">
                <p>{note.message}</p>
                <span>{note.title}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsPanel;
