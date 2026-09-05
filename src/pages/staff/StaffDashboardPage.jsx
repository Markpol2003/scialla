import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export default function StaffDashboardPage() {
  const {
    orders,
    updateOrderStatus,
    menuCategories,
    toggleItemStock,
    todayRevenue,
    todayOrderCount
  } = useApp();

  const [activeTab, setActiveTab] = useState('orders');

  const parseTimeStr = (str) => {
    if (!str) return 0;
    const match = String(str).match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (match) {
      let hrs = parseInt(match[1], 10);
      const mins = parseInt(match[2], 10);
      const meridiem = (match[3] || '').toUpperCase();
      if (meridiem === 'PM' && hrs < 12) hrs += 12;
      if (meridiem === 'AM' && hrs === 12) hrs = 0;
      return hrs * 60 + mins;
    }
    return 0;
  };

  const sortByOldestFirst = (list) => {
    return [...list].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
      const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
      if (!isNaN(timeA) && !isNaN(timeB) && timeA > 0 && timeB > 0 && timeA !== timeB) {
        return timeA - timeB;
      }
      if (a.timestamp && b.timestamp) {
        const minsA = parseTimeStr(a.timestamp);
        const minsB = parseTimeStr(b.timestamp);
        if (minsA !== minsB && minsA > 0 && minsB > 0) {
          return minsA - minsB;
        }
      }
      return 0;
    });
  };

  const newOrders = sortByOldestFirst(orders.filter((o) => o.status === 'new'));
  const preparingOrders = sortByOldestFirst(orders.filter((o) => o.status === 'preparing'));
  const readyOrders = sortByOldestFirst(orders.filter((o) => o.status === 'ready'));
  const completedOrders = orders.filter((o) => o.status === 'completed' || o.status === 'cancelled');

  const consolidateItems = (items = []) => {
    let list = items;
    if (typeof list === 'string') {
      try {
        const parsed = JSON.parse(list);
        list = parsed;
      } catch {
        list = list.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    if (list && typeof list === 'object' && !Array.isArray(list)) {
      if (Array.isArray(list.items)) {
        list = list.items;
      } else if (Array.isArray(list.order_items)) {
        list = list.order_items;
      } else if (Array.isArray(list.products)) {
        list = list.products;
      } else {
        list = Object.values(list).filter(Boolean);
      }
    }
    if (!Array.isArray(list)) {
      list = [];
    }

    const result = [];
    list.forEach((item, idx) => {
      if (!item) return;

      if (typeof item === 'string') {
        const qtyMatch = item.match(/^(\d+)x\s*/i);
        const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
        const clean = item.replace(/^\d+x\s*/i, '').trim();
        const sizeMatch = clean.match(/\(([^)]+)\)/);
        const size = sizeMatch ? sizeMatch[1] : '';
        const nameOnly = clean.replace(/\s*\([^)]+\)/g, '').trim() || clean;
        result.push({
          id: `str-${idx}`,
          name: nameOnly,
          displayName: nameOnly,
          size,
          qty,
          price: 0,
          addons: []
        });
        return;
      }

      const rawName = item.rawName || item.displayName || item.name || item.product_name || item.productName || item.item_name || item.title || item.item || item.label || 'Item';
      const sizeVal = item.size || item.selectedSize || (typeof rawName === 'string' && rawName.match(/\(([^)]+)\)/) ? rawName.match(/\(([^)]+)\)/)[1] : '');
      const nameOnly = typeof rawName === 'string'
        ? rawName.replace(/^\d+x\s*/i, '').replace(/\s*\([^)]+\)/g, '').trim() || rawName
        : 'Item';
      const itemQty = parseInt(item.qty || item.quantity || item.count || 1, 10) || 1;
      const itemPrice = parseFloat(item.price || 0) || 0;

      result.push({
        ...item,
        name: nameOnly,
        displayName: nameOnly,
        size: sizeVal,
        qty: itemQty,
        price: itemPrice
      });
    });

    const map = new Map();
    result.forEach((it) => {
      const key = `${it.displayName}-${it.size}-${it.price}`;
      if (map.has(key)) {
        const existing = map.get(key);
        map.set(key, { ...existing, qty: existing.qty + it.qty });
      } else {
        map.set(key, it);
      }
    });

    return Array.from(map.values());
  };

  const renderItemList = (items, orderTotal) => {
    const list = consolidateItems(items);
    if (list.length === 0) {
      return (
        <div style={{ color: '#E2B688', fontStyle: 'italic', fontSize: '0.86rem', padding: '4px 0' }}>
          ☕ 1× Customer Order Items (₱{parseFloat(orderTotal || 0).toFixed(2)})
        </div>
      );
    }

    return list.map((item, idx) => (
      <div key={idx} className="staff-item-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', margin: '5px 0', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="item-qty-badge" style={{ color: '#E2B688', fontWeight: 900, fontSize: '0.95rem' }}>
              {item.qty}×
            </span>
            <span className="item-name" style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '0.94rem' }}>
              {item.displayName || item.name}
            </span>
          </div>
          {item.price > 0 && (
            <span className="item-line-price" style={{ color: '#E2B688', fontWeight: 700, fontSize: '0.86rem', fontFamily: 'var(--font-mono, monospace)' }}>
              ₱{(parseFloat(item.price) * item.qty).toFixed(2)}
            </span>
          )}
        </div>
        {item.size && (
          <span className="item-size-badge" style={{ color: '#D4A373', fontSize: '0.78rem', fontWeight: 700, marginLeft: '26px', marginTop: '2px' }}>
            {item.size}
          </span>
        )}
      </div>
    ));
  };

  return (
    <div className="staff-container">
      <header className="staff-header">
        <div className="staff-header-title">
          <h1>SCIALLA STAFF DASHBOARD</h1>
          <p className="staff-subtitle">Live Kitchen & Barista Queue Management</p>
        </div>

        <div className="staff-summary-cards">
          <div className="staff-stat-card">
            <span className="stat-label">TODAY'S REVENUE</span>
            <span className="stat-value">₱{todayRevenue.toLocaleString()}</span>
          </div>
          <div className="staff-stat-card">
            <span className="stat-label">TOTAL ORDERS</span>
            <span className="stat-value">{todayOrderCount}</span>
          </div>
          <div className="staff-stat-card highlight">
            <span className="stat-label">PENDING QUEUE</span>
            <span className="stat-value">{newOrders.length + preparingOrders.length}</span>
          </div>
        </div>
      </header>

      <div className="staff-subnav">
        <button
          className={`staff-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          📋 Live Order Board ({newOrders.length + preparingOrders.length})
        </button>
        <button
          className={`staff-tab-btn ${activeTab === 'menu' ? 'active' : ''}`}
          onClick={() => setActiveTab('menu')}
        >
          ☕ Menu Availability
        </button>
        <button
          className={`staff-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          🧾 Shift History
        </button>
      </div>

      {activeTab === 'orders' && (
        <div className="orders-board-grid">
          <div className="order-column column-new">
            <div className="column-header">
              <h2 className="column-title">
                <span className="status-dot dot-new"></span> NEW ORDERS
              </h2>
              <span className="column-count-badge">{newOrders.length}</span>
            </div>

            <div className="column-body">
              {newOrders.length === 0 ? (
                <div className="column-empty">
                  <p>No new orders</p>
                  <span className="empty-sub">Waiting for customer checkouts...</span>
                </div>
              ) : (
                newOrders.map((ord) => (
                  <div key={ord.id} className="staff-order-card card-new">
                    <div className="card-header-bar">
                      <span className="order-id-pill">#{ord.id}</span>
                      <span className="order-table-tag">{ord.table}</span>
                      <span className="order-time-tag">{ord.timestamp}</span>
                    </div>

                    <div className="card-items-list">
                      {renderItemList(ord.items, ord.total)}
                    </div>

                    <div className="card-footer-bar">
                      <div className="order-payment-tag">
                        Total: <strong>₱{ord.total.toFixed(2)}</strong>{ord.paymentMethod && <> ({ord.paymentMethod})</>}
                      </div>
                      <div className="card-actions-row">
                        <button
                          className="btn-staff-action btn-accept"
                          onClick={() => updateOrderStatus(ord.id, 'preparing')}
                        >
                          ✓ ACCEPT ORDER
                        </button>
                        <button
                          className="btn-staff-action btn-reject"
                          onClick={() => updateOrderStatus(ord.id, 'cancelled')}
                        >
                          ✕ REJECT
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="order-column column-preparing">
            <div className="column-header">
              <h2 className="column-title">
                <span className="status-dot dot-prep"></span> PREPARING IN KITCHEN
              </h2>
              <span className="column-count-badge">{preparingOrders.length}</span>
            </div>

            <div className="column-body">
              {preparingOrders.length === 0 ? (
                <div className="column-empty">
                  <p>Kitchen idle</p>
                  <span className="empty-sub">Accept new orders to start crafting</span>
                </div>
              ) : (
                preparingOrders.map((ord) => (
                  <div key={ord.id} className="staff-order-card card-preparing">
                    <div className="card-header-bar">
                      <span className="order-id-pill">#{ord.id}</span>
                      <span className="order-table-tag">{ord.table}</span>
                      <span className="order-time-tag">{ord.timestamp}</span>
                    </div>

                    <div className="card-items-list">
                      {renderItemList(ord.items, ord.total)}
                    </div>

                    <div className="card-footer-bar">
                      <button
                        className="btn-staff-action btn-ready"
                        onClick={() => updateOrderStatus(ord.id, 'ready')}
                      >
                        ✨ MARK AS READY
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="order-column column-ready">
            <div className="column-header">
              <h2 className="column-title">
                <span className="status-dot dot-ready"></span> READY TO SERVE
              </h2>
              <span className="column-count-badge">{readyOrders.length}</span>
            </div>

            <div className="column-body">
              {readyOrders.length === 0 ? (
                <div className="column-empty">
                  <p>No orders ready</p>
                </div>
              ) : (
                readyOrders.map((ord) => (
                  <div key={ord.id} className="staff-order-card card-ready">
                    <div className="card-header-bar">
                      <span className="order-id-pill">#{ord.id}</span>
                      <span className="order-table-tag">{ord.table}</span>
                    </div>

                    <div className="card-items-list">
                      {renderItemList(ord.items, ord.total)}
                    </div>

                    <div className="card-footer-bar">
                      <button
                        className="btn-staff-action btn-complete"
                        onClick={() => updateOrderStatus(ord.id, 'completed')}
                      >
                        ✓ DELIVERED & COMPLETE
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'menu' && (
        <div className="staff-menu-manage-section">
          <p className="section-help-text">
            Toggle menu item availability in real-time. Out of stock items cannot be ordered by customers.
          </p>

          <div className="menu-toggle-grid">
            {menuCategories.map((cat) => (
              <div key={cat.id} className="menu-cat-card">
                <h3 className="cat-title">{cat.category}</h3>
                <div className="cat-items-list">
                  {cat.items.map((item) => (
                    <div key={item.id} className="menu-toggle-row">
                      <div className="item-details">
                        <span className="item-name-str">{item.name}</span>
                        <span className="item-price-str">₱{item.price.toFixed(2)}</span>
                      </div>

                      <button
                        type="button"
                        className={`toggle-stock-btn ${item.inStock ? 'in-stock' : 'out-of-stock'}`}
                        onClick={() => toggleItemStock(item.id)}
                      >
                        {item.inStock ? '✓ IN STOCK' : '✕ SOLD OUT'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="staff-history-section">
          <h2 className="section-heading">Completed Orders Log</h2>
          <table className="staff-history-table">
            <thead>
              <tr>
                <th>Order Ref</th>
                <th>Destination</th>
                <th>Time</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {completedOrders.map((ord) => (
                <tr key={ord.id}>
                  <td><strong>#{ord.id}</strong></td>
                  <td>{ord.table}</td>
                  <td>{ord.timestamp}</td>
                  <td>{ord.items.map((i) => `${i.qty || i.quantity || 1}x ${i.name || i.product_name || i.item_name || 'Item'}`).join(', ')}</td>
                  <td>₱{ord.total.toFixed(2)}</td>
                  <td>
                    <span className={`history-status-pill status-${ord.status}`}>
                      {ord.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
