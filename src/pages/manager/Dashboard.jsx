import React from 'react';
import { useApp } from '../../context/AppContext';

export default function Dashboard() {
  const {
    todayRevenue,
    todayOrderCount,
    avgOrderValue,
    monthlySalesData,
    orders
  } = useApp();

  const recentOrders = orders.slice(0, 8);

  return (
    <div className="manager-dashboard-overview">
      {/* KPI Cards Row */}
      <div className="kpi-cards-row">
        <div className="kpi-card highlight-revenue">
          <span className="kpi-title">TODAY'S SALES</span>
          <div className="kpi-main-val">₱{todayRevenue.toLocaleString()}</div>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">DAILY COMPLETED ORDERS</span>
          <div className="kpi-main-val">{todayOrderCount.toLocaleString()}</div>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">AVERAGE ORDER VALUE</span>
          <div className="kpi-main-val">₱{avgOrderValue}</div>
        </div>
      </div>

      {/* SALES BREAKDOWN & RECENT ORDERS */}
      <div className="manager-two-columns">
        {/* Monthly Sales Breakdown Table */}
        <div className="manager-box">
          <div className="box-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2>Monthly Breakdown</h2>
            <span className="box-tag">2026</span>
          </div>

          <div className="table-scroll-container">
            <table className="manager-table min-w-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Orders</th>
                  <th>Sales</th>
                  <th>Avg Order</th>
                  <th>Growth</th>
                </tr>
              </thead>
              <tbody>
                {monthlySalesData.slice().reverse().map((m) => (
                  <tr key={m.month} className={m.isCurrent ? 'row-current-month' : ''}>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <strong>{m.month}</strong>
                        {m.isCurrent && (
                          <span className="current-badge" style={{ marginLeft: '6px', padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 'bold', background: 'rgba(59, 130, 246, 0.25)', color: '#60a5fa' }}>
                            Current
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{m.orders.toLocaleString()}</td>
                    <td><strong style={{ color: 'var(--color-gold)' }}>₱{m.revenue.toLocaleString()}</strong></td>
                    <td>₱{m.avgTicket.toFixed(2)}</td>
                    <td>
                      <span className="growth-pill-ok">{m.growth}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Store Orders */}
        <div className="manager-box">
          <div className="box-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2>Recent Store Orders</h2>
            <span className="box-tag">Live Queue</span>
          </div>

          <div className="table-scroll-container">
            <table className="manager-table min-w-table">
              <thead>
                <tr>
                  <th>Order Ref</th>
                  <th>Destination</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Completed By</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#D4C3B3' }}>
                      No recent orders.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((ord) => (
                    <tr key={ord.id}>
                      <td><strong>#{ord.id}</strong></td>
                      <td>{ord.table}</td>
                      <td>₱{parseFloat(ord.total || 0).toFixed(2)}</td>
                      <td>
                        <span className={`status-badge badge-${ord.status === 'completed' ? 'ok' : 'warning'}`}>
                          {ord.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {ord.status === 'completed' ? (
                          <span style={{ color: '#86efac', fontWeight: 600 }}>
                            {ord.completed_by_name || '—'}
                          </span>
                        ) : (
                          <span style={{ color: '#8C7B70' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
