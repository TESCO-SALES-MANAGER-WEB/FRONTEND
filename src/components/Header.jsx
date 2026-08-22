import React, { useState, useEffect, useCallback } from 'react';
import { Search, Bell, X, User, Menu } from 'lucide-react';
import './Header.css';
import { notificationsApi, clearSession } from '../api/client';

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

  // Real, DB-backed notifications scoped to the logged-in manager (recipientName = mgr_name).
  const recipient = (typeof localStorage !== 'undefined' && localStorage.getItem('mgr_name')) || '';
  const [notifs, setNotifs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    if (!recipient) return;
    try {
      const data = await notificationsApi.getNotifications(recipient);
      setNotifs(Array.isArray(data?.notifications) ? data.notifications : []);
      setUnreadCount(Number(data?.unreadCount) || 0);
    } catch {
      /* leave last-known state on transient errors */
    }
  }, [recipient]);

  // Fetch on mount and poll every 30s for near-real-time bell updates.
  useEffect(() => {
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [load]);

  const toggleNotif = () => setIsNotifOpen((o) => !o);

  // Mark a single notification read — optimistic UI + persisted via PATCH.
  const markRead = async (n) => {
    if (!n || n.isRead) return;
    setNotifs((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await notificationsApi.markRead(n._id, recipient);
    } catch {
      load();
    }
  };

  // Mark all read — zero the badge immediately, persist via PATCH read-all.
  const markAllRead = async () => {
    if (unreadCount === 0) return;
    setNotifs((prev) => prev.map((x) => ({ ...x, isRead: true })));
    setUnreadCount(0);
    try {
      await notificationsApi.markAllRead(recipient);
    } catch {
      load();
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
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', padding: 0 }}>Mark all as read</button>
                    )}
                    <button onClick={() => setIsNotifOpen(false)} style={{ color: '#94a3b8', cursor: 'pointer' }}><X size={16}/></button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {notifs.length === 0 ? (
                    <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>You're all caught up.</div>
                  ) : (
                    notifs.map((n) => {
                      const unread = !n.isRead;
                      return (
                        <div
                          key={n._id}
                          onClick={() => markRead(n)}
                          style={{ padding: '8px 10px', borderRadius: '8px', background: unread ? '#f5f8ff' : '#ffffff', borderLeft: unread ? '3px solid #4f46e5' : '3px solid transparent', fontSize: '12px', cursor: unread ? 'pointer' : 'default' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', marginTop: 5, flexShrink: 0, background: unread ? '#4f46e5' : 'transparent' }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: unread ? 700 : 500, color: unread ? '#0f172a' : '#475569' }}>{n.title}</div>
                              <div style={{ color: unread ? '#334155' : '#64748b', marginTop: '2px' }}>{n.message}</div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                <span style={{ fontSize: '10px', color: '#94a3b8' }}>{timeAgo(n.eventAt || n.createdAt)}</span>
                                {unread && (
                                  <button onClick={(e) => { e.stopPropagation(); markRead(n); }} style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: '10.5px', fontWeight: 600, cursor: 'pointer', padding: 0 }}>Mark as read</button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
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
                    // Log out of THIS app's own Manager login and return to it.
                    try { clearSession(); } catch { /* ignore */ }
                    window.location.href = `${window.location.pathname}?loggedout=1`;
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
