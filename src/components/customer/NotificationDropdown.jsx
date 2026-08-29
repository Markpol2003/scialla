import React, { useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Bell, CheckCheck, Trash2, X } from 'lucide-react';

export default function NotificationDropdown({ isOpen, onClose }) {
  const {
    customerNotifications,
    unreadNotificationsCount,
    markNotificationsAsRead,
    clearNotifications
  } = useApp();

  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) && !e.target.closest('.header-icon-btn')) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="customer-notification-dropdown"
      style={{
        position: 'absolute',
        top: '60px',
        right: '10px',
        width: '320px',
        maxWidth: 'calc(100vw - 20px)',
        background: 'linear-gradient(180deg, #26150C 0%, #1A0D07 100%)',
        border: '1.5px solid #4D2E1D',
        borderRadius: '14px',
        padding: '16px',
        color: '#FFFFFF',
        boxShadow: '0 16px 40px rgba(0,0,0,0.85)',
        zIndex: 999998,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(201, 139, 91, 0.2)', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Bell size={16} color="#C98B5B" />
          <strong style={{ fontSize: '0.92rem', color: '#FFFFFF' }}>Notifications</strong>
          {unreadNotificationsCount > 0 && (
            <span style={{ background: '#C98B5B', color: '#1A0C06', fontSize: '0.68rem', fontWeight: 800, padding: '1px 6px', borderRadius: '10px' }}>
              {unreadNotificationsCount}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {customerNotifications.length > 0 && (
            <>
              <button
                type="button"
                onClick={markNotificationsAsRead}
                title="Mark all as read"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#D4A373',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px'
                }}
              >
                <CheckCheck size={14} /> Read
              </button>
              <button
                type="button"
                onClick={clearNotifications}
                title="Clear all notifications"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8c7b70',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  padding: '2px 4px'
                }}
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#8c7b70', cursor: 'pointer', padding: '2px' }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {customerNotifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 10px', color: '#8c7b70', fontSize: '0.8rem' }}>
            No new notifications
          </div>
        ) : (
          customerNotifications.map((notif) => {
            const timeStr = notif.timestamp
              ? new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Just now';

            return (
              <div
                key={notif.id}
                style={{
                  background: notif.read ? 'rgba(0,0,0,0.2)' : 'rgba(201, 139, 91, 0.1)',
                  border: notif.read ? '1px solid rgba(201, 139, 91, 0.1)' : '1px solid rgba(201, 139, 91, 0.3)',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: notif.read ? '#FFFFFF' : '#E2B688' }}>
                    {notif.title}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '0.68rem', color: '#8c7b70' }}>{timeStr}</span>
                    {!notif.read && (
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C98B5B' }}></span>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: '0.74rem', color: '#D4C3B3', lineHeight: 1.3 }}>
                  {notif.message}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
