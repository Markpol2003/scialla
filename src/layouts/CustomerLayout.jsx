import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import Menu from '../pages/customer/Menu';
import Cart from '../pages/customer/Cart';
import Checkout from '../pages/customer/Checkout';
import OrderHistoryModal from '../components/customer/OrderHistoryModal';
import NotificationDropdown from '../components/customer/NotificationDropdown';
import { Clock3, Bell } from 'lucide-react';
import '../CoffeeMenu.css';

export default function CustomerLayout({ onNavigate }) {
  const {
    lastCustomerOrder,
    setLastCustomerOrder,
    orders,
    toastMessage,
    unreadNotificationsCount,
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
  const [cartVisible, setCartVisible] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
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
      const idx = prevCart.findIndex((c) => c.id === cartItemId);
      if (idx > -1) {
        const updated = [...prevCart];
        updated[idx] = { ...updated[idx], qty: updated[idx].qty + customQty };
        return updated;
      }
      return [...prevCart, { id: cartItemId, name: cartItemName, rawName: item.name, size: sizeLabel, price: itemPrice, qty: customQty, originalId: item.id }];
    });
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

          {/* Center: Brand */}
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
                className={`header-icon-btn ${isNotificationsOpen ? 'active' : ''}`}
                onClick={() => {
                  const nextState = !isNotificationsOpen;
                  setIsNotificationsOpen(nextState);
                  setIsHistoryOpen(false);
                  if (nextState && unreadNotificationsCount > 0) {
                    markNotificationsAsRead();
                  }
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
              {lastCustomerOrder.status === 'new' && (
                <span className="status-pill status-new">Order Received • Barista in queue</span>
              )}
              {lastCustomerOrder.status === 'preparing' && (
                <span className="status-pill status-prep">Barista is handcrafting your order</span>
              )}
              {lastCustomerOrder.status === 'ready' && (
                <span className="status-pill status-ready">
                  {(lastCustomerOrder.table || '').toLowerCase().includes('takeout')
                    ? 'Ready for Counter Pickup!'
                    : `Ready! Serving to ${lastCustomerOrder.table || 'Table'}`}
                </span>
              )}
              {lastCustomerOrder.status === 'completed' && (
                <span className="status-pill status-complete">Completed • Enjoy your visit!</span>
              )}
            </div>
          </div>

          <div className="tracker-right">
            {/* Compact 4-Step Stepper */}
            <div className="tracker-mini-stepper">
              <div className={`mini-node ${['new', 'preparing', 'ready', 'completed'].includes(lastCustomerOrder.status) ? 'active' : ''}`}>
                <span className="mini-dot">1</span>
                <span className="mini-label">Accepted</span>
              </div>
              <div className={`mini-line ${['preparing', 'ready', 'completed'].includes(lastCustomerOrder.status) ? 'active-line' : ''}`} />
              <div className={`mini-node ${['preparing', 'ready', 'completed'].includes(lastCustomerOrder.status) ? 'active' : ''}`}>
                <span className="mini-dot">2</span>
                <span className="mini-label">Crafting</span>
              </div>
              <div className={`mini-line ${['ready', 'completed'].includes(lastCustomerOrder.status) ? 'active-line' : ''}`} />
              <div className={`mini-node ${['ready', 'completed'].includes(lastCustomerOrder.status) ? 'active' : ''}`}>
                <span className="mini-dot">3</span>
                <span className="mini-label">Ready</span>
              </div>
              <div className={`mini-line ${lastCustomerOrder.status === 'completed' ? 'active-line' : ''}`} />
              <div className={`mini-node ${lastCustomerOrder.status === 'completed' ? 'active' : ''}`}>
                <span className="mini-dot">4</span>
                <span className="mini-label">Done</span>
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

      {/* Mobile Floating Checkout Bar */}
      <div className={`mobile-checkout-bar ${cart.length > 0 ? 'active' : ''}`}>
        <div className="mobile-bar-info">
          <span className="mobile-bar-count">
            {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} • {tableDisplayLabel}
          </span>
          <span className="mobile-bar-total">₱{totalAmount.toFixed(2)}</span>
        </div>
        <div className="mobile-bar-actions">
          <button
            type="button"
            className="mobile-bar-cancel-btn"
            onClick={() => setCart([])}
            title="Cancel / Clear Order"
          >
            Cancel
          </button>
          <button
            type="button"
            className="mobile-bar-btn"
            onClick={() => setIsMobileCartOpen(true)}
          >
            View Order
          </button>
        </div>
      </div>

      {/* Mobile Cart Bottom Sheet */}
      {isMobileCartOpen && (
        <div className="mobile-cart-sheet-backdrop" onClick={() => setIsMobileCartOpen(false)}>
          <div className="mobile-cart-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-cart-sheet-handle" />
            <Cart
              cart={cart}
              tableDisplayLabel={tableDisplayLabel}
              totalItemCount={totalItemCount}
              totalAmount={totalAmount}
              onUpdateQty={handleUpdateQty}
              onRemoveItem={handleRemoveItem}
              onOpenCheckout={() => { setIsMobileCartOpen(false); setIsCheckoutOpen(true); }}
              onOpenTableModal={() => { setIsMobileCartOpen(false); setIsTableModalOpen(true); }}
            />
            <button
              type="button"
              className="mobile-cart-sheet-close"
              onClick={() => setIsMobileCartOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
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

      {/* Global In-App Toast Notification */}
      {toastMessage && (
        <div className="scialla-toast" style={{ zIndex: 9999999 }}>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
