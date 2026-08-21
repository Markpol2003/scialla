import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Dashboard from '../pages/staff/Dashboard';
import Orders from '../pages/staff/Orders';
import Inventory from '../pages/staff/Inventory';

export default function StaffLayout({ onNavigate }) {
  const { currentUser, logout, orders } = useApp();
  const [currentTab, setCurrentTab] = useState('orders');

  const newOrdersCount = orders.filter((o) => o.status === 'new').length;

  return (
    <div className="portal-layout-container">
      {/* Top Header Bar */}
      <header className="portal-top-bar">
        <div className="portal-brand-title">
          <span className="brand-bold">SCIALLA</span>
          <span className="portal-tag">STAFF</span>
        </div>

        <div className="portal-user-meta">
          <span className="user-name">{currentUser?.name || 'Staff Member'}</span>
          <span className="status-dot-active">●</span>
          <button
            type="button"
            className="btn-portal-logout"
            onClick={() => {
              logout();
              if (onNavigate) onNavigate('/');
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Two-Column Layout (Sidebar + Content) */}
      <div className="portal-body-wrapper">
        {/* Left Sidebar */}
        <aside className="portal-sidebar">
          <button
            type="button"
            className={`sidebar-nav-item ${currentTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={`sidebar-nav-item ${currentTab === 'orders' ? 'active' : ''}`}
            onClick={() => setCurrentTab('orders')}
          >
            Orders {newOrdersCount > 0 && <span className="sidebar-count">{newOrdersCount}</span>}
          </button>
          <button
            type="button"
            className={`sidebar-nav-item ${currentTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setCurrentTab('inventory')}
          >
            Inventory
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
          {currentTab === 'inventory' && <Inventory />}
        </main>
      </div>
    </div>
  );
}
