import React from 'react';
import { useApp } from '../../context/AppContext';

export default function Orders() {
  const { orders, updateOrderStatus } = useApp();

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
      // 1. Sort by ISO Date/Timestamp if valid
      const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
      const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
      if (!isNaN(timeA) && !isNaN(timeB) && timeA > 0 && timeB > 0 && timeA !== timeB) {
        return timeA - timeB; // Ascending: oldest first at top
      }

      // 2. Sort by time string (e.g. 08:28 PM vs 08:40 PM)
      if (a.timestamp && b.timestamp) {
        const minsA = parseTimeStr(a.timestamp);
        const minsB = parseTimeStr(b.timestamp);
        if (minsA !== minsB && minsA > 0 && minsB > 0) {
          return minsA - minsB; // Ascending: earliest time first at top
        }
      }

      return 0;
    });
  };

  const newOrders = sortByOldestFirst(orders.filter((o) => o.status === 'new'));
  const preparingOrders = sortByOldestFirst(orders.filter((o) => o.status === 'preparing'));
  const readyOrders = sortByOldestFirst(orders.filter((o) => o.status === 'ready'));

  const consolidateItems = (items = []) => {
    let list = items;
    if (typeof list === 'string') {
      try {
        list = JSON.parse(list);
      } catch {
        list = list.split(',').map((s) => s.trim()).filter(Boolean);
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
          price: 0
        });
        return;
      }

      const rawName = item.rawName || item.name || item.product_name || item.productName || item.item_name || item.title || item.item || 'Item';
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
                  {renderItemList(ord.items, ord.total)}
                </div>

                <div className="card-footer-bar">
                  <div className="order-payment-tag">
                    Paid: <strong>₱{parseFloat(ord.total || 0).toFixed(2)}</strong> ({ord.paymentMethod || 'Paid'})
                  </div>
                  <div className="card-actions-row">
                    <button
                      type="button"
                      className="btn-staff-action btn-accept"
                      onClick={() => updateOrderStatus(ord.id, 'preparing')}
                    >
                      ACCEPT ORDER
                    </button>
                    <button
                      type="button"
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
                  {renderItemList(ord.items, ord.total)}
                </div>

                <div className="card-footer-bar">
                  <button
                    type="button"
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
                  {renderItemList(ord.items, ord.total)}
                </div>

                <div className="card-footer-bar">
                  <button
                    type="button"
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
