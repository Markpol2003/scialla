import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export default function Orders() {
  const { orders, updateOrderStatus, currentUser } = useApp();
  const [activeTab, setActiveTab] = useState('board'); // 'board' | 'completed'
  const [completedSort, setCompletedSort] = useState('newest'); // 'newest' | 'oldest' | 'highest' | 'lowest'
  const [searchQuery, setSearchQuery] = useState('');

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
  const activeCount = newOrders.length + preparingOrders.length + readyOrders.length;

  const rawCompletedOrders = orders.filter((o) => o.status === 'completed');

  // Filter and sort completed orders
  const filteredCompletedOrders = rawCompletedOrders
    .filter((ord) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        String(ord.id || '').toLowerCase().includes(q) ||
        String(ord.table || '').toLowerCase().includes(q) ||
        String(ord.accepted_by_name || '').toLowerCase().includes(q) ||
        String(ord.completed_by_name || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (completedSort === 'newest') {
        const timeA = new Date(a.completed_at || a.updatedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.completed_at || b.updatedAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      }
      if (completedSort === 'oldest') {
        const timeA = new Date(a.completed_at || a.updatedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.completed_at || b.updatedAt || b.createdAt || 0).getTime();
        return timeA - timeB;
      }
      if (completedSort === 'highest') {
        return (b.total || 0) - (a.total || 0);
      }
      if (completedSort === 'lowest') {
        return (a.total || 0) - (b.total || 0);
      }
      return 0;
    });

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
        price: itemPrice,
        addons: Array.isArray(item.addons) ? item.addons : []
      });
    });

    const map = new Map();
    result.forEach((it) => {
      let addonList = it.addons || [];
      if (typeof addonList === 'string') {
        try { addonList = JSON.parse(addonList); } catch {}
      }
      const addonKey = Array.isArray(addonList) ? addonList.map((a) => a.id || a.name).sort().join('_') : '';
      const key = `${it.displayName}-${it.size}-${it.price}-${addonKey}`;
      if (map.has(key)) {
        const existing = map.get(key);
        map.set(key, { ...existing, qty: existing.qty + it.qty });
      } else {
        map.set(key, { ...it, addons: Array.isArray(addonList) ? addonList : [] });
      }
    });

    return Array.from(map.values());
  };

  const renderItemList = (items, orderTotal) => {
    const list = consolidateItems(items);
    if (list.length === 0) {
      return (
        <div style={{ color: '#E2B688', fontStyle: 'italic', fontSize: '0.86rem', padding: '4px 0' }}>
          1× Customer Order Items (₱{parseFloat(orderTotal || 0).toFixed(2)})
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
        {Array.isArray(item.addons) && item.addons.length > 0 && (
          <div style={{ marginLeft: '26px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
            <span style={{ fontSize: '0.74rem', color: '#A08070', fontWeight: 600 }}>Add-ons:</span>
            {item.addons.map((a, aIdx) => (
              <span key={a.id || aIdx} style={{ fontSize: '0.74rem', color: '#E2B688', fontWeight: 600, paddingLeft: '4px' }}>
                • {a.name}
              </span>
            ))}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="staff-orders-container" style={{ width: '100%' }}>
      {/* Top View Switcher Navigation */}
      <div
        className="staff-orders-nav"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
          padding: '12px 18px',
          background: 'linear-gradient(135deg, rgba(32, 17, 10, 0.8), rgba(20, 10, 6, 0.9))',
          borderRadius: '14px',
          border: '1px solid rgba(201, 139, 91, 0.25)'
        }}
      >
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('board')}
            style={{
              padding: '9px 18px',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              border: activeTab === 'board' ? '1px solid #C98B5B' : '1px solid rgba(255,255,255,0.1)',
              background: activeTab === 'board' ? 'linear-gradient(135deg, #C98B5B, #8B4513)' : 'rgba(0,0,0,0.3)',
              color: activeTab === 'board' ? '#FFFFFF' : '#D4C3B3'
            }}
          >
            ACTIVE KITCHEN BOARD
            <span
              style={{
                background: activeTab === 'board' ? '#1A0C06' : 'rgba(201, 139, 91, 0.3)',
                color: '#E2B688',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.78rem'
              }}
            >
              {activeCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            style={{
              padding: '9px 18px',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              border: activeTab === 'completed' ? '1px solid #C98B5B' : '1px solid rgba(255,255,255,0.1)',
              background: activeTab === 'completed' ? 'linear-gradient(135deg, #C98B5B, #8B4513)' : 'rgba(0,0,0,0.3)',
              color: activeTab === 'completed' ? '#FFFFFF' : '#D4C3B3'
            }}
          >
            COMPLETED ORDERS
            <span
              style={{
                background: activeTab === 'completed' ? '#1A0C06' : 'rgba(201, 139, 91, 0.3)',
                color: '#E2B688',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.78rem'
              }}
            >
              {rawCompletedOrders.length}
            </span>
          </button>
        </div>

        {activeTab === 'completed' && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search table, ID or staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(201, 139, 91, 0.3)',
                borderRadius: '8px',
                padding: '7px 12px',
                color: '#FFFFFF',
                fontSize: '0.84rem'
              }}
            />
            <select
              value={completedSort}
              onChange={(e) => setCompletedSort(e.target.value)}
              style={{
                background: '#1A0C06',
                border: '1px solid rgba(201, 139, 91, 0.4)',
                borderRadius: '8px',
                padding: '7px 12px',
                color: '#E2B688',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <option value="newest">Newest Completed First</option>
              <option value="oldest">Oldest Completed First</option>
              <option value="highest">Highest Total First</option>
              <option value="lowest">Lowest Total First</option>
            </select>
          </div>
        )}
      </div>

      {activeTab === 'board' ? (
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

                    {ord.accepted_by_name && (
                      <div
                        style={{
                          margin: '4px 0 8px',
                          padding: '4px 10px',
                          background: 'rgba(201, 139, 91, 0.15)',
                          borderLeft: '3px solid #C98B5B',
                          borderRadius: '4px',
                          fontSize: '0.78rem',
                          color: '#E2B688',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>Accepted by: <strong>{ord.accepted_by_name}</strong></span>
                      </div>
                    )}

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

                    {ord.accepted_by_name && (
                      <div
                        style={{
                          margin: '4px 0 8px',
                          padding: '4px 10px',
                          background: 'rgba(34, 197, 94, 0.12)',
                          borderLeft: '3px solid #22c55e',
                          borderRadius: '4px',
                          fontSize: '0.78rem',
                          color: '#86efac',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>Crafted by: <strong>{ord.accepted_by_name}</strong></span>
                      </div>
                    )}

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
      ) : (
        /* COMPLETED ORDERS VIEW */
        <div className="completed-orders-container" style={{ width: '100%' }}>
          {filteredCompletedOrders.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: 'rgba(25, 12, 7, 0.6)',
                borderRadius: '16px',
                border: '1px dashed rgba(201, 139, 91, 0.3)',
                color: '#D4C3B3'
              }}
            >
              <h3 style={{ margin: '0 0 6px', color: '#E2B688' }}>No completed orders found</h3>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>Completed guest orders will appear here for reference and audit.</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '16px'
              }}
            >
              {filteredCompletedOrders.map((ord) => (
                <div
                  key={ord.id}
                  style={{
                    background: 'linear-gradient(145deg, #1C0E08, #140A05)',
                    border: '1px solid rgba(201, 139, 91, 0.3)',
                    borderRadius: '14px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ background: '#2D160C', color: '#E2B688', padding: '3px 9px', borderRadius: '6px', fontWeight: 800, fontSize: '0.85rem' }}>
                          #{ord.id}
                        </span>
                        <span style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '0.88rem' }}>{ord.table}</span>
                      </div>
                      <span style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
                        COMPLETED
                      </span>
                    </div>

                    {/* Staff Handlers Audit Trail */}
                    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '8px 10px', marginBottom: '12px', fontSize: '0.76rem', color: '#D4C3B3', lineHeight: '1.4' }}>
                      <div>
                        <strong>Accepted by:</strong> {ord.accepted_by_name || '—'} {ord.accepted_at ? `at ${new Date(ord.accepted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                      </div>
                      <div style={{ marginTop: '3px' }}>
                        <strong>Completed by:</strong> {ord.completed_by_name || '—'} {ord.completed_at ? `at ${new Date(ord.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(201, 139, 91, 0.15)', paddingTop: '8px', marginBottom: '12px' }}>
                      {renderItemList(ord.items, ord.total)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed rgba(201, 139, 91, 0.25)', paddingTop: '10px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#D4A373' }}>
                      {ord.paymentMethod || 'Cash'}
                    </span>
                    <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#E2B688', fontFamily: 'var(--font-mono, monospace)' }}>
                      ₱{parseFloat(ord.total || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
