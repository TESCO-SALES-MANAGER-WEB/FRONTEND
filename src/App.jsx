import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
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
import './App.css';

// Capture the logged-in manager's identity from the shared-login redirect BEFORE
// any component renders, so per-manager filtering has the name on the first paint.
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
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Bumped whenever we want Lead Management to auto-open its "Add New Lead" form
  const [leadAddSignal, setLeadAddSignal] = useState(0);

  // Go to Lead Management and open the Add New Lead form (used by Sales Pipeline)
  const goToLeadForm = () => {
    setActivePage('leads');
    setLeadAddSignal((n) => n + 1);
  };

  // Capture the logged-in manager's identity passed from the Coordinator login redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mgr = params.get('mgr');
    const email = params.get('email');
    if (mgr) localStorage.setItem('mgr_name', mgr);
    if (email) localStorage.setItem('mgr_email', email);
    if (mgr || email) window.history.replaceState({}, '', window.location.pathname);
  }, []);

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
