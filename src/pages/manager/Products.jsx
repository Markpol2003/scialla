import React, { useState } from 'react';
import ProductForm from './ProductForm';
import { useApp } from '../../context/AppContext';

export default function Products() {
  const { menuCategories, toggleItemStock, saveProduct } = useApp();
  const [editor, setEditor] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');

  const totalItemsCount = menuCategories.reduce((sum, cat) => sum + cat.items.length, 0);
  const totalInStockCount = menuCategories.reduce(
    (sum, cat) => sum + cat.items.filter((i) => i.inStock).length,
    0
  );
  const totalOutOfStock = totalItemsCount - totalInStockCount;

  // Flatten items with category meta for table rendering
  const allProducts = menuCategories.flatMap((cat) =>
    cat.items.map((item) => ({
      ...item,
      categoryId: cat.id,
      categoryName: cat.category,
    }))
  );

  const filteredProducts = allProducts.filter((item) => {
    if (selectedCat !== 'all' && item.categoryId !== selectedCat) return false;
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      (item.tag && item.tag.toLowerCase().includes(q)) ||
      item.categoryName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="catalog-modern">
      {editor && <ProductForm product={editor.id ? editor : null} onSave={saveProduct} onClose={() => setEditor(null)} />}
      {/* Hero Header */}
      <header className="catalog-hero">
        <div className="catalog-hero-text">
          <h2 className="catalog-title">Beverage & Bakery Catalog</h2>
          <p className="catalog-subtitle">
            Manage your menu pricing and live item availability status
          </p>
        </div>
        <button type="button" className="filter-chip active" onClick={() => setEditor({})}>+ Add Product</button>
        <div className="catalog-hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-value">{totalItemsCount}</span>
            <span className="hero-stat-label">Total SKUs</span>
          </div>
          <div className="hero-stat success">
            <span className="hero-stat-value">{totalInStockCount}</span>
            <span className="hero-stat-label">In Stock</span>
          </div>
          <div className="hero-stat danger">
            <span className="hero-stat-value">{totalOutOfStock}</span>
            <span className="hero-stat-label">Out of Stock</span>
          </div>
        </div>
      </header>

      {/* Toolbar: Search + Filter Chips */}
      <div className="catalog-toolbar">
        <div className="catalog-search">
          <input
            type="text"
            placeholder="Search by name, description or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="catalog-filter-chips">
          <button
            type="button"
            className={`filter-chip ${selectedCat === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCat('all')}
          >
            All ({totalItemsCount})
          </button>
          {menuCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`filter-chip ${selectedCat === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCat(cat.id)}
            >
              {cat.category} ({cat.items.length})
            </button>
          ))}
        </div>
      </div>

      {/* Product Catalog Data Table */}
      <div className="catalog-table-container">
        {filteredProducts.length === 0 ? (
          <div className="catalog-empty">
            <p>No catalog items match "{searchQuery}".</p>
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View (Hidden on mobile via CSS) */}
            <div className="catalog-desktop-table-container">
              <table className="catalog-data-table">
                <thead>
                  <tr>
                    <th style={{ width: '42%' }}>Item & Description</th>
                    <th style={{ width: '22%' }}>Category</th>
                    <th style={{ width: '16%' }}>Price</th>
                    <th style={{ width: '20%', textAlign: 'right' }}>Availability</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((item) => (
                    <tr key={item.id} className={!item.inStock ? 'row-out-of-stock' : ''}>
                      <td>
                        <div className="tbl-item-cell">
                          <div className="tbl-name-row">
                            <strong className="tbl-item-name">{item.name}</strong>
                            {item.tag && <span className="product-tag">{item.tag}</span>}
                          </div>
                          <p className="tbl-item-desc">{item.description}</p>
                        </div>
                      </td>
                      <td>
                        <span className="tbl-cat-badge">{item.categoryName}</span>
                      </td>
                      <td>
                        <div className="tbl-price-cell">
                          {item.sizes ? (
                            <div>
                              <strong className="tbl-price-val">
                                ₱{Math.min(...item.sizes.map(s => s.price))} – ₱{Math.max(...item.sizes.map(s => s.price))}
                              </strong>
                              <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                                {item.sizes.map((s) => `${s.size}: ₱${s.price}`).join(' | ')}
                              </span>
                            </div>
                          ) : (
                            <strong className="tbl-price-val">₱{item.price.toFixed(2)}</strong>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className={`stock-switch ${item.inStock ? 'is-stock' : 'is-out'}`}
                          disabled={item.active === false}
                      onClick={() => toggleItemStock(item.id)}
                          title={item.inStock ? 'Mark as sold out' : 'Mark as in stock'}
                        >
                          <span className="switch-knob" />
                          <span className="switch-label">
                            {item.active === false ? 'Inactive' : item.inStock ? 'Available' : 'Unavailable'}
                          </span>
                        </button>
                      </td>
                      <td><button type="button" className="filter-chip" onClick={() => setEditor(item)}>Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Product Cards View (Visible only on mobile via CSS) */}
            <div className="catalog-mobile-cards-list">
              {filteredProducts.map((item) => (
                <div key={item.id} className={`product-mobile-card ${!item.inStock ? 'card-out-of-stock' : ''}`}>
                  <div className="pmc-top-row">
                    <div className="pmc-identity">
                      <strong className="pmc-name">{item.name}</strong>
                      {item.tag && <span className="product-tag">{item.tag}</span>}
                    </div>
                    <span className="tbl-cat-badge">{item.categoryName}</span>
                  </div>

                  <button type="button" className="filter-chip" onClick={() => setEditor(item)}>Edit</button>
                  <p className="pmc-desc">{item.description}</p>

                  <div className="pmc-bottom-row">
                    <div className="pmc-price-box">
                      {item.sizes ? (
                        <div>
                          <strong className="pmc-price-main">
                            ₱{Math.min(...item.sizes.map(s => s.price))} – ₱{Math.max(...item.sizes.map(s => s.price))}
                          </strong>
                          <span className="pmc-sizes-sub">
                            {item.sizes.map((s) => `${s.size}: ₱${s.price}`).join(' · ')}
                          </span>
                        </div>
                      ) : (
                        <strong className="pmc-price-main">₱{item.price.toFixed(2)}</strong>
                      )}
                    </div>

                    <button
                      type="button"
                      className={`stock-switch ${item.inStock ? 'is-stock' : 'is-out'}`}
                      disabled={item.active === false}
                          onClick={() => toggleItemStock(item.id)}
                      title={item.inStock ? 'Mark as sold out' : 'Mark as in stock'}
                    >
                      <span className="switch-knob" />
                      <span className="switch-label">
                        {item.active === false ? 'Inactive' : item.inStock ? 'Available' : 'Unavailable'}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
