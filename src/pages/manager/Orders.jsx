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
      <div className="manager-box manager-orders-header-box">
        <div className="orders-header-title-row">
          <div>
            <h2 className="orders-page-title">Store Orders & Fulfillment Audit</h2>
            <p className="orders-page-subtitle">
              Real-time kitchen & staff activity
            </p>
          </div>

          {/* Quick Metrics Badges (Live Queue & Fulfilled side-by-side on mobile) */}
          <div className="orders-metrics-grid">
            <div className="order-metric-card live-queue">
              <span className="metric-label">LIVE QUEUE</span>
              <strong className="metric-val">{liveOrdersCount}</strong>
            </div>
            <div className="order-metric-card fulfilled">
              <span className="metric-label">FULFILLED</span>
              <strong className="metric-val">{completedOrdersCount}</strong>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="orders-filter-toolbar">
          {/* Status Filter Tabs */}
          <div className="orders-tab-toggle">
            <button
              type="button"
              className={`role-chip-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All ({orders.length})
            </button>
            <button
              type="button"
              className={`role-chip-btn ${activeTab === 'live' ? 'active' : ''}`}
              onClick={() => setActiveTab('live')}
            >
              Live ({liveOrdersCount})
            </button>
            <button
              type="button"
              className={`role-chip-btn ${activeTab === 'completed' ? 'active' : ''}`}
              onClick={() => setActiveTab('completed')}
            >
              Completed ({completedOrdersCount})
            </button>
          </div>

          {/* Search & Sort Controls */}
          <div className="orders-controls-group">
            <input
              type="text"
              className="orders-search-input"
              placeholder="Search by order #, table, staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {/* Desktop Sort Buttons (Hidden on mobile via CSS) */}
            <div className="orders-desktop-sort-group">
              <button
                type="button"
                className={`role-chip-btn ${sortBy === 'newest' ? 'active' : ''}`}
                onClick={() => setSortBy('newest')}
              >
                Newest First
              </button>
              <button
                type="button"
                className={`role-chip-btn ${sortBy === 'oldest' ? 'active' : ''}`}
                onClick={() => setSortBy('oldest')}
              >
                Oldest First
              </button>
              <button
                type="button"
                className={`role-chip-btn ${sortBy === 'highest' ? 'active' : ''}`}
                onClick={() => setSortBy('highest')}
              >
                Highest Amount
              </button>
              <button
                type="button"
                className={`role-chip-btn ${sortBy === 'lowest' ? 'active' : ''}`}
                onClick={() => setSortBy('lowest')}
              >
                Lowest Amount
              </button>
            </div>

            {/* Mobile Sort Dropdown (Visible only on mobile via CSS) */}
            <select
              className="orders-mobile-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort Orders"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Amount</option>
              <option value="lowest">Lowest Amount</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Orders Content Container */}
      <div className="manager-box manager-orders-list-box">
        {filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#D4C3B3' }}>
            <p style={{ margin: 0, fontSize: '0.92rem' }}>No orders matching the current filter criteria.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (Hidden on mobile via CSS) */}
            <div className="orders-desktop-table-container">
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
                      ? (ord.completed_by_name || '—')
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
                        <td style={{ padding: '12px', color: isCompleted ? '#4ade80' : '#8C7B70', fontWeight: isCompleted ? 600 : 400 }}>
                          {completedByDisplay}
                        </td>
                        <td style={{ padding: '12px', color: '#F5EDE6', fontSize: '0.85rem' }}>
                          {formatFullDateTime(ord.timestamp || ord.createdAt || ord.created_at)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn-order-audit-trigger"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(ord);
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

            {/* Mobile Responsive Order Cards View (Visible only on mobile via CSS) */}
            <div className="orders-mobile-cards-list">
              {filteredOrders.map((ord) => {
                const isCompleted = ord.status === 'completed';
                const completedByDisplay = isCompleted
                  ? (ord.completed_by_name || '—')
                  : '—';

                return (
                  <div
                    key={ord.id}
                    className="manager-order-mobile-card"
                    onClick={() => setSelectedOrder(ord)}
                  >
                    {/* Top Row: Order reference (left) + Status badge (right) */}
                    <div className="order-card-top-row">
                      <strong className="order-card-ref">#{ord.id}</strong>
                      <span className={`status-pill pill-${ord.status}`}>
                        {ord.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Second Row: Destination (left) + Time (right) */}
                    <div className="order-card-second-row">
                      <span className="order-card-dest">{ord.table || 'Counter Pickup'}</span>
                      <span className="order-card-time">{formatOrderTime(ord)}</span>
                    </div>

                    {/* Large/clear Total */}
                    <div className="order-card-total-row">
                      <span className="order-card-total">₱{parseFloat(ord.total || 0).toFixed(2)}</span>
                    </div>

                    {/* Completed by row */}
                    <div className="order-card-completed-row">
                      <span className="order-card-completed-label">Completed by:</span>
                      <span className={`order-card-completed-val ${isCompleted ? 'is-completed' : ''}`}>
                        {completedByDisplay}
                      </span>
                    </div>

                    {/* Bottom: View Audit trigger */}
                    <div className="order-card-audit-row">
                      <button
                        type="button"
                        className="btn-order-card-audit"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(ord);
                        }}
                      >
                        View Audit ›
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
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
                {selectedOrder.table || 'Counter Pickup'}{selectedOrder.paymentMethod && <> &bull; {selectedOrder.paymentMethod}</>}
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

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(201, 139, 91, 0.15)', paddingTop: '6px' }}>
                <span style={{ fontSize: '0.8rem', color: '#D4C3B3' }}>Accepted By:</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#E2B688' }}>
                  {selectedOrder.accepted_by_name || '—'} {selectedOrder.accepted_at ? `(${formatOrderTime({ timestamp: selectedOrder.accepted_at })})` : ''}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(201, 139, 91, 0.15)', paddingTop: '6px' }}>
                <span style={{ fontSize: '0.8rem', color: '#D4C3B3' }}>Completed By:</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: selectedOrder.status === 'completed' ? '#4ade80' : '#A08070' }}>
                  {selectedOrder.status === 'completed' ? (selectedOrder.completed_by_name || '—') : 'Not completed'}
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
                {(selectedOrder.items || []).map((it, idx) => {
                  let itAddons = it.addons || [];
                  if (typeof itAddons === 'string') {
                    try { itAddons = JSON.parse(itAddons); } catch {}
                  }
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        background: 'rgba(255,255,255,0.03)',
                        padding: '8px 10px',
                        borderRadius: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.82rem', color: '#F5EDE6' }}>
                          <strong style={{ color: '#E2B688' }}>{it.qty || it.quantity || 1}x</strong> {it.rawName || it.name || it.product_name || it.item_name || 'Item'} {it.size ? `(${it.size})` : ''}
                        </span>
                        {Array.isArray(itAddons) && itAddons.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', paddingLeft: '16px', marginTop: '2px' }}>
                            {itAddons.map((a, aIdx) => (
                              <span key={a.id || aIdx} style={{ fontSize: '0.72rem', color: '#A08070' }}>
                                + {a.name} <span style={{ color: '#E2B688' }}>(₱{parseFloat(a.price).toFixed(2)})</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#E2B688', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                        ₱{((parseFloat(it.price) || 0) * (it.qty || it.quantity || 1)).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
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
