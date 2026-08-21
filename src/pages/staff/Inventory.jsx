import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export default function Inventory() {
  const {
    inventory,
    adjustInventoryStock,
    menuCategories,
    toggleItemStock
  } = useApp();

  const [activeTab, setActiveTab] = useState('ingredients'); // 'ingredients' | 'availability'

  const lowStockItems = inventory.filter((item) => item.stock <= item.minThreshold);

  return (
    <div className="staff-inventory-section">
      <div className="box-header">
        <div>
          <h2 className="section-heading">Kitchen Ingredients & Item Availability</h2>
          <p className="section-help-text">Log barista ingredient usage or mark beverages as sold out.</p>
        </div>

        <div className="staff-inv-tabs">
          <button
            type="button"
            className={`staff-tab-btn ${activeTab === 'ingredients' ? 'active' : ''}`}
            onClick={() => setActiveTab('ingredients')}
          >
            Ingredients & Usage ({lowStockItems.length} Low)
          </button>
          <button
            type="button"
            className={`staff-tab-btn ${activeTab === 'availability' ? 'active' : ''}`}
            onClick={() => setActiveTab('availability')}
          >
            Beverage Stock Toggles
          </button>
        </div>
      </div>

      {/* SECTION 1: INGREDIENTS & USAGE LOGGING */}
      {activeTab === 'ingredients' && (
        <div className="inventory-cards-grid">
          {inventory.map((inv) => {
            const isLow = inv.stock <= inv.minThreshold;
            const deltaUnit = inv.unit === 'kg' ? 0.5 : 1;

            return (
              <div key={inv.id} className={`inv-status-card ${isLow ? 'card-warning' : ''}`}>
                <div className="inv-card-top">
                  <span className="inv-name">{inv.name}</span>
                  {isLow ? (
                    <span className="warning-badge">LOW STOCK</span>
                  ) : (
                    <span className="status-badge badge-ok">OK</span>
                  )}
                </div>

                <div className="inv-card-stock">
                  <span className="stock-number">{inv.stock}</span>
                  <span className="stock-unit">{inv.unit}</span>
                </div>

                <div className="inv-progress-bar">
                  <div
                    className={`progress-fill ${isLow ? 'fill-low' : 'fill-good'}`}
                    style={{ width: `${Math.min(100, (inv.stock / (inv.minThreshold * 2.5)) * 100)}%` }}
                  ></div>
                </div>

                <span className="inv-min-info">Min threshold: {inv.minThreshold} {inv.unit}</span>

                {/* Barista Quick Usage & Add Steppers */}
                <div className="staff-stock-actions">
                  <button
                    type="button"
                    className="btn-stock-step step-minus"
                    onClick={() => adjustInventoryStock(inv.id, -deltaUnit)}
                    title={`Log -${deltaUnit} ${inv.unit} usage/waste`}
                  >
                    - {deltaUnit} {inv.unit} (Log Usage)
                  </button>

                  <button
                    type="button"
                    className="btn-stock-step step-plus"
                    onClick={() => adjustInventoryStock(inv.id, deltaUnit)}
                    title={`Add +${deltaUnit} ${inv.unit}`}
                  >
                    + {deltaUnit} {inv.unit} (Open Pack)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SECTION 2: ITEM AVAILABILITY TOGGLES */}
      {activeTab === 'availability' && (
        <div className="menu-toggle-grid">
          {menuCategories.map((cat) => (
            <div key={cat.id} className="menu-cat-card">
              <h3 className="cat-title">{cat.category}</h3>
              <div className="cat-items-list">
                {cat.items.map((item) => (
                  <div key={item.id} className="menu-toggle-row">
                    <div className="item-details">
                      <span className="item-name-str">{item.name}</span>
                      <span className="item-price-str">₱{item.price.toFixed(2)}</span>
                    </div>

                    <button
                      type="button"
                      className={`toggle-stock-btn ${item.inStock ? 'in-stock' : 'out-of-stock'}`}
                      onClick={() => toggleItemStock(item.id)}
                    >
                      {item.inStock ? 'IN STOCK' : 'SOLD OUT'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
