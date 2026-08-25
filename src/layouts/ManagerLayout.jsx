import React, { useState } from 'react';
import Dashboard from '../pages/manager/Dashboard';
import Sales from '../pages/manager/Sales';
import Products from '../pages/manager/Products';
import Staff from '../pages/manager/Staff';
import UserProfileDropdown from '../components/UserProfileDropdown';

export default function ManagerLayout({ onNavigate }) {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
          <span className="portal-tag tag-manager">MANAGER</span>
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
            className={`sidebar-nav-item ${currentTab === 'sales' ? 'active' : ''}`}
            onClick={() => handleTabChange('sales')}
          >
            Sales
          </button>
          <button
            type="button"
            className={`sidebar-nav-item ${currentTab === 'products' ? 'active' : ''}`}
            onClick={() => handleTabChange('products')}
          >
            Products
          </button>
          <button
            type="button"
            className={`sidebar-nav-item ${currentTab === 'staff' ? 'active' : ''}`}
            onClick={() => handleTabChange('staff')}
          >
            Staff
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
          {currentTab === 'sales' && <Sales />}
          {currentTab === 'products' && <Products />}
          {currentTab === 'staff' && <Staff />}
        </main>
      </div>
    </div>
  );
}
