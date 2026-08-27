import React from 'react';
import { useApp } from '../../context/AppContext';

export default function Orders() {
  const { orders, updateOrderStatus } = useApp();

  const newOrders = orders.filter((o) => o.status === 'new');
  const preparingOrders = orders.filter((o) => o.status === 'preparing');
  const readyOrders = orders.filter((o) => o.status === 'ready');

  const consolidateItems = (items = []) => {
    const map = new Map();
    items.forEach((item) => {
      const rawName = item.name || item.product_name || item.productName || item.item_name || 'Item';
      const cleanName = rawName.replace(/^\d+x\s*/i, '').replace(/\s*\([\d\s\w]+\)\s*/i, '').trim() || rawName;
      const sizeVal = item.size || (rawName.match(/\(([^)]+)\)/) ? rawName.match(/\(([^)]+)\)/)[1] : '');
      const itemQty = item.qty || item.quantity || 1;
      const key = `${item.id || item.item_id || cleanName}-${sizeVal}-${item.price}`;
      if (map.has(key)) {
        const existing = map.get(key);
        map.set(key, { ...existing, qty: existing.qty + itemQty });
      } else {
        map.set(key, { ...item, name: rawName, cleanName, size: sizeVal, qty: itemQty });
      }
    });
    return Array.from(map.values());
  };

  return (
    <div className="orders-board-grid">
      {/* COLUMN 1: NEW ORDERS */}
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
                      ACCEPT ORDER
                    </button>
                    <button
                      className="btn-staff-action btn-reject"
                      onClick={() => updateOrderStatus(ord.id, 'cancelled')}
                    >
                      REJECT
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* COLUMN 2: PREPARING */}
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
                    MARK AS READY
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* COLUMN 3: READY TO SERVE */}
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
                    DELIVERED & COMPLETE
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
