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
        {/* Header with clean action spacing */}
        <div className="cart-header">
          <div className="cart-title-wrapper">
            <h2 className="cart-title">Your Order</h2>
            <button
              type="button"
              className="cart-table-indicator-btn"
              onClick={onOpenTableModal}
              title="Click to change Table / Dining Option"
            >
              <span className="table-label-text">{tableDisplayLabel}</span>
              <span className="table-edit-badge">Edit</span>
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

        {/* Scrollable Cart Items List */}
        <div className="cart-list">
          {cart.length === 0 ? (
            <div className="cart-empty-state">
              <p className="empty-title">Your order is empty.</p>
              <p className="empty-sub">Select coffee to start ordering.</p>
            </div>
          ) : (
            cart.map((item) => {
              const hasAddons = Array.isArray(item.addons) && item.addons.length > 0;
              const canHaveAddons = onOpenAddonsModal && !String(item.id || '').startsWith('da') && !String(item.id || '').startsWith('fa');
              const itemTotalPrice = (item.price * item.qty).toFixed(2);

              return (
                <div key={item.id} className="cart-item-card">
                  {/* Top Row: Product Name on Left, Remove Button on Right */}
                  <div className="cart-item-top-row">
                    <div className="cart-item-title-block">
                      <span className="cart-item-name">{item.rawName || item.name}</span>
                      {item.size && <span className="cart-item-size">{item.size}</span>}
                    </div>
                    <button
                      type="button"
                      className="btn-cart-item-remove"
                      onClick={() => onRemoveItem(item.id)}
                      title="Remove item"
                      aria-label="Remove item"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Selected Add-ons Nested Section */}
                  {hasAddons && (
                    <div className="cart-addons-nested-box">
                      <span className="cart-addons-header-label">Add-ons</span>
                      <div className="cart-addons-items-list">
                        {item.addons.map((a, aIdx) => (
                          <div key={a.id || aIdx} className="cart-addon-row">
                            <span className="cart-addon-name">• {a.name}</span>
                            <span className="cart-addon-price">+₱{parseFloat(a.price).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Secondary Action: [ + Add-ons ] / [ Edit Add-ons ] */}
                  {canHaveAddons && (
                    <button
                      type="button"
                      className={`btn-cart-addon-action ${hasAddons ? 'is-edit' : ''}`}
                      onClick={() => onOpenAddonsModal(item)}
                      title={hasAddons ? 'Edit add-ons for this item' : 'Customize add-ons for this item'}
                    >
                      {hasAddons ? 'Edit Add-ons' : '+ Add-ons'}
                    </button>
                  )}

                  {/* Bottom Row: Quantity Stepper on Left, Item Total on Right */}
                  <div className="cart-item-bottom-row">
                    <div className="cart-qty-wrapper">
                      <span className="cart-qty-label">Qty</span>
                      <div className="qty-stepper">
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => onUpdateQty(item.id, -1)}
                          title="Decrease quantity"
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="qty-number">{item.qty}</span>
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => onUpdateQty(item.id, 1)}
                          title="Increase quantity"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="cart-item-total-price">
                      ₱{itemTotalPrice}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Totals Section */}
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
            onClick={onOpenCheckout}
          >
            Confirm Order • ₱{totalAmount.toFixed(2)}
          </button>
        </div>
      </div>
    </aside>
  );
}
