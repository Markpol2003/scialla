import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

export default function LoginPage({ targetRole = 'staff', onNavigate, onClose }) {
  const { login, signup } = useApp();

  const [mode, setMode] = useState('login');
  const [selectedRole, setSelectedRole] = useState(targetRole);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'login') {
      login(email || `${selectedRole}@scialla.com`, password || 'password123', selectedRole);
    } else {
      signup(name || 'Scialla User', email || `${selectedRole}@scialla.com`, password || 'password123', selectedRole);
    }
    if (onNavigate) {
      onNavigate(selectedRole === 'manager' ? '/manager' : selectedRole === 'staff' ? '/staff' : '/');
    }
  };

  const handleDemoLogin = (role) => {
    login(`${role}@scialla.com`, 'demo123', role);
    if (onNavigate) {
      onNavigate(role === 'manager' ? '/manager' : role === 'staff' ? '/staff' : '/');
    }
  };

  return (
    <div
      className="login-page-container"
      onClick={handleClose}
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

        {/* Mode Tabs */}
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

        {/* Account Role Selector */}
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

        {/* Form Inputs */}
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
            <label>Email Address</label>
            <input
              type="email"
              placeholder={`e.g. ${selectedRole}@scialla.com`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-login-submit">
            {mode === 'login' ? `Sign In to ${selectedRole.toUpperCase()}` : `Create ${selectedRole.toUpperCase()} Account`}
          </button>
        </form>

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
    </div>
  );
}
