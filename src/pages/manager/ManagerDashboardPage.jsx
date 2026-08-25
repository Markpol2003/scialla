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
    staffList,
    orders,
    menuCategories
  } = useApp();

  const [activeTab, setActiveTab] = useState('overview');

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
        </div>
      </header>

      {activeTab === 'overview' && (
        <div className="manager-content-grid">
          <div className="kpi-cards-row">
            <div className="kpi-card highlight-revenue">
              <span className="kpi-title">TODAY'S REVENUE</span>
              <div className="kpi-main-val">₱{todayRevenue.toLocaleString()}</div>
            </div>

            <div className="kpi-card highlight-revenue-monthly">
              <span className="kpi-title">THIS MONTH'S REVENUE</span>
              <div className="kpi-main-val">₱{thisMonthRevenue.toLocaleString()}</div>
            </div>

            <div className="kpi-card">
              <span className="kpi-title">MONTHLY ORDERS</span>
              <div className="kpi-main-val">{monthlyOrderCount.toLocaleString()}</div>
            </div>

            <div className="kpi-card">
              <span className="kpi-title">ACTIVE MENU ITEMS</span>
              <div className="kpi-main-val">18</div>
            </div>
          </div>

          <div className="manager-two-columns">
            <div className="manager-box sales-chart-box">
              <div className="box-header">
                <h2>Weekly Revenue Trend (₱)</h2>
                <span className="box-tag">Live POS Stream</span>
              </div>

              <div className="chart-bars-container">
                {monthlySalesData.slice(0, 7).map((d) => (
                  <div key={d.month} className="chart-bar-group">
                    <span className="chart-val-label">₱{(d.revenue / 1000).toFixed(1)}k</span>
                    <div className="chart-bar-outer">
                      <div
                        className="chart-bar-inner"
                        style={{ height: `${d.percent}%` }}
                      ></div>
                    </div>
                    <span className="chart-day-label">{d.month}</span>
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
