import React, { useState } from 'react';
import Dashboard from '../pages/manager/Dashboard';
import Sales from '../pages/manager/Sales';
import Orders from '../pages/manager/Orders';
import Products from '../pages/manager/Products';
import Staff from '../pages/manager/Staff';
import UserProfileDropdown from '../components/UserProfileDropdown';

export default function ManagerLayout({ onNavigate }) {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Desktop sidebar collapse state (persisted in localStorage)
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(() => {
    try {
      return localStorage.getItem('managerNavCollapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleDesktopCollapse = () => {
    setIsDesktopCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('managerNavCollapsed', String(next));
      } catch {}
      return next;
    });
  };

  const handleTabChange = (tab) => {
    setCurrentTab(tab);
    setIsMobileDrawerOpen(false); // Auto-close drawer on mobile when tab is selected
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'sales', label: 'Sales' },
    { id: 'orders', label: 'Orders' },
    { id: 'products', label: 'Products' },
    { id: 'staff', label: 'Staff' }
  ];

  return (
    <div className="portal-layout-container">
      {/* Top Header Bar (Clean: Only Branding & Profile) */}
      <header className="portal-top-bar">
        <div className="portal-brand-title">
          <span className="brand-bold">SCIALLA</span>
          <span className="portal-tag tag-manager">MANAGER</span>
        </div>

        {/* User Profile Dropdown Pill */}
        <UserProfileDropdown onNavigate={onNavigate} />
      </header>

      {/* Edge Arrow Tab (Visible when sidebar is closed on mobile or collapsed on desktop) */}
      {/* Mobile edge tab */}
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

      {/* Desktop edge tab */}
      {isDesktopCollapsed && (
        <button
          type="button"
          className="btn-edge-toggle btn-edge-toggle-desktop"
          onClick={toggleDesktopCollapse}
          title="Expand navigation"
          aria-label="Expand navigation"
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
      <div className={`portal-body-wrapper ${isDesktopCollapsed ? 'desktop-collapsed' : ''}`}>
        {/* Left Sidebar Navigation (Off-canvas drawer on mobile, collapsible sidebar on desktop) */}
        <aside className={`portal-sidebar ${isMobileDrawerOpen ? 'mobile-open' : ''} ${isDesktopCollapsed ? 'collapsed' : ''}`}>
          {/* Mobile Drawer Header with Close Arrow */}
          <div className="drawer-header-mobile">
            <div className="drawer-brand">
              <span className="brand-bold">SCIALLA</span>
              <span className="portal-tag tag-manager">MANAGER</span>
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

          {/* Navigation Items List */}
          <div className="sidebar-nav-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`sidebar-nav-item ${currentTab === item.id ? 'active' : ''}`}
                onClick={() => handleTabChange(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Sidebar Footer Link & Desktop Collapse Arrow */}
          <div className="sidebar-footer-link" style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

            {/* Desktop Collapse Arrow Button */}
            <button
              type="button"
              className="btn-sidebar-collapse-toggle"
              onClick={toggleDesktopCollapse}
              title="Collapse navigation"
              aria-label="Collapse navigation"
            >
              ‹
            </button>
          </div>
        </aside>

        {/* Right Main Content (Expands to full available width when sidebar is hidden) */}
        <main className={`portal-main-content ${isDesktopCollapsed ? 'content-expanded' : ''}`}>
          {currentTab === 'dashboard' && <Dashboard />}
          {currentTab === 'sales' && <Sales />}
          {currentTab === 'orders' && <Orders />}
          {currentTab === 'products' && <Products />}
          {currentTab === 'staff' && <Staff />}
        </main>
      </div>
    </div>
  );
}
