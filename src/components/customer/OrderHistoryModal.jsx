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
          background: 'linear-gradient(180deg, #26150C 0%, #1A0D07 100%)',
          border: '1.5px solid #4D2E1D',
          borderRadius: '18px',
          padding: '24px',
          color: '#FFFFFF',
          boxShadow: '0 20px 50px rgba(0,0,0,0.85)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '85vh'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid rgba(201, 139, 91, 0.2)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {selectedOrder ? (
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(201, 139, 91, 0.3)',
                  borderRadius: '8px',
                  color: '#E2B688',
                  padding: '6px 8px',
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
                <Clock3 size={20} color="#C98B5B" />
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontFamily: 'var(--font-display)', color: '#FFFFFF', fontWeight: 800 }}>
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
            style={{ position: 'static', transform: 'none' }}
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
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201, 139, 91, 0.2)', borderRadius: '12px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: '#D4C3B3', textTransform: 'uppercase' }}>Order Number</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#E2B688' }}>
                      #{selectedOrder.id}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      background: selectedOrder.status === 'completed' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                      color: selectedOrder.status === 'completed' ? '#4ade80' : '#facc15',
                      border: selectedOrder.status === 'completed' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(234, 179, 8, 0.3)'
                    }}
                  >
                    {selectedOrder.status}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem', color: '#D4C3B3', borderTop: '1px solid rgba(201, 139, 91, 0.15)', paddingTop: '8px', marginTop: '6px' }}>
                  <div>
                    <span style={{ color: '#8c7b70' }}>Destination: </span>
                    <strong style={{ color: '#FFFFFF' }}>{selectedOrder.table}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#8c7b70' }}>Payment: </span>
                    <strong style={{ color: '#FFFFFF' }}>{selectedOrder.paymentMethod || 'Cash'}</strong>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: '#8c7b70' }}>Date/Time: </span>
                    <strong style={{ color: '#FFFFFF' }}>
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
                <h4 style={{ margin: '0 0 10px', fontSize: '0.86rem', color: '#E2B688', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Items Ordered
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '12px', border: '1px solid rgba(201, 139, 91, 0.15)' }}>
                  {(selectedOrder.items || []).map((it, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.84rem',
                        borderBottom: idx < (selectedOrder.items || []).length - 1 ? '1px solid rgba(201, 139, 91, 0.1)' : 'none',
                        paddingBottom: idx < (selectedOrder.items || []).length - 1 ? '8px' : 0
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: '#FFFFFF' }}>
                          {it.qty || 1}× {it.name}
                        </div>
                        {it.size && (
                          <div style={{ fontSize: '0.72rem', color: '#D4A373' }}>
                            Size: {it.size}
                          </div>
                        )}
                      </div>
                      <div style={{ fontWeight: 800, color: '#E2B688', fontFamily: 'var(--font-mono)' }}>
                        ₱{(parseFloat(it.price || 0) * (it.qty || 1)).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total & Staff Accountability */}
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201, 139, 91, 0.2)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: '#D4C3B3' }}>Total Amount Paid:</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#E2B688', fontFamily: 'var(--font-mono)' }}>
                    ₱{parseFloat(selectedOrder.total || 0).toFixed(2)}
                  </span>
                </div>

                {(selectedOrder.accepted_by_name || selectedOrder.completed_by_name) && (
                  <div style={{ borderTop: '1px dashed rgba(201, 139, 91, 0.2)', paddingTop: '8px', marginTop: '4px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {selectedOrder.accepted_by_name && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#8c7b70' }}>Crafted by:</span>
                        <strong style={{ color: '#E2B688' }}>{selectedOrder.accepted_by_name}</strong>
                      </div>
                    )}
                    {selectedOrder.completed_by_name && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#8c7b70' }}>Delivered by:</span>
                        <strong style={{ color: '#4ade80' }}>{selectedOrder.completed_by_name}</strong>
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
                <div style={{ textAlign: 'center', padding: '40px 14px', color: '#D4C3B3' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(201, 139, 91, 0.1)', border: '1px solid rgba(201, 139, 91, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Clock3 size={24} color="#C98B5B" />
                  </div>
                  <h3 style={{ margin: '0 0 6px', fontSize: '1rem', color: '#FFFFFF' }}>No order history yet</h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#8c7b70' }}>
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
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(201, 139, 91, 0.2)',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '0.98rem', color: '#FFFFFF' }}>
                            Order #{ord.id}
                          </strong>
                          <div style={{ fontSize: '0.74rem', color: '#D4A373' }}>
                            {ord.table} • {dateLabel}{timeLabel ? ` · ${timeLabel}` : ''}
                          </div>
                        </div>

                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            background: isCompleted ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                            color: isCompleted ? '#4ade80' : '#facc15',
                            border: isCompleted ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(234, 179, 8, 0.3)'
                          }}
                        >
                          {ord.status}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(201, 139, 91, 0.12)', paddingTop: '8px', marginTop: '2px' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 900, color: '#E2B688', fontFamily: 'var(--font-mono)' }}>
                          ₱{parseFloat(ord.total || 0).toFixed(2)}
                        </span>

                        <button
                          type="button"
                          onClick={() => setSelectedOrder(ord)}
                          style={{
                            background: 'rgba(201, 139, 91, 0.15)',
                            border: '1px solid rgba(201, 139, 91, 0.35)',
                            borderRadius: '6px',
                            color: '#E2B688',
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
