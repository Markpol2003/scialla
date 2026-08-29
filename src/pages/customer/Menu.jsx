import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import CategoryFilterBar from '../../components/customer/CategoryFilterBar';

export default function Menu({ onAddToCart, cart }) {
  const { menuCategories } = useApp();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [toastMsg, setToastMsg] = useState('');
  const [selectedSizes, setSelectedSizes] = useState({});
  const scrollRefs = useRef({});

  // Filter displayed categories based on dropdown/chip selection
  const displayedCategories = selectedCategory === 'all'
    ? menuCategories
    : menuCategories.filter((section) => section.id === selectedCategory || section.category === selectedCategory);

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

      {/* LUXURY CATEGORY FILTER DROPDOWN & QUICK CHIPS */}
      <CategoryFilterBar
        categories={menuCategories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Every category renders as a horizontal scroll section */}
      {displayedCategories.map((section) => (
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


          <div className="cards-carousel-wrapper">
            <div className="carousel-fade-left" aria-hidden="true" />
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
                      <div className="card-header-row">
                        <h3 className="card-name">{item.name}</h3>
                        <span className="tag-badge">
                          ● {isOutOfStock ? 'Sold Out' : item.tag}
                        </span>
                      </div>
                      <p className="card-desc">{item.description}</p>
                    </div>

                    {item.sizes ? (
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
                    ) : (
                      <div className="drink-size-selector-row empty-size-placeholder" />
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
            <div className="carousel-fade-right" aria-hidden="true" />
          </div>
        </section>
      ))}

      {/* PRODUCT CUSTOMIZATION MODAL */}
      {modalItem && (
        <div className="receipt-modal-backdrop" onClick={() => setModalItem(null)} style={{ zIndex: 999999 }}>
          <div className="product-detail-modal-card product-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="receipt-close-btn" onClick={() => setModalItem(null)}>✕</button>

            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div className="product-modal-image-wrap">
                <img
                  src={modalItem.image || '/images/products/caramelmacc.png'}
                  alt={modalItem.name}
                  style={{ height: '130px', width: 'auto', objectFit: 'contain', borderRadius: '8px' }}
                />
              </div>
              <h2 className="product-modal-title">{modalItem.name}</h2>
              <p className="product-modal-desc">{modalItem.description}</p>
            </div>

            {modalItem.sizes && (
              <div style={{ marginBottom: '18px' }}>
                <label className="product-modal-size-label">
                  Choose Size:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {modalItem.sizes.map((s) => (
                    <button
                      key={s.size}
                      type="button"
                      className={`modal-size-pill ${(modalSize?.size === s.size) ? 'active' : ''}`}
                      onClick={() => setModalSize(s)}
                    >
                      <span className="modal-size-pill-name">{s.label || s.size}</span>
                      <span className="modal-size-pill-price">₱{s.price}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity Stepper & Add Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', gap: '12px' }}>
              <div className="qty-stepper" style={{ height: '44px', padding: '0 10px' }}>
                <button className="qty-btn" onClick={() => setModalQty(Math.max(1, modalQty - 1))}>-</button>
                <span className="qty-number" style={{ width: '36px', textAlign: 'center', fontWeight: 'bold' }}>{modalQty}</span>
                <button className="qty-btn" onClick={() => setModalQty(modalQty + 1)}>+</button>
              </div>

              <button
                type="button"
                className="btn-3d-add"
                style={{ flex: 1, height: '44px', fontSize: '0.92rem', fontWeight: 'bold', width: 'auto', minWidth: 0 }}
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
