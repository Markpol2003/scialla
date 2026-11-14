import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';

export default function ManagerOrders() {
  const {
    orders, adjustOrder, reviewOrder, sizeChangeRequests, reviewSizeChangeRequest,
    cashReports, cashReconciliation, orderAudit, reviewCashReport, closeCashReconciliation
  } = useApp();
  const [activeTab, setActiveTab] = useState('incoming'); // 'incoming' | 'all' | 'live' | 'completed'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'highest' | 'lowest'
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingItems, setEditingItems] = useState(false);
  const [draftItems, setDraftItems] = useState([]);
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  const [reviewingRequestId, setReviewingRequestId] = useState(null);
  const [reviewingOrder, setReviewingOrder] = useState(false);
  const [orderReviewError, setOrderReviewError] = useState('');
  const [openingCash, setOpeningCash] = useState('0.00');
  const [closingCash, setClosingCash] = useState('');
  const [reconciliationNote, setReconciliationNote] = useState('');
  const [closingReconciliation, setClosingReconciliation] = useState(false);

  const openOrder = (order) => {
    setSelectedOrder(order);
    setOrderReviewError('');
    setDraftItems((order.items || []).map((item) => ({ ...item, name: item.name || item.rawName || item.product_name || 'Item', qty: Number(item.qty || item.quantity || 1), price: Number(item.price || 0) })));
    setEditingItems(false);
  };

  const saveOrderChange = async () => {
    setSavingAdjustment(true);
    const result = await adjustOrder(selectedOrder.id, 'adjust', draftItems);
    setSavingAdjustment(false);
    if (result?.success) {
      setSelectedOrder(result.order);
      setDraftItems(result.order.items || draftItems);
      setEditingItems(false);
    }
  };

  const reviewRequest = async (request, decision) => {
    setReviewingRequestId(request.id);
    await reviewSizeChangeRequest(request.id, decision);
    setReviewingRequestId(null);
  };

  const handleReviewOrder = async (decision) => {
    if (!selectedOrder?.id || reviewingOrder) return;
    setReviewingOrder(true);
    setOrderReviewError('');
    try {
      const result = await reviewOrder(selectedOrder.id, decision);
      if (result?.success && result.order) {
        setSelectedOrder(result.order);
      } else {
        setOrderReviewError(result?.message || 'The order could not be updated. Check the server connection and try again.');
      }
    } catch {
      setOrderReviewError('The order could not be updated. Check the server connection and try again.');
    } finally {
      setReviewingOrder(false);
    }
  };

  const handleCashReview = async (report, decision) => {
    await reviewCashReport(report.id, decision);
  };

  const handleReconcile = async (event) => {
    event.preventDefault();
    setClosingReconciliation(true);
    const result = await closeCashReconciliation({ openingCash: Number(openingCash), closingCash: Number(closingCash), note: reconciliationNote });
    setClosingReconciliation(false);
    if (result?.success) {
      setOpeningCash(closingCash);
      setClosingCash('');
      setReconciliationNote('');
    }
  };

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
        if (activeTab === 'incoming') {
          if (o.status !== 'pending_manager_approval') return false;
        } else if (activeTab === 'live') {
          if (!['approved', 'preparing', 'ready'].includes(o.status)) return false;
        } else if (activeTab === 'completed') {
          if (o.status !== 'served' && o.status !== 'cancelled') return false;
        }

        // Search query filtering
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const idMatch = String(o.id || '').toLowerCase().includes(q);
          const customerMatch = String(o.customer_name || '').toLowerCase().includes(q);
          const tableMatch = String(o.table || '').toLowerCase().includes(q);
          const statusMatch = String(o.status || '').toLowerCase().includes(q);
          const completedByMatch = String(o.completed_by_name || '').toLowerCase().includes(q);
          const acceptedByMatch = String(o.accepted_by_name || '').toLowerCase().includes(q);
          const itemsMatch = Array.isArray(o.items) && o.items.some((it) =>
            String(it.name || it.product_name || it.item_name || '').toLowerCase().includes(q)
          );

          return idMatch || customerMatch || tableMatch || statusMatch || completedByMatch || acceptedByMatch || itemsMatch;
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

  const pendingApprovalCount = orders.filter((o) => o.status === 'pending_manager_approval').length;
  const liveOrdersCount = orders.filter((o) => ['approved', 'preparing', 'ready'].includes(o.status)).length;
  const completedOrdersCount = orders.filter((o) => o.status === 'served' || o.status === 'cancelled').length;
  const pendingSizeChangeRequests = sizeChangeRequests.filter((request) => request.status === 'pending');
  const cashReportsForReview = cashReports.filter((report) => ['pending_manager_verification', 'payment_discrepancy'].includes(report.status));
  const pendingCashVerificationCount = cashReports.filter((report) => report.status === 'pending_manager_verification').length;
  const cashDiscrepancyCount = cashReports.filter((report) => report.status === 'payment_discrepancy').length;

  return (
    <div className="manager-orders-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {pendingSizeChangeRequests.length > 0 && <details className="manager-box manager-orders-tools" aria-labelledby="size-change-requests-title">
        <summary id="size-change-requests-title">
          <span>Customer Size-Change Requests</span>
          <span className="manager-tools-count">{pendingSizeChangeRequests.length} pending</span>
        </summary>
        <div className="manager-tools-content">
        {pendingSizeChangeRequests.length === 0 ? (
          <p style={{ margin: 0, color: '#A08070', fontSize: '0.86rem' }}>No pending size-change requests.</p>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {pendingSizeChangeRequests.map((request) => (
              <article key={request.id} className="manager-size-request-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', padding: '12px', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', border: '1px solid rgba(201,139,91,0.24)' }}>
                <div style={{ display: 'grid', gap: '4px', color: '#E2B688', fontSize: '0.84rem' }}>
                  <strong style={{ color: '#FFDFBA' }}>{request.customerName} · Order #{request.orderId}</strong>
                  <span>{request.itemName}: {request.originalSize} → {request.requestedSize}</span>
                  <span>Unit price: ₱{Number(request.originalPrice || 0).toFixed(2)} → ₱{Number(request.requestedPrice || 0).toFixed(2)}</span>
                  <span>Requested {formatFullDateTime(request.requestedAt)}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn-staff-action btn-accept" disabled={reviewingRequestId === request.id} onClick={() => reviewRequest(request, 'approved')}>Approve</button>
                  <button type="button" className="btn-staff-action btn-reject" disabled={reviewingRequestId === request.id} onClick={() => reviewRequest(request, 'rejected')}>Reject</button>
                </div>
              </article>
            ))}
          </div>
        )}
        </div>
      </details>}

      <details className="manager-box manager-orders-tools" aria-labelledby="cash-controls-title">
        <summary id="cash-controls-title">
          <span>Cash Verification & Reconciliation</span>
          <span className="manager-tools-count">{pendingCashVerificationCount} pending{' · '}{cashDiscrepancyCount} discrepancies</span>
        </summary>
        <div className="manager-tools-content">
        <div className="manager-cash-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '14px' }}>
          {[
            ['Expected / reported', cashReconciliation?.summary?.reported_total],
            ['Cash verified', cashReconciliation?.summary?.verified_total],
            ['Pending verification', cashReconciliation?.summary?.pending_count],
            ['Discrepancies', cashReconciliation?.summary?.discrepancy_count]
          ].map(([label, value]) => <div key={label} style={{ padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.22)', color: '#A08070', fontSize: '0.74rem' }}>{label}<strong style={{ display: 'block', color: '#E2B688', fontSize: '1rem', marginTop: '4px' }}>{label.includes('Pending') || label === 'Discrepancies' ? Number(value || 0) : `₱${Number(value || 0).toFixed(2)}`}</strong></div>)}
        </div>
        <div style={{ display: 'grid', gap: '8px', marginBottom: '14px' }}>
          {cashReportsForReview.map((report) => (
            <div key={report.id} className="manager-cash-report-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.22)', color: '#E2B688', fontSize: '0.8rem' }}>
              <div>
                <strong>Order #{report.order_id || report.orderId} · {report.customer_name || 'Customer'}</strong>
                <div>Staff: {report.staff_name || 'Staff'} · Reported ₱{Number(report.amount_reported).toFixed(2)} · Expected ₱{Number(report.expected_amount ?? report.total ?? 0).toFixed(2)}</div>
                <div>{report.status.replaceAll('_', ' ').toUpperCase()} · {new Date(report.reported_at || report.reportedAt).toLocaleString()}</div>
              </div>
              {report.status === 'pending_manager_verification' && <div style={{ display: 'flex', gap: '7px' }}>
                <button type="button" className="btn-staff-action btn-accept" onClick={() => handleCashReview(report, 'verify')}>Verify Cash</button>
                <button type="button" className="btn-staff-action btn-reject" onClick={() => handleCashReview(report, 'flag')}>Flag Discrepancy</button>
              </div>}
            </div>
          ))}
          {cashReportsForReview.length === 0 && <p style={{ color: '#A08070', margin: 0, fontSize: '0.84rem' }}>No cash reports need review.</p>}
        </div>
        <form onSubmit={handleReconcile} style={{ display: 'flex', alignItems: 'end', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid rgba(201,139,91,0.2)', paddingTop: '12px' }}>
          <label style={{ color: '#A08070', fontSize: '0.75rem' }}>Opening cash<input type="number" min="0" step="0.01" required value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} /></label>
          <label style={{ color: '#A08070', fontSize: '0.75rem' }}>Actual closing cash<input type="number" min="0" step="0.01" required value={closingCash} onChange={(e) => setClosingCash(e.target.value)} /></label>
          <label style={{ flex: '1 1 180px', color: '#A08070', fontSize: '0.75rem' }}>Note<input value={reconciliationNote} onChange={(e) => setReconciliationNote(e.target.value)} maxLength={500} /></label>
          <button type="submit" className="btn-order-audit-trigger" disabled={closingReconciliation}>{closingReconciliation ? 'Saving…' : 'Close & Reconcile Shift'}</button>
        </form>
        {cashReconciliation?.staffTotals?.length > 0 && <div style={{ marginTop: '12px', color: '#A08070', fontSize: '0.78rem' }}>Staff cash: {cashReconciliation.staffTotals.map((staff) => `${staff.staff_name}: ₱${Number(staff.reported).toFixed(2)} reported / ₱${Number(staff.verified).toFixed(2)} verified`).join(' · ')}</div>}
        {cashReconciliation?.lastClose && <div style={{ marginTop: '8px', color: '#A08070', fontSize: '0.78rem' }}>Last counted close: ₱{Number(cashReconciliation.lastClose.closing_cash).toFixed(2)} at {new Date(cashReconciliation.lastClose.closed_at).toLocaleString()}</div>}
        {cashReconciliation?.reports?.length > 0 && <div style={{ marginTop: '8px', color: '#A08070', fontSize: '0.78rem' }}>Reconciliation calculates expected cash from the opening balance plus verified collections; any variance is recorded for investigation.</div>}
        </div>
      </details>

      <details className="manager-box" style={{ padding: '14px 18px' }}>
        <summary style={{ color: '#FFDFBA', cursor: 'pointer', fontWeight: 800 }}>Immutable Audit Log ({orderAudit.length})</summary>
        <div style={{ maxHeight: '240px', overflowY: 'auto', marginTop: '10px', display: 'grid', gap: '5px' }}>
          {orderAudit.slice(0, 50).map((entry) => <div key={entry.id} style={{ color: '#A08070', fontSize: '0.76rem' }}>#{entry.order_id || 'Cash'} · {entry.action} · {entry.actor_role} {entry.actor_id || ''} · {new Date(entry.created_at).toLocaleString()}</div>)}
          {!orderAudit.length && <span style={{ color: '#A08070', fontSize: '0.8rem' }}>Audit events will appear here.</span>}
        </div>
      </details>

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
            <div className="order-metric-card live-queue pending-approval-metric">
              <span className="metric-label">PENDING APPROVAL</span>
              <strong className="metric-val">{pendingApprovalCount}</strong>
            </div>
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
            <button type="button" className={`role-chip-btn ${activeTab === 'incoming' ? 'active' : ''}`} onClick={() => setActiveTab('incoming')}>
              Incoming ({pendingApprovalCount})
            </button>
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
              placeholder="Search by customer, order #, table, staff..."
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
                    <th style={{ textAlign: 'left', padding: '10px 12px' }}>Customer / Order</th>
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
                    const isCompleted = ord.status === 'served';
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
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontWeight: 700, color: ord.customer_name ? '#FFDFBA' : '#E2B688', fontSize: '0.95rem' }}>
                              {ord.customer_name || `#${ord.id}`}
                            </span>
                            {ord.customer_name && (
                              <span style={{ fontSize: '0.78rem', color: '#A08070', fontFamily: 'var(--font-mono)' }}>
                                Ref: #{ord.id}
                              </span>
                            )}
                          </div>
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
                          {formatFullDateTime(ord.createdAt || ord.created_at || ord.timestamp)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn-order-audit-trigger"
                            onClick={(e) => {
                              e.stopPropagation();
                            openOrder(ord);
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
                const isCompleted = ord.status === 'served';
                const completedByDisplay = isCompleted
                  ? (ord.completed_by_name || '—')
                  : '—';

                return (
                  <div
                    key={ord.id}
                    className="manager-order-mobile-card"
                    onClick={() => openOrder(ord)}
                  >
                    {/* Top Row: Customer Name / Order reference (left) + Status badge (right) */}
                    <div className="order-card-top-row">
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="order-card-customer" style={{ fontWeight: 700, color: ord.customer_name ? '#FFDFBA' : '#E2B688', fontSize: '1.05rem' }}>
                          {ord.customer_name || `#${ord.id}`}
                        </span>
                        {ord.customer_name && (
                          <span className="order-card-ref-sub" style={{ fontSize: '0.78rem', color: '#A08070', fontFamily: 'var(--font-mono)' }}>
                            Ref: #{ord.id}
                          </span>
                        )}
                      </div>
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
                          openOrder(ord);
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
          style={{ zIndex: 1000001, pointerEvents: 'auto' }}
        >
          <div
            className="login-card-3d profile-modal-card manager-order-review-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto', pointerEvents: 'auto' }}
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
              <h2 className="brand-title" style={{ marginTop: '4px', fontSize: '1.4rem', color: '#FFDFBA' }}>
                {selectedOrder.customer_name ? `${selectedOrder.customer_name}'s Order` : `Order #${selectedOrder.id}`}
              </h2>
              <p className="brand-subtitle" style={{ fontSize: '0.85rem' }}>
                Order Ref: <strong style={{ color: '#E2B688', fontFamily: 'var(--font-mono)' }}>#{selectedOrder.id}</strong> &bull; {selectedOrder.table || 'Counter Pickup'}{selectedOrder.paymentMethod && <> &bull; {selectedOrder.paymentMethod}</>}
              </p>
            </div>
            <button
              type="button"
              className="btn-order-audit-trigger"
              style={{ alignSelf: 'flex-start', marginBottom: '8px' }}
              onClick={() => { setActiveTab('all'); setSelectedOrder(null); }}
            >
              Back to All Orders
            </button>

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
              {selectedOrder.customer_name && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(201, 139, 91, 0.15)', paddingBottom: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#D4C3B3' }}>Customer:</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFDFBA' }}>
                    {selectedOrder.customer_name}
                  </span>
                </div>
              )}

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
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: selectedOrder.status === 'served' ? '#4ade80' : '#A08070' }}>
                  {selectedOrder.status === 'served' ? (selectedOrder.completed_by_name || '—') : 'Not served'}
                </span>
              </div>

              {selectedOrder.status === 'served' && selectedOrder.completed_at && (
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.76rem', color: '#A08070', textTransform: 'uppercase' }}>Ordered Items</span>
                {!editingItems && selectedOrder.status !== 'cancelled' && (
                  <button type="button" className="btn-order-audit-trigger" onClick={() => setEditingItems(true)}>Unlock for Changes</button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                {(editingItems ? draftItems : (selectedOrder.items || [])).map((it, idx) => {
                  let itAddons = it.addons || [];
                  if (typeof itAddons === 'string') {
                    try { itAddons = JSON.parse(itAddons); } catch {}
                  }
                  if (editingItems) return (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 2fr) 1fr 65px 90px auto', gap: '6px', alignItems: 'center' }}>
                      <input aria-label="Item name" value={it.name || ''} onChange={(e) => setDraftItems((prev) => prev.map((item, i) => i === idx ? { ...item, name: e.target.value } : item))} />
                      <input aria-label="Size" placeholder="Size" value={it.size || ''} onChange={(e) => setDraftItems((prev) => prev.map((item, i) => i === idx ? { ...item, size: e.target.value } : item))} />
                      <input aria-label="Quantity" type="number" min="1" value={it.qty || 1} onChange={(e) => setDraftItems((prev) => prev.map((item, i) => i === idx ? { ...item, qty: Number(e.target.value) } : item))} />
                      <input aria-label="Unit price" type="number" min="0" step="0.01" value={it.price || 0} onChange={(e) => setDraftItems((prev) => prev.map((item, i) => i === idx ? { ...item, price: Number(e.target.value) } : item))} />
                      <button type="button" aria-label="Remove item" onClick={() => setDraftItems((prev) => prev.filter((_, i) => i !== idx))}>×</button>
                    </div>
                  );
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
              {editingItems && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                  <button type="button" className="btn-order-audit-trigger" onClick={() => setDraftItems((prev) => [...prev, { name: '', size: '', qty: 1, price: 0, addons: [] }])}>Add Item</button>
                  <button type="button" className="btn-order-audit-trigger" disabled={savingAdjustment || !draftItems.length || draftItems.some((it) => !it.name?.trim() || Number(it.qty) < 1 || Number(it.price) < 0)} onClick={saveOrderChange}>{savingAdjustment ? 'Saving…' : 'Save Order Change'}</button>
                  <button type="button" className="btn-order-audit-trigger" onClick={() => { setDraftItems((selectedOrder.items || []).map((it) => ({ ...it }))); setEditingItems(false); }}>Cancel</button>
                  <span style={{ alignSelf: 'center', color: '#E2B688', fontWeight: 700 }}>New Order Total: ₱{draftItems.reduce((sum, it) => sum + ((Number(it.price) || 0) + (Array.isArray(it.addons) ? it.addons.reduce((addonSum, addon) => addonSum + (Number(addon.price) || 0), 0) : 0)) * (Number(it.qty) || 0), 0).toFixed(2)}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '12px', marginBottom: '14px', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', color: '#E2B688', fontSize: '0.84rem' }}>
              <div>Amount Already Paid<strong style={{ display: 'block', marginTop: '4px' }}>₱{Number(selectedOrder.amountAlreadyPaid || 0).toFixed(2)}</strong></div>
              <div>New Order Total<strong style={{ display: 'block', marginTop: '4px' }}>₱{Number(selectedOrder.total || 0).toFixed(2)}</strong></div>
              <div>Additional Amount to Pay<strong style={{ display: 'block', marginTop: '4px' }}>₱{Math.max(0, Number(selectedOrder.total || 0) - Number(selectedOrder.amountAlreadyPaid || 0)).toFixed(2)}</strong></div>
            </div>
            <div style={{ color: '#E2B688', marginBottom: '12px', fontSize: '0.82rem' }}>Cash payment status: <strong>{String(selectedOrder.paymentStatus || 'unpaid').replaceAll('_', ' ').toUpperCase()}</strong></div>

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
            {selectedOrder.status === 'pending_manager_approval' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px' }}>
                <button type="button" className="btn-staff-action btn-accept" style={{ flex: '1 1 140px', pointerEvents: 'auto' }} disabled={reviewingOrder} onClick={() => handleReviewOrder('approve')}>{reviewingOrder ? 'Saving…' : 'Approve'}</button>
                <button type="button" className="btn-staff-action btn-reject" style={{ flex: '1 1 140px', pointerEvents: 'auto' }} disabled={reviewingOrder} onClick={() => handleReviewOrder('reject')}>{reviewingOrder ? 'Saving…' : 'Reject'}</button>
              </div>
            )}
            {orderReviewError && <p role="alert" aria-live="assertive" style={{ margin: '10px 0 0', color: '#ffb4a8', fontSize: '0.84rem' }}>{orderReviewError}</p>}
            {selectedOrder.status !== 'cancelled' && (
              <button type="button" className="btn-staff-action btn-reject" style={{ width: '100%', marginTop: '8px', pointerEvents: 'auto' }} disabled={reviewingOrder} onClick={() => handleReviewOrder('cancel')}>
                {reviewingOrder ? 'Saving…' : 'Cancel Order'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
