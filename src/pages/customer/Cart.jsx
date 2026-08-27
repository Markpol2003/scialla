import React from 'react';

export default function Cart({
  cart,
  tableDisplayLabel,
  totalItemCount,
  totalAmount,
  onUpdateQty,
  onRemoveItem,
  onOpenCheckout,
  onOpenTableModal
}) {
  return (
    <aside className="scialla-cart-sidebar">
      <div className="cart-card-3d">
        <div className="cart-header">
          <div className="cart-title-wrapper">
            <h2 className="cart-title">Your Order</h2>
            <button
              type="button"
              className="cart-table-indicator-btn"
              onClick={onOpenTableModal}
              title="Click to change Table / Dining Option"
            >
              <span>{tableDisplayLabel}</span>
              <span style={{ fontSize: '0.68rem', opacity: 0.7 }}>Edit</span>
            </button>
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
                  <div className="item-row-name">{item.rawName || item.name}</div>
                  {item.size && (
                    <div className="item-row-size">
                      {item.size}
                    </div>
                  )}
                </div>

                <div className="qty-stepper">
                  <button
                    className="qty-btn"
                    onClick={() => onUpdateQty(item.id, -1)}
                    title="Decrease quantity"
                  >
                    -
                  </button>
                  <span className="qty-number">{item.qty}</span>
                  <button
                    className="qty-btn"
                    onClick={() => onUpdateQty(item.id, 1)}
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
                  onClick={() => onRemoveItem(item.id)}
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
            onClick={onOpenCheckout}
          >
            Checkout • ₱{totalAmount.toFixed(2)}
          </button>
        </div>
      </div>
    </aside>
  );
}
