import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import CategoryFilterBar from '../../components/customer/CategoryFilterBar';

const categorySubtitles = {
  coffee: 'Smooth, bold & handcrafted espresso creations',
  'non-coffee': 'Creamy matcha, artisanal teas & chocolate blends',
  soda: 'Crisp, sparkling & fruit-infused thirst quenchers',
  rice: 'Hearty garlic rice bowls & savory store favorites',
  waffles: 'Crisp golden waffles with premium toppings & syrup',
  pasta: 'Rich authentic sauces tossed with fresh pasta',
  pikapika: 'Shareable cafe bites, crisp fries & finger food',
  quesadilla: 'Toasted flour tortillas filled with melted savory cheese',
  sandwiches: 'Artisanal sourdough, loaded subs & gourmet burgers',
  pizza: 'Hand-stretched thin crust stone-baked cafe pizzas',
  'drink-addons': 'Espresso shots, sweet foams, syrups & crystal pearls',
  'food-addons': 'Extra egg, rice, melted cheese & dipping sauces'
};

const getCategorySubtitle = (id, title) => {
  const cleanId = String(id || '').toLowerCase();
  const cleanTitle = String(title || '').toLowerCase();
  for (const [key, desc] of Object.entries(categorySubtitles)) {
    if (cleanId.includes(key) || cleanTitle.includes(key)) {
      return desc;
    }
  }
  return 'Smooth, bold & handcrafted store favorites';
};

export default function Menu({ onAddToCart, cart }) {
  const { menuCategories } = useApp();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [selectedSizes, setSelectedSizes] = useState({});
  const scrollRefs = useRef({});

  const cleanQuery = searchQuery.trim().toLowerCase();

  // Filter displayed categories and items based on dropdown & search query
  const displayedCategories = menuCategories
    .filter((section) => {
      if (selectedCategory === 'all') return true;
      return section.id === selectedCategory || section.category === selectedCategory;
    })
    .map((section) => {
      if (!cleanQuery) return section;
      const filteredItems = (section.items || []).filter((it) =>
        (it.name || '').toLowerCase().includes(cleanQuery) ||
        (it.description || '').toLowerCase().includes(cleanQuery)
      );
      return { ...section, items: filteredItems };
    })
    .filter((section) => section.items.length > 0);

  // Product Customization Modal State
  const [modalItem, setModalItem] = useState(null);
  const [modalSize, setModalSize] = useState(null);
  const [modalQty, setModalQty] = useState(1);

  useEffect(() => {
    setSelectedSizes(previous => Object.fromEntries(Object.entries(previous).flatMap(([id, size]) => {
      const item = menuCategories.flatMap(c => c.items).find(i => i.id === id);
      const latest = item?.sizes?.find(s => s.size === size.size);
      return latest ? [[id, latest]] : [];
    })));
    setModalItem(previous => {
      if (!previous) return null;
      return menuCategories.flatMap(c => c.items).find(i => i.id === previous.id && i.inStock) || null;
    });
  }, [menuCategories]);

  useEffect(() => {
    if (modalItem) setModalSize(previous => modalItem.sizes?.find(s => s.size === previous?.size) || modalItem.sizes?.[0] || null);
  }, [modalItem]);

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

      {/* COMPACT CATEGORY FILTER DROPDOWN & SEARCH INPUT */}
      <CategoryFilterBar
        categories={menuCategories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Empty Search Result Feedback */}
      {displayedCategories.length === 0 && (
        <div className="menu-search-empty-state">
          <p className="empty-title">No menu items found</p>
          <p className="empty-sub">We couldn't find any items matching "{searchQuery}".</p>
          <button
            type="button"
            className="btn-clear-search"
            onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
          >
            View Full Menu
          </button>
        </div>
      )}

      {/* Every category renders as a horizontal scroll section */}
      {displayedCategories.map((section) => (
        <section key={`${section.id}-${selectedCategory}-${searchQuery}`} className="category-block animate-fade-slide">
          <div className="category-title-bar">
            <div className="category-heading-group">
              <div className="category-heading-top-line">
                <h2 className="category-heading-title">{section.category}</h2>
                <span className="category-count">
                  {section.items.length} {section.items.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <p className="category-heading-subtitle">
                {getCategorySubtitle(section.id, section.category)}
              </p>
              <div className="category-heading-accent-line" />
            </div>

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
