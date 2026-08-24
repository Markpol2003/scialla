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

  // Search & Filter States for Ingredients
  const [ingSearch, setIngSearch] = useState('');
  const [ingCategory, setIngCategory] = useState('all');

  // Search & Filter States for Menu Availability
  const [menuSearch, setMenuSearch] = useState('');
  const [menuCategory, setMenuCategory] = useState('all');

  // Summary Metrics
  const totalIngredients = inventory.length;
  const lowStockItems = inventory.filter((item) => item.stock <= item.minThreshold);
  const lowStockCount = lowStockItems.length;

  const allMenuItems = menuCategories.flatMap((cat) => cat.items);
  const soldOutCount = allMenuItems.filter((item) => !item.inStock).length;

  // Inventory Categories
  const uniqueIngCategories = Array.from(new Set(inventory.map((i) => i.category || 'General')));

  // Filtered Ingredients
  const filteredInventory = inventory.filter((item) => {
    if (ingCategory !== 'all' && (item.category || 'General') !== ingCategory) return false;
    if (ingSearch.trim()) {
      const q = ingSearch.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        (item.category && item.category.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Filtered Menu Categories for Availability Tab
  const filteredMenuSections = menuCategories
    .map((cat) => {
      if (menuCategory !== 'all' && cat.id !== menuCategory) return null;
      const matchingItems = cat.items.filter((item) => {
        if (!menuSearch.trim()) return true;
        const q = menuSearch.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          (item.tag && item.tag.toLowerCase().includes(q))
        );
      });
      if (matchingItems.length === 0) return null;
      return { ...cat, items: matchingItems };
    })
    .filter(Boolean);

  return (
    <div className="staff-inventory-container">
      {/* Top Header Breadcrumb & Title */}
      <div className="staff-inv-hero">
        <div className="hero-text-block">
          <h1 className="staff-inv-title">Inventory</h1>
          <p className="staff-inv-subtitle">
          </p>
        </div>
      </div>

      {/* 1. Inventory Summary (3 Top Metric Cards) */}
      <div className="staff-inv-summary-cards">
        <div className="inv-summary-card">
          <span className="summary-card-label">Total Ingredients</span>
          <span className="summary-card-value">{totalIngredients}</span>
        </div>

        <div className={`inv-summary-card ${lowStockCount > 0 ? 'warning-glow' : ''}`}>
          <span className="summary-card-label">Low Stock</span>
          <span className={`summary-card-value ${lowStockCount > 0 ? 'color-warning' : ''}`}>
            {lowStockCount}
          </span>
        </div>

        <div className={`inv-summary-card ${soldOutCount > 0 ? 'danger-glow' : ''}`}>
          <span className="summary-card-label">Sold Out Items</span>
          <span className={`summary-card-value ${soldOutCount > 0 ? 'color-danger' : ''}`}>
            {soldOutCount}
          </span>
        </div>
      </div>

      {/* 2. Sub-Navigation Tabs */}
      <div className="staff-inv-tab-bar">
        <button
          type="button"
          className={`staff-inv-tab-btn ${activeTab === 'ingredients' ? 'active' : ''}`}
          onClick={() => setActiveTab('ingredients')}
        >
          Ingredients &amp; Stock
        </button>

        <button
          type="button"
          className={`staff-inv-tab-btn ${activeTab === 'availability' ? 'active' : ''}`}
          onClick={() => setActiveTab('availability')}
        >
          Menu Availability {soldOutCount > 0 && <span className="tab-badge-sold">{soldOutCount} Sold Out</span>}
        </button>
      </div>

      {/* TAB 1: INGREDIENTS & STOCK */}
      {activeTab === 'ingredients' && (
        <div className="staff-inv-tab-content">
          {/* Low Stock Warning Banner */}
          {lowStockCount > 0 && (
            <div className="low-stock-alert-banner">
              <div className="alert-header-row">
                <span className="alert-icon">⚠</span>
                <strong>LOW STOCK WARNING ({lowStockCount} {lowStockCount === 1 ? 'item' : 'items'})</strong>
              </div>
              <div className="alert-items-list">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="alert-item-pill">
                    <strong>{item.name}</strong> — Current: <span className="alert-num">{item.stock} {item.unit}</span> (Min: {item.minThreshold} {item.unit})
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search & Category Filter Toolbar */}
          <div className="staff-inv-toolbar">
            <div className="staff-inv-search">
              <input
                type="text"
                placeholder="Search ingredient..."
                value={ingSearch}
                onChange={(e) => setIngSearch(e.target.value)}
              />
              {ingSearch && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setIngSearch('')}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="staff-inv-select-wrapper">
              <span className="select-label">Category:</span>
              <select
                value={ingCategory}
                onChange={(e) => setIngCategory(e.target.value)}
                className="staff-inv-select"
              >
                <option value="all">All Categories</option>
                {uniqueIngCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Ingredients Data Table */}
          <div className="staff-inv-table-wrapper">
            {filteredInventory.length === 0 ? (
              <div className="staff-inv-empty">
                <p>No ingredients match your search query "{ingSearch}".</p>
              </div>
            ) : (
              <table className="staff-inv-table">
                <thead>
                  <tr>
                    <th>Ingredient</th>
                    <th style={{ textAlign: 'right' }}>Current Stock</th>
                    <th style={{ textAlign: 'right' }}>Minimum</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item) => {
                    const isLow = item.stock <= item.minThreshold;
                    const deltaUnit = item.unit === 'kg' ? 0.5 : 1;

                    return (
                      <tr key={item.id} className={isLow ? 'row-low-stock' : ''}>
                        <td>
                          <div className="tbl-ing-cell">
                            <strong className="ing-name">{item.name}</strong>
                            {item.category && <span className="ing-cat-tag">{item.category}</span>}
                          </div>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <span className={`stock-val ${isLow ? 'val-low' : ''}`}>
                            {item.stock} <span className="unit-str">{item.unit}</span>
                          </span>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <span className="min-val">
                            {item.minThreshold} <span className="unit-str">{item.unit}</span>
                          </span>
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          {isLow ? (
                            <span className="status-pill-badge badge-warning">
                              ⚠ Low Stock
                            </span>
                          ) : (
                            <span className="status-pill-badge badge-ok">
                              ● In Stock
                            </span>
                          )}
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div className="staff-action-btns">
                            <button
                              type="button"
                              className="btn-action-step btn-usage"
                              onClick={() => adjustInventoryStock(item.id, -deltaUnit)}
                              title={`Log -${deltaUnit} ${item.unit} usage/waste`}
                            >
                              - Usage
                            </button>

                            <button
                              type="button"
                              className="btn-action-step btn-add"
                              onClick={() => adjustInventoryStock(item.id, deltaUnit)}
                              title={`Add +${deltaUnit} ${item.unit} stock`}
                            >
                              + Add
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MENU AVAILABILITY */}
      {activeTab === 'availability' && (
        <div className="staff-inv-tab-content">
          {/* Search & Category Dropdown Toolbar */}
          <div className="staff-inv-toolbar">
            <div className="staff-inv-search">
              <input
                type="text"
                placeholder="Search product..."
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
              />
              {menuSearch && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setMenuSearch('')}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="staff-inv-select-wrapper">
              <span className="select-label">Category:</span>
              <select
                value={menuCategory}
                onChange={(e) => setMenuCategory(e.target.value)}
                className="staff-inv-select"
              >
                <option value="all">All Categories</option>
                {menuCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grouped Product List */}
          <div className="menu-availability-sections">
            {filteredMenuSections.length === 0 ? (
              <div className="staff-inv-empty">
                <p>No products match "{menuSearch}".</p>
              </div>
            ) : (
              filteredMenuSections.map((sec) => (
                <div key={sec.id} className="menu-avail-group">
                  <div className="avail-group-header">
                    <h3 className="avail-cat-title">{sec.category}</h3>
                    <span className="avail-cat-count">{sec.items.length} items</span>
                  </div>

                  <div className="avail-rows-list">
                    {sec.items.map((item) => (
                      <div
                        key={item.id}
                        className={`avail-item-row ${!item.inStock ? 'item-is-sold-out' : ''}`}
                      >
                        <div className="avail-item-meta">
                          <strong className="avail-item-name">{item.name}</strong>
                          <div className="avail-item-sub">
                            {item.tag && <span className="avail-tag-badge">{item.tag}</span>}
                            <span className="avail-price-str">₱{item.price.toFixed(2)}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className={`btn-stock-toggle-pill ${item.inStock ? 'is-in-stock' : 'is-sold-out'}`}
                          onClick={() => toggleItemStock(item.id)}
                          title={item.inStock ? 'Click to mark as SOLD OUT (Syncs in real-time)' : 'Click to mark as IN STOCK (Syncs in real-time)'}
                        >
                          <span className="toggle-dot" />
                          <span>{item.inStock ? 'IN STOCK' : 'SOLD OUT'}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
