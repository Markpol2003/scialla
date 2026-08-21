import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function AuthModal() {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authMode,
    setAuthMode,
    login,
    signup
  } = useApp();

  const [selectedRole, setSelectedRole] = useState('staff');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  if (!isAuthModalOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (authMode === 'login') {
      login(email || `${selectedRole}@scialla.com`, password || 'password123', selectedRole);
    } else {
      signup(name || 'New Staff Member', email || `${selectedRole}@scialla.com`, password || 'password123', selectedRole);
    }
  };

  const handleDemoLogin = (role) => {
    login(`${role}@scialla.com`, 'demo123', role);
  };

  return (
    <div
      className="auth-modal-backdrop"
      onClick={() => setIsAuthModalOpen(false)}
    >
      <div
        className="auth-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="auth-close-btn"
          onClick={() => setIsAuthModalOpen(false)}
        >
          ✕
        </button>

        <div className="auth-brand-header">
          <span className="auth-logo-icon">☕</span>
          <h2>Scialla</h2>
          <p>Portal Sign In & Role Authentication</p>
        </div>

        <div className="auth-mode-tabs">
          <button
            type="button"
            className={`auth-mode-btn ${authMode === 'login' ? 'active' : ''}`}
            onClick={() => setAuthMode('login')}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-mode-btn ${authMode === 'signup' ? 'active' : ''}`}
            onClick={() => setAuthMode('signup')}
          >
            Create Account
          </button>
        </div>

        <div className="auth-role-picker">
          <label className="auth-label">Select Account Type:</label>
          <div className="auth-role-options">
            <button
              type="button"
              className={`auth-role-chip ${selectedRole === 'customer' ? 'active' : ''}`}
              onClick={() => setSelectedRole('customer')}
            >
              ☕ Customer
            </button>
            <button
              type="button"
              className={`auth-role-chip ${selectedRole === 'staff' ? 'active' : ''}`}
              onClick={() => setSelectedRole('staff')}
            >
              📋 Staff / Barista
            </button>
            <button
              type="button"
              className={`auth-role-chip ${selectedRole === 'manager' ? 'active' : ''}`}
              onClick={() => setSelectedRole('manager')}
            >
              📊 Manager / Owner
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {authMode === 'signup' && (
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="e.g. Marco Santos"
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

          <button type="submit" className="btn-auth-submit">
            {authMode === 'login' ? `Sign In as ${selectedRole.toUpperCase()}` : `Create ${selectedRole.toUpperCase()} Account`}
          </button>
        </form>

        <div className="demo-logins-container">
          <span className="demo-divider">OR 1-CLICK DEMO LOGIN</span>
          <div className="demo-buttons-grid">
            <button
              type="button"
              className="btn-demo-login demo-staff"
              onClick={() => handleDemoLogin('staff')}
            >
              📋 Demo Staff (Barista Queue)
            </button>
            <button
              type="button"
              className="btn-demo-login demo-manager"
              onClick={() => handleDemoLogin('manager')}
            >
              📊 Demo Manager (Sales & Analytics)
            </button>
            <button
              type="button"
              className="btn-demo-login demo-customer"
              onClick={() => handleDemoLogin('customer')}
            >
              ☕ Demo Customer Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
