import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Menu from '../pages/customer/Menu';
import Cart from '../pages/customer/Cart';
import Checkout from '../pages/customer/Checkout';
import LoginPage from '../pages/auth/LoginPage';
import UserProfileDropdown from '../components/UserProfileDropdown';
import '../CoffeeMenu.css';

export default function CustomerLayout({ onNavigate }) {
  const { lastCustomerOrder, setLastCustomerOrder, currentUser, orders, toastMessage } = useApp();

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
  const [isAuthOpen, setIsAuthOpen] = useState(false);

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

  const [isTableModalOpen, setIsTableModalOpen] = useState(false);

  return (
    <div className="scialla-container">
      {/* COMPACT SINGLE-ROW HEADER */}
      <header className="scialla-unified-header">
        <div className="header-compact-row">
          {/* Left: Brand with Waving Animation */}
          <div className="scialla-customer-brand" title="Scialla Cafe">
            <span className="customer-brand-title brand-wave">
              {'Scialla Cafe'.split('').map((char, index) => (
                <span
                  key={index}
                  className={`wave-char ${char === ' ' ? 'wave-space' : ''}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {char === ' ' ? '\u00A0' : char}
                </span>
              ))}
            </span>
          </div>

          {/* Center: Clean Interactive Table Badge */}
          <div className="header-table-center">
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
          </div>

          {/* Right: Auth / Portal */}
          <div className="nav-portal-links">
            {currentUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {(currentUser.role === 'staff' || currentUser.role === 'manager') && (
                  <button
                    type="button"
                    className="btn-return-portal"
                    onClick={() => onNavigate(currentUser.role === 'manager' ? '/manager' : '/staff')}
                  >
                    {currentUser.role === 'manager' ? 'Manager' : 'Staff'}
                  </button>
                )}
                <UserProfileDropdown onNavigate={onNavigate} />
              </div>
            ) : (
              <button
                type="button"
                className="btn-single-signin"
                onClick={() => setIsAuthOpen(true)}
              >
                Sign In
              </button>
            )}
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
                <span className="mini-label">Received</span>
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

      {/* Main Content + Cart Sidebar (2-column grid) */}
      <div className="scialla-layout">
        <Menu onAddToCart={handleAddToCart} cart={cart} />

        <Cart
          cart={cart}
          tableDisplayLabel={tableDisplayLabel}
          totalItemCount={totalItemCount}
          totalAmount={totalAmount}
          onUpdateQty={handleUpdateQty}
          onRemoveItem={handleRemoveItem}
          onOpenCheckout={() => setIsCheckoutOpen(true)}
          onOpenTableModal={() => setIsTableModalOpen(true)}
        />
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
          onClick={() => setIsCheckoutOpen(true)}
        >
          Checkout →
        </button>
      </div>

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

      {/* SIGN IN Auth Portal Modal Overlay */}
      {isAuthOpen && (
        <LoginPage
          targetRole="staff"
          onNavigate={onNavigate}
          onClose={() => setIsAuthOpen(false)}
        />
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
