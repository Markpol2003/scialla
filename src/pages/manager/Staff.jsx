import React from 'react';
import { useApp } from '../../context/AppContext';

export default function Staff() {
  const { staffList } = useApp();

  return (
    <div className="manager-staff-manager">
      <div className="box-header">
        <h2>Café Staff & Barista Roster</h2>
        <span className="box-tag">4 Active Team Members</span>
      </div>

      <div className="staff-roster-grid">
        {staffList.map((member) => (
          <div key={member.id} className="staff-card">
            <div className="staff-avatar">{member.avatar}</div>
            <div className="staff-details">
              <h3>{member.name}</h3>
              <p className="staff-role">{member.role}</p>
              <span className={`staff-status-pill status-${member.status.toLowerCase().replace(' ', '-')}`}>
                ● {member.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
