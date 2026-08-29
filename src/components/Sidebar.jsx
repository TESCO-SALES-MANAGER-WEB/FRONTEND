import React from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  FileText,
  FolderOpen,
  Layers,
  Wallet,
  Settings,
  Bell,
  ChevronLeft
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ activePage = 'dashboard', setActivePage = () => {}, onClose = () => {} }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-text">
          <h1>SalesCRM</h1>
          <span>Tesco Structures</span>
        </div>
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close sidebar">
          <ChevronLeft size={20} />
        </button>
      </div>

      <nav className="sidebar-nav">
        <ul>
          <li 
            className={activePage === 'dashboard' ? 'active' : ''} 
            onClick={() => setActivePage('dashboard')}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </li>
          <li
            className={activePage === 'leads' ? 'active' : ''}
            onClick={() => setActivePage('leads')}
          >
            <Users size={20} />
            <span>Lead Management</span>
          </li>
          <li
            className={activePage === 'pipeline' ? 'active' : ''}
            onClick={() => setActivePage('pipeline')}
          >
            <Layers size={20} />
            <span>Sales Pipeline</span>
          </li>
          <li
            className={activePage === 'appointments' ? 'active' : ''}
            onClick={() => setActivePage('appointments')}
          >
            <CalendarCheck size={20} />
            <span>Appointments</span>
          </li>
          <li
            className={activePage === 'quotations' ? 'active' : ''}
            onClick={() => setActivePage('quotations')}
          >
            <FileText size={20} />
            <span>Quotations</span>
          </li>
          <li
            className={activePage === 'projects' ? 'active' : ''}
            onClick={() => setActivePage('projects')}
          >
            <FolderOpen size={20} />
            <span>Order Confirmation</span>
          </li>
          <li
            className={activePage === 'payments' ? 'active' : ''}
            onClick={() => setActivePage('payments')}
          >
            <Wallet size={20} />
            <span>Payment Collection</span>
          </li>
        </ul>
      </nav>

      <div className="sidebar-footer">
        <hr className="sidebar-divider" />
        <ul className="footer-links">
          <li
            className={activePage === 'notifications' ? 'active' : ''} 
            onClick={() => setActivePage('notifications')}
          >
            <Bell size={18} />
            <span>Notifications</span>
          </li>
          <li
            className={activePage === 'settings' ? 'active' : ''} 
            onClick={() => setActivePage('settings')}
          >
            <Settings size={18} />
            <span>Settings</span>
          </li>
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;
