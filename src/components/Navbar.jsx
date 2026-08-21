import React from 'react';
import { useApp } from '../context/AppContext';
import UserProfileDropdown from './UserProfileDropdown';

export default function Navbar({ onNavigate }) {
  const { currentUser, activeRole } = useApp();

  if (!currentUser) return null;

  return (
    <nav className="scialla-nav-bar">
      <div className="nav-brand">
        <span className="brand-name">Scialla</span>
        <span className="brand-role-tag">
          {activeRole === 'customer' && '• Customer Coffee Menu'}
          {activeRole === 'staff' && '• Barista Kitchen Queue'}
          {activeRole === 'manager' && '• Store Analytics & Operations'}
        </span>
      </div>

      <div className="nav-user-section">
        <UserProfileDropdown onNavigate={onNavigate} />
      </div>
    </nav>
  );
}
