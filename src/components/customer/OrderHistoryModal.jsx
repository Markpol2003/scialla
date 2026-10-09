import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Clock3, X, ChevronRight, ArrowLeft } from 'lucide-react';

export default function OrderHistoryModal({ isOpen, onClose }) {
  const { customerOrderHistory } = useApp();
  const [selectedOrder, setSelectedOrder] = useState(null);

  if (!isOpen) return null;

  return (
    <div
      className="receipt-modal-backdrop"
      onClick={onClose}
      style={{ zIndex: 999999 }}
    >
      <div
        className="auth-modal-card history-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '520px',
          width: '92%',
          background: '#FFFFFF',
          border: '1.5px solid #EADFD5',
          borderRadius: '18px',
          padding: '24px',
          color: '#2D2118',
          boxShadow: '0 20px 50px rgba(122, 74, 46, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '85vh'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #EADFD5', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {selectedOrder ? (
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                style={{
                  background: '#FFF9F2',
                  border: '1px solid #EADFD5',
                  borderRadius: '8px',
                  color: '#7A4A2E',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}
              >
                <ArrowLeft size={16} /> Back
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock3 size={20} color="#F59E42" />
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontFamily: 'var(--font-display)', color: '#2D2118', fontWeight: 800 }}>
                  Order History
                </h2>
              </div>
            )}
          </div>

          <button
            type="button"
            className="receipt-close-btn"
            onClick={onClose}
            title="Close"
            style={{ position: 'static', transform: 'none', color: '#75685E' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {selectedOrder ? (
            /* DETAILED ORDER VIEW */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Order Meta Card */}
              <div style={{ background: '#FFF9F2', border: '1.5px solid #EADFD5', borderRadius: '12px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: '#75685E', textTransform: 'uppercase', fontWeight: 600 }}>
                      {selectedOrder.customer_name ? 'Customer & Order Ref' : 'Order Number'}
                    </span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#2D2118' }}>
                      {selectedOrder.customer_name || `#${selectedOrder.id}`}
                    </div>
                    {selectedOrder.customer_name && (
                      <div style={{ fontSize: '0.8rem', color: '#7A4A2E', fontFamily: 'var(--font-mono)', marginTop: '2px', fontWeight: 700 }}>
                        Ref: #{selectedOrder.id}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      background: selectedOrder.status === 'completed' ? '#DCFCE7' : '#FEF3C7',
                      color: selectedOrder.status === 'completed' ? '#15803D' : '#B45309',
                      border: selectedOrder.status === 'completed' ? '1px solid #BBF7D0' : '1px solid #FDE68A'
                    }}
                  >
                    {selectedOrder.status}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem', color: '#75685E', borderTop: '1px solid #EADFD5', paddingTop: '8px', marginTop: '6px' }}>
                  <div>
                    <span style={{ color: '#75685E' }}>Destination: </span>
                    <strong style={{ color: '#2D2118' }}>{selectedOrder.table}</strong>
                  </div>
                  {selectedOrder.paymentMethod && (
                    <div>
                      <span style={{ color: '#75685E' }}>Payment: </span>
                      <strong style={{ color: '#2D2118' }}>{selectedOrder.paymentMethod}</strong>
                    </div>
                  )}
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: '#75685E' }}>Date/Time: </span>
                    <strong style={{ color: '#2D2118' }}>
                      {(() => {
                        const raw = selectedOrder.createdAt || selectedOrder.created_at;
                        let dl = 'Today';
                        if (raw) {
                          const d = new Date(raw);
                          if (!isNaN(d.getTime())) {
                            dl = d.toDateString() === new Date().toDateString() ? 'Today' : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
                          }
                        }
                        const tl = selectedOrder.timestamp || (raw ? new Date(raw).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent');
                        return `${dl} · ${tl}`;
                      })()}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h4 style={{ margin: '0 0 10px', fontSize: '0.86rem', color: '#7A4A2E', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 800 }}>
                  Items Ordered
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#FFF9F2', borderRadius: '12px', padding: '12px', border: '1.5px solid #EADFD5' }}>
                  {(selectedOrder.items || []).map((it, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        fontSize: '0.84rem',
                        borderBottom: idx < (selectedOrder.items || []).length - 1 ? '1px solid #EADFD5' : 'none',
                        paddingBottom: idx < (selectedOrder.items || []).length - 1 ? '8px' : 0
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: '#2D2118' }}>
                          {it.qty || 1}× {it.rawName || it.name}
                        </div>
                        {it.size && (
                          <div style={{ fontSize: '0.72rem', color: '#75685E', marginTop: '1px' }}>
                            Size: {it.size}
                          </div>
                        )}
                        {Array.isArray(it.addons) && it.addons.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '2px' }}>
                            {it.addons.map((a, aIdx) => (
                              <span key={a.id || aIdx} style={{ fontSize: '0.72rem', color: '#75685E' }}>
                                + {a.name} <span style={{ color: '#7A4A2E', fontWeight: 600 }}>(₱{parseFloat(a.price).toFixed(2)})</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ fontWeight: 800, color: '#7A4A2E', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                        ₱{(parseFloat(it.price || 0) * (it.qty || 1)).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total & Staff Accountability */}
              <div style={{ background: '#FFF9F2', border: '1.5px solid #EADFD5', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: '#75685E', fontWeight: 600 }}>Total Amount Paid:</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#F59E42', fontFamily: 'var(--font-mono)' }}>
                    ₱{parseFloat(selectedOrder.total || 0).toFixed(2)}
                  </span>
                </div>

                {(selectedOrder.accepted_by_name || selectedOrder.completed_by_name) && (
                  <div style={{ borderTop: '1px dashed #EADFD5', paddingTop: '8px', marginTop: '4px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {selectedOrder.accepted_by_name && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#75685E' }}>Crafted by:</span>
                        <strong style={{ color: '#7A4A2E' }}>{selectedOrder.accepted_by_name}</strong>
                      </div>
                    )}
                    {selectedOrder.completed_by_name && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#75685E' }}>Delivered by:</span>
                        <strong style={{ color: '#22C55E' }}>{selectedOrder.completed_by_name}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ORDERS LIST */
            <>
              {customerOrderHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 14px', color: '#75685E' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#FFF0DF', border: '1.5px solid #F59E42', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Clock3 size={24} color="#F59E42" />
                  </div>
                  <h3 style={{ margin: '0 0 6px', fontSize: '1rem', color: '#2D2118', fontWeight: 700 }}>No order history yet</h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#75685E' }}>
                    Your orders placed during this session will appear here.
                  </p>
                </div>
              ) : (
                customerOrderHistory.map((ord) => {
                  const isCompleted = ord.status === 'completed';
                  const rawCreated = ord.createdAt || ord.created_at;
                  let dateLabel = 'Today';
                  if (rawCreated) {
                    const d = new Date(rawCreated);
                    if (!isNaN(d.getTime())) {
                      const isToday = d.toDateString() === new Date().toDateString();
                      dateLabel = isToday ? 'Today' : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
                    }
                  }
                  const timeLabel = ord.timestamp || (rawCreated ? new Date(rawCreated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');

                  return (
                    <div
                      key={ord.id}
                      style={{
                        background: '#FFFFFF',
                        border: '1.5px solid #EADFD5',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        boxShadow: '0 2px 6px rgba(122, 74, 46, 0.04)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '0.98rem', color: '#2D2118' }}>
                            {ord.customer_name ? `${ord.customer_name}'s Order` : `Order #${ord.id}`}
                          </strong>
                          <div style={{ fontSize: '0.74rem', color: '#75685E', marginTop: '2px' }}>
                            {ord.table} • Ref: #{ord.id} • {dateLabel}{timeLabel ? ` · ${timeLabel}` : ''}
                          </div>
                        </div>

                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            background: isCompleted ? '#DCFCE7' : '#FEF3C7',
                            color: isCompleted ? '#15803D' : '#B45309',
                            border: isCompleted ? '1px solid #BBF7D0' : '1px solid #FDE68A'
                          }}
                        >
                          {ord.status}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #EADFD5', paddingTop: '8px', marginTop: '2px' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 900, color: '#7A4A2E', fontFamily: 'var(--font-mono)' }}>
                          ₱{parseFloat(ord.total || 0).toFixed(2)}
                        </span>

                        <button
                          type="button"
                          onClick={() => setSelectedOrder(ord)}
                          style={{
                            background: '#FFF0DF',
                            border: '1px solid #F59E42',
                            borderRadius: '6px',
                            color: '#7A4A2E',
                            padding: '5px 12px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s'
                          }}
                        >
                          View Details <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
