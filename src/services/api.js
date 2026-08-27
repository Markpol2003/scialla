// Scialla REST API Client Service (Node.js & PostgreSQL Backend)

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050';

function getGuestSessionId() {
  try {
    return localStorage.getItem('scialla_guest_session');
  } catch {
    return null;
  }
}

function getAuthHeaders() {
  const token = localStorage.getItem('scialla_token');
  const guestSessionId = getGuestSessionId();

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(guestSessionId ? { 'X-Guest-Session': guestSessionId } : {})
  };
}

export const api = {
  baseUrl: API_BASE_URL,

  // Manager Login
  async managerLogin(email, password) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/manager/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Unable to connect to backend server.' };
    }
  },

  // Staff Login
  async staffLogin(identifier, password) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/staff/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: identifier, email: identifier, password })
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Unable to connect to backend server.' };
    }
  },

  // Logout
  async logout() {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
    } catch {
      // Ignored network errors on logout
    }
  },

  // Validate Token / Get Current Auth User
  async getCurrentUser() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.user || null;
    } catch {
      return null;
    }
  },

  // Staff Management (Manager Only)
  async getStaffList() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/staff`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async createStaff(staffData) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/staff`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(staffData)
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Network error while creating staff member.' };
    }
  },

  async updateStaff(id, staffData) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/staff/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(staffData)
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Network error while updating staff member.' };
    }
  },

  async updateStaffStatus(id, status) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/staff/${id}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status })
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Network error updating status.' };
    }
  },

  async resetStaffPassword(id, password) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/staff/${id}/password`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ password })
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Network error resetting password.' };
    }
  },

  // Anonymous Guest Session Management
  async getOrCreateGuestSession() {
    let currentId = getGuestSessionId();
    if (currentId) {
      // Validate with server (non-blocking verification)
      fetch(`${API_BASE_URL}/api/auth/guest-session/validate`, {
        headers: { 'X-Guest-Session': currentId }
      }).catch(() => {});
      return currentId;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/guest-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.guestSessionId) {
          localStorage.setItem('scialla_guest_session', data.guestSessionId);
          return data.guestSessionId;
        }
      }
    } catch {
      // Offline fallback
    }

    // Client fallback if backend is unreachable
    const fallbackId = `sc-guest-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    try {
      localStorage.setItem('scialla_guest_session', fallbackId);
    } catch {}
    return fallbackId;
  },

  // Customer & Staff Orders
  async getOrders() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async getOrderById(orderId) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.order || null;
    } catch {
      return null;
    }
  },

  async createOrder(orderData) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(orderData)
      });
      return await res.json();
    } catch {
      return { success: true, offline: true, order: orderData };
    }
  },

  async updateOrderStatus(orderId, status) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status })
      });
      return await res.json();
    } catch {
      return { success: true, orderId, status };
    }
  }
};
