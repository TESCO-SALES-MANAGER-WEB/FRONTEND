import React, { useState, useEffect } from 'react';
import { Search, Bell, X, User, Menu } from 'lucide-react';
import './Header.css';
import { leadsApi, quotationsApi, appointmentsApi } from '../api/client';

const timeAgo = (date) => {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 0) return 'just now';
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.floor(h / 24)} d ago`;
};

const Header = ({ activePage = 'dashboard', sidebarOpen = true, setSidebarOpen = () => {} }) => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Account-holder name: a name set in Settings (mgr_display_name) overrides the login name.
  // mgr_name stays the filtering key, so we never overwrite it with the display name.
  const managerName = (typeof localStorage !== 'undefined' && (localStorage.getItem('mgr_display_name') || localStorage.getItem('mgr_name'))) || 'Manager';
  const initials = managerName.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'M';

  // Unread tracking for the bell badge (shared key with the Notifications page)
  const NOTIF_READ_KEY = 'mgr_notif_read';
  const loadReadSet = () => { try { return new Set(JSON.parse(localStorage.getItem(NOTIF_READ_KEY) || '[]')); } catch { return new Set(); } };
  const [readSet, setReadSet] = useState(loadReadSet);

  // Real bell notifications scoped to the logged-in manager
  const [notifs, setNotifs] = useState([]);
  useEffect(() => {
    const mgrName = (localStorage.getItem('mgr_name') || '').trim();
    const build = () => Promise.all([
      leadsApi.list().catch(() => []),
      quotationsApi.list().catch(() => []),
      appointmentsApi.list().catch(() => []),
    ]).then(([leads, quotes, appts]) => {
      const items = [];
      const myLeads = (Array.isArray(leads) ? leads : []).filter((l) => (l.manager || '').trim() === mgrName);
      const myLeadIds = new Set(myLeads.map((l) => l.id));
      myLeads.forEach((l) => items.push({ id: `lead-${l.id}`, bg: '#eff6ff', text: `Lead assigned to you: ${l.name || l.id} — ${l.status || 'New'}`, sortDate: l.updatedAt || l.createdAt }));
      (Array.isArray(appts) ? appts : []).filter((a) => (a.manager || '').trim() === mgrName && a.rescheduledAt)
        .forEach((a) => items.push({ id: `resched-${a._id || a.id}`, bg: '#fff7ed', text: `Visit rescheduled: ${a.title || 'Visit'} → ${a.date}${a.timeStart ? ' ' + a.timeStart : ''}`, sortDate: a.rescheduledAt }));
      (Array.isArray(appts) ? appts : []).filter((a) => (a.manager || '').trim() === mgrName && a.status !== 'Completed' && a.status !== 'Cancelled' && !a.cancelledAt)
        .forEach((a) => items.push({ id: `appt-${a._id || a.id}`, bg: '#f0fdf4', text: `New appointment assigned: ${a.title || 'Appointment'} on ${a.date || ''}`, sortDate: a.createdAt || a.date }));
      (Array.isArray(appts) ? appts : []).filter((a) => (a.manager || '').trim() === mgrName && (a.status === 'Cancelled' || a.cancelledAt))
        .forEach((a) => items.push({ id: `cancel-${a._id || a.id}-${a.cancelledAt || ''}`, bg: '#fef2f2', text: `Appointment cancelled: ${a.title || 'Appointment'}`, sortDate: a.cancelledAt || a.date }));
      (Array.isArray(quotes) ? quotes : []).filter((q) => myLeadIds.has(q.leadId) && q.approvalStatus === 'Pending')
        .forEach((q) => items.push({ id: `quote-${q.id}`, bg: '#eef2ff', text: `Quotation ${q.id} pending approval`, sortDate: q.updatedAt || q.createdAt }));
      items.sort((a, b) => new Date(b.sortDate || 0) - new Date(a.sortDate || 0));
      setNotifs(items.slice(0, 12));
    });
    build();
    const iv = setInterval(build, 15000); // real-time bell badge updates
    return () => clearInterval(iv);
  }, []);

  const unreadCount = notifs.filter((n) => !readSet.has(n.id)).length;

  // Opening the bell marks everything shown as read → the badge clears
  const toggleNotif = () => {
    const willOpen = !isNotifOpen;
    setIsNotifOpen(willOpen);
    if (willOpen && notifs.length) {
      const s = new Set(readSet);
      notifs.forEach((n) => s.add(n.id));
      localStorage.setItem(NOTIF_READ_KEY, JSON.stringify([...s]));
      setReadSet(s);
    }
  };

  const getBreadcrumbs = () => {
    switch (activePage) {
      case 'leads':
        return { parent: 'Pages / Leads', active: 'Leads' };
      case 'calling':
        return { parent: 'Pages / Calling', active: 'Calling Updates' };
      case 'appointments':
        return { parent: 'Pages / Appointments', active: 'Appointments' };
      case 'quotations':
        return { parent: 'Pages / Quotations', active: 'Quotations' };
      case 'projects':
        return { parent: 'Pages / Projects', active: 'Order Confirmation' };
      case 'pipeline':
        return { parent: 'Pages / Pipeline', active: 'Sales Pipeline' };
      case 'payments':
        return { parent: 'Pages / Payments', active: 'Payment Collection' };
      case 'analytics':
        return { parent: 'Pages / Reports', active: 'Reports' };
      case 'notifications':
        return { parent: 'Pages / Notifications', active: 'Notifications' };
      case 'settings':
        return { parent: 'Pages / Settings', active: 'Settings' };
      default:
        return { parent: 'Pages / Dashboard', active: 'Dashboard' };
    }
  };

  const { parent, active } = getBreadcrumbs();

  return (
    <header className="header">
      {/* Breadcrumb Navigation on the Left */}
      <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {!sidebarOpen && (
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="sidebar-toggle-btn"
            style={{
              background: 'none',
              border: 'none',
              color: '#4f46e5',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f1f5f9',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
            title="Open sidebar"
          >
            <Menu size={18} />
          </button>
        )}
        <div className="breadcrumb">
          <h2 className="breadcrumb-active">{active}</h2>
        </div>
      </div>

      {/* Action Controls on the Right */}
      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div className="notification-center">
          <button className="icon-btn notification-btn" onClick={toggleNotif}>
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="badge" style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                minWidth: '16px',
                height: '16px',
                padding: '0 4px',
                backgroundColor: '#ef4444',
                color: '#fff',
                fontSize: '10px',
                fontWeight: 700,
                lineHeight: '16px',
                textAlign: 'center',
                borderRadius: '9999px',
                border: '2px solid white'
              }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>
          
          {isNotifOpen && (
            <>
              <div className="notif-backdrop" onClick={() => setIsNotifOpen(false)} style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'transparent',
                zIndex: 999
              }}></div>
              <div className="notif-dropdown-overlay" style={{
                position: 'absolute',
                top: '50px',
                right: 0,
                width: '320px',
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                padding: '16px',
                zIndex: 1000,
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Notifications</h4>
                  <button onClick={() => setIsNotifOpen(false)} style={{ color: '#94a3b8', cursor: 'pointer' }}><X size={16}/></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {notifs.length === 0 ? (
                    <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>You're all caught up.</div>
                  ) : (
                    notifs.map((n) => (
                      <div key={n.id} style={{ padding: '8px', borderRadius: '8px', background: n.bg, fontSize: '12px' }}>
                        {n.text}
                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>{timeAgo(n.sortDate)}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0' }}></div>

        <div 
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', position: 'relative' }}
          onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
        >
          <div className="header-avatar-circle" style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: '#312e81',
            color: '#c7d2fe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            fontSize: '13px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {initials}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13.5px', fontWeight: '600', color: '#0f172a', lineHeight: '1.2' }}>{managerName}</span>
            <span style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>Sales Manager</span>
          </div>

          {isProfileDropdownOpen && (
            <>
              <div 
                onClick={(e) => { e.stopPropagation(); setIsProfileDropdownOpen(false); }} 
                style={{
                  position: 'fixed',
                  top: 0, left: 0, right: 0, bottom: 0,
                  background: 'transparent',
                  zIndex: 999
                }}
              />
              <div 
                onClick={(e) => e.stopPropagation()} 
                style={{
                  position: 'absolute',
                  top: '45px',
                  right: 0,
                  width: '160px',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                  padding: '8px',
                  zIndex: 1000,
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <button
                  onClick={() => {
                    setIsProfileDropdownOpen(false);
                    // Manager app has no login of its own — log out back to the Coordinator login
                    try { localStorage.clear(); } catch { /* ignore */ }
                    const loginUrl =
                      import.meta.env.VITE_COORDINATOR_LOGIN_URL ||
                      'http://localhost:5173/login?loggedout=1';
                    window.location.href = loginUrl;
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    color: '#dc2626',
                    fontSize: '13.5px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
