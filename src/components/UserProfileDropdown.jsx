import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';

export default function UserProfileDropdown({ onNavigate }) {
  const { currentUser, logout } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!currentUser) return null;

  const roleTitle = currentUser.role === 'staff'
    ? 'Barista'
    : currentUser.role === 'manager'
    ? 'Store Manager'
    : 'Customer';

  return (
    <div className="user-profile-menu-container" ref={dropdownRef}>
      {/* Profile Button with Dropdown Arrow */}
      <button
        type="button"
        className="user-profile-pill-btn"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="user-avatar-badge">{currentUser.name.charAt(0).toUpperCase()}</span>
        <span className="user-name-label">{currentUser.name}</span>
        <span className="dropdown-arrow-icon">{isOpen ? '▴' : '▾'}</span>
      </button>

      {/* Floating Dropdown Card */}
      {isOpen && (
        <div className="user-profile-dropdown-card">
          <div className="dropdown-user-header">
            <div className="dropdown-avatar-circle">{currentUser.name.charAt(0).toUpperCase()}</div>
            <div className="dropdown-user-details">
              <strong className="dropdown-user-name">{currentUser.name}</strong>
              <span className="dropdown-user-role">({roleTitle})</span>
              <span className="dropdown-status-dot">● Active</span>
            </div>
          </div>

          <div className="dropdown-divider"></div>

          <button
            type="button"
            className="dropdown-logout-btn"
            onClick={() => {
              logout();
              setIsOpen(false);
              if (onNavigate) onNavigate('/');
            }}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
