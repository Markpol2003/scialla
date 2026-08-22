import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import Products from './Products';

export default function ManagerDashboardPage() {
  const {
    todayRevenue,
    todayOrderCount,
    avgOrderValue,
    thisMonthRevenue,
    monthlyTargetRevenue,
    monthlyProgressPercent,
    monthlyOrderCount,
    monthlySalesData,
    topProducts,
    inventory,
    restockInventory,
    staffList,
    orders,
    menuCategories
  } = useApp();

  const [activeTab, setActiveTab] = useState('overview');

  const lowStockItems = inventory.filter((item) => item.stock <= item.minThreshold);

  return (
    <div className="manager-container">
      <header className="manager-header">
        <div className="manager-header-title">
          <h1>SCIALLA MANAGER SUITE</h1>
          <p className="manager-subtitle">Executive Business Insights & Store Operations</p>
        </div>

        <div className="manager-subnav">
          <button
            className={`manager-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Analytics Dashboard
          </button>
          <button
            className={`manager-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            Inventory Control ({lowStockItems.length})
          </button>
          <button
            className={`manager-tab-btn ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            Product Catalog
          </button>
          <button
            className={`manager-tab-btn ${activeTab === 'staff' ? 'active' : ''}`}
            onClick={() => setActiveTab('staff')}
          >
            Staff Roster
          </button>
          <button
            className={`manager-tab-btn ${activeTab === 'api' ? 'active' : ''}`}
            onClick={() => setActiveTab('api')}
          >
            API Inspector
          </button>
        </div>
      </header>

      {activeTab === 'overview' && (
        <div className="manager-content-grid">
          <div className="kpi-cards-row">
            <div className="kpi-card highlight-revenue">
              <span className="kpi-title">TODAY'S REVENUE</span>
              <div className="kpi-main-val">
                ₱{todayRevenue.toLocaleString()}
                <span className="kpi-growth-tag">+14.2% vs yesterday</span>
              </div>
            </div>

            <div className="kpi-card highlight-revenue-monthly">
              <span className="kpi-title">THIS MONTH'S REVENUE</span>
              <div className="kpi-main-val">
                ₱{thisMonthRevenue.toLocaleString()}
                <span className="kpi-growth-tag">+18.6% vs last month</span>
              </div>
              <span className="kpi-sub-tag">
                Target: ₱{monthlyTargetRevenue.toLocaleString()} ({monthlyProgressPercent}% achieved)
              </span>
            </div>

            <div className="kpi-card">
              <span className="kpi-title">MONTHLY ORDERS</span>
              <div className="kpi-main-val">{monthlyOrderCount.toLocaleString()}</div>
              <span className="kpi-sub-tag">Avg ₱{avgOrderValue} per order</span>
            </div>

            <div className="kpi-card">
              <span className="kpi-title">ACTIVE MENU ITEMS</span>
              <div className="kpi-main-val">18</div>
              <span className="kpi-sub-tag">4 Categories</span>
            </div>
          </div>

          <div className="manager-two-columns">
            <div className="manager-box sales-chart-box">
              <div className="box-header">
                <h2>Weekly Revenue Trend (₱)</h2>
                <span className="box-tag">Live POS Stream</span>
              </div>

              <div className="chart-bars-container">
                {weeklySalesData.map((d) => (
                  <div key={d.day} className="chart-bar-group">
                    <span className="chart-val-label">₱{(d.sales / 1000).toFixed(1)}k</span>
                    <div className="chart-bar-outer">
                      <div
                        className="chart-bar-inner"
                        style={{ height: `${d.percent}%` }}
                      ></div>
                    </div>
                    <span className="chart-day-label">{d.day}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="manager-box top-products-box">
              <div className="box-header">
                <h2>Top Performing Beverages</h2>
                <span className="box-tag">Ranked by Volume</span>
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

          <div className="manager-box alerts-box">
            <div className="box-header">
              <h2 className="alert-box-title">⚠ Inventory Warning & Action Required</h2>
              <span className="alert-count-pill">{lowStockItems.length} Low Stock Alert(s)</span>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="alert-ok-message">
                ✓ All inventory items are comfortably above minimum reorder thresholds.
              </div>
            ) : (
              <div className="alerts-grid">
                {lowStockItems.map((inv) => (
                  <div key={inv.id} className="alert-card-item">
                    <div className="alert-info">
                      <strong>⚠ {inv.name}</strong>
                      <p>Only {inv.stock} {inv.unit} remaining (Min: {inv.minThreshold} {inv.unit})</p>
                    </div>

                    <button
                      className="btn-restock-quick"
                      onClick={() => restockInventory(inv.id, inv.unit === 'kg' ? 5.0 : 10)}
                    >
                      + Quick Restock ({inv.unit === 'kg' ? '+5.0 kg' : '+10 units'})
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="manager-inventory-manager">
          <div className="box-header">
            <h2>Complete Warehouse & Bar Inventory</h2>
            <span className="box-tag">Real-time Stock Monitor</span>
          </div>

          <table className="manager-table">
            <thead>
              <tr>
                <th>Ingredient Name</th>
                <th>Category</th>
                <th>Current Stock</th>
                <th>Minimum Threshold</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((inv) => {
                const isLow = inv.stock <= inv.minThreshold;
                return (
                  <tr key={inv.id} className={isLow ? 'row-low-stock' : ''}>
                    <td><strong>{inv.name}</strong></td>
                    <td>{inv.category}</td>
                    <td>
                      <span className="stock-pill">{inv.stock} {inv.unit}</span>
                    </td>
                    <td>{inv.minThreshold} {inv.unit}</td>
                    <td>
                      {isLow ? (
                        <span className="status-badge badge-warning">⚠ LOW STOCK</span>
                      ) : (
                        <span className="status-badge badge-ok">✓ OK</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn-table-action"
                        onClick={() => restockInventory(inv.id, inv.unit === 'kg' ? 5 : 10)}
                      >
                        Restock +{inv.unit === 'kg' ? '5 kg' : '10'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'products' && <Products />}

      {activeTab === 'staff' && (
        <div className="manager-staff-manager">
          <div className="box-header">
            <h2>Café Staff & Barista Roster</h2>
            <span className="box-tag">4 Active Team Members</span>
          </div>

          <div className="staff-roster-grid">
            {staffList.map((member) => (
              <div key={member.id} className="staff-card">
                <div className="staff-avatar">{member.avatar}</div>
                <div className="staff-details">
                  <h3>{member.name}</h3>
                  <p className="staff-role">{member.role}</p>
                  <span className={`staff-status-pill status-${member.status.toLowerCase().replace(' ', '-')}`}>
                    ● {member.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
