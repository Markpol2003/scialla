import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../context/AppContext';

export default function LoginPage({ targetRole = 'staff', onNavigate, onClose }) {
  const { login, signup } = useApp();

  const [mode, setMode] = useState('login');
  const [selectedRole, setSelectedRole] = useState(targetRole);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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

  const [resetInput, setResetInput] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const displayName = name || username || (selectedRole === 'staff' ? 'Marco Santos' : 'Sofia Mendoza');
    const userEmail = `${username || selectedRole}@scialla.com`;

    if (mode === 'login') {
      login(userEmail, password || 'password123', selectedRole);
    } else {
      signup(displayName, userEmail, password || 'password123', selectedRole);
    }
    if (onNavigate) {
      onNavigate(selectedRole === 'manager' ? '/manager' : selectedRole === 'staff' ? '/staff' : '/');
    }
  };

  const handleResetSubmit = (e) => {
    e.preventDefault();
    setResetSent(true);
  };

  const handleDemoLogin = (role) => {
    login(`${role}@scialla.com`, 'demo123', role);
    if (onNavigate) {
      onNavigate(role === 'manager' ? '/manager' : role === 'staff' ? '/staff' : '/');
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
          <p className="brand-subtitle">
            {mode === 'forgot' ? 'Password Recovery' : 'Portal Authentication'}
          </p>
        </div>

        {/* Mode Tabs */}
        {mode !== 'forgot' && (
          <div className="login-mode-tabs">
            <button
              type="button"
              className={`mode-tab-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => setMode('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`mode-tab-btn ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => setMode('signup')}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Account Role Selector */}
        {mode !== 'forgot' && (
          <div className="login-role-section">
            <label className="role-label">Portal Area:</label>
            <div className="role-chips-grid">
              <button
                type="button"
                className={`role-chip-btn ${selectedRole === 'staff' ? 'active' : ''}`}
                onClick={() => setSelectedRole('staff')}
              >
                Staff Portal
              </button>
              <button
                type="button"
                className={`role-chip-btn ${selectedRole === 'manager' ? 'active' : ''}`}
                onClick={() => setSelectedRole('manager')}
              >
                Manager Portal
              </button>
            </div>
          </div>
        )}

        {/* Forgot Password Flow */}
        {mode === 'forgot' ? (
          <div className="forgot-password-card">
            <h3 style={{ margin: '0 0 6px', color: 'var(--color-gold)', fontSize: '1.05rem', fontWeight: '800' }}>
              Reset Your Password
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
              Enter your username or registered email address to receive password reset instructions.
            </p>

            {resetSent ? (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  padding: '14px',
                  borderRadius: '10px',
                  color: '#34d399',
                  fontSize: '0.84rem',
                  lineHeight: '1.4',
                  marginBottom: '16px',
                }}
              >
                Password reset instructions have been sent to <strong>{resetInput || 'your account email'}</strong>. Please check your inbox!
              </div>
            ) : (
              <form onSubmit={handleResetSubmit} className="login-form">
                <div className="form-group">
                  <label>Username or Email</label>
                  <input
                    type="text"
                    placeholder="e.g. marco_barista or manager@scialla.com"
                    value={resetInput}
                    onChange={(e) => setResetInput(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn-login-submit" style={{ marginTop: '8px' }}>
                  Send Password Reset Link
                </button>
              </form>
            )}

            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button
                type="button"
                className="btn-forgot-link"
                onClick={() => {
                  setMode('login');
                  setResetSent(false);
                }}
              >
                ← Return to Sign In
              </button>
            </div>
          </div>
        ) : (
          /* Form Inputs */
          <form onSubmit={handleSubmit} className="login-form">
            {mode === 'signup' && (
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Mark Santos"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                placeholder={`e.g. ${selectedRole}_user`}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    className="btn-forgot-link"
                    onClick={() => setMode('forgot')}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
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

            <button type="submit" className="btn-login-submit">
              {mode === 'login' ? `Sign In to ${selectedRole.toUpperCase()}` : `Create ${selectedRole.toUpperCase()} Account`}
            </button>
          </form>
        )}

        {/* 1-Click Demo Login */}
        <div className="demo-login-box">
          <span className="demo-title">QUICK DEMO ACCESS</span>
          <div className="demo-btns-stack">
            <button
              type="button"
              className="btn-demo demo-staff-btn"
              onClick={() => handleDemoLogin('staff')}
            >
              Staff Dashboard Demo
            </button>
            <button
              type="button"
              className="btn-demo demo-manager-btn"
              onClick={() => handleDemoLogin('manager')}
            >
              Manager Dashboard Demo
            </button>
            <button
              type="button"
              className="btn-demo demo-customer-btn"
              onClick={handleClose}
            >
              Back to Coffee Menu (/)
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
