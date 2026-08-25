import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import logoImg from '../logo.png';

export default function AuthModal() {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    login
  } = useApp();

  const [selectedRole, setSelectedRole] = useState('staff');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    const res = await login(email, password, selectedRole);
    setLoading(false);
    if (!res || !res.success) {
      setErrorMsg(res?.message || 'Invalid credentials or inactive account.');
    }
  };

  return createPortal(
    <div
      className="auth-modal-backdrop"
      onClick={() => setIsAuthModalOpen(false)}
      style={{ zIndex: 999999 }}
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
          <img src={logoImg} alt="Scialla Logo" style={{ height: '48px', width: 'auto', objectFit: 'contain', margin: '0 auto 8px' }} />
          <h2>Scialla</h2>
          <p>Portal Sign In & Role Authentication</p>
        </div>

        <div className="auth-role-picker">
          <label className="auth-label">Select Account Type:</label>
          <div className="auth-role-options">
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

        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '8px 12px', borderRadius: '6px', color: '#f87171', fontSize: '0.8rem', margin: '10px 0', textAlign: 'center' }}>
            ⚠ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>{selectedRole === 'manager' ? 'Email Address' : 'Username or Email'}</label>
            <input
              type="text"
              placeholder={selectedRole === 'manager' ? 'Enter email address' : 'Enter username or email'}
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

          <button type="submit" className="btn-auth-submit" disabled={loading}>
            {loading ? 'Signing in...' : `Sign In as ${selectedRole.toUpperCase()}`}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
