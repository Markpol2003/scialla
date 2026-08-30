import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';

/**
 * Extract the full display name of the authenticated user
 * @param {Object} user - User object from AppContext / session
 * @returns {string} Clean user display name
 */
export function getDisplayName(user) {
  if (!user) return 'User';
  if (user.first_name && user.last_name) {
    return `${user.first_name.trim()} ${user.last_name.trim()}`.trim();
  }
  if (user.first_name) return user.first_name.trim();
  if (user.name) {
    return user.name.replace(/\s*\(.*?\)\s*/g, '').trim();
  }
  if (user.fullName) return user.fullName.trim();
  if (user.full_name) return user.full_name.trim();
  if (user.firstName && user.lastName) {
    return `${user.firstName.trim()} ${user.lastName.trim()}`.trim();
  }
  if (user.username) return user.username.trim();
  if (user.email) return user.email.split('@')[0];
  return user.role === 'manager' ? 'Store Manager' : user.role === 'staff' ? 'Staff Member' : 'User';
}

/**
 * Generate avatar initials from the user's name
 * First letter of first word + first letter of last word
 * Examples:
 *   "Jan Pol" -> "JP"
 *   "Maria Santos" -> "MS"
 *   "Mark Paul Burlat" -> "MB"
 *   "Maria" -> "M"
 * @param {string} name
 * @param {string} [fallback='👤']
 * @returns {string} 1 or 2 uppercase initials
 */
export function getUserInitials(name, fallback = '👤') {
  if (!name || typeof name !== 'string') return fallback;
  const clean = name.replace(/\s*\(.*?\)\s*/g, '').trim();
  if (!clean) return fallback;

  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return fallback;
  if (words.length === 1) {
    return words[0][0].toUpperCase();
  }
  const firstChar = words[0][0];
  const lastChar = words[words.length - 1][0];
  return `${firstChar}${lastChar}`.toUpperCase();
}

export default function ProfileDropdown({ onNavigate }) {
  const { currentUser, logout } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  if (!currentUser) return null;

  const displayName = getDisplayName(currentUser);
  const initials = getUserInitials(
    displayName,
    currentUser.email ? currentUser.email[0].toUpperCase() : (currentUser.role === 'manager' ? 'M' : 'S')
  );

  const rolePrivilege = currentUser.role === 'manager'
    ? 'Manager'
    : currentUser.role === 'staff'
    ? (currentUser.staffRole ? `${currentUser.staffRole} (Staff)` : 'Barista (Staff)')
    : 'Customer';

  const roleSubtitle = currentUser.role === 'manager'
    ? 'Store Manager'
    : currentUser.role === 'staff'
    ? (currentUser.staffRole || 'Barista (Staff)')
    : 'Customer';

  const handleSignOut = () => {
    logout();
    setIsOpen(false);
    if (onNavigate) {
      onNavigate('/');
    } else {
      window.location.href = '/';
    }
  };

  const modalOverlay = isOpen ? (
    <div
      className="login-page-container profile-modal-overlay"
      onClick={() => setIsOpen(false)}
      style={{ zIndex: 999999 }}
    >
      <div
        className="login-card-3d profile-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close "X" Button */}
        <button
          type="button"
          className="login-close-btn"
          onClick={() => setIsOpen(false)}
          title="Close modal"
        >
          ✕
        </button>

        {/* Profile Header with Avatar Initials */}
        <div className="login-brand" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            className="profile-modal-avatar"
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #E2B688 0%, #C98B5B 100%)',
              color: '#1A0C06',
              fontSize: '1.35rem',
              fontWeight: '900',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '10px',
              boxShadow: '0 4px 16px rgba(201, 139, 91, 0.4)'
            }}
          >
            {initials}
          </div>
          <h2 className="brand-title" style={{ marginTop: '0', marginBottom: '4px' }}>{displayName}</h2>
          <p className="brand-subtitle">{roleSubtitle} • Verified Account</p>
        </div>

        {/* Account Details List */}
        <div className="profile-details-list">
          <div className="detail-row">
            <span className="detail-label">Email Address</span>
            <span className="detail-val">{currentUser.email || `${currentUser.role}@scialla.com`}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Role Privilege</span>
            <span className="detail-val">{rolePrivilege}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Status</span>
            <span className="detail-val" style={{ color: '#10b981' }}>● Active</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Branch</span>
            <span className="detail-val">Scialla Main Cafe</span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="profile-modal-actions">
          {(currentUser.role === 'staff' || currentUser.role === 'manager') && (
            <button
              type="button"
              className="btn-login-submit"
              onClick={() => {
                setIsOpen(false);
                if (onNavigate) onNavigate(currentUser.role === 'manager' ? '/manager' : '/staff');
              }}
              style={{ marginBottom: '10px' }}
            >
              Return to {currentUser.role === 'manager' ? 'Manager' : 'Staff'} Dashboard
            </button>
          )}

          <button
            type="button"
            className="btn-login-submit btn-danger-action"
            onClick={handleSignOut}
          >
            Sign Out of Account
          </button>

          <button
            type="button"
            className="btn-forgot-link"
            onClick={() => setIsOpen(false)}
            style={{ textAlign: 'center', marginTop: '8px', width: '100%' }}
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="profile-dropdown-wrapper">
      {/* Profile Trigger Pill Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="profile-trigger-btn"
        title={`${displayName} (${rolePrivilege})`}
        aria-label="User Profile"
      >
        <span className="user-avatar-badge">
          {initials}
        </span>
        <span className="user-name-str">
          {displayName}
        </span>
        <span className="chevron-icon">▾</span>
      </button>

      {/* PROFILE & SIGN OUT MODAL OVERLAY - Rendered directly to document.body via Portal */}
      {modalOverlay && createPortal(modalOverlay, document.body)}
    </div>
  );
}
