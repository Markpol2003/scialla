import React from 'react';
import { useApp } from '../../context/AppContext';

export default function Sales() {
  const { topProducts, monthlySalesData } = useApp();

  const maxRevenue = Math.max(...monthlySalesData.map((d) => d.revenue));

  const weeklySalesData = [
    { day: 'Mon', sales: 18400, percent: 65 },
    { day: 'Tue', sales: 21200, percent: 78 },
    { day: 'Wed', sales: 19800, percent: 72 },
    { day: 'Thu', sales: 23500, percent: 85 },
    { day: 'Fri', sales: 28900, percent: 98 },
    { day: 'Sat', sales: 31400, percent: 100 },
    { day: 'Sun', sales: 26800, percent: 90 },
  ];

  return (
    <div className="sales-tab-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Monthly Overview */}
      <div className="manager-box monthly-summary-header-box">
        <div className="box-header">
          <div>
            <h2>2026 Monthly Revenue</h2>
          </div>
          <span className="box-tag">2026</span>
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
        {/* Weekly Revenue Trend */}
        <div className="manager-box sales-chart-box">
          <div className="box-header">
            <h2>Weekly Revenue</h2>
            <span className="box-tag">This Week</span>
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
