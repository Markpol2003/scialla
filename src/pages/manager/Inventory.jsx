import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export default function Inventory() {
  const { inventory, restockInventory } = useApp();
  const [filterCategory, setFilterCategory] = useState('all');

  const lowStockItems = inventory.filter((item) => item.stock <= item.minThreshold);
  const categories = ['all', ...new Set(inventory.map((i) => i.category))];

  const filteredInventory = filterCategory === 'all'
    ? inventory
    : inventory.filter((i) => i.category === filterCategory);

  return (
    <div className="manager-inventory-section">
      {/* Top Inventory Summary Cards */}
      <div className="kpi-cards-row">
        <div className="kpi-card">
          <span className="kpi-title">TOTAL INGREDIENTS</span>
          <div className="kpi-main-val">{inventory.length}</div>
          <span className="kpi-sub-tag">Tracked in Warehouse</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">LOW STOCK ALERTS</span>
          <div className="kpi-main-val" style={{ color: lowStockItems.length > 0 ? '#ef4444' : '#10b981' }}>
            {lowStockItems.length}
          </div>
          <span className="kpi-sub-tag">Requiring Immediate Restock</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">HEALTHY STOCK ITEMS</span>
          <div className="kpi-main-val" style={{ color: '#10b981' }}>
            {inventory.length - lowStockItems.length}
          </div>
          <span className="kpi-sub-tag">Above Minimum Threshold</span>
        </div>
      </div>

      {/* Main Table Box */}
      <div className="manager-box">
        <div className="box-header">
          <h2>Inventory Warehouse & Stock Control</h2>
          <div className="category-filter-pills">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`filter-pill-btn ${filterCategory === cat ? 'active' : ''}`}
                onClick={() => setFilterCategory(cat)}
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <table className="manager-table">
          <thead>
            <tr>
              <th>Ingredient Name</th>
              <th>Category</th>
              <th>Current Stock</th>
              <th>Stock Level Bar</th>
              <th>Min Threshold</th>
              <th>Status</th>
              <th>Restock Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredInventory.map((inv) => {
              const isLow = inv.stock <= inv.minThreshold;
              const maxVal = inv.minThreshold * 2.5;
              const fillPercent = Math.min(100, (inv.stock / maxVal) * 100);

              return (
                <tr key={inv.id} className={isLow ? 'row-low-stock' : ''}>
                  <td><strong>{inv.name}</strong></td>
                  <td>
                    <span className="category-tag">{inv.category}</span>
                  </td>
                  <td>
                    <span className="stock-number-pill">{inv.stock} {inv.unit}</span>
                  </td>
                  <td style={{ width: '180px' }}>
                    <div className="inv-progress-bar">
                      <div
                        className={`progress-fill ${isLow ? 'fill-low' : 'fill-good'}`}
                        style={{ width: `${fillPercent}%` }}
                      ></div>
                    </div>
                  </td>
                  <td>{inv.minThreshold} {inv.unit}</td>
                  <td>
                    {isLow ? (
                      <span className="status-badge badge-warning">LOW STOCK</span>
                    ) : (
                      <span className="status-badge badge-ok">OK</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-table-action"
                      onClick={() => restockInventory(inv.id, inv.unit === 'kg' ? 5.0 : 10)}
                    >
                      + Restock ({inv.unit === 'kg' ? '+5 kg' : '+10'})
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
