import React, { useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Bell, CheckCheck, Trash2, X, Sparkles, CheckCircle2, Clock, ChefHat, AlertCircle } from 'lucide-react';

function formatRelativeTime(dateString) {
  if (!dateString) return 'Just now';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 45) return 'Just now';
    if (diffSec < 90) return '1 min ago';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Just now';
  }
}

export default function NotificationDropdown({ isOpen, onClose }) {
  const {
    customerNotifications,
    unreadNotificationsCount,
    markNotificationsAsRead,
    markSingleNotificationAsRead,
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

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'ready') {
      return (
        <span
          style={{
            background: 'linear-gradient(135deg, #E2B688 0%, #C98B5B 100%)',
            color: '#120A05',
            fontSize: '0.65rem',
            fontWeight: 800,
            padding: '2px 7px',
            borderRadius: '12px',
            letterSpacing: '0.5px',
            boxShadow: '0 2px 6px rgba(226, 182, 136, 0.4)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px'
          }}
        >
          <Sparkles size={10} /> READY
        </span>
      );
    }
    if (s === 'preparing') {
      return (
        <span
          style={{
            background: 'rgba(234, 179, 8, 0.18)',
            border: '1px solid rgba(234, 179, 8, 0.4)',
            color: '#FACC15',
            fontSize: '0.65rem',
            fontWeight: 700,
            padding: '1px 6px',
            borderRadius: '10px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px'
          }}
        >
          <ChefHat size={10} /> PREPARING
        </span>
      );
    }
    if (s === 'accepted') {
      return (
        <span
          style={{
            background: 'rgba(56, 189, 248, 0.18)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            color: '#38BDF8',
            fontSize: '0.65rem',
            fontWeight: 700,
            padding: '1px 6px',
            borderRadius: '10px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px'
          }}
        >
          <Clock size={10} /> ACCEPTED
        </span>
      );
    }
    if (s === 'completed') {
      return (
        <span
          style={{
            background: 'rgba(74, 222, 128, 0.18)',
            border: '1px solid rgba(74, 222, 128, 0.4)',
            color: '#4ADE80',
            fontSize: '0.65rem',
            fontWeight: 700,
            padding: '1px 6px',
            borderRadius: '10px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px'
          }}
        >
          <CheckCircle2 size={10} /> COMPLETED
        </span>
      );
    }
    if (s === 'cancelled') {
      return (
        <span
          style={{
            background: 'rgba(239, 68, 68, 0.18)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#F87171',
            fontSize: '0.65rem',
            fontWeight: 700,
            padding: '1px 6px',
            borderRadius: '10px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px'
          }}
        >
          <AlertCircle size={10} /> CANCELLED
        </span>
      );
    }
    return (
      <span
        style={{
          background: 'rgba(201, 139, 91, 0.15)',
          border: '1px solid rgba(201, 139, 91, 0.3)',
          color: '#E2B688',
          fontSize: '0.65rem',
          fontWeight: 700,
          padding: '1px 6px',
          borderRadius: '10px'
        }}
      >
        RECEIVED
      </span>
    );
  };

  return (
    <div
      ref={dropdownRef}
      className="customer-notification-dropdown"
      style={{
        position: 'absolute',
        top: '60px',
        right: '10px',
        width: '340px',
        maxWidth: 'calc(100vw - 20px)',
        background: 'linear-gradient(180deg, #26150C 0%, #160B06 100%)',
        border: '1.5px solid #4D2E1D',
        borderRadius: '16px',
        padding: '16px',
        color: '#FFFFFF',
        boxShadow: '0 20px 48px rgba(0, 0, 0, 0.9)',
        zIndex: 999998,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        animation: 'dropdownFadeIn 0.2s ease'
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(201, 139, 91, 0.2)',
          paddingBottom: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'rgba(201, 139, 91, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Bell size={15} color="#E2B688" />
          </div>
          <div>
            <strong style={{ fontSize: '0.92rem', color: '#FFFFFF', display: 'block', lineHeight: 1.1 }}>
              Notifications
            </strong>
          </div>
          {unreadNotificationsCount > 0 && (
            <span
              style={{
                background: '#C98B5B',
                color: '#120A05',
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '1px 6px',
                borderRadius: '10px'
              }}
            >
              {unreadNotificationsCount}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {customerNotifications.length > 0 && (
            <>
              {unreadNotificationsCount > 0 && (
                <button
                  type="button"
                  onClick={markNotificationsAsRead}
                  title="Mark all as read"
                  style={{
                    background: 'rgba(201, 139, 91, 0.12)',
                    border: '1px solid rgba(201, 139, 91, 0.25)',
                    borderRadius: '6px',
                    color: '#FFDFBA',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '3px 7px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <CheckCheck size={13} /> Mark Read
                </button>
              )}
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
                  padding: '3px 5px',
                  borderRadius: '4px'
                }}
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#A08070',
              cursor: 'pointer',
              padding: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Notifications List (Timeline) */}
      <div
        style={{
          maxHeight: '320px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          paddingRight: '2px'
        }}
      >
        {customerNotifications.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '32px 12px',
              color: '#8c7b70',
              fontSize: '0.82rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Bell size={24} style={{ opacity: 0.3 }} />
            <span>No order updates yet</span>
            <span style={{ fontSize: '0.72rem', color: '#6A554A' }}>
              Your order updates will appear here in real time.
            </span>
          </div>
        ) : (
          customerNotifications.map((notif) => {
            const isReady = (notif.status || '').toLowerCase() === 'ready';
            const isRead = Boolean(notif.read);
            const timeAgo = formatRelativeTime(notif.timestamp);
            const orderRef = notif.orderId ? `#${String(notif.orderId).replace(/^#/, '')}` : null;

            return (
              <div
                key={notif.id || notif.key}
                onClick={() => {
                  if (!isRead && markSingleNotificationAsRead) {
                    markSingleNotificationAsRead(notif.id || notif.key);
                  }
                }}
                style={{
                  background: isReady
                    ? 'linear-gradient(135deg, rgba(201, 139, 91, 0.28) 0%, rgba(77, 46, 29, 0.45) 100%)'
                    : isRead
                    ? 'rgba(0, 0, 0, 0.25)'
                    : 'linear-gradient(135deg, rgba(201, 139, 91, 0.12) 0%, rgba(45, 23, 14, 0.3) 100%)',
                  border: isReady
                    ? '1.5px solid #E2B688'
                    : isRead
                    ? '1px solid rgba(201, 139, 91, 0.12)'
                    : '1px solid rgba(201, 139, 91, 0.35)',
                  borderRadius: '10px',
                  padding: isReady ? '10px 12px' : '9px 11px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  boxShadow: isReady ? '0 4px 18px rgba(201, 139, 91, 0.25)' : 'none',
                  cursor: isRead ? 'default' : 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                {/* Meta Row (Order Ref + Status Badge + Time) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {orderRef && (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          color: isReady ? '#FFDFBA' : '#C98B5B',
                          letterSpacing: '0.3px'
                        }}
                      >
                        Order {orderRef}
                      </span>
                    )}
                    {getStatusBadge(notif.status)}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.68rem', color: isReady ? '#FFDFBA' : '#8c7b70' }}>{timeAgo}</span>
                    {!isRead && (
                      <span
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: isReady ? '#FFDFBA' : '#C98B5B',
                          boxShadow: '0 0 6px rgba(201, 139, 91, 0.8)'
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Notification Message */}
                <div
                  style={{
                    fontSize: isReady ? '0.8rem' : '0.75rem',
                    fontWeight: isReady ? 700 : 500,
                    color: isReady ? '#FFFFFF' : isRead ? '#B5A599' : '#E8D8CC',
                    lineHeight: 1.35
                  }}
                >
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
