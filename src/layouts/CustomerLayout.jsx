import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import Menu from '../pages/customer/Menu';
import Cart from '../pages/customer/Cart';
import Checkout from '../pages/customer/Checkout';
import OrderHistoryModal from '../components/customer/OrderHistoryModal';
import NotificationDropdown from '../components/customer/NotificationDropdown';
import ItemAddonsModal from '../components/customer/ItemAddonsModal';
import { Clock3, Bell, X } from 'lucide-react';
import '../CoffeeMenu.css';

export default function CustomerLayout({ onNavigate }) {
  const {
    lastCustomerOrder,
    setLastCustomerOrder,
    orders,
    toastMessage,
    unreadNotificationsCount,
    hasNewNotifPulse,
    markNotificationsAsRead
  } = useApp();

  const occupiedTables = (orders || [])
    .filter((o) => ['new', 'preparing', 'ready'].includes(o.status))
    .filter((o) => o.table && !o.table.toLowerCase().includes('takeout'))
    .map((o) => {
      const match = String(o.table).match(/\d+/);
      return match ? String(parseInt(match[0], 10)) : String(o.table).trim();
    });

  const [cart, setCart] = useState([]);
  const [tableNumber, setTableNumber] = useState('4');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isCartCollapsed, setIsCartCollapsed] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [cartVisible, setCartVisible] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [addonModalItem, setAddonModalItem] = useState(null);
  const prevCartLenRef = useRef(0);

  // Track cart visibility for animation
  useEffect(() => {
    if (cart.length > 0 && prevCartLenRef.current === 0) {
      // First item added — trigger appear animation
      requestAnimationFrame(() => setCartVisible(true));
    } else if (cart.length === 0 && prevCartLenRef.current > 0) {
      // Last item removed — trigger disappear
      setCartVisible(false);
      setIsCartCollapsed(false);
      setIsMobileCartOpen(false);
      setIsClearConfirmOpen(false);
    }
    prevCartLenRef.current = cart.length;
  }, [cart.length]);

  const handleAddToCart = (item, customSize = null, customQty = 1) => {
    const activeSize = item.sizes ? (customSize || item.sizes[0]) : null;
    const sizeLabel = activeSize ? (activeSize.label || activeSize.size) : '';
    const cartItemId = activeSize ? `${item.id}-${activeSize.size}` : item.id;
    const cartItemName = activeSize ? `${item.name} (${activeSize.size})` : item.name;
    const itemPrice = activeSize ? activeSize.price : item.price;

    setCart((prevCart) => {
      const idx = prevCart.findIndex((c) => c.id === cartItemId && (!c.addons || c.addons.length === 0));
      if (idx > -1) {
        const updated = [...prevCart];
        updated[idx] = { ...updated[idx], qty: updated[idx].qty + customQty };
        return updated;
      }
      return [
        ...prevCart,
        {
          id: cartItemId,
          name: cartItemName,
          rawName: item.name,
          size: sizeLabel,
          basePrice: itemPrice,
          price: itemPrice,
          qty: customQty,
          originalId: item.id,
          category: item.category,
          addons: []
        }
      ];
    });
  };

  const handleSaveItemAddons = (cartItemId, chosenAddons) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id === cartItemId) {
          const basePrice = item.basePrice || item.price;
          const addonsTotal = (chosenAddons || []).reduce((sum, a) => sum + (parseFloat(a.price) || 0), 0);
          return {
            ...item,
            basePrice: basePrice,
            price: basePrice + addonsTotal,
            addons: chosenAddons || []
          };
        }
        return item;
      })
    );
  };

  const handleUpdateQty = (id, delta) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => (item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item))
        .filter((item) => item.qty > 0)
    );
  };

  const handleRemoveItem = (id) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  const handleClearCartClick = () => {
    if (cart.length <= 1) {
      setCart([]);
    } else {
      setIsClearConfirmOpen(true);
    }
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalItemCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const tableDisplayLabel = tableNumber.toLowerCase() === 'takeout'
    ? 'Takeout'
    : `Table #${tableNumber || '01'}`;

  return (
    <div className="scialla-container">
      {/* COMPACT SINGLE-ROW HEADER */}
      <header className="scialla-unified-header">
        <div className="header-compact-row">
          {/* Left: Balanced spacer */}
          <div className="header-side-spacer" />

          {/* Center: Brand & Tagline */}
          <div className="scialla-customer-brand" title="Scialla Cafe">
            <span className="customer-brand-title">
              <span className="brand-name">
                {'Scialla Cafe'.split('').map((char, index) => (
                  <span
                    key={index}
                    className="brand-char"
                    style={{ animationDelay: `${index * 35}ms` }}
                  >
                    {char === ' ' ? '\u00A0' : char}
                  </span>
                ))}
              </span>
              <span
                className="brand-dot"
                style={{ animationDelay: `${12 * 35}ms` }}
              >
                .
              </span>
            </span>
            <span className="customer-brand-tagline">Crafted coffee, made for your table.</span>
          </div>

          {/* Right: Clean Interactive Table Badge + History & Bell Icons */}
          <div className="header-table-right">
            <button
              type="button"
              className="header-table-badge-btn"
              onClick={() => setIsTableModalOpen(true)}
              title="Click to change your table number or order type"
            >
              <span className="table-badge-label">
                {tableNumber.toLowerCase() === 'takeout' ? 'Takeout' : `Table #${tableNumber || '1'}`}
              </span>
              <span className="table-badge-change">Change ▾</span>
            </button>

            {/* ORDER HISTORY ICON */}
            <button
              type="button"
              className={`header-icon-btn ${isHistoryOpen ? 'active' : ''}`}
              onClick={() => {
                setIsHistoryOpen(!isHistoryOpen);
                setIsNotificationsOpen(false);
              }}
              title="Order History"
              aria-label="Order History"
            >
              <Clock3 size={17} />
            </button>

            {/* NOTIFICATION BELL ICON */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className={`header-icon-btn ${isNotificationsOpen ? 'active' : ''} ${hasNewNotifPulse ? 'notif-pulse' : ''}`}
                onClick={() => {
                  const nextState = !isNotificationsOpen;
                  setIsNotificationsOpen(nextState);
                  setIsHistoryOpen(false);
                }}
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell size={17} />
                {unreadNotificationsCount > 0 && (
                  <span className="header-badge-count">{unreadNotificationsCount}</span>
                )}
              </button>

              <NotificationDropdown
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
              />
            </div>
          </div>
        </div>
      </header>

      {/* TABLE SELECTOR MODAL */}
      {isTableModalOpen && (
        <div className="receipt-modal-backdrop" onClick={() => setIsTableModalOpen(false)} style={{ zIndex: 999999 }}>
          <div className="auth-modal-card table-select-modal" onClick={(e) => e.stopPropagation()}>
            <button className="receipt-close-btn" onClick={() => setIsTableModalOpen(false)}>✕</button>

            <div className="table-modal-header">
              <h2 className="table-modal-title">Where are you dining?</h2>
              <p className="table-modal-sub">Select your table number or choose takeout</p>
            </div>

            {/* Dine In vs Takeout Selection */}
            <div className="order-type-switch-row">
              <button
                type="button"
                className={`order-type-btn ${tableNumber.toLowerCase() !== 'takeout' ? 'active' : ''}`}
                onClick={() => setTableNumber(tableNumber.toLowerCase() === 'takeout' ? '1' : tableNumber)}
              >
                Dine In
              </button>
              <button
                type="button"
                className={`order-type-btn ${tableNumber.toLowerCase() === 'takeout' ? 'active' : ''}`}
                onClick={() => {
                  setTableNumber('Takeout');
                  setIsTableModalOpen(false);
                }}
              >
                Take Out
              </button>
            </div>

            {tableNumber.toLowerCase() !== 'takeout' && (
              <>
                <div className="table-quick-label">Quick Select Table</div>
                <div className="table-quick-grid">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map((num) => {
                    const isOccupied = occupiedTables.includes(num);
                    const isSelected = tableNumber === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        className={`table-quick-num-btn ${isSelected ? 'active' : ''} ${isOccupied ? 'occupied' : ''}`}
                        onClick={() => {
                          setTableNumber(num);
                          setIsTableModalOpen(false);
                        }}
                      >
                        <span className="table-num-val">#{num}</span>
                        {isOccupied && <span className="table-num-active-tag">Active</span>}
                      </button>
                    );
                  })}
                </div>

                <div className="table-custom-box">
                  <label className="table-custom-label">
                    Or enter custom table / booth:
                  </label>
                  <div className="table-custom-input-row">
                    <input
                      type="text"
                      placeholder="e.g. 12, Balcony 2, VIP"
                      value={tableNumber.toLowerCase() === 'takeout' ? '' : tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      className="table-custom-input-field"
                    />
                    <button
                      type="button"
                      className="btn-table-custom-save"
                      onClick={() => setIsTableModalOpen(false)}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </>
            )}

            <button
              type="button"
              className="btn-confirm-table"
              onClick={() => setIsTableModalOpen(false)}
            >
              Confirm Selection ({tableDisplayLabel})
            </button>
          </div>
        </div>
      )}

      {/* Sleek Compact Live Order Tracker */}
      {lastCustomerOrder && (
        <div className="live-order-tracker-banner">
          <div className="tracker-left">
            <div className="tracker-live-tag">
              <span className="pulse-indicator" />
              <strong className="tracker-order-id">#{lastCustomerOrder.id}</strong>
              <span className="tracker-table-badge">{lastCustomerOrder.table}</span>
            </div>

            <div className="tracker-status-pill-wrap">
              {(lastCustomerOrder.status === 'new' || lastCustomerOrder.status === 'received') && (
                <span className="status-pill status-new">Order Received • Waiting for barista</span>
              )}
              {(lastCustomerOrder.status === 'preparing' || lastCustomerOrder.status === 'accepted') && (
                <span className="status-pill status-prep">
                  Accepted & Preparing{lastCustomerOrder.accepted_by_name ? ` • Crafted by ${lastCustomerOrder.accepted_by_name}` : ''}
                </span>
              )}
              {lastCustomerOrder.status === 'ready' && (
                <span className="status-pill status-ready">
                  Crafted • Ready for pickup!{lastCustomerOrder.accepted_by_name ? ` (Crafted by ${lastCustomerOrder.accepted_by_name})` : ''}
                </span>
              )}
              {lastCustomerOrder.status === 'completed' && (
                <span className="status-pill status-complete">
                  Completed{lastCustomerOrder.completed_by_name ? ` by ${lastCustomerOrder.completed_by_name}` : ''} • Thank you for visiting!
                </span>
              )}
            </div>
          </div>

          <div className="tracker-right">
            {/* Compact 4-Step Stepper */}
            <div className="tracker-mini-stepper">
              <div className={`mini-node ${['new', 'received', 'preparing', 'accepted', 'ready', 'completed'].includes(lastCustomerOrder.status) ? 'active' : ''}`}>
                <span className="mini-dot">1</span>
                <span className="mini-label">Received</span>
              </div>
              <div className={`mini-line ${['preparing', 'accepted', 'ready', 'completed'].includes(lastCustomerOrder.status) ? 'active-line' : ''}`} />
              <div className={`mini-node ${['preparing', 'accepted', 'ready', 'completed'].includes(lastCustomerOrder.status) ? 'active' : ''}`}>
                <span className="mini-dot">2</span>
                <span className="mini-label">Preparing</span>
              </div>
              <div className={`mini-line ${['ready', 'completed'].includes(lastCustomerOrder.status) ? 'active-line' : ''}`} />
              <div className={`mini-node ${['ready', 'completed'].includes(lastCustomerOrder.status) ? 'active' : ''}`}>
                <span className="mini-dot">3</span>
                <span className="mini-label">Crafted</span>
              </div>
              <div className={`mini-line ${lastCustomerOrder.status === 'completed' ? 'active-line' : ''}`} />
              <div className={`mini-node ${lastCustomerOrder.status === 'completed' ? 'active' : ''}`}>
                <span className="mini-dot">4</span>
                <span className="mini-label">Completed</span>
              </div>
            </div>

            <button
              type="button"
              className="btn-dismiss-tracker"
              onClick={() => setLastCustomerOrder(null)}
              title="Dismiss tracker"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content + Floating Cart Sidebar */}
      <div className={`scialla-layout ${cart.length === 0 ? 'cart-empty' : ''}`}>
        <Menu onAddToCart={handleAddToCart} cart={cart} />

        {/* Desktop Floating Cart Panel */}
        {cart.length > 0 && (
          <div className={`floating-cart-wrapper ${cartVisible ? 'visible' : ''} ${isCartCollapsed ? 'collapsed' : ''}`}>
            {!isCartCollapsed ? (
              <Cart
                cart={cart}
                tableDisplayLabel={tableDisplayLabel}
                totalItemCount={totalItemCount}
                totalAmount={totalAmount}
                onUpdateQty={handleUpdateQty}
                onRemoveItem={handleRemoveItem}
                onOpenAddonsModal={setAddonModalItem}
                onOpenCheckout={() => setIsCheckoutOpen(true)}
                onOpenTableModal={() => setIsTableModalOpen(true)}
                onCollapse={() => setIsCartCollapsed(true)}
              />
            ) : (
              <button
                type="button"
                className="floating-cart-mini-bar"
                onClick={() => setIsCartCollapsed(false)}
                title="Click to view and expand your order panel"
              >
                <div className="mini-bar-left">
                  <div className="mini-bar-cart-icon">🛒</div>
                  <div className="mini-bar-info">
                    <span className="mini-bar-heading">Your Order</span>
                    <span className="mini-bar-count">
                      {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} • {tableDisplayLabel}
                    </span>
                  </div>
                </div>
                <div className="mini-bar-right">
                  <span className="mini-bar-total">₱{totalAmount.toFixed(2)}</span>
                  <span className="mini-bar-expand-badge">View Order ◂</span>
                </div>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Mobile Sticky Bottom Order Bar (Visible when cart has items on mobile) */}
      {cart.length > 0 && (
        <div className="mobile-order-bottom-bar">
          <div className="mobile-order-bar-content">
            <div className="mobile-order-bar-top-row">
              <span className="mobile-order-bar-count">
                {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} &bull; {tableDisplayLabel}
              </span>
              <button
                type="button"
                className="mobile-order-bar-close-btn"
                onClick={handleClearCartClick}
                title="Clear current order"
                aria-label="Clear current order"
              >
                <X size={14} />
              </button>
            </div>
            <div className="mobile-order-bar-bottom-row">
              <span className="mobile-order-bar-total">₱{totalAmount.toFixed(2)}</span>
              <button
                type="button"
                className="mobile-order-bar-view-btn"
                onClick={() => setIsMobileCartOpen(true)}
              >
                View Order &bull; ₱{totalAmount.toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Cart Bottom Sheet / Drawer */}
      {isMobileCartOpen && cart.length > 0 && (
        <div className="mobile-cart-sheet-backdrop" onClick={() => setIsMobileCartOpen(false)}>
          <div className="mobile-cart-sheet-container" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-cart-sheet-handle" />

            <div className="mobile-cart-sheet-header">
              <div className="mobile-cart-sheet-title-group">
                <h2 className="mobile-cart-sheet-title">Your Order</h2>
                <button
                  type="button"
                  className="mobile-cart-table-pill"
                  onClick={() => {
                    setIsMobileCartOpen(false);
                    setIsTableModalOpen(true);
                  }}
                  title="Change Table / Dining Option"
                >
                  <span>{tableDisplayLabel}</span>
                  <span style={{ fontSize: '0.68rem', opacity: 0.8 }}>Change ▾</span>
                </button>
              </div>
              <button
                type="button"
                className="mobile-cart-sheet-close-btn"
                onClick={() => setIsMobileCartOpen(false)}
                title="Close order drawer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Order Items List */}
            <div className="mobile-cart-items-scroll">
              {cart.map((item) => {
                const hasAddons = Array.isArray(item.addons) && item.addons.length > 0;
                const canHaveAddons = !String(item.id || '').startsWith('da') && !String(item.id || '').startsWith('fa');
                const itemTotalPrice = (item.price * item.qty).toFixed(2);

                return (
                  <div key={item.id} className="mobile-cart-item-card">
                    {/* Top Row: Name on Left, Remove on Right */}
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

                    {/* Selected Add-ons Nested Inset Section */}
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
                        onClick={() => {
                          setIsMobileCartOpen(false);
                          setAddonModalItem(item);
                        }}
                        title={hasAddons ? 'Edit add-ons for this item' : 'Customize add-ons for this item'}
                      >
                        {hasAddons ? 'Edit Add-ons' : '+ Add-ons'}
                      </button>
                    )}

                    {/* Bottom Row: Qty Stepper on Left, Total Price on Right */}
                    <div className="cart-item-bottom-row">
                      <div className="cart-qty-wrapper">
                        <span className="cart-qty-label">Qty</span>
                        <div className="qty-stepper">
                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => handleUpdateQty(item.id, -1)}
                            title="Decrease quantity"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="qty-number">{item.qty}</span>
                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => handleUpdateQty(item.id, 1)}
                            title="Increase quantity"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <span className="cart-item-total-price">
                        ₱{itemTotalPrice}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sticky Bottom Summary & Always-Accessible Checkout */}
            <div className="mobile-cart-sheet-footer">
              <div className="mobile-cart-summary-line">
                <span>Total Items</span>
                <span>{totalItemCount}</span>
              </div>
              <div className="mobile-cart-summary-line total-line">
                <span>Total</span>
                <span className="mobile-cart-total-amount">₱{totalAmount.toFixed(2)}</span>
              </div>

              <button
                type="button"
                className="btn-3d-checkout mobile-sheet-checkout-btn"
                onClick={() => {
                  setIsMobileCartOpen(false);
                  setIsCheckoutOpen(true);
                }}
              >
                Checkout &bull; ₱{totalAmount.toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Add-ons Customization Modal */}
      {addonModalItem && (
        <ItemAddonsModal
          isOpen={!!addonModalItem}
          item={addonModalItem}
          onClose={() => setAddonModalItem(null)}
          onSave={handleSaveItemAddons}
        />
      )}

      {/* Checkout Modal */}
      <Checkout
        isOpen={isCheckoutOpen}
        cart={cart}
        tableDisplayLabel={tableDisplayLabel}
        totalAmount={totalAmount}
        totalItemCount={totalItemCount}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderPlaced={() => setCart([])}
      />

      {/* Order History Modal */}
      <OrderHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      {/* Clear Order Confirmation Modal (Shown when clearing > 1 item) */}
      {isClearConfirmOpen && (
        <div className="receipt-modal-backdrop" onClick={() => setIsClearConfirmOpen(false)} style={{ zIndex: 100002 }}>
          <div className="auth-modal-card" style={{ maxWidth: '340px', padding: '22px 20px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.08rem', fontWeight: 800, color: '#1A0C06' }}>
              Clear your current order?
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '0.82rem', color: '#6A584D', lineHeight: 1.4 }}>
              This will remove all {totalItemCount} items from your unsubmitted order.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid var(--border-medium)',
                  background: '#F8F4EE',
                  color: '#6A584D',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
                onClick={() => setIsClearConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'var(--danger)',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(199, 75, 75, 0.3)'
                }}
                onClick={() => {
                  setCart([]);
                  setIsClearConfirmOpen(false);
                }}
              >
                Clear Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global In-App Toast Notification */}
      {toastMessage && (
        <div className="scialla-toast" style={{ zIndex: 9999999 }}>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
