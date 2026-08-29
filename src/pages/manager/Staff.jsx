import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';

export default function Staff() {
  const { staffList, refreshStaffList, staffOnDuty, orders } = useApp();

  const [activeTab, setActiveTab] = useState('duty'); // 'duty' | 'roster'
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
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Filter out any manager accounts strictly
  const filteredStaffList = staffList.filter((s) => (s.role || '').toLowerCase() !== 'manager');

  const displayStaffOnDuty = (staffOnDuty && staffOnDuty.length > 0 ? staffOnDuty : filteredStaffList.filter((s) => s.status === 'Active'))
    .filter((s) => (s.role || s.staffRole || '').toLowerCase() !== 'manager')
    .map((s) => {
      const fullName = `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.name || s.username || 'Staff Member';
      const liveOrdersCount = orders.filter((o) =>
        (o.accepted_by_id && String(o.accepted_by_id) === String(s.id)) ||
        (o.completed_by_id && String(o.completed_by_id) === String(s.id)) ||
        (o.accepted_by_name && o.accepted_by_name.toLowerCase().trim() === fullName.toLowerCase().trim()) ||
        (o.completed_by_name && o.completed_by_name.toLowerCase().trim() === fullName.toLowerCase().trim())
      ).length;

      const finalCount = typeof s.ordersHandledToday === 'number' && s.ordersHandledToday > liveOrdersCount
        ? s.ordersHandledToday
        : liveOrdersCount;

      return {
        id: s.id,
        name: fullName,
        role: s.role || s.staffRole || 'Staff',
        loginTime: s.loginTime || s.created_at || new Date().toISOString(),
        ordersHandledToday: finalCount
      };
    });

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setUsername('');
    setRole('Staff');
    setPassword('');
    setNewPassword('');
    setErrorMsg('');
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

  const activeCount = filteredStaffList.filter((s) => s.status === 'Active').length;

  return (
    <div className="manager-staff-manager" style={{ width: '100%' }}>
      {/* Top Header & Navigation Switcher */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          marginBottom: '22px',
          padding: '14px 18px',
          background: 'linear-gradient(135deg, rgba(32, 17, 10, 0.8), rgba(20, 10, 6, 0.9))',
          borderRadius: '14px',
          border: '1px solid rgba(201, 139, 91, 0.25)'
        }}
      >
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('duty')}
            style={{
              padding: '9px 18px',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              border: activeTab === 'duty' ? '1px solid #C98B5B' : '1px solid rgba(255,255,255,0.1)',
              background: activeTab === 'duty' ? 'linear-gradient(135deg, #C98B5B, #8B4513)' : 'rgba(0,0,0,0.3)',
              color: activeTab === 'duty' ? '#FFFFFF' : '#D4C3B3'
            }}
          >
            STAFF ON DUTY
            <span
              style={{
                background: activeTab === 'duty' ? '#1A0C06' : 'rgba(34, 197, 94, 0.2)',
                color: activeTab === 'duty' ? '#E2B688' : '#4ade80',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.78rem'
              }}
            >
              {displayStaffOnDuty.length} Active
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            style={{
              padding: '9px 18px',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              border: activeTab === 'roster' ? '1px solid #C98B5B' : '1px solid rgba(255,255,255,0.1)',
              background: activeTab === 'roster' ? 'linear-gradient(135deg, #C98B5B, #8B4513)' : 'rgba(0,0,0,0.3)',
              color: activeTab === 'roster' ? '#FFFFFF' : '#D4C3B3'
            }}
          >
            STAFF ACCOUNT ROSTER
            <span
              style={{
                background: activeTab === 'roster' ? '#1A0C06' : 'rgba(201, 139, 91, 0.3)',
                color: '#E2B688',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.78rem'
              }}
            >
              {filteredStaffList.length}
            </span>
          </button>
        </div>

        {activeTab === 'roster' && (
          <button
            type="button"
            className="btn-add-staff-luxury"
            onClick={handleOpenAdd}
          >
            Add New Staff Member
          </button>
        )}
      </div>

      {activeTab === 'duty' ? (
        /* STAFF ON DUTY VIEW */
        <div className="staff-on-duty-container" style={{ width: '100%' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
              marginBottom: '24px'
            }}
          >
            <div style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(201, 139, 91, 0.25)', borderRadius: '12px', padding: '16px' }}>
              <span style={{ fontSize: '0.76rem', color: '#D4C3B3', textTransform: 'uppercase' }}>Active Baristas on Shift</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#4ade80', marginTop: '4px' }}>
                {displayStaffOnDuty.length}
              </div>
              <span style={{ fontSize: '0.74rem', color: '#A08070' }}>Real-time verified presence</span>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(201, 139, 91, 0.25)', borderRadius: '12px', padding: '16px' }}>
              <span style={{ fontSize: '0.76rem', color: '#D4C3B3', textTransform: 'uppercase' }}>Total Handled Orders Today</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#E2B688', marginTop: '4px' }}>
                {displayStaffOnDuty.reduce((sum, s) => sum + (s.ordersHandledToday || 0), 0)}
              </div>
              <span style={{ fontSize: '0.74rem', color: '#A08070' }}>Assigned and fulfilled</span>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(201, 139, 91, 0.25)', borderRadius: '12px', padding: '16px' }}>
              <span style={{ fontSize: '0.76rem', color: '#D4C3B3', textTransform: 'uppercase' }}>Active Roster Accounts</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#FFFFFF', marginTop: '4px' }}>
                {activeCount}
              </div>
              <span style={{ fontSize: '0.74rem', color: '#A08070' }}>Authorized café staff</span>
            </div>
          </div>

          {displayStaffOnDuty.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: 'rgba(25, 12, 7, 0.6)',
                borderRadius: '16px',
                border: '1px dashed rgba(201, 139, 91, 0.3)',
                color: '#D4C3B3'
              }}
            >
              <h3 style={{ margin: '0 0 6px', color: '#E2B688' }}>No staff members currently on duty</h3>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>Staff members will appear here automatically when signed in.</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '16px'
              }}
            >
              {displayStaffOnDuty.map((st, idx) => (
                <div
                  key={st.id || idx}
                  style={{
                    background: 'linear-gradient(145deg, #1C0E08, #140A05)',
                    border: '1px solid rgba(201, 139, 91, 0.3)',
                    borderRadius: '14px',
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #C98B5B, #8B4513)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFFFFF',
                            fontWeight: 800,
                            fontSize: '0.95rem'
                          }}
                        >
                          {(st.name || 'S').charAt(0)}
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#FFFFFF', fontWeight: 800 }}>
                            {st.name}
                          </h3>
                          <span style={{ fontSize: '0.78rem', color: '#D4A373' }}>
                            {st.role || st.staffRole || 'Barista'}
                          </span>
                        </div>
                      </div>
                      <span style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                        ON DUTY
                      </span>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '10px 12px', marginBottom: '14px', fontSize: '0.8rem', color: '#D4C3B3', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Shift Started:</span>
                        <strong style={{ color: '#E2B688' }}>
                          {st.loginTime ? new Date(st.loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Shift Start'}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Orders Handled Today:</span>
                        <strong style={{ color: '#4ade80' }}>
                          {st.ordersHandledToday || 0} Orders
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(201, 139, 91, 0.15)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: '#8c7b70' }}>
                    <span>Active Barista Station</span>
                    <span style={{ color: '#4ade80', fontWeight: 700 }}>Online</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ALL REGISTERED STAFF ROSTER VIEW */
        <div>
          <div className="staff-roster-grid">
            {filteredStaffList.map((member, index) => {
              const initials = `${(member.first_name || member.name || 'S')[0]}${(member.last_name || '')[0] || ''}`.toUpperCase();
              const isResigned = member.status === 'Resigned';
              const isInactive = member.status === 'Inactive';
              const badgeId = String(member.id || index + 1).padStart(3, '0');
              const statusClass = isResigned ? 'status-resigned' : isInactive ? 'status-inactive' : 'status-active';

              return (
                <div
                  key={member.id}
                  className={`staff-id-badge-card ${statusClass}`}
                >
                  {/* Badge Top Header */}
                  <div className="badge-top-row">
                    <span className="badge-id-num">PASS #{badgeId}</span>
                    <span className={`badge-status-pill ${isResigned ? 'resigned' : isInactive ? 'inactive' : 'active'}`}>
                      ● {member.status}
                    </span>
                  </div>

                  {/* Profile Identity Hub */}
                  <div className="badge-profile-hub">
                    <div className="badge-avatar-ring">
                      {initials}
                    </div>
                    <div className="badge-profile-meta">
                      <h3 className="badge-name">
                        {member.first_name ? `${member.first_name} ${member.last_name}` : member.name}
                      </h3>
                      <div className="badge-role-chip">
                        <span>{member.role || 'Staff'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Credentials Inset Tray */}
                  <div className="badge-creds-tray">
                    <div className="badge-cred-item">
                      <span>Username: <strong>@{member.username}</strong></span>
                    </div>
                    <div className="badge-cred-item">
                      <span>Email: <strong>{member.email}</strong></span>
                    </div>
                  </div>

                  {/* Action Buttons Grid */}
                  <div className="badge-actions-grid">
                    {!isResigned ? (
                      <>
                        <button
                          type="button"
                          className="badge-btn badge-btn-edit"
                          onClick={() => handleOpenEdit(member)}
                        >
                          Edit
                        </button>

                        {member.status === 'Active' ? (
                          <button
                            type="button"
                            className="badge-btn badge-btn-toggle-deactivate"
                            onClick={() => handleStatusChange(member.id, 'Inactive')}
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="badge-btn badge-btn-toggle-activate"
                            onClick={() => handleStatusChange(member.id, 'Active')}
                          >
                            Activate
                          </button>
                        )}

                        <button
                          type="button"
                          className="badge-btn badge-btn-password"
                          onClick={() => handleOpenResetPassword(member)}
                        >
                          Password
                        </button>

                        <button
                          type="button"
                          className="badge-btn badge-btn-resign"
                          onClick={() => {
                            if (confirm(`Mark ${member.first_name || member.name} as Resigned? Account access will be terminated immediately.`)) {
                              handleStatusChange(member.id, 'Resigned');
                            }
                          }}
                        >
                          Resign
                        </button>
                      </>
                    ) : (
                      <div style={{ gridColumn: 'span 2', textAlign: 'center', color: '#ef4444', fontSize: '0.78rem', fontStyle: 'italic', padding: '6px 0' }}>
                        Resigned Employee (Access Revoked)
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="login-form">
              <div className="form-row-2col">
                <div className="form-group">
                  <label>First Name</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required placeholder="Marco" />
                </div>
                <div className="form-group">
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
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="login-form">
              <div className="form-row-2col">
                <div className="form-group">
                  <label>First Name</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </div>
                <div className="form-group">
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
                {errorMsg}
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
