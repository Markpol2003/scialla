import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Dashboard from '../pages/staff/Dashboard';
import Orders from '../pages/staff/Orders';
import UserProfileDropdown from '../components/UserProfileDropdown';

export default function StaffLayout({ onNavigate }) {
  const { orders } = useApp();
  const [currentTab, setCurrentTab] = useState('orders');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const newOrdersCount = (orders || []).filter((o) => o.status === 'new').length;

  const handleTabChange = (tab) => {
    setCurrentTab(tab);
    setIsMobileDrawerOpen(false);
  };

  return (
    <div className="portal-layout-container">
      {/* Top Header Bar (Clean: Only Branding & Profile) */}
      <header className="portal-top-bar">
        <div className="portal-brand-title">
          <span className="brand-bold">SCIALLA</span>
          <span className="portal-tag">STAFF</span>
        </div>

        {/* User Profile Dropdown Pill */}
        <UserProfileDropdown onNavigate={onNavigate} />
      </header>

      {/* Mobile Edge Arrow Tab (Visible when sidebar is closed on mobile) */}
      {!isMobileDrawerOpen && (
        <button
          type="button"
          className="btn-edge-toggle btn-edge-toggle-mobile"
          onClick={() => setIsMobileDrawerOpen(true)}
          title="Open navigation"
          aria-label="Open navigation"
        >
          ›
        </button>
      )}

      {/* Mobile Backdrop Overlay */}
      {isMobileDrawerOpen && (
        <div
          className="portal-drawer-backdrop"
          onClick={() => setIsMobileDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Two-Column Layout (Sidebar + Content) */}
      <div className="portal-body-wrapper">
        {/* Left Sidebar (Drawer on mobile, fixed sidebar on desktop) */}
        <aside className={`portal-sidebar ${isMobileDrawerOpen ? 'mobile-open' : ''}`}>
          {/* Mobile Drawer Header with Close Arrow */}
          <div className="drawer-header-mobile">
            <div className="drawer-brand">
              <span className="brand-bold">SCIALLA</span>
              <span className="portal-tag">STAFF</span>
            </div>
            <button
              type="button"
              className="btn-drawer-close"
              onClick={() => setIsMobileDrawerOpen(false)}
              title="Close navigation"
              aria-label="Close navigation"
            >
              ‹
            </button>
          </div>

          <div className="sidebar-nav-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              type="button"
              className={`sidebar-nav-item ${currentTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleTabChange('dashboard')}
            >
              <span>Dashboard</span>
            </button>
            <button
              type="button"
              className={`sidebar-nav-item ${currentTab === 'orders' ? 'active' : ''}`}
              onClick={() => handleTabChange('orders')}
            >
              <span>Orders</span>
              {newOrdersCount > 0 && <span className="sidebar-count">{newOrdersCount}</span>}
            </button>
          </div>

          <div className="sidebar-footer-link" style={{ marginTop: 'auto', paddingTop: '16px' }}>
            <button
              type="button"
              className="btn-menu-link"
              onClick={() => {
                setIsMobileDrawerOpen(false);
                if (onNavigate) onNavigate('/');
              }}
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
