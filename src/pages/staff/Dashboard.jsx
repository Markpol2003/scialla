import React from 'react';
import { useApp } from '../../context/AppContext';

export default function Dashboard() {
  const { todayRevenue, todayOrderCount, orders } = useApp();
  const newOrdersCount = orders.filter((o) => o.status === 'new').length;
  const prepOrdersCount = orders.filter((o) => o.status === 'preparing').length;

  return (
    <div className="staff-dashboard-overview">
      <div className="kpi-cards-row">
        <div className="kpi-card highlight-revenue">
          <span className="kpi-title">BARISTA SHIFT REVENUE</span>
          <div className="kpi-main-val">₱{todayRevenue.toLocaleString()}</div>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">TOTAL ORDERS PROCESSED</span>
          <div className="kpi-main-val">{todayOrderCount}</div>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">PENDING KITCHEN QUEUE</span>
          <div className="kpi-main-val">{newOrdersCount + prepOrdersCount}</div>
        </div>
      </div>
    </div>
  );
}
