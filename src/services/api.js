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

// Safe JSON response parser — handles HTML error pages (e.g. Render 502/503 gateway errors)
// that would otherwise throw a SyntaxError when calling .json() on an HTML body.
async function safeParseJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    if (res.status === 503 || res.status === 502) {
      return { success: false, message: 'Server is temporarily unavailable. Please try again shortly.' };
    }
    if (res.status >= 500) {
      return { success: false, message: `Server error (${res.status}). Please try again.` };
    }
    return { success: false, message: text.slice(0, 120) || 'Unexpected server response.' };
  }
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
      return await safeParseJson(res);
    } catch (err) {
      return { success: false, message: 'Unable to connect to the Scialla server. Check your connection.' };
    }
  },

  // Staff Login (accepts username or email as identifier)
  async staffLogin(identifier, password) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/staff/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send same value in both fields — server uses whichever matches first
        body: JSON.stringify({ username: identifier, email: identifier, password })
      });
      return await safeParseJson(res);
    } catch (err) {
      return { success: false, message: 'Unable to connect to the Scialla server. Check your connection.' };
    }
  },

  // Forgot Password: Step 1 - Request 6-digit Code
  async requestPasswordReset(email, role) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role })
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Unable to connect to backend server.' };
    }
  },

  // Forgot Password: Step 2 - Verify 6-digit Code
  async verifyResetCode(email, role, code) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role, code })
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Unable to connect to backend server.' };
    }
  },

  // Forgot Password: Step 3 - Set New Password
  async resetPassword(resetToken, newPassword, confirmPassword) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword, confirmPassword })
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
      if (res.status === 401 || res.status === 403) {
        return { unauthorized: true };
      }
      if (!res.ok) {
        return { error: true, status: res.status };
      }
      const data = await safeParseJson(res);
      return data.user || null;
    } catch {
      return { error: true, network: true };
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

  // Staff On Duty (Presence & Live Order Counts)
  async getStaffOnDuty() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/staff/on-duty`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.staff || [];
    } catch {
      return [];
    }
  },

  async getProducts() {
    const response = await fetch(API_BASE_URL + '/api/products');
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Unable to load products.');
    return data.products;
  },

  async uploadProductImage(file) {
    const response = await fetch(API_BASE_URL + '/api/products/images?filename=' + encodeURIComponent(file.name), {
      method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': file.type }, body: file
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Unable to upload image.');
    return data.image;
  },

  async saveProduct(id, product) {
    const response = await fetch(API_BASE_URL + '/api/products' + (id ? '/' + encodeURIComponent(id) : ''), {
      method: id ? 'PATCH' : 'POST', headers: getAuthHeaders(), body: JSON.stringify(product)
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Unable to save product.');
    return data.product;
  },

  // Product Stock Management
  async getProductStock() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/products/stock`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return {};
      const data = await res.json();
      return data.stock || {};
    } catch {
      return {};
    }
  },

  async updateProductStock(itemId, inStock, quantity = 50, name = '') {
    try {
      const res = await fetch(`${API_BASE_URL}/api/products/stock/${itemId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ inStock, quantity, name })
      });
      return await res.json();
    } catch {
      return { success: true, item: { itemId, inStock, quantity } };
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
      if (!res.ok) return [];
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.orders)) return data.orders;
      return [];
    } catch {
      return [];
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

  async updateOrderStatus(orderId, status, staffName = null) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status, staffName })
      });
      return await res.json();
    } catch {
      return { success: true, orderId, status, accepted_by_name: staffName, completed_by_name: staffName };
    }
  },

  // Customer Notifications API
  async getNotifications() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async markNotificationAsRead(id) {
    try {
      await fetch(`${API_BASE_URL}/api/notifications/${encodeURIComponent(id)}/read`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });
    } catch {}
  },

  async markAllNotificationsAsRead() {
    try {
      await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });
    } catch {}
  },

  async clearNotifications() {
    try {
      await fetch(`${API_BASE_URL}/api/notifications`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
    } catch {}
  }
};
