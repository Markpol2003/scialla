import React from 'react';
import { useApp } from '../../context/AppContext';

export default function Sales() {
  const { topProducts } = useApp();

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
    <div className="manager-two-columns">
      {/* Revenue Trend Visualizer */}
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

      {/* Top Products */}
      <div className="manager-box top-products-box">
        <div className="box-header">
          <h2>Top Selling Beverages</h2>
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
  );
}
