import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, AlertCircle, Trash2, Calendar, MessageSquare, CreditCard } from 'lucide-react';
import './NotificationsPage.css';
import { leadsApi, quotationsApi, appointmentsApi, projectsApi } from '../api/client';

const READ_KEY = 'mgr_notif_read';
const DEL_KEY = 'mgr_notif_deleted';

const parseAmount = (v) => {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return Number.isNaN(n) ? 0 : n;
};

const timeAgo = (date) => {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 0) return 'just now';
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

const loadSet = (key) => {
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); } catch { return new Set(); }
};
const saveSet = (key, set) => localStorage.setItem(key, JSON.stringify([...set]));

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const build = async () => {
      const [leads, quotes, appts, projects] = await Promise.all([
        leadsApi.list().catch(() => []),
        quotationsApi.list().catch(() => []),
        appointmentsApi.list().catch(() => []),
        projectsApi.list().catch(() => []),
      ]);

      const readSet = loadSet(READ_KEY);
      const delSet = loadSet(DEL_KEY);
      const mgrName = (localStorage.getItem('mgr_name') || '').trim();
      const myLeadIds = new Set(
        (Array.isArray(leads) ? leads : [])
          .filter((l) => (l.manager || '').trim() === mgrName)
          .map((l) => l.id)
      );
      const items = [];

      // ONE notification per appointment assigned to this manager, reflecting its latest
      // state (cancelled > rescheduled > assigned). Avoids duplicate assigned + reschedule
      // notifications firing for the same record.
      (Array.isArray(appts) ? appts : [])
        .filter((a) => (!mgrName || (a.manager || '').trim() === mgrName))
        .forEach((a) => {
          const title = a.title || 'Appointment';
          const when = `${a.date || ''}${a.timeStart ? ' ' + a.timeStart : ''}`;
          if (a.status === 'Cancelled' || a.cancelledAt) {
            items.push({
              id: `cancel-${a._id || a.id}-${a.cancelledAt || ''}`, category: 'appointments',
              text: `Appointment cancelled by ${a.cancelledBy || 'coordinator'}: ${title}`,
              sortDate: a.cancelledAt || a.updatedAt || a.date,
            });
          } else if (a.rescheduledAt) {
            const st = a.rescheduleStatus;
            let text;
            if (st === 'Accepted') text = `Reschedule accepted by coordinator: ${title} → ${when}`;
            else if (st === 'Declined') text = `Reschedule declined by coordinator: ${title} → ${when}`;
            else if (st === 'Pending') text = `Reschedule request sent — awaiting coordinator approval: ${title} → ${when}`;
            else text = `Visit rescheduled: ${title} → ${when}`;
            items.push({ id: `resched-${a._id || a.id}-${a.rescheduledAt}-${st || ''}`, category: 'appointments', text, sortDate: a.rescheduledAt });
          } else if (a.status !== 'Completed') {
            items.push({
              id: `appt-${a._id || a.id}`, category: 'appointments',
              text: `New appointment assigned to you: ${title}${a.location ? ' at ' + a.location : ''}`,
              sortDate: a.createdAt || a.date,
            });
          }
        });

      (Array.isArray(quotes) ? quotes : []).forEach((q) => {
        // Only quotations for leads assigned to this manager
        if (mgrName && !myLeadIds.has(q.leadId)) return;
        if (q.approvalStatus === 'Pending') items.push({
          id: `quote-${q.id}`, category: 'quotations',
          text: `Quotation ${q.id} pending approval`, sortDate: q.updatedAt || q.createdAt,
        });
        if (q.approvalStatus === 'Approved') items.push({
          id: `quote-appr-${q.id}`, category: 'quotations',
          text: `Quotation ${q.id} approved by Sales Head`, sortDate: q.updatedAt || q.createdAt,
        });
        if (q.approvalStatus === 'Rejected') items.push({
          id: `quote-rej-${q.id}`, category: 'quotations',
          text: `Quotation ${q.id} rejected by Sales Head${q.rejectionReason ? ' — Reason: ' + q.rejectionReason : ''}`, sortDate: q.updatedAt || q.createdAt,
        });
        if (q.approvalStatus === 'Changes Requested') items.push({
          id: `quote-chg-${q.id}-${q.updatedAt || ''}`, category: 'quotations',
          text: `Sales Head requested changes on Quotation ${q.id}${q.rejectionReason ? ' — ' + q.rejectionReason : ''}`, sortDate: q.updatedAt || q.createdAt,
        });
        const created = q.createdAt ? new Date(q.createdAt) : null;
        const due = created ? new Date(created.getTime() + 30 * 864e5) : null;
        const received = q.approvalStatus === 'Approved' && q.quotationStatus === 'Prepared';
        if (due && due < new Date() && !received && parseAmount(q.amount) > 0) items.push({
          id: `pay-${q.id}`, category: 'payments',
          text: `Payment overdue for Invoice INV-${q.id}`, sortDate: q.createdAt,
        });
      });

      (Array.isArray(leads) ? leads : []).forEach((l) => {
        // Highest priority: a lead assigned to the currently logged-in manager
        if (mgrName && (l.manager || '').trim() === mgrName) {
          items.push({
            id: `assigned-${l.id}`, category: 'leads',
            text: `Lead assigned to you: ${l.name || l.id} — ${l.status || 'New'}`,
            sortDate: l.updatedAt || l.createdAt,
          });
          return;
        }
        const isNew = /new|received/i.test(l.status || '');
        const unassigned = !l.manager || l.manager === 'Unassigned';
        if (isNew || unassigned) items.push({
          id: `lead-${l.id}`, category: 'leads',
          text: unassigned ? `Lead ${l.name || l.id} needs assignment` : `New lead: ${l.name || l.id}`,
          sortDate: l.updatedAt || l.createdAt,
        });
      });

      (Array.isArray(projects) ? projects : []).forEach((p) => items.push({
        id: `proj-${p.id}`, category: 'team',
        text: `Project File ${p.id} — ${p.status || 'updated'}`, sortDate: p.updatedAt || p.createdAt,
      }));

      const list = items
        .filter((n) => !delSet.has(n.id))
        .sort((a, b) => new Date(b.sortDate || 0) - new Date(a.sortDate || 0))
        .slice(0, 25)
        .map((n) => ({ ...n, time: timeAgo(n.sortDate), when: fmtDateTime(n.sortDate), read: readSet.has(n.id) }));
      setNotifications(list);
    };
    build();
    // Auto-refresh so new appointment / reschedule / cancellation notifications appear
    // in real time without reopening the page. Unread ones remain until viewed.
    const iv = setInterval(build, 15000);
    return () => clearInterval(iv);
  }, []);

  const markAllAsRead = () => {
    const set = loadSet(READ_KEY);
    notifications.forEach((n) => set.add(n.id));
    saveSet(READ_KEY, set);
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id) => {
    const set = loadSet(DEL_KEY);
    set.add(id);
    saveSet(DEL_KEY, set);
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const getIcon = (category) => {
    switch (category) {
      case 'leads': return <Bell size={18} className="text-blue" />;
      case 'payments': return <CreditCard size={18} className="text-green" />;
      case 'appointments': return <Calendar size={18} className="text-indigo" />;
      case 'team': return <MessageSquare size={18} className="text-purple" />;
      default: return <AlertCircle size={18} className="text-warning" />;
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
          <button className="btn-secondary" onClick={markAllAsRead}>Mark all as read</button>
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
            notifications.map(note => (
              <div key={note.id} className={`notification-page-item ${note.read ? 'is-read' : 'is-unread'}`}>
                <div className="note-icon-box">
                  {getIcon(note.category)}
                </div>
                <div className="note-text-details">
                  <p className="note-message-text">{note.text}</p>
                  <span className="note-time-stamp">{note.when ? `${note.when} · ${note.time}` : note.time}</span>
                </div>
                <div className="note-action-box">
                  <button className="action-icon delete-btn" title="Delete" onClick={() => deleteNotification(note.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
