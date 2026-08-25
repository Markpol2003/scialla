import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';

export default function Staff() {
  const { staffList, refreshStaffList } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  // Form States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('Staff');
  const [password, setPassword] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setUsername('');
    setRole('Staff');
    setPassword('');
    setNewPassword('');
    setErrorMsg('');
    setStatusMsg('');
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (member) => {
    resetForm();
    setSelectedStaff(member);
    setFirstName(member.first_name || member.name?.split(' ')[0] || '');
    setLastName(member.last_name || member.name?.split(' ')[1] || '');
    setEmail(member.email || '');
    setUsername(member.username || '');
    setRole(member.role || 'Staff');
    setShowEditModal(true);
  };

  const handleOpenResetPassword = (member) => {
    resetForm();
    setSelectedStaff(member);
    setShowPasswordModal(true);
  };

  // Add Staff Submit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const res = await api.createStaff({
      first_name: firstName,
      last_name: lastName,
      email,
      username,
      role,
      password
    });

    setLoading(false);

    if (res && res.success) {
      setShowAddModal(false);
      resetForm();
      if (refreshStaffList) refreshStaffList();
    } else {
      setErrorMsg(res?.message || 'Failed to create staff account.');
    }
  };

  // Edit Staff Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStaff) return;
    setErrorMsg('');
    setLoading(true);

    const res = await api.updateStaff(selectedStaff.id, {
      first_name: firstName,
      last_name: lastName,
      email,
      username,
      role
    });

    setLoading(false);

    if (res && res.success) {
      setShowEditModal(false);
      resetForm();
      if (refreshStaffList) refreshStaffList();
    } else {
      setErrorMsg(res?.message || 'Failed to update staff details.');
    }
  };

  // Status Change (Active, Inactive, Resigned)
  const handleStatusChange = async (staffId, newStatus) => {
    setErrorMsg('');
    const res = await api.updateStaffStatus(staffId, newStatus);
    if (res && res.success) {
      if (refreshStaffList) refreshStaffList();
    } else {
      alert(res?.message || 'Failed to update staff status.');
    }
  };

  // Reset Password Submit
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStaff) return;
    setErrorMsg('');
    setLoading(true);

    const res = await api.resetStaffPassword(selectedStaff.id, newPassword);
    setLoading(false);

    if (res && res.success) {
      setShowPasswordModal(false);
      resetForm();
      alert('Password updated successfully!');
    } else {
      setErrorMsg(res?.message || 'Failed to reset password.');
    }
  };

  const activeCount = staffList.filter((s) => s.status === 'Active').length;

  return (
    <div className="manager-staff-manager">
      <div className="box-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>Café Staff & Barista Roster</h2>
          <span className="box-tag">{activeCount} Active Team Member(s)</span>
        </div>

        <button
          type="button"
          className="btn-login-submit"
          onClick={handleOpenAdd}
          style={{ width: 'auto', padding: '10px 20px', fontSize: '0.88rem' }}
        >
          + Add New Staff Member
        </button>
      </div>

      {/* Staff Roster Grid */}
      <div className="staff-roster-grid" style={{ marginTop: '20px' }}>
        {staffList.map((member) => {
          const initials = `${(member.first_name || member.name || 'S')[0]}${(member.last_name || '')[0] || ''}`.toUpperCase();
          const isResigned = member.status === 'Resigned';
          const isInactive = member.status === 'Inactive';

          return (
            <div
              key={member.id}
              className="staff-card"
              style={{
                opacity: isResigned ? 0.6 : 1,
                borderColor: isResigned ? '#4b5563' : isInactive ? '#eab308' : 'var(--color-gold)'
              }}
            >
              <div className="staff-avatar">{initials}</div>
              <div className="staff-details" style={{ width: '100%' }}>
                <h3>{member.first_name ? `${member.first_name} ${member.last_name}` : member.name}</h3>
                <p className="staff-role" style={{ color: 'var(--color-gold)', fontWeight: 'bold' }}>{member.role}</p>
                <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: '4px 0' }}>
                  @{member.username} • {member.email}
                </p>

                <div style={{ margin: '8px 0' }}>
                  <span
                    className="staff-status-pill"
                    style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      background: isResigned
                        ? 'rgba(239, 68, 68, 0.2)'
                        : isInactive
                        ? 'rgba(234, 179, 8, 0.2)'
                        : 'rgba(16, 185, 129, 0.2)',
                      color: isResigned ? '#ef4444' : isInactive ? '#eab308' : '#10b981'
                    }}
                  >
                    ● {member.status}
                  </span>
                </div>

                {/* Staff Actions Stack */}
                <div className="staff-actions-row" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
                  {!isResigned && (
                    <>
                      <button
                        type="button"
                        className="btn-table-action"
                        onClick={() => handleOpenEdit(member)}
                        style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                      >
                        ✏ Edit
                      </button>

                      {member.status === 'Active' ? (
                        <button
                          type="button"
                          className="btn-table-action"
                          onClick={() => handleStatusChange(member.id, 'Inactive')}
                          style={{ fontSize: '0.75rem', padding: '4px 8px', borderColor: '#eab308', color: '#eab308' }}
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-table-action"
                          onClick={() => handleStatusChange(member.id, 'Active')}
                          style={{ fontSize: '0.75rem', padding: '4px 8px', borderColor: '#10b981', color: '#10b981' }}
                        >
                          Activate
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn-table-action"
                        onClick={() => handleOpenResetPassword(member)}
                        style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                      >
                        🔑 Password
                      </button>

                      <button
                        type="button"
                        className="btn-table-action"
                        onClick={() => {
                          if (confirm(`Mark ${member.first_name || member.name} as Resigned? Account will be disabled immediately.`)) {
                            handleStatusChange(member.id, 'Resigned');
                          }
                        }}
                        style={{ fontSize: '0.75rem', padding: '4px 8px', borderColor: '#ef4444', color: '#ef4444' }}
                      >
                        Mark Resigned
                      </button>
                    </>
                  )}

                  {isResigned && (
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af', italic: 'true' }}>
                      Resigned Employee (Login Revoked)
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="auth-modal-backdrop" onClick={() => setShowAddModal(false)} style={{ zIndex: 999999 }}>
          <div className="auth-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <button className="auth-close-btn" onClick={() => setShowAddModal(false)}>✕</button>
            <h3>Add New Staff Member</h3>
            <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '16px' }}>
              Create an account for new café employees. Staff will use these credentials to sign in.
            </p>

            {errorMsg && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '8px', borderRadius: '6px', color: '#f87171', fontSize: '0.8rem', marginBottom: '12px' }}>
                ⚠ {errorMsg}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="login-form">
              <div style={{ display: 'flex', gap: '10px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>First Name</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required placeholder="Marco" />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Last Name</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required placeholder="Santos" />
                </div>
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="marco@scialla.com" />
              </div>

              <div className="form-group">
                <label>Username</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="marco_barista" />
              </div>

              <div className="form-group">
                <label>Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--color-gold)', color: '#fff' }}
                >
                  <option value="Staff">Staff</option>
                  <option value="Barista">Barista</option>
                  <option value="Head Barista">Head Barista</option>
                  <option value="Cashier">Cashier</option>
                </select>
              </div>

              <div className="form-group">
                <label>Temporary Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
              </div>

              <button type="submit" className="btn-login-submit" disabled={loading} style={{ marginTop: '12px' }}>
                {loading ? 'Creating...' : 'Create Staff Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {showEditModal && selectedStaff && (
        <div className="auth-modal-backdrop" onClick={() => setShowEditModal(false)} style={{ zIndex: 999999 }}>
          <div className="auth-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <button className="auth-close-btn" onClick={() => setShowEditModal(false)}>✕</button>
            <h3>Edit Staff Details</h3>

            {errorMsg && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '8px', borderRadius: '6px', color: '#f87171', fontSize: '0.8rem', marginBottom: '12px' }}>
                ⚠ {errorMsg}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="login-form">
              <div style={{ display: 'flex', gap: '10px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>First Name</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Last Name</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </div>
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <div className="form-group">
                <label>Username</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
              </div>

              <div className="form-group">
                <label>Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--color-gold)', color: '#fff' }}
                >
                  <option value="Staff">Staff</option>
                  <option value="Barista">Barista</option>
                  <option value="Head Barista">Head Barista</option>
                  <option value="Cashier">Cashier</option>
                </select>
              </div>

              <button type="submit" className="btn-login-submit" disabled={loading} style={{ marginTop: '12px' }}>
                {loading ? 'Saving...' : 'Save Staff Details'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showPasswordModal && selectedStaff && (
        <div className="auth-modal-backdrop" onClick={() => setShowPasswordModal(false)} style={{ zIndex: 999999 }}>
          <div className="auth-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <button className="auth-close-btn" onClick={() => setShowPasswordModal(false)}>✕</button>
            <h3>Reset Password</h3>
            <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '14px' }}>
              Reset password for <strong>{selectedStaff.first_name || selectedStaff.name}</strong> (@{selectedStaff.username}).
            </p>

            {errorMsg && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '8px', borderRadius: '6px', color: '#f87171', fontSize: '0.8rem', marginBottom: '12px' }}>
                ⚠ {errorMsg}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="login-form">
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-login-submit" disabled={loading} style={{ marginTop: '12px' }}>
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
