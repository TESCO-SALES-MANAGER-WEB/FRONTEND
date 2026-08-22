import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import LeadsManagement from './components/LeadsManagement';
import AppointmentsVisits from './components/AppointmentsVisits';
import SiteMeasurements from './components/SiteMeasurements';
import DesignCoordination from './components/DesignCoordination';
import Quotations from './components/Quotations';
import SalesPipeline from './components/SalesPipeline';
import NegotiationCenter from './components/NegotiationCenter';
import OrdersConfirmations from './components/OrdersConfirmations';
import Payments from './components/Payments';
import ProjectHandover from './components/ProjectHandover';
import TeamCollaboration from './components/TeamCollaboration';
import ReportsAnalytics from './components/ReportsAnalytics';
import NotificationsPage from './components/NotificationsPage';
import SettingsPage from './components/SettingsPage';
import { getUser, clearSession } from './api/client';
import './App.css';

// This application is LOCKED to the Sales Manager role.
const APP_ROLE = 'Sales Manager';

// True only when a valid session exists AND it belongs to a Sales Manager.
// A session carried over from another role's app (via localStorage) is rejected,
// which prevents reaching the Manager dashboard by tampering with storage/URL.
function isManagerAuthed() {
  const hasToken =
    !!localStorage.getItem('crm_token') &&
    localStorage.getItem('crm_authenticated') === 'true';
  if (!hasToken) return false;
  const role = getUser()?.role;
  if (role && role !== APP_ROLE) {
    clearSession();
    return false;
  }
  return true;
}

// Capture a legacy login-redirect identity (older links) once, before first paint.
(function bootstrapManagerIdentity() {
  try {
    const params = new URLSearchParams(window.location.search);
    const mgr = params.get('mgr');
    const email = params.get('email');
    if (mgr) localStorage.setItem('mgr_name', mgr);
    if (email) localStorage.setItem('mgr_email', email);
    if (mgr || email) window.history.replaceState({}, '', window.location.pathname);
  } catch (e) { /* ignore */ }
})();

function App() {
  const [authed, setAuthed] = useState(isManagerAuthed());
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Bumped whenever we want Lead Management to auto-open its "Add New Lead" form
  const [leadAddSignal, setLeadAddSignal] = useState(0);

  // Go to Lead Management and open the Add New Lead form (used by Sales Pipeline)
  const goToLeadForm = () => {
    setActivePage('leads');
    setLeadAddSignal((n) => n + 1);
  };

  // Re-check auth if another tab logs out (storage event).
  useEffect(() => {
    const onStorage = () => setAuthed(isManagerAuthed());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Not signed in as a Manager → show only the Manager login (no dashboard access).
  if (!authed) {
    return <Login onAuthenticated={() => { setAuthed(true); setActivePage('dashboard'); }} />;
  }

  return (
    <div className={`app-container ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="main-content">
        <Header activePage={activePage} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div className="dashboard-scroll">
          {activePage === 'dashboard' && <Dashboard setActivePage={setActivePage} />}
          {activePage === 'leads' && <LeadsManagement openAddSignal={leadAddSignal} />}
          {activePage === 'calling' && <LeadsManagement />}
          {activePage === 'appointments' && <AppointmentsVisits />}
          {activePage === 'quotations' && <Quotations />}
          {activePage === 'projects' && <ProjectHandover />}
          {activePage === 'pipeline' && <SalesPipeline goToLeadForm={goToLeadForm} />}
          {activePage === 'payments' && <Payments />}
          {activePage === 'handover' && <ProjectHandover />}
          {activePage === 'analytics' && <ReportsAnalytics />}
          {activePage === 'notifications' && <NotificationsPage />}
          {activePage === 'settings' && <SettingsPage />}
        </div>
      </div>
    </div>
  );
}

export default App;
