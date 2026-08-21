// Scialla REST API Client Service (Laravel Backend Ready)

const API_BASE_URL = 'http://localhost:8000/api'; // Laravel API URL when deployed

export const api = {
  // Products & Categories
  async getProducts() {
    try {
      const res = await fetch(`${API_BASE_URL}/products`);
      if (!res.ok) throw new Error('API not available, using mock state');
      return await res.json();
    } catch {
      return null; // Fallback to Context state
    }
  },

  // Customer Orders
  async createOrder(orderData) {
    try {
      const res = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      return await res.json();
    } catch {
      return { success: true, offline: true, order: orderData };
    }
  },

  // Staff Order Queue
  async getStaffOrders() {
    try {
      const res = await fetch(`${API_BASE_URL}/staff/orders`);
      return await res.json();
    } catch {
      return null;
    }
  },

  async updateOrderStatus(orderId, status) {
    try {
      const res = await fetch(`${API_BASE_URL}/staff/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      return await res.json();
    } catch {
      return { success: true, orderId, status };
    }
  },

  // Manager Analytics
  async getManagerSales() {
    try {
      const res = await fetch(`${API_BASE_URL}/manager/sales`);
      return await res.json();
    } catch {
      return null;
    }
  }
};
