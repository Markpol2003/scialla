import React from 'react';
import { useApp } from '../../context/AppContext';

// Helper to check if an order timestamp is today in Asia/Manila timezone
function isTodayInManila(dateInput) {
  if (!dateInput) return true;
  try {
    const orderDate = new Date(dateInput).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    const todayManila = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    return orderDate === todayManila;
  } catch {
    return true;
  }
}

export default function Sales() {
  const { topProducts, monthlySalesData, orders } = useApp();

  const maxRevenue = Math.max(...monthlySalesData.map((d) => d.revenue));

  // Single consistent set of today's completed orders
  const completedOrdersList = orders.filter((o) => {
    if (o.status !== 'completed') return false;
    const dateVal = o.completed_at || o.createdAt || o.timestamp || o.created_at;
    return isTodayInManila(dateVal);
  });

  const activeOrdersList = orders.filter((o) => {
    if (o.status !== 'new' && o.status !== 'preparing' && o.status !== 'ready') return false;
    const dateVal = o.createdAt || o.timestamp || o.created_at;
    return isTodayInManila(dateVal);
  });

  // Daily Revenue Total = Sum of completed orders revenue ONLY
  const dailyRevenue = completedOrdersList.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

  // Avg Ticket = Today's completed order revenue / Today's completed order count
  const completedCount = completedOrdersList.length;
  const avgTicket = completedCount > 0 ? (dailyRevenue / completedCount).toFixed(2) : '0.00';

  return (
    <div className="sales-tab-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Monthly Overview */}
      <div className="manager-box monthly-summary-header-box">
        <div className="box-header">
          <div>
            <h2>2026 Monthly Revenue</h2>
          </div>
          <span className="box-tag">2026 Fiscal Year</span>
        </div>

        {/* Monthly Bar Chart */}
        <div className="chart-bars-container monthly-chart-bars" style={{ height: '220px', marginTop: '10px' }}>
          {monthlySalesData.map((d) => {
            const hPct = Math.round((d.revenue / maxRevenue) * 100);
            return (
              <div key={d.month} className={`chart-bar-group ${d.isCurrent ? 'current-month-bar' : ''}`}>
                <span className="chart-val-label">₱{(d.revenue / 1000).toFixed(0)}k</span>
                <div className="chart-bar-outer">
                  <div
                    className="chart-bar-inner"
                    style={{ height: `${hPct}%` }}
                  ></div>
                </div>
                <span className="chart-day-label">{d.month}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="manager-two-columns">
        {/* Daily Completed Orders & Sales Summary */}
        <div className="manager-box sales-chart-box">
          <div className="box-header">
            <h2>Daily Completed Orders</h2>
            <span className="box-tag">Today</span>
          </div>

          <div style={{ padding: '10px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201, 139, 91, 0.25)', borderRadius: '10px', padding: '14px' }}>
                <span style={{ fontSize: '0.74rem', color: '#D4C3B3', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Today's Fulfilled</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#4ade80', marginTop: '4px' }}>
                  {completedOrdersList.length}
                </div>
                <span style={{ fontSize: '0.72rem', color: '#A08070' }}>Completed guest orders</span>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201, 139, 91, 0.25)', borderRadius: '10px', padding: '14px' }}>
                <span style={{ fontSize: '0.74rem', color: '#D4C3B3', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active In Kitchen</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#E2B688', marginTop: '4px' }}>
                  {activeOrdersList.length}
                </div>
                <span style={{ fontSize: '0.72rem', color: '#A08070' }}>In-flight orders</span>
              </div>
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(32, 17, 10, 0.7), rgba(20, 10, 6, 0.8))', border: '1px solid rgba(201, 139, 91, 0.25)', borderRadius: '10px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#D4C3B3', textTransform: 'uppercase' }}>Daily Revenue Total</span>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#E2B688', fontFamily: 'var(--font-mono)' }}>
                  ₱{dailyRevenue.toFixed(2)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.74rem', color: '#D4C3B3', textTransform: 'uppercase' }}>Avg Ticket</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>
                  ₱{avgTicket}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="manager-box top-products-box">
          <div className="box-header">
            <h2>Top Selling Items</h2>
            <span className="box-tag">By Volume</span>
          </div>

          <div className="top-products-list">
            {topProducts.map((p, idx) => (
              <div key={idx} className="top-product-item">
                <span className="rank-num">0{idx + 1}</span>
                <div className="product-info-block">
                  <span className="p-name">{p.name}</span>
                  <span className="p-price">₱{p.price.toFixed(2)} unit price</span>
                </div>
                <div className="product-stat-block">
                  <span className="p-count">{p.count} sold</span>
                  <span className="p-total">₱{(p.count * p.price).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
