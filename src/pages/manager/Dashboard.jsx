import React from 'react';
import { useApp } from '../../context/AppContext';

export default function Dashboard() {
  const { todayRevenue, todayOrderCount, avgOrderValue, inventory, orders } = useApp();
  const lowStockItems = inventory.filter((i) => i.stock <= i.minThreshold);
  const recentOrders = orders.slice(0, 5);

  return (
    <div className="manager-dashboard-overview">
      {/* Executive KPI Stats Row */}
      <div className="kpi-cards-row">
        <div className="kpi-card highlight-revenue">
          <span className="kpi-title">TODAY'S REVENUE</span>
          <div className="kpi-main-val">
            ₱{todayRevenue.toLocaleString()}
            <span className="kpi-growth-tag">+14.2% vs yesterday</span>
          </div>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">TOTAL ORDERS</span>
          <div className="kpi-main-val">{todayOrderCount}</div>
          <span className="kpi-sub-tag">96 Unique Customers</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">AVERAGE TICKET</span>
          <div className="kpi-main-val">₱{avgOrderValue}</div>
          <span className="kpi-sub-tag">Per customer transaction</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">LOW STOCK ALERTS</span>
          <div className="kpi-main-val" style={{ color: lowStockItems.length > 0 ? '#ef4444' : '#10b981' }}>
            {lowStockItems.length}
          </div>
          <span className="kpi-sub-tag">Ingredients below threshold</span>
        </div>
      </div>

      {/* Recent Activity Log & Low Stock Table */}
      <div className="manager-two-columns">
        <div className="manager-box">
          <div className="box-header">
            <h2>Recent Store Orders</h2>
            <span className="box-tag">Live Stream</span>
          </div>

          <table className="manager-table">
            <thead>
              <tr>
                <th>Order Ref</th>
                <th>Destination</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((ord) => (
                <tr key={ord.id}>
                  <td><strong>#{ord.id}</strong></td>
                  <td>{ord.table}</td>
                  <td>₱{ord.total.toFixed(2)}</td>
                  <td>
                    <span className={`status-badge badge-${ord.status === 'completed' ? 'ok' : 'warning'}`}>
                      {ord.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="manager-box">
          <div className="box-header">
            <h2>Inventory Stock Warnings</h2>
            <span className="box-tag">{lowStockItems.length} Alerts</span>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="alert-ok-message">
              All inventory ingredients are comfortably above minimum reorder thresholds.
            </div>
          ) : (
            <div className="alerts-grid">
              {lowStockItems.map((inv) => (
                <div key={inv.id} className="alert-card-item">
                  <div className="alert-info">
                    <strong>{inv.name}</strong>
                    <p>Only {inv.stock} {inv.unit} remaining (Min: {inv.minThreshold} {inv.unit})</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
