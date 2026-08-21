import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Dashboard from '../pages/manager/Dashboard';
import Sales from '../pages/manager/Sales';
import Products from '../pages/manager/Products';
import Inventory from '../pages/manager/Inventory';
import Staff from '../pages/manager/Staff';

export default function ManagerLayout({ onNavigate }) {
  const { currentUser, logout, inventory } = useApp();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const lowStockCount = inventory.filter((i) => i.stock <= i.minThreshold).length;

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

        <div className="portal-user-meta">
          <span className="user-name">{currentUser?.name || 'Store Manager'}</span>
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
            className={`sidebar-nav-item ${currentTab === 'inventory' ? 'active' : ''}`}
            onClick={() => handleTabChange('inventory')}
          >
            Inventory {lowStockCount > 0 && <span className="sidebar-count">{lowStockCount}</span>}
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
          {currentTab === 'inventory' && <Inventory />}
          {currentTab === 'staff' && <Staff />}
        </main>
      </div>
    </div>
  );
}
