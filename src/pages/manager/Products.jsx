import React from 'react';
import { useApp } from '../../context/AppContext';

export default function Products() {
  const { menuCategories, toggleItemStock } = useApp();

  return (
    <div className="manager-products-manager">
      <div className="box-header">
        <h2>Beverage & Bakery Catalog</h2>
        <span className="box-tag">{menuCategories.reduce((s, c) => s + c.items.length, 0)} Active Items</span>
      </div>

      <div className="manager-products-grid">
        {menuCategories.map((cat) => (
          <div key={cat.id} className="cat-management-card">
            <h3 className="cat-header-title">{cat.category}</h3>
            <div className="cat-items-rows">
              {cat.items.map((item) => (
                <div key={item.id} className="p-mgmt-row">
                  <div className="p-mgmt-left">
                    <strong>{item.name}</strong>
                    <p>{item.description}</p>
                  </div>
                  <div className="p-mgmt-right">
                    <span className="price-badge">₱{item.price.toFixed(2)}</span>
                    <button
                      type="button"
                      className={`toggle-stock-btn ${item.inStock ? 'in-stock' : 'out-of-stock'}`}
                      onClick={() => toggleItemStock(item.id)}
                    >
                      {item.inStock ? 'In Stock' : 'Sold Out'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
