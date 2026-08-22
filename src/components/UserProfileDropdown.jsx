import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';

export default function ProfileDropdown({ onNavigate }) {
  const { currentUser, logout } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  if (!currentUser) return null;

  const rawName = currentUser.name || 'User';
  const cleanName = rawName.replace(/\s*\(.*?\)\s*/g, '').trim();

  const roleTag = currentUser.role === 'staff'
    ? 'Barista'
    : currentUser.role === 'manager'
    ? 'Manager'
    : 'Customer';

  const roleTitle = currentUser.role === 'staff'
    ? 'Barista (Staff)'
    : currentUser.role === 'manager'
    ? 'Store Manager'
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

        {/* Profile Header */}
        <div className="login-brand">
          <div className="avatar-circle large">
            {cleanName.charAt(0).toUpperCase()}
          </div>
          <h2 className="brand-title" style={{ marginTop: '14px' }}>{cleanName}</h2>
          <p className="brand-subtitle">{roleTitle} • Verified Account</p>
        </div>

        {/* Account Details List */}
        <div className="profile-details-list">
          <div className="detail-row">
            <span className="detail-label">Email Address</span>
            <span className="detail-val">{currentUser.email || `${currentUser.role}@scialla.com`}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Role Privilege</span>
            <span className="detail-val">{roleTitle}</span>
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
              ⚡ Return to {currentUser.role === 'manager' ? 'Manager' : 'Staff'} Dashboard
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
            className="btn-demo demo-customer-btn"
            onClick={() => setIsOpen(false)}
            style={{ textAlign: 'center', marginTop: '8px' }}
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="profile-dropdown-wrapper">
      {/* Profile Trigger Pill Button (Single line clean name + role tag) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="profile-trigger-btn"
      >
        <div className="avatar-circle">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </div>

        <span className="user-name-str">
          {cleanName} ({roleTag})
        </span>

        <span className="chevron-icon">▾</span>
      </button>

      {/* PROFILE & SIGN OUT MODAL OVERLAY - Rendered directly to document.body via Portal */}
      {modalOverlay && createPortal(modalOverlay, document.body)}
    </div>
  );
}
