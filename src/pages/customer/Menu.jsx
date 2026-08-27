import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';

export default function Menu({ onAddToCart, cart }) {
  const { menuCategories } = useApp();
  const [toastMsg, setToastMsg] = useState('');
  const [selectedSizes, setSelectedSizes] = useState({});
  const scrollRefs = useRef({});

  // Product Customization Modal State
  const [modalItem, setModalItem] = useState(null);
  const [modalSize, setModalSize] = useState(null);
  const [modalQty, setModalQty] = useState(1);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2000);
  };

  const handleSizeSelect = (itemId, sizeObj) => {
    setSelectedSizes((prev) => ({ ...prev, [itemId]: sizeObj }));
  };

  const handleOpenProductModal = (item) => {
    if (!item.inStock) {
      triggerToast(`Sorry, ${item.name} is currently out of stock`);
      return;
    }
    setModalItem(item);
    const initialSize = item.sizes ? (selectedSizes[item.id] || item.sizes[0]) : null;
    setModalSize(initialSize);
    setModalQty(1);
  };

  const handleAdd = (item, customSize = null, customQty = 1) => {
    if (!item.inStock) {
      triggerToast(`Sorry, ${item.name} is out of stock`);
      return;
    }

    const activeSize = item.sizes ? (customSize || selectedSizes[item.id] || item.sizes[0]) : null;
    const cartItemName = activeSize ? `${item.name} (${activeSize.label || activeSize.size})` : item.name;

    onAddToCart(item, activeSize, customQty);
    triggerToast(`Added ${cartItemName} (${customQty}) to order`);
  };

  const scrollRow = (catId, direction) => {
    const el = scrollRefs.current[catId];
    if (el) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="scialla-content">
      {toastMsg && (
        <div className="scialla-toast">
          <span>✓</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Every category renders as a horizontal scroll section */}
      {menuCategories.map((section) => (
        <section key={section.id} className="category-block">
          <div className="category-title-bar">
            <div className="category-heading">
              <h2>{section.category}</h2>
            </div>
            <div className="category-title-actions">
              <span className="category-count">{section.items.length} items</span>
              <div className="carousel-arrows">
                <button
                  type="button"
                  className="carousel-arrow-btn"
                  onClick={() => scrollRow(section.id, 'left')}
                  aria-label="Scroll left"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="carousel-arrow-btn"
                  onClick={() => scrollRow(section.id, 'right')}
                  aria-label="Scroll right"
                >
                  ›
                </button>
              </div>
            </div>
          </div>


          <div
            className="cards-grid"
            ref={(el) => { scrollRefs.current[section.id] = el; }}
          >
            {section.items.map((item) => {
              const activeSize = item.sizes ? (selectedSizes[item.id] || item.sizes[0]) : null;
              const activePrice = activeSize ? activeSize.price : item.price;
              const cartItemId = activeSize ? `${item.id}-${activeSize.size}` : item.id;
              const cartItem = cart.find((c) => c.id === cartItemId);
              const qty = cartItem ? cartItem.qty : 0;
              const isOutOfStock = !item.inStock;
              const cardImg = item.image || '/images/products/caramelmacc.png';

              return (
                <div
                  key={item.id}
                  className={`coffee-card-3d ${item.featured ? 'featured-signature' : ''} ${isOutOfStock ? 'card-out-of-stock' : ''}`}
                >
                  <div className="card-bg-image-wrapper" onClick={() => handleOpenProductModal(item)}>
                    <img
                      src={cardImg}
                      alt={item.name}
                      className="card-bg-image"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/images/products/caramelmacc.png';
                      }}
                    />
                  </div>

                  <div className="card-top" onClick={() => handleOpenProductModal(item)} style={{ cursor: 'pointer' }}>
                    <div>
                      <h3 className="card-name">{item.name}</h3>
                      <p className="card-desc">{item.description}</p>
                    </div>
                    <span className="tag-badge">
                      ● {isOutOfStock ? 'Sold Out' : item.tag}
                    </span>
                  </div>

                  {item.sizes && (
                    <div className="drink-size-selector-row">
                      {item.sizes.map((s) => (
                        <button
                          key={s.size}
                          type="button"
                          className={`size-pill-btn ${(activeSize?.size === s.size) ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSizeSelect(item.id, s);
                          }}
                        >
                          {s.label || s.size} (₱{s.price})
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="card-bottom">
                    <div className="card-price" onClick={() => handleOpenProductModal(item)} style={{ cursor: 'pointer' }}>
                      <span className="currency-sym">₱</span>
                      <span>{activePrice.toFixed(2)}</span>
                    </div>
                    <button
                      className={`btn-3d-add ${qty > 0 ? 'in-cart' : ''}`}
                      onClick={() => handleAdd(item, activeSize, 1)}
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

      {/* PRODUCT CUSTOMIZATION MODAL */}
      {modalItem && (
        <div className="receipt-modal-backdrop" onClick={() => setModalItem(null)} style={{ zIndex: 999999 }}>
          <div className="auth-modal-card product-detail-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <button className="receipt-close-btn" onClick={() => setModalItem(null)}>✕</button>

            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <img
                src={modalItem.image || '/images/products/caramelmacc.png'}
                alt={modalItem.name}
                style={{ height: '130px', width: 'auto', objectFit: 'contain', margin: '0 auto 10px', borderRadius: '12px' }}
              />
              <h2 style={{ fontSize: '1.35rem', margin: '0 0 6px', color: 'var(--brown-900)' }}>{modalItem.name}</h2>
              <p style={{ fontSize: '0.84rem', margin: 0, lineHeight: '1.4', color: 'var(--text-muted)' }}>{modalItem.description}</p>
            </div>

            {modalItem.sizes && (
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--accent)', marginBottom: '8px' }}>
                  Choose Size:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {modalItem.sizes.map((s) => (
                    <button
                      key={s.size}
                      type="button"
                      className={`size-pill-btn ${(modalSize?.size === s.size) ? 'active' : ''}`}
                      onClick={() => setModalSize(s)}
                      style={{ flex: 1, padding: '10px 6px', borderRadius: '10px' }}
                    >
                      {s.label || s.size}<br />
                      <span style={{ fontSize: '0.76rem', opacity: 0.85 }}>₱{s.price}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity Stepper & Add Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', gap: '12px' }}>
              <div className="qty-stepper" style={{ height: '42px', padding: '0 10px' }}>
                <button className="qty-btn" onClick={() => setModalQty(Math.max(1, modalQty - 1))}>-</button>
                <span className="qty-number" style={{ width: '32px', textAlign: 'center', fontWeight: 'bold' }}>{modalQty}</span>
                <button className="qty-btn" onClick={() => setModalQty(modalQty + 1)}>+</button>
              </div>

              <button
                type="button"
                className="btn-3d-add"
                style={{ flex: 1, height: '42px', fontSize: '0.88rem', fontWeight: 'bold', width: 'auto', minWidth: 0 }}
                onClick={() => {
                  handleAdd(modalItem, modalSize, modalQty);
                  setModalItem(null);
                }}
              >
                Add to Cart • ₱{((modalSize ? modalSize.price : modalItem.price) * modalQty).toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
