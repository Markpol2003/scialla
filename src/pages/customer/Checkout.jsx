import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Coffee } from 'lucide-react';
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
  const [createdOrder, setCreatedOrder] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const now = new Date();
  const datePart = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const timePart = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  const formattedDate = `${datePart} • ${timePart}`;
  const orderNum = `SC-${Math.floor(1000 + Math.random() * 9000)}`;

  const handlePay = async () => {
    setIsSubmitting(true);
    const res = await placeOrder({
      orderNum,
      table: tableDisplayLabel,
      items: cart,
      total: totalAmount,
      paymentMethod: null
    });
    setIsSubmitting(false);

    if (res && res.success === false) {
      // Out of stock error caught
      return;
    }

    setCreatedOrder(res?.order || { id: orderNum, table: tableDisplayLabel, paymentMethod: null, total: totalAmount });
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
          <div className="receipt-brand-badge">
            <Coffee size={15} className="receipt-brand-icon" />
            <h2 className="receipt-brand-title">SCIALLA CAFE</h2>
          </div>
          <p className="receipt-subtitle">{isPaid ? 'Official Guest Receipt' : 'Confirm your order?'}</p>
          <p className="receipt-tagline">Crafted coffee, served simply.</p>
          <div className="receipt-header-divider" />

          <div className="receipt-meta-list">
            <div className="receipt-meta-row">
              <span className="receipt-meta-label">Destination</span>
              <span className="receipt-meta-val highlight-destination">{tableDisplayLabel}</span>
            </div>
            <div className="receipt-meta-row">
              <span className="receipt-meta-label">Order Ref</span>
              <span className="receipt-meta-val font-mono">#{createdOrder?.id || orderNum}</span>
            </div>
            <div className="receipt-meta-row">
              <span className="receipt-meta-label">Date & Time</span>
              <span className="receipt-meta-val font-mono">{formattedDate}</span>
            </div>
          </div>
        </div>

        {!isPaid ? (
          <>
            <div className="receipt-items-scroll">
              {cart.map((item, idx) => {
                const hasAddons = Array.isArray(item.addons) && item.addons.length > 0;
                return (
                  <div key={idx} className="receipt-item-row" style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingBottom: hasAddons ? '6px' : '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div className="item-name-qty">
                        <span className="item-qty">{item.qty}×</span>
                        <span className="item-title">{item.rawName || item.name} {item.size ? `(${item.size})` : ''}</span>
                      </div>
                      <span className="item-price">₱{(item.price * item.qty).toFixed(2)}</span>
                    </div>
                    {hasAddons && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', paddingLeft: '22px' }}>
                        {item.addons.map((a, aIdx) => (
                          <div key={aIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#D4A373' }}>
                            <span>+ {a.name}</span>
                            <span style={{ color: '#E2B688', fontFamily: 'var(--font-mono)' }}>₱{parseFloat(a.price).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
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
                {isSubmitting ? 'Submitting Order...' : 'Confirm Order'}
              </button>
            </div>
          </>
        ) : (
          <div className="receipt-success-state">
            <div className="success-icon-badge">✓</div>
            <h3 className="success-title">Order Confirmed</h3>
            <p className="success-msg">
              Your order has been sent to the kitchen for <strong>{tableDisplayLabel}</strong>.
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
                <span className="success-label">Total:</span>
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
              Track Order
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
