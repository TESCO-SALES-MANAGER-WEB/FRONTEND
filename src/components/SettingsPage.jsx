import React, { useState } from 'react';
import { User, Bell, Save } from 'lucide-react';
import './SettingsPage.css';
import { notify } from '../utils/notify';

const SettingsPage = () => {
  // The account-holder name is stored in mgr_display_name (a display override) so it shows
  // in the header without changing mgr_name, which is the key used to scope this manager's data.
  const [profile, setProfile] = useState({
    name: (localStorage.getItem('mgr_display_name') || localStorage.getItem('mgr_name') || '').trim(),
    email: (localStorage.getItem('mgr_email') || '').trim(),
    role: 'Sales Manager',
  });

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    desktopAlerts: true,
  });

  const handleSave = () => {
    const name = (profile.name || '').trim();
    if (name) localStorage.setItem('mgr_display_name', name);
    if ((profile.email || '').trim()) localStorage.setItem('mgr_email', profile.email.trim());
    notify('Settings saved', 'success');
    // Reload so the header account-holder name updates immediately
    setTimeout(() => window.location.reload(), 600);
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h2>Settings</h2>
          <p>Configure your profile, notifications, and account details</p>
        </div>
      </div>

      <div className="settings-container-grid">
        {/* Left Side: General Profile Settings */}
        <div className="settings-box">
          <div className="panel-header">
            <h3><User size={18} /> User Profile</h3>
          </div>
          <div className="settings-body">
            <div className="form-group">
              <label>Account Holder Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter account holder name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="name@example.com"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>System Role</label>
              <input type="text" className="form-input" disabled value={profile.role} />
            </div>
          </div>
        </div>

        {/* Right Side: Preference Settings */}
        <div className="settings-box">
          <div className="panel-header">
            <h3><Bell size={18} /> Preferences</h3>
          </div>
          <div className="settings-body">
            <div className="settings-preference-item">
              <div>
                <h4>Email Alerts</h4>
                <p>Receive summaries of newly assigned leads</p>
              </div>
              <input
                type="checkbox"
                className="ios-switch"
                checked={notifications.emailAlerts}
                onChange={(e) => setNotifications({ ...notifications, emailAlerts: e.target.checked })}
              />
            </div>

            <div className="settings-preference-item">
              <div>
                <h4>Desktop Notifications</h4>
                <p>Show desktop banners for urgent chat mentions</p>
              </div>
              <input
                type="checkbox"
                className="ios-switch"
                checked={notifications.desktopAlerts}
                onChange={(e) => setNotifications({ ...notifications, desktopAlerts: e.target.checked })}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="settings-save-row" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-primary" style={{ gap: '8px' }} onClick={handleSave}>
          <Save size={16} /> Save Configuration
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
