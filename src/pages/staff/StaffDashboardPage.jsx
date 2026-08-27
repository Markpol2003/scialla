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

  const newOrders = orders.filter((o) => o.status === 'new');
  const preparingOrders = orders.filter((o) => o.status === 'preparing');
  const readyOrders = orders.filter((o) => o.status === 'ready');
  const completedOrders = orders.filter((o) => o.status === 'completed' || o.status === 'cancelled');

  const consolidateItems = (items = []) => {
    let list = items;
    if (typeof list === 'string') {
      try {
        list = JSON.parse(list);
      } catch {
        list = [];
      }
    }
    if (!Array.isArray(list)) {
      list = [];
    }

    const map = new Map();
    list.forEach((item) => {
      if (!item) return;
      const rawName = item.rawName || item.name || item.product_name || item.productName || item.item_name || item.title || 'Item';
      const cleanName = typeof rawName === 'string'
        ? rawName.replace(/^\d+x\s*/i, '').replace(/\s*\([\d\s\w]+\)\s*/i, '').trim() || rawName
        : 'Item';
      const sizeVal = item.size || item.selectedSize || (typeof rawName === 'string' && rawName.match(/\(([^)]+)\)/) ? rawName.match(/\(([^)]+)\)/)[1] : '');
      const itemQty = parseInt(item.qty || item.quantity || 1, 10) || 1;
      const itemPrice = parseFloat(item.price || 0) || 0;
      const key = `${item.id || item.item_id || cleanName}-${sizeVal}-${itemPrice}`;

      if (map.has(key)) {
        const existing = map.get(key);
        map.set(key, { ...existing, qty: existing.qty + itemQty });
      } else {
        map.set(key, { ...item, name: rawName, cleanName, size: sizeVal, qty: itemQty, price: itemPrice });
      }
    });
    return Array.from(map.values());
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
                      {consolidateItems(ord.items).map((item, idx) => (
                        <div key={idx} className="staff-item-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', margin: '4px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className="item-qty-badge">{item.qty}×</span>
                              <span className="item-name" style={{ fontWeight: 'bold' }}>{item.cleanName || item.name}</span>
                            </div>
                            <span className="item-line-price">₱{(item.price * item.qty).toFixed(2)}</span>
                          </div>
                          {item.size && (
                            <span className="item-size-badge" style={{ fontSize: '0.78rem', color: '#C98B5B', fontWeight: 'bold', marginLeft: '28px', marginTop: '1px' }}>
                              {item.size}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="card-footer-bar">
                      <div className="order-payment-tag">
                        Paid: <strong>₱{ord.total.toFixed(2)}</strong> ({ord.paymentMethod})
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
                      {consolidateItems(ord.items).map((item, idx) => (
                        <div key={idx} className="staff-item-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', margin: '4px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className="item-qty-badge">{item.qty}×</span>
                              <span className="item-name" style={{ fontWeight: 'bold' }}>{item.cleanName || item.name}</span>
                            </div>
                            <span className="item-line-price">₱{(item.price * item.qty).toFixed(2)}</span>
                          </div>
                          {item.size && (
                            <span className="item-size-badge" style={{ fontSize: '0.78rem', color: '#C98B5B', fontWeight: 'bold', marginLeft: '28px', marginTop: '1px' }}>
                              {item.size}
                            </span>
                          )}
                        </div>
                      ))}
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
                      {consolidateItems(ord.items).map((item, idx) => (
                        <div key={idx} className="staff-item-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', margin: '4px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="item-qty-badge">{item.qty}×</span>
                            <span className="item-name" style={{ fontWeight: 'bold' }}>{item.cleanName || item.name}</span>
                          </div>
                          {item.size && (
                            <span className="item-size-badge" style={{ fontSize: '0.78rem', color: '#C98B5B', fontWeight: 'bold', marginLeft: '28px', marginTop: '1px' }}>
                              {item.size}
                            </span>
                          )}
                        </div>
                      ))}
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
