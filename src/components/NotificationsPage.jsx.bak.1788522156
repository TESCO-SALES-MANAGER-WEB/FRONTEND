import React, { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCircle, AlertCircle, Calendar, MessageSquare, CreditCard, FileText, ShoppingCart } from 'lucide-react';
import './NotificationsPage.css';
import { notificationsApi } from '../api/client';

const timeAgo = (date) => {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  if (Number.isNaN(diff) || diff < 0) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

// Absolute date + time from the record's real timestamp (e.g. "Aug 6, 2026, 4:35 PM")
const fmtDateTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

// Icon by the notification's source entity.
const getIcon = (entityType) => {
  switch (entityType) {
    case 'lead': return <Bell size={18} className="text-blue" />;
    case 'appointment': return <Calendar size={18} className="text-indigo" />;
    case 'quotation': return <FileText size={18} className="text-purple" />;
    case 'order': return <ShoppingCart size={18} className="text-indigo" />;
    case 'payment': return <CreditCard size={18} className="text-green" />;
    default: return <AlertCircle size={18} className="text-warning" />;
  }
};

const NotificationsPage = () => {
  // Per-manager scope: recipientName = the manager captured from the login redirect.
  const recipient = (typeof localStorage !== 'undefined' && localStorage.getItem('mgr_name')) || '';
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    if (!recipient) return;
    try {
      const data = await notificationsApi.getNotifications(recipient);
      setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
      setUnreadCount(Number(data?.unreadCount) || 0);
    } catch {
      /* leave last-known state on transient errors */
    }
  }, [recipient]);

  // Fetch on mount and poll every 30s so new events appear without reopening the page.
  useEffect(() => {
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [load]);

  const markRead = async (n) => {
    if (!n || n.isRead) return;
    setNotifications((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await notificationsApi.markRead(n._id, recipient);
    } catch {
      load();
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    setNotifications((prev) => prev.map((x) => ({ ...x, isRead: true })));
    setUnreadCount(0);
    try {
      await notificationsApi.markAllRead(recipient);
    } catch {
      load();
    }
  };

  return (
    <div className="notifications-page">
      <div className="page-header">
        <div>
          <h2>Notifications Center</h2>
          <p>Stay up to date with activity, task assignments, and client milestones</p>
        </div>
        <div className="page-actions">
          {unreadCount > 0 && (
            <button className="btn-secondary" onClick={markAllAsRead}>Mark all as read</button>
          )}
        </div>
      </div>

      <div className="notifications-container-box">
        <div className="notifications-list-wrapper">
          {notifications.length === 0 ? (
            <div className="no-notifications">
              <CheckCircle size={48} className="text-green" />
              <h3>All caught up!</h3>
              <p>You have no notifications right now.</p>
            </div>
          ) : (
            notifications.map((note) => {
              const when = fmtDateTime(note.eventAt || note.createdAt);
              const ago = timeAgo(note.eventAt || note.createdAt);
              return (
                <div
                  key={note._id}
                  className={`notification-page-item ${note.isRead ? 'is-read' : 'is-unread'}`}
                  onClick={() => markRead(note)}
                  style={{ cursor: note.isRead ? 'default' : 'pointer' }}
                >
                  <div className="note-icon-box">
                    {getIcon(note.entityType)}
                  </div>
                  <div className="note-text-details">
                    <p className="note-message-text">{note.title}</p>
                    <p className="note-message-text" style={{ fontWeight: 500, color: '#475569' }}>{note.message}</p>
                    <span className="note-time-stamp">{when ? `${when} · ${ago}` : ago}</span>
                  </div>
                  <div className="note-action-box">
                    {!note.isRead && (
                      <button
                        className="action-icon"
                        title="Mark as read"
                        onClick={(e) => { e.stopPropagation(); markRead(note); }}
                        style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
