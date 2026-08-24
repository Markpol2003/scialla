import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export default function Menu({ onAddToCart, cart }) {
  const { menuCategories } = useApp();
  const [toastMsg, setToastMsg] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');

  const totalAllItemsCount = menuCategories.reduce((sum, cat) => sum + cat.items.length, 0);
  const filteredCategories = selectedCat === 'all'
    ? menuCategories
    : menuCategories.filter((sec) => sec.id === selectedCat);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2000);
  };

  const handleAdd = (item) => {
    if (!item.inStock) {
      triggerToast(`Sorry, ${item.name} is out of stock`);
      return;
    }
    onAddToCart(item);
    triggerToast(`Added ${item.name} to order`);
  };

  return (
    <div className="scialla-content">
      {toastMsg && (
        <div className="scialla-toast">
          <span>✓</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Customer Category Sorting Bar */}
      <div className="customer-category-bar-container" style={{ margin: '0 0 16px' }}>
        <div className="customer-category-chips">
          <button
            type="button"
            className={`customer-cat-chip ${selectedCat === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCat('all')}
          >
            All ({totalAllItemsCount})
          </button>
          {menuCategories.map((sec) => (
            <button
              key={sec.id}
              type="button"
              className={`customer-cat-chip ${selectedCat === sec.id ? 'active' : ''}`}
              onClick={() => setSelectedCat(sec.id)}
            >
              {sec.category} ({sec.items.length})
            </button>
          ))}
        </div>
      </div>

      {filteredCategories.map((section) => (
        <section key={section.id} className="category-block">
          <div className="category-title-bar">
            <div className="category-heading">
              <h2>{section.category}</h2>
            </div>
            <span className="category-count">{section.items.length} items</span>
          </div>

          <div className="cards-grid">
            {section.items.map((item) => {
              const cartItem = cart.find((c) => c.id === item.id);
              const qty = cartItem ? cartItem.qty : 0;
              const isOutOfStock = !item.inStock;
              const cardImg = item.image || '/images/products/caramelmacc.png';

              return (
                <div
                  key={item.id}
                  className={`coffee-card-3d ${item.featured ? 'featured-signature' : ''} ${isOutOfStock ? 'card-out-of-stock' : ''}`}
                >
                  <div className="card-bg-image-wrapper">
                    <img
                      src={cardImg}
                      alt={item.name}
                      className="card-bg-image"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/images/products/caramelmacc.png';
                      }}
                    />
                    <div className="card-bg-overlay" />
                  </div>

                  <div className="card-top">
                    <div>
                      <h3 className="card-name">{item.name}</h3>
                      <p className="card-desc">{item.description}</p>
                    </div>
                    <span className="tag-badge">
                      ● {isOutOfStock ? 'Sold Out' : item.tag}
                    </span>
                  </div>

                  <div className="card-bottom">
                    <div className="card-price">
                      <span className="currency-sym">₱</span>
                      <span>{item.price.toFixed(2)}</span>
                    </div>
                    <button
                      className={`btn-3d-add ${qty > 0 ? 'in-cart' : ''}`}
                      onClick={() => handleAdd(item)}
                      disabled={isOutOfStock}
                    >
                      {isOutOfStock ? 'Unavailable' : qty > 0 ? `+ Add (${qty})` : '+ Add'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
