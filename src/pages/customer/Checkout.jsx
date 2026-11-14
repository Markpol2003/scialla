import React, { useRef, useState } from 'react';
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

  const [customerName, setCustomerName] = useState('');
  const [nameError, setNameError] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const orderIdRef = useRef(null);
  const submitLockRef = useRef(false);

  if (!isOpen) {
    orderIdRef.current = null;
    return null;
  }
  if (!orderIdRef.current) {
    orderIdRef.current = `SC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }

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
  const orderNum = orderIdRef.current;

  const sanitizeName = (str) => {
    if (!str) return '';
    return str
      .replace(/[<>]/g, '') // remove html tag characters
      .trim()
      .slice(0, 40);
  };

  const handlePay = async () => {
    if (submitLockRef.current) return;
    const cleanName = sanitizeName(customerName);
    if (!cleanName) {
      setNameError('Please enter your name or nickname to confirm.');
      return;
    }
    if (cleanName.length > 40) {
      setNameError('Name cannot exceed 40 characters.');
      return;
    }

    setNameError('');
    submitLockRef.current = true;
    setIsSubmitting(true);
    let res;
    try {
      res = await placeOrder({
        orderNum,
        customer_name: cleanName,
        customerName: cleanName,
        table: tableDisplayLabel,
        items: cart,
        total: totalAmount,
        paymentMethod: null
      });
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }

    if (res && res.success === false) {
      // Out of stock error caught
      return;
    }

    setCreatedOrder(
      res?.order || {
        id: orderNum,
        customer_name: cleanName,
        customerName: cleanName,
        table: tableDisplayLabel,
        paymentMethod: null,
        total: totalAmount
      }
    );
    setIsPaid(true);
  };

  const handleFinish = () => {
    setIsPaid(false);
    setCustomerName('');
    setNameError('');
    onOrderPlaced();
    onClose();
  };

  const confirmedName = createdOrder?.customer_name || createdOrder?.customerName || sanitizeName(customerName);

  return createPortal(
    <div className="receipt-modal-backdrop" onClick={() => !isPaid && onClose()} style={{ zIndex: 999999 }}>
      <div className="receipt-3d-card" onClick={(e) => e.stopPropagation()}>
        <div className="receipt-header">
          <div className="receipt-brand-badge">
            <Coffee size={15} className="receipt-brand-icon" />
            <h2 className="receipt-brand-title">SCIALLA CAFE</h2>
          </div>
          <p className="receipt-subtitle">{isPaid ? 'Order Submitted' : 'Confirm your order?'}</p>
          <p className="receipt-tagline">Crafted coffee, served simply.</p>
          <div className="receipt-header-divider" />

          <div className="receipt-meta-list">
            {isPaid && confirmedName && (
              <div className="receipt-meta-row">
                <span className="receipt-meta-label">Customer</span>
                <span className="receipt-meta-val highlight-customer">{confirmedName}</span>
              </div>
            )}
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
            {/* Customer Name Input Field Group */}
            <div className="checkout-name-field-group">
              <label htmlFor="customer-name-input" className="checkout-name-label">
                Your Name <span className="required-star">*</span>
              </label>
              <input
                id="customer-name-input"
                type="text"
                className={`checkout-name-input ${nameError ? 'input-error' : ''}`}
                placeholder="e.g. Mark or nickname"
                value={customerName}
                maxLength={40}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  if (nameError) setNameError('');
                }}
                disabled={isSubmitting}
                autoFocus
              />
              <p className="checkout-name-helper">
                {nameError ? (
                  <span className="error-text">{nameError}</span>
                ) : (
                  'This name will be used to identify your order.'
                )}
              </p>
            </div>

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
                          <div key={aIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#75685E' }}>
                            <span>+ {a.name}</span>
                            <span style={{ color: '#7A4A2E', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>₱{parseFloat(a.price).toFixed(2)}</span>
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
                {isSubmitting ? 'Submitting Order...' : 'Submit Order'}
              </button>
            </div>
          </>
        ) : (
          <div className="receipt-success-state">
            <div className="success-icon-badge">✓</div>
            <h3 className="success-title">Awaiting Manager Approval</h3>
            <p className="success-msg">
              Thank you <strong>{confirmedName}</strong>! Your order is pending Manager approval for <strong>{tableDisplayLabel}</strong>. Payment is due at the counter after approval.
            </p>

            <div className="success-receipt-summary">
              <div className="success-line">
                <span className="success-label">Customer:</span>
                <strong className="success-val-customer">{confirmedName}</strong>
              </div>
              <div className="success-line">
                <span className="success-label">Destination:</span>
                <strong className="success-val-dest">{tableDisplayLabel}</strong>
              </div>
              <div className="success-line">
                <span className="success-label">Order Reference:</span>
                <strong className="success-val-order">#{createdOrder?.id || orderNum}</strong>
              </div>
              <div className="success-line">
                <span className="success-label">Total:</span>
                <strong className="success-val-total">₱{totalAmount.toFixed(2)}</strong>
              </div>
              <div className="success-line">
                <span className="success-label">Payment:</span>
                <strong className="success-val-total">Unpaid · Cash at counter</strong>
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
