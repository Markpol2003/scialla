import React, { useState } from 'react';
import Live3DBackground from '../../Live3DBackground';
import { useApp } from '../../context/AppContext';
import '../../CoffeeMenu.css';

export default function CustomerMenuPage() {
  const { menuCategories, placeOrder, lastCustomerOrder } = useApp();

  const [cart, setCart] = useState([]);
  const [toastMessage, setToastMessage] = useState('');
  const [tableNumber, setTableNumber] = useState('4');

  // Checkout & Receipt Modal State
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('GCash');
  const [orderMeta, setOrderMeta] = useState({ orderNum: '', dateStr: '' });

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 2200);
  };

  const handleAddToCart = (item) => {
    if (!item.inStock) {
      triggerToast(`Sorry, ${item.name} is currently out of stock`);
      return;
    }
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((cartItem) => cartItem.id === item.id);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex] = {
          ...updated[existingIndex],
          qty: updated[existingIndex].qty + 1,
        };
        return updated;
      }
      return [...prevCart, { ...item, qty: 1 }];
    });
    triggerToast(`Added ${item.name} to order`);
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

      {/* Live Customer Order Tracking Banner */}
      {lastCustomerOrder && (
        <div className="live-order-tracker-banner">
          <div className="tracker-header">
            <span className="pulse-indicator"></span>
            <strong>Active Order Tracker: {lastCustomerOrder.id} ({lastCustomerOrder.table})</strong>
          </div>
          <div className="tracker-status-step">
            {lastCustomerOrder.status === 'new' && (
              <span className="status-pill status-new">⏳ Received by Staff (Pending Barista Acceptance)</span>
            )}
            {lastCustomerOrder.status === 'preparing' && (
              <span className="status-pill status-prep">☕ Barista is handcrafting your order now!</span>
            )}
            {lastCustomerOrder.status === 'ready' && (
              <span className="status-pill status-ready">✨ Ready! Serving to {lastCustomerOrder.table}</span>
            )}
            {lastCustomerOrder.status === 'completed' && (
              <span className="status-pill status-complete">✓ Delivered. Thank you for visiting Scialla!</span>
            )}
          </div>
        </div>
      )}

      {/* Sticky / Frozen Top Section */}
      <div className="scialla-sticky-top">
        <header className="scialla-header">
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
              {['1', '2', '3', '4', '5', 'Takeout'].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`table-chip-btn ${tableNumber === t ? 'active' : ''}`}
                  onClick={() => setTableNumber(t)}
                >
                  {t === 'Takeout' ? 'Takeout' : `Table ${t}`}
                </button>
              ))}
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
          {menuCategories.map((section) => (
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

                  return (
                    <div
                      key={item.id}
                      className={`coffee-card-3d ${item.featured ? 'featured-signature' : ''} ${isOutOfStock ? 'card-out-of-stock' : ''}`}
                    >
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
                <span className="cart-table-indicator">
                  Serving to: <strong>{tableDisplayLabel}</strong>
                </span>
              </div>
              <span className="cart-badge-count">
                {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
              </span>
            </div>

            <div className="cart-list">
              {cart.length === 0 ? (
                <div className="cart-empty-state">
                  <p>Your order is empty.</p>
                  <p style={{ marginTop: '4px', fontSize: '0.8rem' }}>Select coffee to start ordering.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="cart-item-row">
                    <div className="item-info">
                      <div className="item-row-name">{item.name}</div>
                    </div>

                    <div className="qty-stepper">
                      <button
                        className="qty-btn"
                        onClick={() => handleUpdateQty(item.id, -1)}
                        title="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="qty-number">{item.qty}</span>
                      <button
                        className="qty-btn"
                        onClick={() => handleUpdateQty(item.id, 1)}
                        title="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    <div className="item-row-total">
                      ₱{(item.price * item.qty).toFixed(2)}
                    </div>

                    <button
                      className="btn-remove-item"
                      onClick={() => handleRemoveItem(item.id)}
                      title="Remove item"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="cart-summary">
              <div className="summary-line">
                <span>Total Items</span>
                <span>{totalItemCount}</span>
              </div>
              <div className="summary-line total-line">
                <span>Total</span>
                <span className="total-amount">₱{totalAmount.toFixed(2)}</span>
              </div>

              <button
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

      {/* Mobile Floating Checkout Bar */}
      <div className={`mobile-checkout-bar ${cart.length > 0 ? 'active' : ''}`}>
        <div className="mobile-bar-info">
          <span className="mobile-bar-count">
            {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} • {tableDisplayLabel}
          </span>
          <span className="mobile-bar-total">₱{totalAmount.toFixed(2)}</span>
        </div>
        <button
          type="button"
          className="mobile-bar-btn"
          onClick={handleOpenCheckout}
        >
          Checkout →
        </button>
      </div>

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
                    {['GCash', 'Maya', 'Card', 'Cash'].map((method) => (
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
                </div>

                <button className="btn-3d-pay" onClick={handlePay}>
                  Pay ₱{totalAmount.toFixed(2)} with {paymentMethod}
                </button>
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
                    <strong>Destination:</strong>
                    <span style={{ color: '#C98B5B', fontWeight: 'bold' }}>{tableDisplayLabel}</span>
                  </div>
                  <div className="success-line">
                    <strong>Order Ref:</strong>
                    <span>{orderMeta.orderNum}</span>
                  </div>
                  <div className="success-line">
                    <strong>Payment Method:</strong>
                    <span>{paymentMethod}</span>
                  </div>
                  <div className="success-line">
                    <strong>Amount Paid:</strong>
                    <span>₱{totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <button className="btn-3d-new-order" onClick={handleNewOrder}>
                  Start New Order
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
