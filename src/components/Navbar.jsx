import React from 'react';
import { useApp } from '../context/AppContext';
import UserProfileDropdown from './UserProfileDropdown';
import logoImg from '../logo.png';

export default function Navbar({ onNavigate }) {
  const { currentUser, activeRole } = useApp();

  if (!currentUser) return null;

  return (
    <nav className="scialla-nav-bar">
      <div className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img src={logoImg} alt="Scialla Logo" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
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
