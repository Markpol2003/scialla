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
  const [createdOrder, setCreatedOrder] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handlePay = async () => {
    setIsSubmitting(true);
    const res = await placeOrder({
      orderNum,
      table: tableDisplayLabel,
      items: cart,
      total: totalAmount,
      paymentMethod
    });
    setIsSubmitting(false);

    if (res && res.success === false) {
      // Out of stock error caught
      return;
    }

    setCreatedOrder(res?.order || { id: orderNum, table: tableDisplayLabel, paymentMethod, total: totalAmount });
    setIsPaid(true);
  };

  const handleFinish = () => {
    setIsPaid(false);
    onOrderPlaced();
    onClose();
  };

  return createPortal(
    <div className="receipt-modal-backdrop" onClick={() => !isPaid && onClose()} style={{ zIndex: 999999 }}>
      <div className="receipt-3d-card" onClick={(e) => e.stopPropagation()}>
        <div className="receipt-header">
          <h2 className="receipt-brand-title">SCIAL LA CAFE</h2>
          <p className="receipt-subtitle">OFFICIAL GUEST RECEIPT</p>
          <div className="receipt-meta-grid">
            <div className="receipt-meta-item">
              <span className="meta-label">DESTINATION</span>
              <span className="meta-val highlight-table">{tableDisplayLabel}</span>
            </div>
            <div className="receipt-meta-item">
              <span className="meta-label">ORDER REF</span>
              <span className="meta-val">{createdOrder?.id || orderNum}</span>
            </div>
            <div className="receipt-meta-item full-width">
              <span className="meta-label">DATE & TIME</span>
              <span className="meta-val">{formattedDate}</span>
            </div>
          </div>
        </div>

        {!isPaid ? (
          <>
            <div className="receipt-items-scroll">
              {cart.map((item, idx) => (
                <div key={idx} className="receipt-item-row">
                  <div className="item-name-qty">
                    <span className="item-qty">{item.qty}×</span>
                    <span className="item-title">{item.name}</span>
                  </div>
                  <span className="item-price">₱{(item.price * item.qty).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="receipt-cost-breakdown">
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
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-3d-pay"
                onClick={handlePay}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Verifying Order...' : `Pay ₱${totalAmount.toFixed(2)} with ${paymentMethod}`}
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

            <div className="success-receipt-summary">
              <div className="success-line">
                <span className="success-label">Order Reference:</span>
                <strong className="success-val-order">#{createdOrder?.id || orderNum}</strong>
              </div>
              <div className="success-line">
                <span className="success-label">Destination:</span>
                <strong className="success-val-dest">{tableDisplayLabel}</strong>
              </div>
              <div className="success-line">
                <span className="success-label">Total Paid:</span>
                <strong className="success-val-total">₱{totalAmount.toFixed(2)}</strong>
              </div>
              {(createdOrder?.accepted_by_name || createdOrder?.completed_by_name) && (
                <div className="success-staff-block">
                  {createdOrder?.accepted_by_name && (
                    <div className="success-line">
                      <span className="success-label">Crafted by:</span>
                      <strong className="success-val-staff">{createdOrder.accepted_by_name}</strong>
                    </div>
                  )}
                  {createdOrder?.completed_by_name && (
                    <div className="success-line">
                      <span className="success-label">Delivered by:</span>
                      <strong className="success-val-delivered">{createdOrder.completed_by_name}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>

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
