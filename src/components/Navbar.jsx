import React from 'react';
import { useApp } from '../context/AppContext';

export default function Navbar() {
  const { currentUser, logout, activeRole } = useApp();

  if (!currentUser) return null;

  return (
    <nav className="scialla-nav-bar">
      <div className="nav-brand">
        <span className="brand-logo-icon">☕</span>
        <span className="brand-name">Scialla</span>
        <span className="brand-role-tag">
          {activeRole === 'customer' && '• Customer Coffee Menu'}
          {activeRole === 'staff' && '• Barista Kitchen Queue'}
          {activeRole === 'manager' && '• Store Analytics & Operations'}
        </span>
      </div>

      <div className="nav-user-section">
        <div className="user-profile-pill">
          <div className="user-meta">
            <span className="user-name">{currentUser.name}</span>
            <span className={`user-role-badge badge-${currentUser.role}`}>
              {currentUser.role.toUpperCase()}
            </span>
          </div>
          <button
            type="button"
            className="btn-nav-logout"
            onClick={logout}
            title="Sign out and return to login screen"
          >
            Sign Out 🚪
          </button>
        </div>
      </div>
    </nav>
  );
}
