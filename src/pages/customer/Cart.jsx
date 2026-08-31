import React from 'react';

export default function Cart({
  cart,
  tableDisplayLabel,
  totalItemCount,
  totalAmount,
  onUpdateQty,
  onRemoveItem,
  onOpenAddonsModal,
  onOpenCheckout,
  onOpenTableModal,
  onCollapse
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
          <div className="cart-header-right-actions">
            <span className="cart-badge-count">
              {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
            </span>
            {onCollapse && (
              <button
                type="button"
                className="btn-cart-header-collapse"
                onClick={onCollapse}
                title="Collapse order panel"
              >
                <span>Hide</span>
                <span className="collapse-arrow-icon">▸</span>
              </button>
            )}
          </div>
        </div>

        <div className="cart-list">
          {cart.length === 0 ? (
            <div className="cart-empty-state">
              <p>Your order is empty.</p>
              <p style={{ marginTop: '4px', fontSize: '0.8rem' }}>Select coffee to start ordering.</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="cart-item-row" style={{ alignItems: 'flex-start' }}>
                <div className="item-info">
                  <div className="item-row-name">{item.rawName || item.name}</div>
                  {item.size && (
                    <div className="item-row-size">
                      {item.size}
                    </div>
                  )}

                  {/* Display selected add-ons if any */}
                  {Array.isArray(item.addons) && item.addons.length > 0 && (
                    <div className="cart-item-addons-list">
                      {item.addons.map((a, aIdx) => (
                        <div key={a.id || aIdx} className="cart-item-addon-line">
                          <span>+ {a.name}</span>
                          <span className="cart-item-addon-price">₱{parseFloat(a.price).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Proper secondary action: [ + Add-ons ] / [ Edit Add-ons ] */}
                  {onOpenAddonsModal && !String(item.id || '').startsWith('da') && !String(item.id || '').startsWith('fa') && (
                    <button
                      type="button"
                      className={`btn-cart-addon-pill ${item.addons && item.addons.length > 0 ? 'is-edit' : ''}`}
                      onClick={() => onOpenAddonsModal(item)}
                      title={item.addons && item.addons.length > 0 ? 'Edit add-ons for this item' : 'Customize add-ons for this item'}
                    >
                      {item.addons && item.addons.length > 0 ? 'Edit Add-ons' : '+ Add-ons'}
                    </button>
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
