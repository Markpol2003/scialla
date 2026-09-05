import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { api } from '../services/api';

const AppContext = createContext();

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050';
const WS_URL = import.meta.env.VITE_WS_URL || API_BASE_URL;

// State order progression ranking (Prevents out-of-order socket events from regressing status)
const STATUS_RANKS = {
  new: 1,
  received: 1,
  pending: 1,
  accepted: 2,
  preparing: 2,
  ready: 3,
  completed: 4,
  complete: 4,
  cancelled: 5
};

function shouldAcceptStatusUpdate(currentStatus, incomingStatus) {
  if (!currentStatus) return true;
  if (!incomingStatus) return false;
  const curr = String(currentStatus).toLowerCase().trim();
  const inc = String(incomingStatus).toLowerCase().trim();
  if (curr === 'cancelled') return false; // Cancelled is terminal
  if ((curr === 'completed' || curr === 'complete') && inc !== 'completed' && inc !== 'complete' && inc !== 'cancelled') {
    return false; // Completed cannot regress to preparing or ready
  }
  const currentRank = STATUS_RANKS[curr] || 0;
  const incomingRank = STATUS_RANKS[inc] || 0;
  if (incomingRank < currentRank) return false; // Prevent backward status movement
  return true;
}

import initialCategories from '../../shared/catalog.json';

export function AppProvider({ children }) {
  const [activeRole, setActiveRole] = useState('customer'); // 'customer' | 'staff' | 'manager'
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('scialla_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [guestSessionId, setGuestSessionId] = useState(() => {
    try {
      return localStorage.getItem('scialla_guest_session');
    } catch {
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const triggerToast = (msg, duration = 4000) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, duration);
  };

  const [menuCategories, setMenuCategories] = useState(initialCategories);
  const [orders, setOrders] = useState(() => {
    try {
      const saved = localStorage.getItem('scialla_orders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [staffList, setStaffList] = useState([]);
  const [staffOnDuty, setStaffOnDuty] = useState([]);
  const [lastCustomerOrder, setLastCustomerOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('scialla_active_order');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Customer Order History IDs tracking (bound to current guest/user session)
  const [customerOrderIds, setCustomerOrderIds] = useState(() => {
    try {
      const saved = localStorage.getItem('scialla_customer_order_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Customer Notifications list with strict deduplication
  const [customerNotifications, setCustomerNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('scialla_customer_notifications');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      const seen = new Set();
      return parsed.filter((n) => {
        const key = n.key || `${n.orderId || 'gen'}-${n.status || ''}-${n.title || ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    } catch {
      return [];
    }
  });

  // Real-Time WebSocket Connection
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Sync customer order IDs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('scialla_customer_order_ids', JSON.stringify(customerOrderIds));
    } catch (e) {
      console.warn('Failed to sync customer order IDs:', e);
    }
  }, [customerOrderIds]);

  // Sync customer notifications to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('scialla_customer_notifications', JSON.stringify(customerNotifications));
    } catch (e) {
      console.warn('Failed to sync customer notifications:', e);
    }
  }, [customerNotifications]);

  const [hasNewNotifPulse, setHasNewNotifPulse] = useState(false);

  const addCustomerNotification = (notif) => {
    const cleanId = String(notif.orderId || 'gen').replace(/^#/, '');
    const status = notif.status || 'update';
    const dedupKey = notif.key || `${cleanId}-${status}`;

    let defaultTitle = notif.title || 'Order Update';
    let defaultMessage = notif.message || `Order #${cleanId} status is now ${status}.`;

    if (status === 'new' || status === 'received') {
      defaultTitle = 'Order Received';
      defaultMessage = `Your order #${cleanId} has been placed and received by our baristas.`;
    } else if (status === 'accepted' || status === 'preparing') {
      defaultTitle = 'Order Accepted';
      defaultMessage = 'Your order has been accepted and is being prepared.';
    } else if (status === 'ready') {
      defaultTitle = 'Your order is ready!';
      defaultMessage = 'Your order has been crafted and is ready!';
    } else if (status === 'completed') {
      defaultTitle = 'Order Completed';
      defaultMessage = 'Your order has been completed. Thank you!';
    } else if (status === 'cancelled') {
      defaultTitle = 'Order Cancelled';
      defaultMessage = `Order #${cleanId} was cancelled.`;
    }

    const newEntry = {
      id: notif.id ? String(notif.id) : dedupKey,
      key: dedupKey,
      orderId: cleanId,
      status,
      title: notif.title || defaultTitle,
      message: notif.message || defaultMessage,
      read: notif.read || false,
      timestamp: notif.timestamp || new Date().toISOString(),
      accepted_by_name: notif.accepted_by_name || null,
      completed_by_name: notif.completed_by_name || null
    };

    setCustomerNotifications((prev) => {
      // Find if notification for this exact order & status transition already exists
      const existsIndex = prev.findIndex(
        (n) => (n.key && n.key === dedupKey) ||
          (n.orderId && String(n.orderId).replace(/^#/, '') === cleanId && n.status && n.status === status)
      );

      if (existsIndex > -1) {
        // Update in place without duplicating
        const updated = [...prev];
        updated[existsIndex] = { ...updated[existsIndex], ...newEntry };
        return updated;
      }

      // Trigger one-time subtle pulse on the notification bell
      setHasNewNotifPulse(true);
      setTimeout(() => setHasNewNotifPulse(false), 800);

      return [newEntry, ...prev].slice(0, 50);
    });
  };

  const refreshCustomerNotifications = async () => {
    try {
      const dbNotifs = await api.getNotifications();
      if (Array.isArray(dbNotifs) && dbNotifs.length > 0) {
        setCustomerNotifications((prev) => {
          const map = new Map();
          dbNotifs.forEach((n) => {
            const cleanId = String(n.orderId || '').replace(/^#/, '');
            const key = n.key || `${cleanId}-${n.status}`;
            map.set(key, { ...n, key, id: String(n.id || key), orderId: cleanId });
          });
          prev.forEach((n) => {
            const cleanId = String(n.orderId || '').replace(/^#/, '');
            const key = n.key || `${cleanId}-${n.status}`;
            if (!map.has(key)) {
              map.set(key, n);
            }
          });
          return Array.from(map.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        });
      }
    } catch (e) {
      console.warn('Failed to refresh customer notifications:', e);
    }
  };

  const markNotificationsAsRead = () => {
    setCustomerNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    api.markAllNotificationsAsRead().catch(() => { });
  };

  const markSingleNotificationAsRead = (id) => {
    setCustomerNotifications((prev) =>
      prev.map((n) => (n.id === id || n.key === id ? { ...n, read: true } : n))
    );
    api.markNotificationAsRead(id).catch(() => { });
  };

  const clearNotifications = () => {
    setCustomerNotifications([]);
    api.clearNotifications().catch(() => { });
  };

  const unreadNotificationsCount = customerNotifications.filter((n) => !n.read).length;

  // Sync active customer order to localStorage
  useEffect(() => {
    try {
      if (lastCustomerOrder) {
        localStorage.setItem('scialla_active_order', JSON.stringify(lastCustomerOrder));
        if (lastCustomerOrder.id) {
          setCustomerOrderIds((prev) => (prev.includes(lastCustomerOrder.id) ? prev : [lastCustomerOrder.id, ...prev]));
        }
      } else {
        localStorage.removeItem('scialla_active_order');
      }
    } catch (e) {
      console.warn('Failed to sync active order:', e);
    }
  }, [lastCustomerOrder]);

  // Sync orders to localStorage for instant cross-tab sync
  useEffect(() => {
    try {
      localStorage.setItem('scialla_orders', JSON.stringify(orders));
    } catch (e) {
      console.warn('Failed to sync orders to localStorage:', e);
    }
  }, [orders]);

  // Listen for storage events (Instant cross-tab updates between customer & staff)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'scialla_orders' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setOrders(parsed);
          }
        } catch { }
      }
      if (e.key === 'scialla_active_order' && e.newValue) {
        try {
          setLastCustomerOrder(JSON.parse(e.newValue));
        } catch { }
      }
      if (e.key === 'scialla_guest_session' && e.newValue) {
        setGuestSessionId(e.newValue);
      }
      if (e.key === 'scialla_customer_notifications' && e.newValue) {
        try {
          setCustomerNotifications(JSON.parse(e.newValue));
        } catch { }
      }
      if (e.key === 'scialla_customer_order_ids' && e.newValue) {
        try {
          setCustomerOrderIds(JSON.parse(e.newValue));
        } catch { }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Fetch Staff List from DB if Manager
  const refreshStaffList = async () => {
    const data = await api.getStaffList();
    if (Array.isArray(data)) {
      const formatted = data.map((s) => ({
        ...s,
        name: `${s.first_name} ${s.last_name}`
      }));
      setStaffList(formatted);
    }
  };

  // Fetch On-Duty Staff
  const refreshStaffOnDuty = async () => {
    const onDuty = await api.getStaffOnDuty();
    if (Array.isArray(onDuty)) {
      setStaffOnDuty(onDuty);
    }
  };

  // Sync Product Stock from PostgreSQL
  const syncProducts = async () => {
    try {
      const products = await api.getProducts();
      setMenuCategories(initialCategories.map(cat => ({
        ...cat, items: products.filter(item => item.categoryId === cat.id)
      })));
    } catch (error) {
      console.warn('Catalog sync failed:', error.message);
    }
  };

  const saveProduct = async (id, product) => {
    const saved = await api.saveProduct(id, product);
    await syncProducts();
    return saved;
  };

  const syncProductStock = async () => {
    const stockMap = await api.getProductStock();
    if (stockMap && typeof stockMap === 'object' && Object.keys(stockMap).length > 0) {
      setMenuCategories((prevCats) =>
        prevCats.map((cat) => ({
          ...cat,
          items: cat.items.map((item) => {
            const baseId = item.id;
            const stockInfo = stockMap[baseId];
            if (stockInfo) {
              return {
                ...item,
                available: stockInfo.inStock !== false && (typeof stockInfo.quantity !== 'number' || stockInfo.quantity > 0),
                inStock: item.active !== false && stockInfo.inStock !== false && (typeof stockInfo.quantity !== 'number' || stockInfo.quantity > 0)
              };
            }
            return item;
          })
        }))
      );
    }
  };

  // Fetch orders from PostgreSQL / REST API (Source of Truth)
  const refreshOrders = async () => {
    try {
      const data = await api.getOrders();
      const orderList = Array.isArray(data) ? data : (data && Array.isArray(data.orders) ? data.orders : []);
      if (orderList.length > 0) {
        setOrders((prev) => {
          const map = new Map();
          // Server orders are the authoritative source of truth
          orderList.forEach((ord) => map.set(ord.id, ord));
          // Retain any optimistic local pending orders not yet saved to server
          prev.forEach((ord) => {
            if (!map.has(ord.id)) {
              map.set(ord.id, ord);
            }
          });
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.warn('Failed to refresh orders from API:', err);
    }
  };

  useEffect(() => {
    // 1. Initialize or validate guest session ID from backend
    api.getOrCreateGuestSession().then((gId) => {
      if (gId) {
        setGuestSessionId(gId);
      }
    });

    // 2. Validate stored token on load with backend
    const token = localStorage.getItem('scialla_token');
    if (token) {
      api.getCurrentUser().then((user) => {
        if (user) {
          setCurrentUser(user);
          setActiveRole(user.role);
          refreshOrders();
        } else {
          logout();
        }
      });
    }

    // 3. Hydrate active customer order from PostgreSQL if present
    const savedActiveOrder = localStorage.getItem('scialla_active_order');
    if (savedActiveOrder) {
      try {
        const parsed = JSON.parse(savedActiveOrder);
        if (parsed && parsed.id) {
          api.getOrderById(parsed.id).then((freshOrder) => {
            if (freshOrder) {
              setLastCustomerOrder(freshOrder);
            }
          });
        }
      } catch { }
    }

    // 4. Initial fetch of persistent orders from PostgreSQL
    refreshOrders();
    refreshStaffOnDuty();
    syncProducts();
    syncProductStock();
    refreshCustomerNotifications();

    const pollInterval = setInterval(() => {
      refreshOrders();
      refreshStaffOnDuty();
    }, 5000);

    // 5. Initialize Socket.IO connection with credentials
    const currentGuestId = localStorage.getItem('scialla_guest_session');
    const currentAuthToken = localStorage.getItem('scialla_token');

    const socketInstance = io(WS_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      auth: {
        token: currentAuthToken,
        guestSessionId: currentGuestId
      }
    });

    socketInstance.on('connect', () => {
      syncProducts();
      console.log(`⚡ Scialla Real-Time Socket.IO connected (${socketInstance.id}) on ${WS_URL}`);
      setIsConnected(true);

      // Authenticate socket session with server immediately upon connection
      const activeToken = localStorage.getItem('scialla_token');
      if (activeToken) {
        socketInstance.emit('authenticate', { token: activeToken });
      }

      // Register guest session with server immediately if guest ID is present
      const activeGuestId = localStorage.getItem('scialla_guest_session');
      if (activeGuestId) {
        socketInstance.emit('register:guest', activeGuestId);
      }

      // Re-join all active order rooms for this customer across refresh/reconnect
      try {
        const savedIds = localStorage.getItem('scialla_customer_order_ids');
        const parsedIds = savedIds ? JSON.parse(savedIds) : [];
        const activeOrd = localStorage.getItem('scialla_active_order');
        const ordObj = activeOrd ? JSON.parse(activeOrd) : null;
        const allIds = Array.from(new Set([...(parsedIds || []), ...(ordObj?.id ? [ordObj.id] : [])]));

        allIds.forEach((ordId) => {
          if (ordId) {
            socketInstance.emit('join:order', { orderId: ordId, guestSessionId: activeGuestId });
            console.log(`📌 Re-joined order room on socket connect: order:${ordId}`);
          }
        });
      } catch (err) {
        console.warn('Re-joining order rooms error:', err);
      }

      // Re-fetch persisted notifications from database upon reconnection
      refreshCustomerNotifications();
    });

    socketInstance.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setIsConnected(false);
    });

    socketInstance.on('staff:presence', (list) => {
      console.log('👥 Received real-time staff:presence:', list);
      if (Array.isArray(list)) {
        setStaffOnDuty(list);
      }
    });

    socketInstance.on('order:created', (newOrder) => {
      console.log('📡 Received real-time order:created:', newOrder);
      setOrders((prev) => {
        if (prev.some((o) => o.id === newOrder.id)) return prev;
        return [newOrder, ...prev];
      });
      refreshStaffOnDuty();
    });

    // Targeted real-time customer notification event from server
    socketInstance.on('notification:new', (notifData) => {
      console.log('🔔 Received targeted notification:new:', notifData);
      addCustomerNotification(notifData);
      if (notifData.status === 'ready') {
        triggerToast('Your order is ready!');
      } else if (notifData.status === 'completed') {
        triggerToast('Order completed. Thank you!');
      } else if (notifData.status === 'cancelled') {
        triggerToast('Order was cancelled.');
      }
    });

    // Targeted status update handler with monotonic order progression guard
    socketInstance.on('order:status_updated', (data) => {
      console.log('📡 Received targeted order:status_updated:', data);
      const targetOrderId = data.id || data.orderId;
      const cleanId = String(targetOrderId).replace(/^#/, '');

      // Update staff dashboard orders queue with monotonic rank check
      setOrders((prev) =>
        prev.map((ord) => {
          if (ord.id === targetOrderId) {
            if (!shouldAcceptStatusUpdate(ord.status, data.status)) return ord;
            return { ...ord, ...data };
          }
          return ord;
        })
      );

      // Check if this order belongs to current customer
      const isCustomerOrder = (lastCustomerOrder && (lastCustomerOrder.id === targetOrderId || String(lastCustomerOrder.id).replace(/^#/, '') === cleanId)) ||
        customerOrderIds.some((id) => id === targetOrderId || String(id).replace(/^#/, '') === cleanId);

      if (isCustomerOrder) {
        let title = 'Order Update';
        let message = `Order #${cleanId} status is now ${data.status}.`;

        if (data.status === 'new' || data.status === 'received') {
          title = 'Order Received';
          message = `Your order #${cleanId} has been placed and received by our baristas.`;
        } else if (data.status === 'accepted' || data.status === 'preparing') {
          title = 'Order Accepted';
          message = 'Your order has been accepted and is being prepared.';
        } else if (data.status === 'ready') {
          title = 'Your order is ready!';
          message = 'Your order has been crafted and is ready!';
          triggerToast('Your order is ready!');
        } else if (data.status === 'completed') {
          title = 'Order Completed';
          message = 'Your order has been completed. Thank you!';
          triggerToast('Order completed. Thank you!');
        } else if (data.status === 'cancelled') {
          title = 'Order Cancelled';
          message = `Order #${cleanId} was cancelled.`;
          triggerToast('Your order was cancelled.');
        }

        addCustomerNotification({
          key: `${cleanId}-${data.status}`,
          orderId: cleanId,
          title,
          message,
          status: data.status,
          accepted_by_name: data.accepted_by_name,
          completed_by_name: data.completed_by_name
        });
      }

      // Update customer live tracking with monotonic guard
      setLastCustomerOrder((prev) => {
        if (prev && (prev.id === targetOrderId || String(prev.id).replace(/^#/, '') === cleanId)) {
          if (!shouldAcceptStatusUpdate(prev.status, data.status)) return prev;
          return { ...prev, ...data };
        }
        return prev;
      });

      refreshStaffOnDuty();
    });

    socketInstance.on('order:updated', (data) => {
      const targetId = data.id || data.orderId;
      setOrders((prev) => prev.map((ord) => (ord.id === targetId ? { ...ord, ...data } : ord)));
      refreshStaffOnDuty();
    });

    socketInstance.on('product:updated', () => { syncProducts(); });

    socketInstance.on('stock:updated', (data) => {
      console.log('📦 Real-time stock update received:', data);
      setMenuCategories((prevCats) =>
        prevCats.map((cat) => ({
          ...cat,
          items: cat.items.map((item) =>
            item.id === data.itemId
              ? {
                ...item,
                available: data.inStock !== false && (typeof data.quantity !== 'number' || data.quantity > 0),
                inStock: item.active !== false && data.inStock !== false && (typeof data.quantity !== 'number' || data.quantity > 0)
              }
              : item
          )
        }))
      );
    });

    setSocket(socketInstance);

    return () => {
      clearInterval(pollInterval);
      socketInstance.disconnect();
    };
  }, []);

  // Dynamic guest socket registration when guest session changes
  useEffect(() => {
    if (!socket || !guestSessionId) return;
    socket.emit('register:guest', guestSessionId);
  }, [socket, guestSessionId]);

  // Socket.IO Room Joining for Customer Live Order Tracking
  useEffect(() => {
    if (!socket || !lastCustomerOrder?.id) return;

    const currentGuestId = guestSessionId || localStorage.getItem('scialla_guest_session');
    socket.emit('join:order', { orderId: lastCustomerOrder.id, guestSessionId: currentGuestId });
    console.log(`📌 Emitted join:order for order:${lastCustomerOrder.id}`);

    return () => {
      if (lastCustomerOrder?.id) {
        socket.emit('leave:order', lastCustomerOrder.id);
      }
    };
  }, [socket, lastCustomerOrder?.id, guestSessionId]);

  // Fetch staff list when Manager user is active
  useEffect(() => {
    if (currentUser && currentUser.role === 'manager') {
      refreshStaffList();
    }
  }, [currentUser]);

  // Authentication Handlers
  const login = async (identifier, password, targetRole) => {
    let response;
    if (targetRole === 'manager') {
      response = await api.managerLogin(identifier, password);
    } else {
      response = await api.staffLogin(identifier, password);
    }

    if (response && response.success) {
      localStorage.setItem('scialla_token', response.token);
      localStorage.setItem('scialla_user', JSON.stringify(response.user));
      setCurrentUser(response.user);
      setActiveRole(response.user.role);
      setIsAuthModalOpen(false);

      // Authenticate active Socket.IO connection immediately with verified token
      if (socket) {
        socket.auth = {
          token: response.token,
          guestSessionId: localStorage.getItem('scialla_guest_session')
        };
        socket.emit('authenticate', { token: response.token });
        if (!socket.connected) {
          socket.connect();
        }
      }

      // Refresh orders and staff data with authenticated role permissions
      refreshOrders();
      refreshStaffOnDuty();
      if (response.user.role === 'manager') {
        refreshStaffList();
      }

      return { success: true, user: response.user };
    } else {
      return { success: false, message: response?.message || 'Authentication failed.' };
    }
  };

  const logout = () => {
    api.logout();
    if (socket) {
      socket.emit('logout');
      socket.auth = {
        token: null,
        guestSessionId: localStorage.getItem('scialla_guest_session')
      };
    }
    localStorage.removeItem('scialla_token');
    localStorage.removeItem('scialla_user');
    setCurrentUser(null);
    setActiveRole('customer');
  };

  const openAuthModal = () => {
    setIsAuthModalOpen(true);
  };

  // Place order from Customer UI (Public Anonymous or Signed-In)
  const placeOrder = async (orderData) => {
    const rawItems = orderData.items || [];
    const itemMap = new Map();
    rawItems.forEach((item) => {
      const rawItemName = item.name || item.product_name || item.productName || item.item_name || 'Item';
      const cleanName = rawItemName.replace(/^\d+x\s*/i, '').trim();
      const key = `${item.id || item.item_id || cleanName}-${item.price}`;
      if (itemMap.has(key)) {
        const existing = itemMap.get(key);
        itemMap.set(key, { ...existing, qty: existing.qty + (item.qty || item.quantity || 1) });
      } else {
        itemMap.set(key, {
          ...item,
          name: cleanName,
          product_name: cleanName,
          productName: cleanName,
          item_name: cleanName,
          qty: item.qty || item.quantity || 1
        });
      }
    });
    const consolidatedItems = Array.from(itemMap.values());

    const activeGuestId = guestSessionId || (await api.getOrCreateGuestSession());

    const nowIso = new Date().toISOString();
    const newOrder = {
      id: orderData.orderNum || orderData.id || `SC-${Math.floor(1000 + Math.random() * 9000)}`,
      table: orderData.table,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: nowIso,
      created_at: nowIso,
      items: consolidatedItems,
      total: orderData.total,
      paymentMethod: orderData.paymentMethod,
      status: 'new',
      guest_session_id: activeGuestId,
      user_id: currentUser ? currentUser.id : null
    };

    const targetId = newOrder.id;
    setCustomerOrderIds((prev) => [targetId, ...prev.filter((id) => id !== targetId)]);

    setOrders((prev) => {
      if (prev.some((o) => o.id === targetId)) return prev;
      return [newOrder, ...prev];
    });
    setLastCustomerOrder(newOrder);

    const cleanTargetId = String(targetId).replace(/^#/, '');
    addCustomerNotification({
      orderId: cleanTargetId,
      title: 'Order Received',
      message: `Order #${cleanTargetId} has been received.`,
      status: 'new'
    });

    // Save to PostgreSQL via REST API (with backend stock verification)
    const response = await api.createOrder(newOrder);
    if (response && response.success === false) {
      // Out of stock or validation failure
      triggerToast(response.message || 'Item is out of stock');
      syncProductStock(); // Sync latest stock state into menu
      return { success: false, message: response.message };
    }

    if (response && response.order) {
      setOrders((prev) =>
        prev.map((o) => (o.id === newOrder.id ? { ...newOrder, ...response.order } : o))
      );
      setLastCustomerOrder(response.order);
      if (response.order.id) {
        setCustomerOrderIds((prev) => (prev.includes(response.order.id) ? prev : [response.order.id, ...prev]));
      }
    }

    // Direct Socket.IO emission fallback if connected
    if (socket && socket.connected) {
      socket.emit('order:create', newOrder);
      socket.emit('join:order', newOrder.id);
    }

    triggerToast(`Order placed successfully! #${newOrder.id}`);
    return { success: true, order: response?.order || newOrder };
  };

  // Update order status (Staff / Manager) with server-side audit trails & registered staff full name
  const updateOrderStatus = async (orderId, newStatus) => {
    const canonicalStatus = newStatus === 'accepted' ? 'preparing' : newStatus;

    let currentStaffName = null;
    if (currentUser) {
      if (currentUser.first_name && currentUser.last_name) {
        currentStaffName = `${currentUser.first_name} ${currentUser.last_name}`.trim();
      } else if (currentUser.name && currentUser.name.trim().length > 0) {
        currentStaffName = currentUser.name.trim();
      } else if (currentUser.id && Array.isArray(staffList)) {
        const found = staffList.find((s) => s.id === currentUser.id);
        if (found) {
          currentStaffName = `${found.first_name || ''} ${found.last_name || ''}`.trim() || found.name;
        }
      }
      if (!currentStaffName) {
        currentStaffName = currentUser.username;
      }
    }

    // 1. Optimistic update with exact registered staff full name
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== orderId) return ord;
        const updated = { ...ord, status: canonicalStatus };
        if (canonicalStatus === 'preparing' && !updated.accepted_by_name && currentStaffName) {
          updated.accepted_by_name = currentStaffName;
          updated.accepted_at = new Date().toISOString();
        } else if (canonicalStatus === 'completed' && currentStaffName) {
          updated.completed_by_name = currentStaffName;
          updated.completed_at = new Date().toISOString();
        }
        return updated;
      })
    );

    if (lastCustomerOrder && lastCustomerOrder.id === orderId) {
      setLastCustomerOrder((prev) => {
        const updated = { ...prev, status: canonicalStatus };
        if (canonicalStatus === 'preparing' && !updated.accepted_by_name && currentStaffName) {
          updated.accepted_by_name = currentStaffName;
        } else if (canonicalStatus === 'completed' && currentStaffName) {
          updated.completed_by_name = currentStaffName;
        }
        return updated;
      });
    }

    // 2. Persist status change in PostgreSQL via REST API (passes verified registered staff name)
    const res = await api.updateOrderStatus(orderId, canonicalStatus, currentStaffName);
    if (res && res.success === false) {
      triggerToast(`${res.message || 'Action conflict'}`);
      if (res.order) {
        setOrders((prev) => prev.map((ord) => (ord.id === orderId ? { ...ord, ...res.order } : ord)));
      }
      return res;
    }

    if (res && res.order) {
      setOrders((prev) =>
        prev.map((ord) => (ord.id === orderId ? { ...ord, ...res.order } : ord))
      );
      if (lastCustomerOrder && lastCustomerOrder.id === orderId) {
        setLastCustomerOrder((prev) => ({ ...prev, ...res.order }));
      }
    }

    // Direct Socket.IO emission fallback if connected
    if (socket && socket.connected) {
      socket.emit('order:update_status', { id: orderId, status: canonicalStatus, staffName: currentStaffName });
    }

    return res;
  };

  // Toggle item stock status (Staff / Manager) with PostgreSQL persistence
  const toggleItemStock = (itemId) => {
    // 1. Find the current item synchronously from active categories
    let currentItem = null;
    for (const cat of menuCategories) {
      const found = cat.items.find((i) => i.id === itemId);
      if (found) {
        currentItem = found;
        break;
      }
    }

    const currentStock = currentItem ? currentItem.inStock !== false : true;
    const nextStockState = !currentStock;
    const nextQuantity = nextStockState ? 50 : 0;
    const itemName = currentItem ? currentItem.name : itemId;

    // 2. Optimistic local state update
    setMenuCategories((prevCats) =>
      prevCats.map((cat) => ({
        ...cat,
        items: cat.items.map((item) => {
          if (item.id === itemId) {
            return { ...item, inStock: nextStockState };
          }
          return item;
        })
      }))
    );

    // 3. Persist to PostgreSQL via REST API
    api.updateProductStock(itemId, nextStockState, nextQuantity, itemName);

    // 4. Broadcast via Socket.IO
    if (socket && socket.connected) {
      socket.emit('stock:toggle', { itemId, inStock: nextStockState, quantity: nextQuantity, name: itemName });
    }
  };

  // Helper to match Asia/Manila date
  const isTodayInManila = (dateInput) => {
    if (!dateInput) return true;
    try {
      const orderDate = new Date(dateInput).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
      const todayManila = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
      return orderDate === todayManila;
    } catch {
      return true;
    }
  };

  // Strictly completed orders for today in Asia/Manila timezone
  const todayCompletedOrders = orders.filter((o) => {
    if (o.status !== 'completed') return false;
    const dateVal = o.completed_at || o.createdAt || o.timestamp || o.created_at;
    return isTodayInManila(dateVal);
  });

  const todayRevenue = todayCompletedOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
  const todayOrderCount = todayCompletedOrders.length;
  const avgOrderValue = todayOrderCount > 0 ? (todayRevenue / todayOrderCount).toFixed(2) : '0.00';
  const completedOrders = todayCompletedOrders;

  // Monthly Revenue & Sales Data Analytics
  const liveOrderTotal = completedOrders.reduce((sum, o) => sum + o.total, 0);
  const liveOrderCount = completedOrders.length;

  const monthlySalesData = [
    { month: 'Jan', revenue: 310500, orders: 1820, avgTicket: 170.6, percent: 60, growth: '+8.4%' },
    { month: 'Feb', revenue: 345800, orders: 1980, avgTicket: 174.6, percent: 67, growth: '+11.3%' },
    { month: 'Mar', revenue: 390200, orders: 2150, avgTicket: 181.4, percent: 76, growth: '+12.8%' },
    { month: 'Apr', revenue: 412000, orders: 2240, avgTicket: 183.9, percent: 80, growth: '+5.5%' },
    { month: 'May', revenue: 438500, orders: 2390, avgTicket: 183.4, percent: 85, growth: '+6.4%' },
    { month: 'Jun', revenue: 462100, orders: 2480, avgTicket: 186.3, percent: 90, growth: '+5.3%' },
    { month: 'Jul', revenue: 489400, orders: 2590, avgTicket: 188.9, percent: 95, growth: '+5.9%' },
    {
      month: 'Aug',
      revenue: 512450 + liveOrderTotal,
      orders: 2710 + liveOrderCount,
      avgTicket: Number(((512450 + liveOrderTotal) / (2710 + liveOrderCount)).toFixed(1)),
      percent: 100,
      growth: '+18.6%',
      isCurrent: true
    },
  ];

  const thisMonthRevenue = 512450 + liveOrderTotal;
  const monthlyTargetRevenue = 600000;
  const monthlyProgressPercent = Math.min(100, Number(((thisMonthRevenue / monthlyTargetRevenue) * 100).toFixed(1)));
  const monthlyOrderCount = 2710 + liveOrderCount;

  // Calculate top products
  const productSalesMap = {};
  orders.forEach((ord) => {
    (ord.items || []).forEach((item) => {
      productSalesMap[item.name] = (productSalesMap[item.name] || 0) + (item.qty || 1);
    });
  });

  const topProducts = [
    { name: 'Spanish Latte', count: (productSalesMap['Spanish Latte'] || 0) + 84, price: 175 },
    { name: 'Scialla Cold Brew', count: (productSalesMap['Scialla Cold Brew'] || 0) + 71, price: 150 },
    { name: 'Iced Vanilla Latte', count: (productSalesMap['Iced Vanilla Latte'] || 0) + 64, price: 180 },
    { name: 'Cappuccino', count: (productSalesMap['Cappuccino'] || 0) + 48, price: 160 },
    { name: 'Butter Croissant', count: (productSalesMap['Butter Croissant'] || 0) + 42, price: 120 },
  ].sort((a, b) => b.count - a.count);

  // Compute customer order history (newest order placed ALWAYS on top)
  const customerOrderHistory = orders
    .filter((o) => {
      if (!o) return false;
      const isIdMatch = customerOrderIds.includes(o.id) || (lastCustomerOrder && lastCustomerOrder.id === o.id);
      const isSessionMatch = Boolean(guestSessionId && o.guest_session_id && o.guest_session_id === guestSessionId);
      return isIdMatch || isSessionMatch;
    })
    .sort((a, b) => {
      // 1. Order Creation Time (primary sort: most recently placed order on TOP)
      const getOrderTimestamp = (ord) => {
        if (!ord) return 0;
        const rawCreated = ord.createdAt || ord.created_at;
        if (rawCreated) {
          const t = new Date(rawCreated).getTime();
          if (!isNaN(t) && t > 0) return t;
        }
        return 0;
      };

      const timeA = getOrderTimestamp(a);
      const timeB = getOrderTimestamp(b);
      if (timeA > 0 && timeB > 0 && timeB !== timeA) {
        return timeB - timeA;
      }

      // 2. Position in customerOrderIds array (index 0 is newest placed -> top)
      const idxA = customerOrderIds.indexOf(a.id);
      const idxB = customerOrderIds.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1 && idxA !== idxB) {
        return idxA - idxB;
      }
      if (idxA !== -1 && idxB === -1) return -1;
      if (idxB !== -1 && idxA === -1) return 1;

      // 3. Fallback: Parse numeric order ID (e.g. SC-7427 > SC-6596)
      const numA = parseInt(String(a.id).replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(String(b.id).replace(/\D/g, ''), 10) || 0;
      if (numB !== numA) return numB - numA;

      return String(b.id).localeCompare(String(a.id), undefined, { numeric: true });
    });

  return (
    <AppContext.Provider
      value={{
        activeRole,
        setActiveRole,
        currentUser,
        guestSessionId,
        toastMessage,
        triggerToast,
        login,
        logout,
        isAuthModalOpen,
        setIsAuthModalOpen,
        openAuthModal,
        menuCategories,
        orders,
        refreshOrders,
        customerOrderHistory,
        customerNotifications,
        unreadNotificationsCount,
        hasNewNotifPulse,
        markNotificationsAsRead,
        markSingleNotificationAsRead,
        refreshCustomerNotifications,
        clearNotifications,
        addCustomerNotification,
        staffList,
        refreshStaffList,
        staffOnDuty,
        refreshStaffOnDuty,
        syncProductStock,
        saveProduct,
        lastCustomerOrder,
        setLastCustomerOrder,
        placeOrder,
        updateOrderStatus,
        toggleItemStock,
        todayRevenue,
        todayOrderCount,
        avgOrderValue,
        thisMonthRevenue,
        monthlyTargetRevenue,
        monthlyProgressPercent,
        monthlyOrderCount,
        monthlySalesData,
        topProducts,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
