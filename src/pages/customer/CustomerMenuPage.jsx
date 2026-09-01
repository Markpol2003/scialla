import React, { useState, useRef } from 'react';
import Live3DBackground from '../../Live3DBackground';
import { useApp } from '../../context/AppContext';
import '../../CoffeeMenu.css';
import logoImg from '../../logo.png';

export default function CustomerMenuPage() {
  const { menuCategories, placeOrder, lastCustomerOrder, setLastCustomerOrder, orders } = useApp();
  const categoryChipsRef = useRef(null);

  const handleScrollCategories = (direction) => {
    if (categoryChipsRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      categoryChipsRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const occupiedTables = (orders || [])
    .filter((o) => ['new', 'preparing', 'ready'].includes(o.status))
    .filter((o) => o.table && !o.table.toLowerCase().includes('takeout'))
    .map((o) => {
      const match = String(o.table).match(/\d+/);
      return match ? String(parseInt(match[0], 10)) : String(o.table).trim();
    });

  const [cart, setCart] = useState([]);
  const [toastMessage, setToastMessage] = useState('');
  const [tableNumber, setTableNumber] = useState('4');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const totalAllItemsCount = menuCategories.reduce((sum, cat) => sum + cat.items.length, 0);
  const filteredCategories = selectedCategory === 'all'
    ? menuCategories
    : menuCategories.filter((sec) => sec.id === selectedCategory);

  // Checkout & Receipt Modal State
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('GCash');
  const [orderMeta, setOrderMeta] = useState({ orderNum: '', dateStr: '' });
  const [selectedSizes, setSelectedSizes] = useState({});
  const [isMobileBarDismissed, setIsMobileBarDismissed] = useState(false);

  // Product Customization Modal State
  const [modalItem, setModalItem] = useState(null);
  const [modalSize, setModalSize] = useState(null);
  const [modalQty, setModalQty] = useState(1);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 2200);
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

  const handleAddToCart = (item, customSize = null, customQty = 1) => {
    setIsMobileBarDismissed(false);
    if (!item.inStock) {
      triggerToast(`Sorry, ${item.name} is currently out of stock`);
      return;
    }

    const activeSize = item.sizes ? (customSize || selectedSizes[item.id] || item.sizes[0]) : null;
    const sizeLabel = activeSize ? (activeSize.label || activeSize.size) : '';
    const cartItemId = activeSize ? `${item.id}-${activeSize.size}` : item.id;
    const cartItemName = activeSize ? `${item.name} (${activeSize.size})` : item.name;
    const itemPrice = activeSize ? activeSize.price : item.price;

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((cartItem) => cartItem.id === cartItemId);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex] = {
          ...updated[existingIndex],
          qty: updated[existingIndex].qty + customQty,
        };
        return updated;
      }
      return [...prevCart, { id: cartItemId, name: cartItemName, rawName: item.name, size: sizeLabel, price: itemPrice, qty: customQty, originalId: item.id }];
    });
    triggerToast(`Added ${cartItemName} (${customQty}) to order`);
  };

  const handleUpdateQty = (id, delta) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.id === id) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  const handleRemoveItem = (id) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalItemCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const randomOrderNum = `SC-${Math.floor(1000 + Math.random() * 9000)}`;

    setOrderMeta({ orderNum: randomOrderNum, dateStr: formattedDate });
    setIsPaid(false);
    setIsReceiptOpen(true);
  };

  const tableDisplayLabel = tableNumber.toLowerCase() === 'takeout'
    ? 'Takeout'
    : `Table #${tableNumber || '01'}`;

  const handlePay = () => {
    setIsPaid(true);

    // Dispatch order into shared AppContext store so Staff & Manager UIs instantly reflect it!
    placeOrder({
      orderNum: orderMeta.orderNum,
      table: tableDisplayLabel,
      items: cart,
      total: totalAmount,
      paymentMethod: paymentMethod
    });
  };

  const handleNewOrder = () => {
    setCart([]);
    setIsReceiptOpen(false);
    setIsPaid(false);
  };

  return (
    <div className="scialla-container">
      {/* Live 3D Canvas Background */}
      <Live3DBackground />

      {/* Toast Alert */}
      {toastMessage && (
        <div className="scialla-toast">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sticky / Frozen Top Section */}
      <div className="scialla-sticky-top">
        {/* Live Customer Order Tracking Banner */}
        {lastCustomerOrder && (() => {
          const normStatus = String(lastCustomerOrder.status || '').toLowerCase().trim();
          const isReceived = ['new', 'received', 'pending'].includes(normStatus);
          const isPreparing = ['preparing', 'accepted'].includes(normStatus);
          const isReady = normStatus === 'ready';
          const isCompleted = normStatus === 'completed';

          return (
            <div className="live-order-tracker-banner">
              <div className="tracker-header">
                <span className="pulse-indicator" />
                <div className="tracker-meta">
                  <strong className="tracker-title">Live Order Tracker #{lastCustomerOrder.id}</strong>
                  <span className="tracker-table-badge">{lastCustomerOrder.table}</span>
                </div>

                <button
                  type="button"
                  className="btn-dismiss-tracker"
                  onClick={() => setLastCustomerOrder(null)}
                  title="Dismiss notification"
                >
                  ✕
                </button>
              </div>

              {/* Unique 4-Step Laser Progress Stepper */}
              <div className="tracker-progress-stepper">
                <div className={`stepper-node ${['new', 'received', 'pending', 'preparing', 'accepted', 'ready', 'completed'].includes(normStatus) ? 'active' : ''}`}>
                  <span className="node-dot">1</span>
                  <span className="node-label">Received</span>
                </div>
                <div className={`stepper-line ${['preparing', 'accepted', 'ready', 'completed'].includes(normStatus) ? 'active-line' : ''}`} />
                <div className={`stepper-node ${['preparing', 'accepted', 'ready', 'completed'].includes(normStatus) ? 'active' : ''}`}>
                  <span className="node-dot">2</span>
                  <span className="node-label">Preparing</span>
                </div>
                <div className={`stepper-line ${['ready', 'completed'].includes(normStatus) ? 'active-line' : ''}`} />
                <div className={`stepper-node ${['ready', 'completed'].includes(normStatus) ? 'active' : ''}`}>
                  <span className="node-dot">3</span>
                  <span className="node-label">Crafted</span>
                </div>
                <div className={`stepper-line ${isCompleted ? 'active-line' : ''}`} />
                <div className={`stepper-node ${isCompleted ? 'active' : ''}`}>
                  <span className="node-dot">4</span>
                  <span className="node-label">Completed</span>
                </div>
              </div>

              <div className="tracker-status-step">
                {isReceived && (
                  <span className="status-pill status-new">Order Received • Waiting for barista</span>
                )}
                {isPreparing && (
                  <span className="status-pill status-prep">
                    Accepted & Preparing{lastCustomerOrder.accepted_by_name ? ` • Crafted by ${lastCustomerOrder.accepted_by_name}` : ''}
                  </span>
                )}
                {isReady && (
                  <span className="status-pill status-ready">
                    Crafted • Ready for pickup!{lastCustomerOrder.accepted_by_name ? ` (Crafted by ${lastCustomerOrder.accepted_by_name})` : ''}
                  </span>
                )}
                {isCompleted && (
                  <span className="status-pill status-complete">
                    Completed{lastCustomerOrder.completed_by_name ? ` by ${lastCustomerOrder.completed_by_name}` : ''} • Thank you for ordering from Scialla Cafe!
                  </span>
                )}
              </div>

              {/* Handled by staff info */}
              {(lastCustomerOrder.accepted_by_name || lastCustomerOrder.completed_by_name) && (
                <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#D4C3B3', textAlign: 'center' }}>
                  {lastCustomerOrder.accepted_by_name && (
                    <span>Accepted by: <strong style={{ color: '#E2B688' }}>{lastCustomerOrder.accepted_by_name}</strong></span>
                  )}
                  {lastCustomerOrder.completed_by_name && (
                    <span>{lastCustomerOrder.accepted_by_name ? ' • ' : ''}Completed by: <strong style={{ color: '#E2B688' }}>{lastCustomerOrder.completed_by_name}</strong></span>
                  )}
                </div>
              )}
            </div>
          );
        })()}
        <header className="scialla-header">
          <div className="scialla-logo-wrapper">
            <img src={logoImg} alt="Scialla Cafe Logo" className="scialla-header-logo" />
          </div>
          <h1 className="scialla-title">
            Scialla <span className="scialla-title-accent"></span> Cafe
          </h1>
          <p className="scialla-subtitle">Artisanal Coffee & Handcrafted Brews</p>
        </header>

        {/* Interactive Table Number Selector */}
        <div className="table-bar-container">
          <div className="table-bar-card">
            <span className="table-bar-label">Your Table:</span>
            <div className="table-chips-group">
              {['1', '2', '3', '4', '5', 'Takeout'].map((t) => {
                const tableNumStr = String(t).trim();
                const isOccupied = t !== 'Takeout' && occupiedTables.includes(tableNumStr);
                return (
                  <button
                    key={t}
                    type="button"
                    className={`table-chip-btn ${tableNumber === t ? 'active' : ''} ${isOccupied ? 'occupied-table' : ''}`}
                    onClick={() => setTableNumber(t)}
                    title={isOccupied ? `Table ${t} currently has an active order (Occupied)` : `Table ${t} is available`}
                  >
                    <span className={`table-status-dot ${isOccupied ? 'dot-occupied' : 'dot-free'}`} />
                    {t === 'Takeout' ? 'Takeout' : `Table ${t}`}
                    {isOccupied && <span className="table-occ-tag">Occupied</span>}
                  </button>
                );
              })}
            </div>

            <div className="table-input-custom-wrapper">
              <span className="table-input-prefix">Custom #</span>
              <input
                type="text"
                placeholder="e.g. 7"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="table-custom-input"
                maxLength={10}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="scialla-layout">
        {/* Menu Sections */}
        <main className="scialla-content">
          {/* Customer Category Sorting Bar */}
          <div className="customer-category-bar-container">
            <button
              type="button"
              className="cat-scroll-arrow left-arrow"
              onClick={() => handleScrollCategories('left')}
              title="Scroll Left"
            >
              ‹
            </button>

            <div className="customer-category-chips" ref={categoryChipsRef}>
              <button
                type="button"
                className={`customer-cat-chip ${selectedCategory === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('all')}
              >
                All ({totalAllItemsCount})
              </button>
              {menuCategories.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  className={`customer-cat-chip ${selectedCategory === sec.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(sec.id)}
                >
                  {sec.category} ({sec.items.length})
                </button>
              ))}
            </div>

            <button
              type="button"
              className="cat-scroll-arrow right-arrow"
              onClick={() => handleScrollCategories('right')}
              title="Scroll Right"
            >
              ›
            </button>
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
                      <div className="card-bg-image-wrapper" onClick={() => handleOpenProductModal(item)} style={{ cursor: 'pointer' }}>
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
                        <div className="drink-size-selector-row" style={{ display: 'flex', gap: '6px', margin: '8px 0' }}>
                          {item.sizes.map((s) => (
                            <button
                              key={s.size}
                              type="button"
                              className={`size-pill-btn ${(activeSize?.size === s.size) ? 'active' : ''}`}
                              onClick={() => handleSizeSelect(item.id, s)}
                              style={{
                                flex: 1,
                                padding: '4px 6px',
                                borderRadius: '8px',
                                border: (activeSize?.size === s.size) ? '1px solid var(--color-gold)' : '1px solid rgba(255, 255, 255, 0.1)',
                                background: (activeSize?.size === s.size) ? 'rgba(201, 139, 91, 0.25)' : 'rgba(0, 0, 0, 0.3)',
                                color: (activeSize?.size === s.size) ? 'var(--color-gold)' : 'var(--color-text-muted)',
                                fontSize: '0.74rem',
                                fontWeight: 'bold',
                                cursor: 'pointer'
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
                          onClick={() => handleAddToCart(item)}
                          disabled={isOutOfStock}
                          aria-label={`Add ${item.name} to order`}
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
        </main>

        {/* 3D Order Cart Sidebar */}
        <aside className="scialla-cart-sidebar">
          <div className="cart-card-3d">
            <div className="cart-header">
              <div className="cart-title-wrapper">
                <h2 className="cart-title">Your Order</h2>
                <span className="cart-table-indicator-btn" style={{ cursor: 'default' }}>
                  <span className="table-label-text">{tableDisplayLabel}</span>
                </span>
              </div>
              <span className="cart-badge-count">
                {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
              </span>
            </div>

            <div className="cart-list">
              {cart.length === 0 ? (
                <div className="cart-empty-state">
                  <p className="empty-title">Your order is empty.</p>
                  <p className="empty-sub">Select coffee to start ordering.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="cart-item-card">
                    <div className="cart-item-top-row">
                      <div className="cart-item-title-block">
                        <span className="cart-item-name">{item.rawName || item.name}</span>
                        {item.size && <span className="cart-item-size">{item.size}</span>}
                      </div>
                      <button
                        type="button"
                        className="btn-cart-item-remove"
                        onClick={() => handleRemoveItem(item.id)}
                        title="Remove item"
                        aria-label="Remove item"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="cart-item-bottom-row">
                      <div className="cart-qty-wrapper">
                        <span className="cart-qty-label">Qty</span>
                        <div className="qty-stepper">
                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => handleUpdateQty(item.id, -1)}
                            title="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="qty-number">{item.qty}</span>
                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => handleUpdateQty(item.id, 1)}
                            title="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="cart-item-total-price">
                        ₱{(item.price * item.qty).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="cart-summary">
              <div className="summary-line">
                <span className="summary-label">Total Items</span>
                <span className="summary-value">{totalItemCount}</span>
              </div>
              <div className="summary-line total-line">
                <span className="total-label">Total</span>
                <span className="total-amount">₱{totalAmount.toFixed(2)}</span>
              </div>

              <button
                type="button"
                className="btn-3d-checkout"
                disabled={cart.length === 0}
                onClick={handleOpenCheckout}
              >
                Checkout • ₱{totalAmount.toFixed(2)}
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile Floating Bottom Order Bar */}
      {cart.length > 0 && (
        <div className="mobile-order-bottom-bar">
          <div className="mobile-order-bar-content">
            <div className="mobile-order-bar-info">
              <span className="mobile-order-bar-count">
                {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} &bull; {tableDisplayLabel}
              </span>
              <span className="mobile-order-bar-total">₱{totalAmount.toFixed(2)}</span>
            </div>
            <div className="mobile-order-bar-actions">
              <button
                type="button"
                className="mobile-order-bar-view-btn"
                onClick={handleOpenCheckout}
              >
                Checkout &bull; ₱{totalAmount.toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {isReceiptOpen && (
        <div
          className="receipt-modal-backdrop"
          onClick={() => !isPaid && setIsReceiptOpen(false)}
        >
          <div
            className="receipt-3d-card"
            onClick={(e) => e.stopPropagation()}
          >
            {!isPaid && (
              <button
                className="receipt-close-btn"
                onClick={() => setIsReceiptOpen(false)}
                title="Close receipt"
              >
                ✕
              </button>
            )}

            {!isPaid ? (
              <>
                <div className="receipt-header">
                  <h2 className="receipt-cafe-title">Scialla Cafe</h2>
                  <p style={{ fontSize: '0.78rem', color: '#7a6e62' }}>Official Order Receipt</p>
                  <span className="receipt-table-pill">{tableDisplayLabel}</span>
                  <div className="receipt-meta">
                    <span>Order: {orderMeta.orderNum}</span>
                    <span>{orderMeta.dateStr}</span>
                  </div>
                </div>

                <table className="receipt-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th style={{ textAlign: 'center' }}>Qty</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item) => (
                      <tr key={item.id}>
                        <td className="receipt-item-name">{item.name}</td>
                        <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{item.qty}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>₱{(item.price * item.qty).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="receipt-breakdown">
                  <div className="breakdown-row">
                    <span>Items Ordered</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{totalItemCount}</span>
                  </div>
                  <div className="breakdown-row grand-total">
                    <span>Total</span>
                    <span className="receipt-total-num">₱{totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="payment-section">
                  <label className="payment-label">Select Payment Method</label>
                  <div className="payment-options-grid">
                    {['GCash', 'Maya', 'Cash'].map((method) => (
                      <button
                        key={method}
                        type="button"
                        className={`payment-option-btn ${paymentMethod === method ? 'active' : ''}`}
                        onClick={() => setPaymentMethod(method)}
                      >
                        {method}
                      </button>
                    ))}
                  </div>

                  {/* Minimal QR Code Display for GCash and Maya */}
                  {(paymentMethod === 'GCash' || paymentMethod === 'Maya') && (
                    <div className="qr-payment-preview-box">
                      <div className="qr-box-header">
                        <span className="qr-brand-tag">{paymentMethod}</span>
                        <span className="qr-amount-tag">₱{totalAmount.toFixed(2)}</span>
                      </div>

                      <div className="qr-img-wrapper">
                        <img
                          src={paymentMethod === 'GCash' ? '/images/gcash-qr.svg' : '/images/maya-qr.svg'}
                          alt={`${paymentMethod} QR Code`}
                          className="payment-qr-code-img"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="checkout-actions-row">
                  <button
                    type="button"
                    className="btn-3d-cancel"
                    onClick={() => setIsReceiptOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-3d-pay"
                    onClick={handlePay}
                  >
                    Pay ₱{totalAmount.toFixed(2)} with {paymentMethod}
                  </button>
                </div>
              </>
            ) : (
              <div className="receipt-success-state">
                <div className="success-icon-badge">✓</div>
                <h3 className="success-title">Payment Received</h3>
                <p className="success-msg">
                  Thank you! Your order has been sent to the Staff Dashboard and is being prepared for <strong>{tableDisplayLabel}</strong>.
                </p>

                <div className="success-receipt-summary">
                  <div className="success-line">
                    <span className="success-label">Order Reference:</span>
                    <strong className="success-val-order">#{orderMeta.orderNum}</strong>
                  </div>
                  <div className="success-line">
                    <span className="success-label">Destination:</span>
                    <strong className="success-val-dest">{tableDisplayLabel}</strong>
                  </div>
                  <div className="success-line">
                    <span className="success-label">Payment Method:</span>
                    <strong style={{ color: '#1A0C06' }}>{paymentMethod}</strong>
                  </div>
                  <div className="success-line">
                    <span className="success-label">Total Paid:</span>
                    <strong className="success-val-total">₱{totalAmount.toFixed(2)}</strong>
                  </div>
                  {lastCustomerOrder && (lastCustomerOrder.accepted_by_name || lastCustomerOrder.completed_by_name) && (
                    <div className="success-staff-block">
                      {lastCustomerOrder.accepted_by_name && (
                        <div className="success-line">
                          <span className="success-label">Crafted / Accepted by:</span>
                          <strong className="success-val-staff">{lastCustomerOrder.accepted_by_name}</strong>
                        </div>
                      )}
                      {lastCustomerOrder.completed_by_name && (
                        <div className="success-line">
                          <span className="success-label">Delivered / Completed by:</span>
                          <strong className="success-val-delivered">{lastCustomerOrder.completed_by_name}</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button className="btn-3d-new-order" onClick={handleNewOrder}>
                  Start New Order
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PRODUCT CUSTOMIZATION MODAL */}
      {modalItem && (
        <div className="auth-modal-backdrop" onClick={() => setModalItem(null)} style={{ zIndex: 999999 }}>
          <div className="auth-modal-card product-detail-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <button className="auth-close-btn" onClick={() => setModalItem(null)}>✕</button>

            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <img
                src={modalItem.image || '/images/products/caramelmacc.png'}
                alt={modalItem.name}
                style={{ height: '130px', width: 'auto', objectFit: 'contain', margin: '0 auto 10px', borderRadius: '12px' }}
              />
              <h2 style={{ color: '#fff', fontSize: '1.35rem', margin: '0 0 6px' }}>{modalItem.name}</h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.84rem', margin: 0, lineHeight: '1.4' }}>{modalItem.description}</p>
            </div>

            {modalItem.sizes && (
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--color-gold)', marginBottom: '8px' }}>
                  Choose Size:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {modalItem.sizes.map((s) => (
                    <button
                      key={s.size}
                      type="button"
                      className={`size-pill-btn ${(modalSize?.size === s.size) ? 'active' : ''}`}
                      onClick={() => setModalSize(s)}
                      style={{
                        flex: 1,
                        padding: '10px 6px',
                        borderRadius: '10px',
                        border: (modalSize?.size === s.size) ? '1.5px solid var(--color-gold)' : '1px solid rgba(255, 255, 255, 0.15)',
                        background: (modalSize?.size === s.size) ? 'rgba(201, 139, 91, 0.3)' : 'rgba(0, 0, 0, 0.4)',
                        color: (modalSize?.size === s.size) ? 'var(--color-gold)' : '#fff',
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
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
                style={{ flex: 1, height: '42px', fontSize: '0.92rem', fontWeight: 'bold' }}
                onClick={() => {
                  handleAddToCart(modalItem, modalSize, modalQty);
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
