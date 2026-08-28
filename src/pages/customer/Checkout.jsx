import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../context/AppContext';

export default function Checkout({
  isOpen,
  cart,
  tableDisplayLabel,
  totalAmount,
  totalItemCount,
  onClose,
  onOrderPlaced
}) {
  const { placeOrder } = useApp();

  const [isPaid, setIsPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('GCash');

  if (!isOpen) return null;

  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const orderNum = `SC-${Math.floor(1000 + Math.random() * 9000)}`;

  const handlePay = () => {
    setIsPaid(true);
    placeOrder({
      orderNum,
      table: tableDisplayLabel,
      items: cart,
      total: totalAmount,
      paymentMethod
    });
  };

  const handleFinish = () => {
    setIsPaid(false);
    onOrderPlaced();
    onClose();
  };

  return createPortal(
    <div className="receipt-modal-backdrop" onClick={() => !isPaid && onClose()} style={{ zIndex: 999999 }}>
      <div className="receipt-3d-card" onClick={(e) => e.stopPropagation()}>
        {!isPaid && (
          <button className="receipt-close-btn" onClick={onClose}>
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
                <span>Order: {orderNum}</span>
                <span>{formattedDate}</span>
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
                onClick={onClose}
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
              Thank you! Your order has been dispatched to the Barista Kitchen queue for <strong>{tableDisplayLabel}</strong>.
            </p>

            <button className="btn-3d-new-order" onClick={handleFinish}>
              Return to Menu
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
