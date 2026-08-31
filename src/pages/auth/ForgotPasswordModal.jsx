import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';

export default function ForgotPasswordModal({ initialRole = 'staff', onClose, onSuccess }) {
  // Step: 1 = 'email', 2 = 'verify', 3 = 'new_password', 4 = 'success'
  const [step, setStep] = useState(1);
  const [role, setRole] = useState(initialRole);
  const [email, setEmail] = useState('');
  const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const digitInputRefs = useRef([]);

  // Cooldown countdown timer effect
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 1 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldown]);

  // Handle Step 1: Send Verification Code
  const handleSendCode = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    const res = await api.requestPasswordReset(cleanEmail, role);
    setLoading(false);

    if (res && res.success) {
      setInfoMsg(res.message || 'If an account exists for this email, a verification code has been sent.');
      setCooldown(45); // 45s resend cooldown
      setStep(2);
      // Clear code digits
      setCodeDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        if (digitInputRefs.current[0]) {
          digitInputRefs.current[0].focus();
        }
      }, 100);
    } else {
      setErrorMsg(res?.message || 'Failed to request verification code. Please try again.');
    }
  };

  // Handle Resend Code in Step 2
  const handleResendCode = async () => {
    if (cooldown > 0 || loading) return;
    setErrorMsg('');
    setInfoMsg('');
    setLoading(true);

    const res = await api.requestPasswordReset(email.trim().toLowerCase(), role);
    setLoading(false);

    if (res && res.success) {
      setInfoMsg('A new 6-digit verification code has been sent to your email.');
      setCooldown(45);
      setCodeDigits(['', '', '', '', '', '']);
      if (digitInputRefs.current[0]) {
        digitInputRefs.current[0].focus();
      }
    } else {
      setErrorMsg(res?.message || 'Failed to resend verification code. Please try again.');
    }
  };

  // Handle 6-Digit input change & auto-advance
  const handleDigitChange = (index, value) => {
    setErrorMsg('');
    const rawVal = value.replace(/\D/g, ''); // only digits

    if (rawVal.length > 1) {
      // Handle paste of full 6-digit code
      const pasted = rawVal.slice(0, 6).split('');
      const newDigits = [...codeDigits];
      pasted.forEach((char, i) => {
        if (i < 6) newDigits[i] = char;
      });
      setCodeDigits(newDigits);
      const nextIndex = Math.min(pasted.length, 5);
      if (digitInputRefs.current[nextIndex]) {
        digitInputRefs.current[nextIndex].focus();
      }
      return;
    }

    const newDigits = [...codeDigits];
    newDigits[index] = rawVal;
    setCodeDigits(newDigits);

    if (rawVal && index < 5) {
      if (digitInputRefs.current[index + 1]) {
        digitInputRefs.current[index + 1].focus();
      }
    }
  };

  // Handle backspace key in digit input
  const handleDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
      if (digitInputRefs.current[index - 1]) {
        digitInputRefs.current[index - 1].focus();
      }
    }
  };

  // Handle Step 2: Verify Code
  const handleVerifyCode = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const fullCode = codeDigits.join('').trim();
    if (fullCode.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    const res = await api.verifyResetCode(email.trim().toLowerCase(), role, fullCode);
    setLoading(false);

    if (res && res.success && res.resetToken) {
      setResetToken(res.resetToken);
      setStep(3);
    } else {
      setErrorMsg(res?.message || 'Invalid or expired verification code.');
    }
  };

  // Handle Step 3: Update Password
  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!newPassword || !confirmPassword) {
      setErrorMsg('Please complete both password fields.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match. Please verify.');
      return;
    }

    setLoading(true);
    const res = await api.resetPassword(resetToken, newPassword, confirmPassword);
    setLoading(false);

    if (res && res.success) {
      setStep(4);
    } else {
      setErrorMsg(res?.message || 'Failed to update password. Please try again.');
    }
  };

  // Handle Final Step: Done
  const handleFinish = () => {
    if (onSuccess) {
      onSuccess(role);
    } else if (onClose) {
      onClose();
    }
  };

  const roleLabel = role === 'manager' ? 'Manager Account' : 'Staff Account';

  return (
    <div
      className="forgot-password-card-v2 w-full max-w-md px-4 sm:px-6 mx-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header with Title & Close Button */}
      <div className="fp-header">
        <div className="fp-header-badge">
          <span className={`fp-role-tag ${role === 'manager' ? 'tag-manager' : 'tag-staff'}`}>
            {roleLabel}
          </span>
        </div>
        <button
          type="button"
          className="fp-close-btn"
          onClick={onClose}
          title="Back to Sign In"
        >
          ✕
        </button>
      </div>

      {/* Step Indicator Progress Bar */}
      <div className="fp-steps-indicator">
        <div className={`fp-step-dot ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>1</div>
        <div className={`fp-step-line ${step >= 2 ? 'active' : ''}`}></div>
        <div className={`fp-step-dot ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>2</div>
        <div className={`fp-step-line ${step >= 3 ? 'active' : ''}`}></div>
        <div className={`fp-step-dot ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>3</div>
        <div className={`fp-step-line ${step >= 4 ? 'active' : ''}`}></div>
        <div className={`fp-step-dot ${step === 4 ? 'active completed' : ''}`}>✓</div>
      </div>

      {/* Error Feedback Box */}
      {errorMsg && (
        <div className="fp-alert fp-alert-error">
          <span className="fp-alert-icon">⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Info Feedback Box */}
      {infoMsg && !errorMsg && (
        <div className="fp-alert fp-alert-info">
          <span className="fp-alert-icon">ℹ️</span>
          <span>{infoMsg}</span>
        </div>
      )}

      {/* ================= STEP 1: ENTER REGISTERED EMAIL ================= */}
      {step === 1 && (
        <form onSubmit={handleSendCode} className="fp-form-body">
          <div className="fp-title-group">
            <h2 className="fp-title">Forgot Password</h2>
            <p className="fp-subtitle">
              Enter your registered {role === 'manager' ? 'Store Manager' : 'Staff'} email address to receive a secure 6-digit verification code.
            </p>
          </div>

          {/* Portal Role Switcher */}
          <div className="fp-role-selector">
            <button
              type="button"
              className={`fp-role-btn ${role === 'staff' ? 'active' : ''}`}
              onClick={() => { setRole('staff'); setErrorMsg(''); }}
            >
              Staff Account
            </button>
            <button
              type="button"
              className={`fp-role-btn ${role === 'manager' ? 'active' : ''}`}
              onClick={() => { setRole('manager'); setErrorMsg(''); }}
            >
              Manager Account
            </button>
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>Registered Email Address</label>
            <div className="fp-input-wrapper">
              <input
                type="email"
                placeholder={role === 'manager' ? 'manager@scialla.com' : 'staff@scialla.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-login-submit fp-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="fp-loading-spinner">Sending Code...</span>
            ) : (
              'Send Verification Code'
            )}
          </button>

          <div className="fp-footer-links">
            <button
              type="button"
              className="fp-link-btn"
              onClick={onClose}
            >
              ← Back to Sign In
            </button>
          </div>
        </form>
      )}

      {/* ================= STEP 2: VERIFY 6-DIGIT CODE ================= */}
      {step === 2 && (
        <form onSubmit={handleVerifyCode} className="fp-form-body">
          <div className="fp-title-group">
            <h2 className="fp-title">Verify your email</h2>
            <p className="fp-subtitle">
              We've sent a 6-digit verification code to <strong style={{ color: '#FFDFBA' }}>{email}</strong>.
            </p>
          </div>

          {/* 6 Digit Input Group */}
          <div className="fp-code-inputs-group grid grid-cols-6 gap-1.5 sm:gap-2 w-full max-w-sm mx-auto">
            {codeDigits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (digitInputRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                maxLength={6}
                className="fp-code-digit w-full min-w-0 aspect-square max-w-[48px] mx-auto text-center"
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                autoFocus={idx === 0}
                required
              />
            ))}
          </div>

          <div className="fp-expiry-badge">
            <span>⏱ Code expires in 10 minutes</span>
          </div>

          <button
            type="submit"
            className="btn-login-submit fp-submit-btn"
            disabled={loading || codeDigits.join('').length !== 6}
          >
            {loading ? 'Verifying Code...' : 'Verify Code'}
          </button>

          {/* Resend Cooldown Section */}
          <div className="fp-resend-section">
            {cooldown > 0 ? (
              <div className="fp-cooldown-text">
                Resend code in <strong style={{ color: '#E2B688' }}>{cooldown}s</strong>
              </div>
            ) : (
              <button
                type="button"
                className="fp-resend-btn"
                onClick={handleResendCode}
                disabled={loading}
              >
                Resend Code
              </button>
            )}
          </div>

          <div className="fp-footer-links">
            <button
              type="button"
              className="fp-link-btn"
              onClick={() => { setStep(1); setErrorMsg(''); setInfoMsg(''); }}
            >
              ← Change Email Address
            </button>
          </div>
        </form>
      )}

      {/* ================= STEP 3: CREATE NEW PASSWORD ================= */}
      {step === 3 && (
        <form onSubmit={handleResetPassword} className="fp-form-body">
          <div className="fp-title-group">
            <h2 className="fp-title">Create New Password</h2>
            <p className="fp-subtitle">
              Enter your new password below for your <strong style={{ color: '#FFDFBA' }}>{roleLabel}</strong>.
            </p>
          </div>

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label>New Password (min. 8 characters)</label>
            <div className="password-input-wrapper">
              <input
                type={showNewPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoFocus
                required
              />
              <button
                type="button"
                className="btn-toggle-password"
                onClick={() => setShowNewPassword(!showNewPassword)}
                title={showNewPassword ? 'Hide' : 'Show'}
              >
                {showNewPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>Confirm New Password</label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="btn-toggle-password"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                title={showConfirmPassword ? 'Hide' : 'Show'}
              >
                {showConfirmPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-login-submit fp-submit-btn"
            disabled={loading || !newPassword || !confirmPassword}
          >
            {loading ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>
      )}

      {/* ================= STEP 4: SUCCESS ================= */}
      {step === 4 && (
        <div className="fp-form-body fp-success-view">
          <div className="fp-success-icon-badge">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>

          <div className="fp-title-group" style={{ textAlign: 'center' }}>
            <h2 className="fp-title" style={{ color: '#FFDFBA' }}>Password Updated</h2>
            <p className="fp-subtitle" style={{ fontSize: '0.9rem', color: '#E2B688' }}>
              Your password has been changed successfully.
            </p>
          </div>

          <p style={{ fontSize: '0.82rem', color: '#D4C3B3', textAlign: 'center', lineHeight: '1.5', margin: '0 0 20px 0' }}>
            You can now sign into your {role === 'manager' ? 'Manager Portal' : 'Staff Portal'} using your new credentials.
          </p>

          <button
            type="button"
            className="btn-login-submit fp-submit-btn"
            onClick={handleFinish}
            autoFocus
          >
            Return to Sign In
          </button>
        </div>
      )}
    </div>
  );
}
