import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Dashboard from '../pages/staff/Dashboard';
import Orders from '../pages/staff/Orders';
import UserProfileDropdown from '../components/UserProfileDropdown';

export default function StaffLayout({ onNavigate }) {
  const { orders } = useApp();
  const [currentTab, setCurrentTab] = useState('orders');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const newOrdersCount = orders.filter((o) => o.status === 'new').length;

  const handleTabChange = (tab) => {
    setCurrentTab(tab);
    setIsSidebarOpen(false); // Auto collapse sidebar on mobile selection
  };

  return (
    <div className="portal-layout-container">
      {/* Top Header Bar */}
      <header className="portal-top-bar">
        <div className="portal-brand-title">
          <button
            type="button"
            className="btn-sidebar-toggle"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title="Toggle Sidebar Navigation"
          >
            {isSidebarOpen ? '✕' : '☰'}
          </button>
          <span className="brand-bold">SCIALLA</span>
          <span className="portal-tag">STAFF</span>
        </div>

        {/* User Profile Dropdown Pill (Arrow toggle for profile info & logout) */}
        <UserProfileDropdown onNavigate={onNavigate} />
      </header>

      {/* Main Two-Column Layout (Sidebar + Content) */}
      <div className="portal-body-wrapper">
        {/* Mobile Backdrop Overlay */}
        {isSidebarOpen && (
          <div
            className="portal-sidebar-backdrop"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}

        {/* Left Sidebar */}
        <aside className={`portal-sidebar ${isSidebarOpen ? 'mobile-open' : ''}`}>
          <button
            type="button"
            className={`sidebar-nav-item ${currentTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleTabChange('dashboard')}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={`sidebar-nav-item ${currentTab === 'orders' ? 'active' : ''}`}
            onClick={() => handleTabChange('orders')}
          >
            Orders {newOrdersCount > 0 && <span className="sidebar-count">{newOrdersCount}</span>}
          </button>

          <div className="sidebar-footer-link">
            <button
              type="button"
              className="btn-menu-link"
              onClick={() => onNavigate && onNavigate('/')}
            >
              ← Public Menu (/)
            </button>
          </div>
        </aside>

        {/* Right Main Content */}
        <main className="portal-main-content">
          {currentTab === 'dashboard' && <Dashboard />}
          {currentTab === 'orders' && <Orders />}
        </main>
      </div>
    </div>
  );
}
