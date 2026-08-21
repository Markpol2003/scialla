import React, { useState } from 'react';
import Live3DBackground from '../Live3DBackground';
import { useApp } from '../context/AppContext';
import Menu from '../pages/customer/Menu';
import Cart from '../pages/customer/Cart';
import Checkout from '../pages/customer/Checkout';
import LoginPage from '../pages/auth/LoginPage';
import '../CoffeeMenu.css';

export default function CustomerLayout({ onNavigate }) {
  const { lastCustomerOrder, currentUser, logout } = useApp();

  const [cart, setCart] = useState([]);
  const [tableNumber, setTableNumber] = useState('4');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const handleAddToCart = (item) => {
    setCart((prevCart) => {
      const idx = prevCart.findIndex((c) => c.id === item.id);
      if (idx > -1) {
        const updated = [...prevCart];
        updated[idx] = { ...updated[idx], qty: updated[idx].qty + 1 };
        return updated;
      }
      return [...prevCart, { ...item, qty: 1 }];
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
        {/* Top Row: Brand & SIGN IN Button */}
        <div className="unified-top-row">
          <div className="nav-brand">
            <span className="brand-name">Scialla</span>
            <span className="brand-role-tag">• Coffee Menu</span>
          </div>

          <div className="nav-portal-links">
            {currentUser ? (
              <div className="user-profile-pill">
                <span className="user-name">{currentUser.name}</span>
                <button
                  type="button"
                  className="btn-nav-logout"
                  onClick={logout}
                >
                  Sign Out
                </button>
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
      </header>

      {/* Live Order Tracking Banner */}
      {lastCustomerOrder && (
        <div className="live-order-tracker-banner">
          <div className="tracker-header">
            <span className="pulse-dot"></span>
            <strong>Order Status: #{lastCustomerOrder.id} ({lastCustomerOrder.table})</strong>
          </div>
          <div className="tracker-status-step">
            {lastCustomerOrder.status === 'new' && (
              <span className="status-pill status-new">Order Received (Pending Barista)</span>
            )}
            {lastCustomerOrder.status === 'preparing' && (
              <span className="status-pill status-prep">Preparing in Kitchen</span>
            )}
            {lastCustomerOrder.status === 'ready' && (
              <span className="status-pill status-ready">Ready for Table / Pickup</span>
            )}
            {lastCustomerOrder.status === 'completed' && (
              <span className="status-pill status-complete">Completed</span>
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
