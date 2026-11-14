import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';

export default function CashCollectionControl({ order }) {
  const { cashReports, submitCashReport } = useApp();
  const remaining = Math.max(0, Number(order.total || 0) - Number(order.amountAlreadyPaid || 0));
  const [amount, setAmount] = useState(remaining.toFixed(2));
  const [submitting, setSubmitting] = useState(false);
  const latestReport = useMemo(() => cashReports
    .filter((report) => String(report.order_id || report.orderId) === String(order.id))
    .sort((a, b) => new Date(b.reported_at || b.reportedAt || 0) - new Date(a.reported_at || a.reportedAt || 0))[0], [cashReports, order.id]);

  const submit = async () => {
    setSubmitting(true);
    await submitCashReport(order.id, Number(amount));
    setSubmitting(false);
  };

  return (
    <div className="staff-cash-control" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', padding: '8px 10px', margin: '8px 0', borderRadius: '8px', background: 'rgba(0,0,0,0.22)', color: '#E2B688', fontSize: '0.78rem' }}>
      <strong>Cash only · Payment: {(order.paymentStatus || 'unpaid').replaceAll('_', ' ').toUpperCase()}</strong>
      {latestReport?.status === 'pending_manager_verification' && (
        <span>Reported ₱{Number(latestReport.amount_reported).toFixed(2)} · awaiting Manager verification</span>
      )}
      {latestReport?.status === 'payment_discrepancy' && <span>Manager flagged a cash discrepancy. Submit a corrected amount after recounting.</span>}
      {order.paymentStatus !== 'paid' && !['pending_manager_verification', 'pending_manager_approval', 'cancelled'].includes(order.paymentStatus || '') && latestReport?.status !== 'pending_manager_verification' && (
        <>
          <span>Expected remaining: ₱{remaining.toFixed(2)}</span>
          <input
            aria-label={`Cash collected for order ${order.id}`}
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            style={{ width: '110px' }}
          />
          <button type="button" disabled={submitting || Number(amount) <= 0} onClick={submit}>
            {submitting ? 'Submitting…' : 'Report Cash Collected'}
          </button>
        </>
      )}
    </div>
  );
}
