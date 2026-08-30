import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';

export default function ManagerOrders() {
  const { orders } = useApp();
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'live' | 'completed'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'highest' | 'lowest'
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Parse time helper
  const formatOrderTime = (order) => {
    const rawDate = order.completed_at || order.createdAt || order.timestamp || order.created_at;
    if (!rawDate) return '—';
    try {
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) {
        return String(order.timestamp || '—');
      }
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return String(order.timestamp || '—');
    }
  };

  const formatFullDateTime = (dateVal) => {
    if (!dateVal) return '—';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      return `${d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return String(dateVal);
    }
  };

  // Filter orders by tab, search, and sort
  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => {
        // Tab filtering
        if (activeTab === 'live') {
          if (o.status !== 'new' && o.status !== 'preparing' && o.status !== 'ready') return false;
        } else if (activeTab === 'completed') {
          if (o.status !== 'completed') return false;
        }

        // Search query filtering
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const idMatch = String(o.id || '').toLowerCase().includes(q);
          const tableMatch = String(o.table || '').toLowerCase().includes(q);
          const statusMatch = String(o.status || '').toLowerCase().includes(q);
          const completedByMatch = String(o.completed_by_name || '').toLowerCase().includes(q);
          const acceptedByMatch = String(o.accepted_by_name || '').toLowerCase().includes(q);
          const itemsMatch = Array.isArray(o.items) && o.items.some((it) =>
            String(it.name || it.product_name || it.item_name || '').toLowerCase().includes(q)
          );

          return idMatch || tableMatch || statusMatch || completedByMatch || acceptedByMatch || itemsMatch;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.completed_at || a.createdAt || a.timestamp || a.created_at || 0).getTime();
        const timeB = new Date(b.completed_at || b.createdAt || b.timestamp || b.created_at || 0).getTime();

        if (sortBy === 'newest') {
          if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) return timeB - timeA;
          return String(b.id).localeCompare(String(a.id));
        }
        if (sortBy === 'oldest') {
          if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) return timeA - timeB;
          return String(a.id).localeCompare(String(b.id));
        }
        if (sortBy === 'highest') {
          return (parseFloat(b.total) || 0) - (parseFloat(a.total) || 0);
        }
        if (sortBy === 'lowest') {
          return (parseFloat(a.total) || 0) - (parseFloat(b.total) || 0);
        }
        return 0;
      });
  }, [orders, activeTab, searchQuery, sortBy]);

  const liveOrdersCount = orders.filter((o) => o.status === 'new' || o.status === 'preparing' || o.status === 'ready').length;
  const completedOrdersCount = orders.filter((o) => o.status === 'completed').length;

  return (
    <div className="manager-orders-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header & Overview Bar */}
      <div className="manager-box" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: '1.2rem', color: '#FFDFBA' }}>Store Orders & Fulfillment Audit</h2>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#D4C3B3' }}>
              Real-time audit log of active kitchen orders and staff fulfillment history
            </p>
          </div>

          {/* Quick Metrics Badges */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', padding: '6px 12px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: '#93c5fd', textTransform: 'uppercase', display: 'block' }}>Live Queue</span>
              <strong style={{ fontSize: '1.1rem', color: '#bfdbfe' }}>{liveOrdersCount}</strong>
            </div>
            <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px', padding: '6px 12px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: '#86efac', textTransform: 'uppercase', display: 'block' }}>Fulfilled</span>
              <strong style={{ fontSize: '1.1rem', color: '#4ade80' }}>{completedOrdersCount}</strong>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginTop: '18px' }}>
          {/* Status Filter Tabs */}
          <div className="orders-tab-toggle" style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className={`role-chip-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
              style={{ padding: '6px 14px', fontSize: '0.8rem' }}
            >
              All Orders ({orders.length})
            </button>
            <button
              type="button"
              className={`role-chip-btn ${activeTab === 'live' ? 'active' : ''}`}
              onClick={() => setActiveTab('live')}
              style={{ padding: '6px 14px', fontSize: '0.8rem' }}
            >
              Live Kitchen ({liveOrdersCount})
            </button>
            <button
              type="button"
              className={`role-chip-btn ${activeTab === 'completed' ? 'active' : ''}`}
              onClick={() => setActiveTab('completed')}
              style={{ padding: '6px 14px', fontSize: '0.8rem' }}
            >
              Completed ({completedOrdersCount})
            </button>
          </div>

          {/* Search & Sort Controls */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search by order #, table, staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(201, 139, 91, 0.3)',
                borderRadius: '8px',
                padding: '7px 12px',
                color: '#FFF',
                fontSize: '0.82rem',
                minWidth: '220px'
              }}
            />

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                background: '#1A0D08',
                border: '1px solid rgba(201, 139, 91, 0.3)',
                borderRadius: '8px',
                padding: '7px 10px',
                color: '#E2B688',
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Amount</option>
              <option value="lowest">Lowest Amount</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Orders Table */}
      <div className="manager-box" style={{ padding: '16px 20px' }}>
        {filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#D4C3B3' }}>
            <p style={{ margin: 0, fontSize: '0.92rem' }}>No orders matching the current filter criteria.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="manager-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Order Ref</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Destination</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Total</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Completed By</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Date/Time</th>
                  <th style={{ textAlign: 'center', padding: '10px 12px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((ord) => {
                  const isCompleted = ord.status === 'completed';
                  const completedByDisplay = isCompleted
                    ? (ord.completed_by_name || 'Staff Member')
                    : '—';

                  return (
                    <tr
                      key={ord.id}
                      onClick={() => setSelectedOrder(ord)}
                      style={{ cursor: 'pointer', transition: 'background 0.15s ease' }}
                    >
                      <td style={{ padding: '12px' }}>
                        <strong style={{ color: '#E2B688', fontFamily: 'var(--font-mono)' }}>
                          #{ord.id}
                        </strong>
                      </td>
                      <td style={{ padding: '12px', color: '#FFFFFF' }}>
                        {ord.table || 'Counter Pickup'}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 700, color: '#E2B688', fontFamily: 'var(--font-mono)' }}>
                        ₱{parseFloat(ord.total || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span className={`status-pill pill-${ord.status}`}>
                          {ord.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {isCompleted ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: 'rgba(34, 197, 94, 0.2)',
                              color: '#86efac',
                              fontSize: '0.65rem',
                              fontWeight: 900,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              ✓
                            </span>
                            <span style={{ fontWeight: 600, color: '#F5EDE6' }}>
                              {completedByDisplay}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#8C7B70' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '12px', color: '#D4C3B3', fontSize: '0.82rem' }}>
                        {formatOrderTime(ord)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-action-small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(ord);
                          }}
                          style={{
                            background: 'rgba(201, 139, 91, 0.15)',
                            border: '1px solid rgba(201, 139, 91, 0.3)',
                            borderRadius: '6px',
                            color: '#E2B688',
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                        >
                          View Audit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Details & Audit Trail Modal */}
      {selectedOrder && (
        <div
          className="login-page-container profile-modal-overlay"
          onClick={() => setSelectedOrder(null)}
          style={{ zIndex: 999999 }}
        >
          <div
            className="login-card-3d profile-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px' }}
          >
            {/* Close Button */}
            <button
              type="button"
              className="login-close-btn"
              onClick={() => setSelectedOrder(null)}
              title="Close modal"
            >
              ✕
            </button>

            {/* Modal Header */}
            <div className="login-brand">
              <h2 className="brand-title" style={{ marginTop: '4px', fontSize: '1.4rem' }}>
                Order #{selectedOrder.id}
              </h2>
              <p className="brand-subtitle">
                {selectedOrder.table || 'Counter Pickup'} &bull; {selectedOrder.paymentMethod || 'Cash'}
              </p>
            </div>

            {/* Status & Fulfillment Audit Trail Box */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(201, 139, 91, 0.3)',
              borderRadius: '12px',
              padding: '14px',
              margin: '10px 0 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: '#A08070', textTransform: 'uppercase' }}>Order Status</span>
                <span className={`status-pill pill-${selectedOrder.status}`}>
                  {selectedOrder.status.toUpperCase()}
                </span>
              </div>

              {selectedOrder.accepted_by_name && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(201, 139, 91, 0.15)', paddingTop: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#D4C3B3' }}>Accepted By:</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#E2B688' }}>
                    {selectedOrder.accepted_by_name} {selectedOrder.accepted_at ? `(${formatOrderTime({ timestamp: selectedOrder.accepted_at })})` : ''}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(201, 139, 91, 0.15)', paddingTop: '6px' }}>
                <span style={{ fontSize: '0.8rem', color: '#D4C3B3' }}>Completed By:</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: selectedOrder.status === 'completed' ? '#4ade80' : '#A08070' }}>
                  {selectedOrder.status === 'completed' ? (selectedOrder.completed_by_name || 'Staff Member') : 'Not completed'}
                </span>
              </div>

              {selectedOrder.status === 'completed' && selectedOrder.completed_at && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: '#D4C3B3' }}>Completed At:</span>
                  <span style={{ fontSize: '0.82rem', color: '#F5EDE6' }}>
                    {formatFullDateTime(selectedOrder.completed_at)}
                  </span>
                </div>
              )}
            </div>

            {/* Order Items List */}
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '0.76rem', color: '#A08070', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                Ordered Items
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                {(selectedOrder.items || []).map((it, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(255,255,255,0.03)',
                      padding: '8px 10px',
                      borderRadius: '6px'
                    }}
                  >
                    <span style={{ fontSize: '0.82rem', color: '#F5EDE6' }}>
                      <strong style={{ color: '#E2B688' }}>{it.qty || it.quantity || 1}x</strong> {it.name || it.product_name || it.item_name || 'Item'} {it.size ? `(${it.size})` : ''}
                    </span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#E2B688', fontFamily: 'var(--font-mono)' }}>
                      ₱{((parseFloat(it.price) || 0) * (it.qty || it.quantity || 1)).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(201, 139, 91, 0.3)', paddingTop: '12px', marginBottom: '14px' }}>
              <span style={{ fontSize: '0.9rem', color: '#D4C3B3' }}>Order Total</span>
              <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#E2B688', fontFamily: 'var(--font-mono)' }}>
                ₱{parseFloat(selectedOrder.total || 0).toFixed(2)}
              </span>
            </div>

            <button
              type="button"
              className="btn-login-submit"
              onClick={() => setSelectedOrder(null)}
            >
              Close Order Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
