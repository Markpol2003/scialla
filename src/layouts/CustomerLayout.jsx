import React, { useState } from 'react';
import Live3DBackground from '../Live3DBackground';
import { useApp } from '../context/AppContext';
import Menu from '../pages/customer/Menu';
import Cart from '../pages/customer/Cart';
import Checkout from '../pages/customer/Checkout';
import LoginPage from '../pages/auth/LoginPage';
import UserProfileDropdown from '../components/UserProfileDropdown';
import '../CoffeeMenu.css';

export default function CustomerLayout({ onNavigate }) {
  const { lastCustomerOrder, setLastCustomerOrder, currentUser, orders } = useApp();

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

  return (
    <div className="scialla-container">
      {/* Live 3D Background */}
      <Live3DBackground />

      {/* ONE UNIFIED HEADER BLOCK (No Hole / Gap In Between!) */}
      <header className="scialla-unified-header">
        {/* Top Row: Brand & SIGN IN Button / User Dropdown */}
        <div className="unified-top-row">
          <div className="nav-brand">
            <span className="brand-name">Scialla</span>
            <span className="brand-role-tag">• Coffee Menu</span>
          </div>

          <div className="nav-portal-links">
            {currentUser ? (
              <div className="nav-portal-user-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {(currentUser.role === 'staff' || currentUser.role === 'manager') && (
                  <button
                    type="button"
                    className={`btn-return-portal ${currentUser.role === 'manager' ? 'return-manager' : 'return-staff'}`}
                    onClick={() => onNavigate(currentUser.role === 'manager' ? '/manager' : '/staff')}
                    title={`Return to ${currentUser.role === 'manager' ? 'Manager' : 'Staff'} Portal`}
                  >
                    ⚡ {currentUser.role === 'manager' ? 'Manager' : 'Staff'} Dashboard
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
                SIGN IN
              </button>
            )}
          </div>
        </div>

        {/* Title Row */}
        <div className="scialla-header">
          <h1 className="scialla-title">
            Scialla <span className="scialla-title-accent"></span> Cafe
          </h1>
          <p className="scialla-subtitle">Artisanal Coffee & Handcrafted Brews</p>
        </div>

        {/* Table Selector Row */}
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
                    title={isOccupied ? `Table ${t} has an active order (Occupied)` : `Table ${t} is available`}
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
      </header>

      {/* Live Order Tracking Banner */}
      {lastCustomerOrder && (
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
            <div className={`stepper-node ${['new', 'preparing', 'ready', 'completed'].includes(lastCustomerOrder.status) ? 'active' : ''}`}>
              <span className="node-dot">1</span>
              <span className="node-label">Received</span>
            </div>
            <div className={`stepper-line ${['preparing', 'ready', 'completed'].includes(lastCustomerOrder.status) ? 'active-line' : ''}`} />
            <div className={`stepper-node ${['preparing', 'ready', 'completed'].includes(lastCustomerOrder.status) ? 'active' : ''}`}>
              <span className="node-dot">2</span>
              <span className="node-label">Preparing</span>
            </div>
            <div className={`stepper-line ${['ready', 'completed'].includes(lastCustomerOrder.status) ? 'active-line' : ''}`} />
            <div className={`stepper-node ${['ready', 'completed'].includes(lastCustomerOrder.status) ? 'active' : ''}`}>
              <span className="node-dot">3</span>
              <span className="node-label">{lastCustomerOrder.table.toLowerCase().includes('takeout') ? 'Counter Pickup' : 'Ready to Serve'}</span>
            </div>
            <div className={`stepper-line ${lastCustomerOrder.status === 'completed' ? 'active-line' : ''}`} />
            <div className={`stepper-node ${lastCustomerOrder.status === 'completed' ? 'active' : ''}`}>
              <span className="node-dot">4</span>
              <span className="node-label">Delivered</span>
            </div>
          </div>

          <div className="tracker-status-step">
            {lastCustomerOrder.status === 'new' && (
              <span className="status-pill status-new">Received by Barista • Preparing to accept...</span>
            )}
            {lastCustomerOrder.status === 'preparing' && (
              <span className="status-pill status-prep">Barista is handcrafting your order now!</span>
            )}
            {lastCustomerOrder.status === 'ready' && (
              <span className="status-pill status-ready">
                {lastCustomerOrder.table.toLowerCase().includes('takeout')
                  ? 'Ready for Counter Pickup! Present Order #' + lastCustomerOrder.id
                  : `Ready! Serving to ${lastCustomerOrder.table}`}
              </span>
            )}
            {lastCustomerOrder.status === 'completed' && (
              <span className="status-pill status-complete">Completed & Delivered. Thank you for visiting Scialla!</span>
            )}
          </div>
        </div>
      )}

      {/* Main Content & Cart Sidebar */}
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
    </div>
  );
}
