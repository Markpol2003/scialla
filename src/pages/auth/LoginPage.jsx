import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../context/AppContext';

export default function LoginPage({ targetRole = 'staff', onNavigate, onClose }) {
  const { login } = useApp();

  const [selectedRole, setSelectedRole] = useState(targetRole);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Body Scroll Lock while Login Modal is active
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (onNavigate) {
      onNavigate('/');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const result = await login(username, password, selectedRole);
    setLoading(false);

    if (result && result.success) {
      if (onNavigate) {
        const destRole = result.user?.role || selectedRole;
        onNavigate(destRole === 'manager' ? '/manager' : destRole === 'staff' ? '/staff' : '/');
      }
    } else {
      setErrorMsg(result?.message || 'Invalid credentials or account inactive.');
    }
  };

  return createPortal(
    <div
      className="login-page-container"
      onClick={handleClose}
      style={{ zIndex: 999999 }}
    >
      <div
        className="login-card-3d"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close "X" Button */}
        <button
          type="button"
          className="login-close-btn"
          onClick={handleClose}
          title="Close and return to menu"
        >
          ✕
        </button>

        {/* Brand Header */}
        <div className="login-brand">
          <h1 className="brand-title">Scialla</h1>
          <p className="brand-subtitle">Portal Authentication</p>
        </div>

        {/* Account Role Selector */}
        <div className="login-role-section">
          <label className="role-label">Portal Area:</label>
          <div className="role-chips-grid">
            <button
              type="button"
              className={`role-chip-btn ${selectedRole === 'staff' ? 'active' : ''}`}
              onClick={() => { setSelectedRole('staff'); setErrorMsg(''); }}
            >
              Staff Portal
            </button>
            <button
              type="button"
              className={`role-chip-btn ${selectedRole === 'manager' ? 'active' : ''}`}
              onClick={() => { setSelectedRole('manager'); setErrorMsg(''); }}
            >
              Manager Portal
            </button>
          </div>
        </div>

        {/* Error Alert Message Box */}
        {errorMsg && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              padding: '10px 14px',
              borderRadius: '8px',
              color: '#f87171',
              fontSize: '0.82rem',
              marginBottom: '14px',
              textAlign: 'center',
              lineHeight: '1.4'
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>{selectedRole === 'manager' ? 'Email Address' : 'Username or Email'}</label>
            <input
              type="text"
              placeholder={selectedRole === 'manager' ? 'Enter email address' : 'Enter username or email'}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="btn-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide Password' : 'Show Password'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-6px', marginBottom: '14px' }}>
            <button
              type="button"
              className="btn-forgot-link"
              onClick={() => setShowForgotModal(true)}
              style={{ color: '#E2B688', fontSize: '0.78rem', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Forgot Password?
            </button>
          </div>

          <button type="submit" className="btn-login-submit" disabled={loading}>
            {loading ? 'Signing in...' : `Sign In`}
          </button>
        </form>

        {/* FORGOT PASSWORD MODAL / DIALOG */}
        {showForgotModal && (
          <div
            className="receipt-modal-backdrop"
            onClick={() => setShowForgotModal(false)}
            style={{ zIndex: 1000000 }}
          >
            <div
              className="forgot-password-card"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '380px',
                width: '90%',
                background: '#1A0C06',
                border: '1.5px solid #C98B5B',
                borderRadius: '16px',
                padding: '24px',
                color: '#FFFFFF',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#E2B688', fontFamily: 'var(--font-display)' }}>
                  {selectedRole === 'manager' ? 'Manager Password Recovery' : 'Staff Password Recovery'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  style={{ background: 'none', border: 'none', color: '#E2B688', fontSize: '1.2rem', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              <p style={{ fontSize: '0.84rem', color: '#D4C3B3', lineHeight: '1.5', marginBottom: '16px' }}>
                {selectedRole === 'manager'
                  ? 'For Store Manager accounts, please verify your root administrator email address or contact Scialla System Admin.'
                  : 'To reset your staff password, your Store Manager can update your credentials immediately from the Manager Portal Staff Roster.'}
              </p>

              <div style={{ background: 'rgba(201, 139, 91, 0.1)', border: '1px solid rgba(201, 139, 91, 0.3)', borderRadius: '10px', padding: '12px', marginBottom: '16px', fontSize: '0.8rem', color: '#F3E5D8' }}>
                Tip: The manager has administrative privileges to reset any staff member’s password instantly with 1-click in the Staff Roster.
              </div>

              <button
                type="button"
                className="btn-login-submit"
                onClick={() => setShowForgotModal(false)}
                style={{ width: '100%' }}
              >
                Back to Sign In
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
