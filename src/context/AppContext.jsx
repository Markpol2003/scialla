import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { api } from '../services/api';

const AppContext = createContext();

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050';
const WS_URL = import.meta.env.VITE_WS_URL || API_BASE_URL;

// State order progression ranking (Prevents out-of-order socket events from regressing status)
const STATUS_RANKS = {
  pending_manager_approval: 1,
  new: 1,
  received: 1,
  pending: 1,
  accepted: 2,
  approved: 2,
  preparing: 3,
  ready: 4,
  served: 5,
  completed: 5,
  complete: 5,
  cancelled: 6
};

function shouldAcceptStatusUpdate(currentStatus, incomingStatus) {
  if (!currentStatus) return true;
  if (!incomingStatus) return false;
  const curr = String(currentStatus).toLowerCase().trim();
  const inc = String(incomingStatus).toLowerCase().trim();
  if (curr === 'cancelled') return false; // Cancelled is terminal
  if ((curr === 'served' || curr === 'completed' || curr === 'complete') && inc !== 'served' && inc !== 'completed' && inc !== 'complete' && inc !== 'cancelled') {
    return false; // Completed cannot regress to preparing or ready
  }
  const currentRank = STATUS_RANKS[curr] || 0;
  const incomingRank = STATUS_RANKS[inc] || 0;
  if (incomingRank < currentRank) return false; // Prevent backward status movement
  return true;
}

import initialCategories from '../../shared/catalog.json';

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('scialla_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [activeRole, setActiveRole] = useState(() => {
    try {
      const saved = localStorage.getItem('scialla_user');
      const u = saved ? JSON.parse(saved) : null;
      return u?.role || 'customer';
    } catch {
      return 'customer';
    }
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
  const [sizeChangeRequests, setSizeChangeRequests] = useState([]);
  const [cashReports, setCashReports] = useState([]);
  const [cashReconciliation, setCashReconciliation] = useState(null);
  const [orderAudit, setOrderAudit] = useState([]);
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
    const custName = notif.customer_name || notif.customerName || (lastCustomerOrder && lastCustomerOrder.customer_name ? lastCustomerOrder.customer_name : null);

    let defaultTitle = notif.title || 'Order Update';
    let defaultMessage = notif.message || (custName ? `${custName}, your order status is now ${status}.` : `Order #${cleanId} status is now ${status}.`);

    if (status === 'pending_manager_approval' || status === 'new' || status === 'received') {
      defaultTitle = 'Awaiting Manager Approval';
      defaultMessage = custName ? `${custName}, your order is waiting for Manager approval.` : `Your order #${cleanId} is waiting for Manager approval.`;
    } else if (status === 'approved') {
      defaultTitle = 'Order Approved';
      defaultMessage = `Order #${cleanId} was approved and sent to Staff for preparation.`;
    } else if (status === 'accepted' || status === 'preparing') {
      defaultTitle = 'Order Preparing';
      defaultMessage = custName ? `${custName}, your order is being prepared.` : 'Your order is being prepared.';
    } else if (status === 'ready') {
      defaultTitle = 'Order Crafted';
      defaultMessage = custName ? `${custName}, your order has been crafted and is ready.` : 'Your order has been crafted and is ready!';
    } else if (status === 'served' || status === 'completed') {
      defaultTitle = 'Order Served';
      defaultMessage = custName ? `${custName}, your order has been served. Thank you!` : 'Your order has been served. Thank you!';
    } else if (status === 'cancelled') {
      defaultTitle = 'Order Cancelled';
      defaultMessage = custName ? `${custName}, your order #${cleanId} was cancelled.` : `Order #${cleanId} was cancelled.`;
    }

    const newEntry = {
      id: notif.id ? String(notif.id) : dedupKey,
      key: dedupKey,
      orderId: cleanId,
      customer_name: custName,
      customerName: custName,
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
    const requestStartedAt = Date.now();
    try {
      const data = await api.getOrders();
      if (data == null) return;
      const orderList = Array.isArray(data) ? data : (data && Array.isArray(data.orders) ? data.orders : []);
      setOrders((prev) => {
        const map = new Map(orderList.map((order) => [String(order.id), order]));
        // Keep a just-arrived socket order if this DB read began before its commit.
        prev.forEach((order) => {
          if (!map.has(String(order.id)) && order._realtimeReceivedAt >= requestStartedAt) {
            map.set(String(order.id), order);
          }
        });
        return Array.from(map.values());
      });
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
      api.getCurrentUser().then((res) => {
        if (res && res.unauthorized) {
          logout();
        } else if (res && !res.error && res.id) {
          setCurrentUser(res);
          setActiveRole(res.role);
          refreshOrders();
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
      const receivedOrder = { ...newOrder, _realtimeReceivedAt: Date.now() };
      setOrders((prev) => {
        if (prev.some((order) => String(order.id) === String(newOrder.id))) {
          return prev.map((order) => String(order.id) === String(newOrder.id) ? { ...order, ...receivedOrder } : order);
        }
        return [receivedOrder, ...prev];
      });
      refreshStaffOnDuty();
    });

    socketInstance.on('order:adjusted', (updatedOrder) => {
      setOrders((prev) => prev.map((order) => order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order));
      setLastCustomerOrder((prev) => prev?.id === updatedOrder.id ? { ...prev, ...updatedOrder } : prev);
    });

    socketInstance.on('size-change-request:updated', (request) => {
      setSizeChangeRequests((prev) => [request, ...prev.filter((item) => item.id !== request.id)]);
    });

    socketInstance.on('cash:reported', (report) => {
      setCashReports((prev) => [report, ...prev.filter((item) => String(item.id) !== String(report.id))]);
      refreshCashReconciliation();
    });
    socketInstance.on('cash:updated', (report) => {
      setCashReports((prev) => [report, ...prev.filter((item) => String(item.id) !== String(report.id))]);
      if (report.orderId) {
        setOrders((prev) => prev.map((order) => String(order.id) === String(report.orderId)
          ? { ...order, paymentStatus: report.paymentStatus, amountAlreadyPaid: report.amountAlreadyPaid }
          : order));
        setLastCustomerOrder((prev) => prev && String(prev.id) === String(report.orderId)
          ? { ...prev, paymentStatus: report.paymentStatus, amountAlreadyPaid: report.amountAlreadyPaid }
          : prev);
      }
      refreshCashReconciliation();
    });

    // Targeted real-time customer notification event from server
    socketInstance.on('notification:new', (notifData) => {
      console.log('🔔 Received targeted notification:new:', notifData);
      addCustomerNotification(notifData);
      if (notifData.status === 'ready') {
        triggerToast('Your order is ready!');
      } else if (notifData.status === 'served' || notifData.status === 'completed') {
        triggerToast('Order served. Thank you!');
      } else if (notifData.status === 'cancelled') {
        triggerToast('Order was cancelled.');
      }
    });

    // Targeted status update handler with monotonic order progression guard
    socketInstance.on('order:status_updated', (data) => {
      console.log('📡 Received targeted order:status_updated:', data);
      const targetOrderId = data.id || data.orderId;
      if (!targetOrderId) return;
      const cleanId = String(targetOrderId).replace(/^#/, '');

      // Update staff dashboard orders queue with monotonic rank check
      setOrders((prev) =>
        prev.map((ord) => {
          const ordCleanId = String(ord.id || '').replace(/^#/, '');
          if (ord.id === targetOrderId || ordCleanId === cleanId) {
            if (!shouldAcceptStatusUpdate(ord.status, data.status)) return ord;
            return {
              ...ord,
              ...data,
              customer_name: data.customer_name || data.customerName || ord.customer_name || ord.customerName || null,
              customerName: data.customer_name || data.customerName || ord.customer_name || ord.customerName || null
            };
          }
          return ord;
        })
      );

      // Check if this order belongs to current customer
      const isCustomerOrder = (lastCustomerOrder && (lastCustomerOrder.id === targetOrderId || String(lastCustomerOrder.id).replace(/^#/, '') === cleanId)) ||
        customerOrderIds.some((id) => id === targetOrderId || String(id).replace(/^#/, '') === cleanId);

      if (isCustomerOrder) {
        const foundOrder = (lastCustomerOrder && (lastCustomerOrder.id === targetOrderId || String(lastCustomerOrder.id).replace(/^#/, '') === cleanId))
          ? lastCustomerOrder
          : orders.find((o) => o.id === targetOrderId || String(o.id).replace(/^#/, '') === cleanId);
        const custName = data.customer_name || data.customerName || (foundOrder ? (foundOrder.customer_name || foundOrder.customerName) : null);

        let title = 'Order Update';
        let message = custName ? `${custName}, your order status is now ${data.status}.` : `Order #${cleanId} status is now ${data.status}.`;

        if (data.status === 'pending_manager_approval' || data.status === 'new' || data.status === 'received') {
          title = 'Awaiting Manager Approval';
          message = custName ? `${custName}, your order is waiting for Manager approval.` : `Your order #${cleanId} is waiting for Manager approval.`;
        } else if (data.status === 'approved') {
          title = 'Order Approved';
          message = `Order #${cleanId} was approved and sent to Staff for preparation.`;
        } else if (data.status === 'accepted' || data.status === 'preparing') {
          title = 'Order Preparing';
          message = custName ? `${custName}, your order is being prepared.` : 'Your order is being prepared.';
        } else if (data.status === 'ready') {
          title = 'Order Crafted';
          message = custName ? `${custName}, your order has been crafted and is ready.` : 'Your order has been crafted and is ready!';
          triggerToast(custName ? `${custName}, your order has been crafted and is ready.` : 'Your order has been crafted and is ready!');
        } else if (data.status === 'served' || data.status === 'completed') {
          title = 'Order Served';
          message = custName ? `${custName}, your order has been served. Thank you!` : 'Your order has been served. Thank you!';
          triggerToast(message);
        } else if (data.status === 'cancelled') {
          title = 'Order Cancelled';
          message = custName ? `${custName}, your order #${cleanId} was cancelled.` : `Order #${cleanId} was cancelled.`;
          triggerToast('Your order was cancelled.');
        }

        addCustomerNotification({
          key: `${cleanId}-${data.status}`,
          orderId: cleanId,
          customer_name: custName,
          customerName: custName,
          title,
          message,
          status: data.status,
          accepted_by_name: data.accepted_by_name,
          completed_by_name: data.completed_by_name
        });
      }

      // Update customer live tracking with monotonic guard & customer_name retention
      setLastCustomerOrder((prev) => {
        if (prev) {
          const prevCleanId = String(prev.id || '').replace(/^#/, '');
          if (prev.id === targetOrderId || prevCleanId === cleanId) {
            if (!shouldAcceptStatusUpdate(prev.status, data.status)) return prev;
            const merged = { ...prev, ...data };
            const preservedName = data.customer_name || data.customerName || prev.customer_name || prev.customerName || null;
            merged.customer_name = preservedName;
            merged.customerName = preservedName;
            return merged;
          }
        }
        return prev;
      });

      refreshStaffOnDuty();
    });

    socketInstance.on('order:updated', (data) => {
      const targetId = data.id || data.orderId;
      if (!targetId) return;
      setOrders((prev) => prev.map((ord) => (String(ord.id) === String(targetId) ? { ...ord, ...data } : ord)));
      setLastCustomerOrder((prev) => prev && String(prev.id) === String(targetId) ? { ...prev, ...data } : prev);
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
      refreshCashReports();
      refreshCashReconciliation();
      refreshOrderAudit();
    }
    if (currentUser && ['staff', 'manager'].includes(currentUser.role)) {
      refreshSizeChangeRequests();
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
    const rawCustomerName = orderData.customer_name || orderData.customerName || '';
    const cleanCustomerName = typeof rawCustomerName === 'string' && rawCustomerName.trim().length > 0
      ? rawCustomerName.trim().slice(0, 40)
      : null;

    const nowIso = new Date().toISOString();
    const newOrder = {
      id: orderData.orderNum || orderData.id || `SC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      customer_name: cleanCustomerName,
      customerName: cleanCustomerName,
      table: orderData.table,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: nowIso,
      created_at: nowIso,
      items: consolidatedItems,
      total: orderData.total,
      paymentMethod: 'Cash',
      status: 'pending_manager_approval',
      paymentStatus: 'unpaid',
      amountAlreadyPaid: 0,
      guest_session_id: activeGuestId,
      user_id: currentUser ? currentUser.id : null
    };

    // Save to PostgreSQL via REST API (with backend stock verification)
    const response = await api.createOrder(newOrder);
    if (response && response.success === false) {
      triggerToast(response.message || 'Item is out of stock');
      syncProductStock();
      return { success: false, message: response.message };
    }

    const created = response?.order;
    if (!response?.success || !created?.id) {
      const message = response?.message || 'The order was not confirmed by the server.';
      triggerToast(message);
      return { success: false, message };
    }

    const targetId = created.id;
    setOrders((prev) => prev.some((order) => String(order.id) === String(targetId))
      ? prev.map((order) => String(order.id) === String(targetId) ? { ...order, ...created } : order)
      : [created, ...prev]);
    setLastCustomerOrder(created);
    setCustomerOrderIds((prev) => (prev.includes(created.id) ? prev : [created.id, ...prev]));
    addCustomerNotification({
      orderId: String(targetId).replace(/^#/, ''),
      customer_name: created.customer_name || cleanCustomerName,
      customerName: created.customer_name || cleanCustomerName,
      title: 'Order Received',
      message: cleanCustomerName ? `${cleanCustomerName}, your order is waiting for Manager approval.` : `Your order #${targetId} is waiting for Manager approval.`,
      status: 'pending_manager_approval'
    });

    // Join order room immediately on socket
    if (socket && socket.connected) {
      if (activeGuestId) {
        socket.emit('register:guest', activeGuestId);
      }
      socket.emit('join:order', { orderId: created.id, guestSessionId: activeGuestId });
    }

    triggerToast(`Order submitted for Manager approval. #${created.id}`);
    return { success: true, order: created };
  };

  // Update order status (Staff / Manager) with server-side audit trails & registered staff full name
  const updateOrderStatus = async (orderId, newStatus) => {
    const canonicalStatus = newStatus === 'completed' ? 'served' : newStatus === 'accepted' ? 'preparing' : newStatus;
    const previousOrder = orders.find((order) => String(order.id) === String(orderId));
    const previousCustomerOrder = lastCustomerOrder && String(lastCustomerOrder.id) === String(orderId)
      ? lastCustomerOrder
      : null;

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
        } else if (canonicalStatus === 'served' && currentStaffName) {
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
        } else if (canonicalStatus === 'served' && currentStaffName) {
          updated.completed_by_name = currentStaffName;
        }
        return updated;
      });
    }

    // 2. Persist status change in PostgreSQL via REST API (passes verified registered staff name)
    const res = await api.updateOrderStatus(orderId, canonicalStatus, currentStaffName);
    if (res && res.success === false) {
      triggerToast(`${res.message || 'Action conflict'}`);
      setOrders((prev) => prev.map((ord) => String(ord.id) === String(orderId)
        ? (res.order ? { ...ord, ...res.order } : previousOrder || ord)
        : ord));
      if (previousCustomerOrder) {
        setLastCustomerOrder((prev) => prev && String(prev.id) === String(orderId)
          ? (res.order ? { ...prev, ...res.order } : previousCustomerOrder)
          : prev);
      }
      return res;
    }

    if (res && res.order) {
      setOrders((prev) =>
        prev.map((ord) => (ord.id === orderId ? { ...ord, ...res.order } : ord))
      );
      if (lastCustomerOrder && lastCustomerOrder.id === orderId) {
        setLastCustomerOrder((prev) => {
          const merged = { ...prev, ...res.order };
          if (!merged.customer_name && prev.customer_name) {
            merged.customer_name = prev.customer_name;
            merged.customerName = prev.customer_name;
          }
          return merged;
        });
      }
    }

    return res;
  };

  const adjustOrder = async (orderId, action, items) => {
    const response = await api.adjustOrder(orderId, action, items);
    if (!response?.success || !response.order) {
      triggerToast(response?.message || 'Unable to update this order.');
      return response;
    }
    const updated = response.order;
    setOrders((prev) => prev.map((order) => order.id === orderId ? { ...order, ...updated } : order));
    setLastCustomerOrder((prev) => prev?.id === orderId ? { ...prev, ...updated } : prev);
    await refreshCashReports();
    return response;
  };

  const refreshSizeChangeRequests = async (orderId = null) => {
    const requests = await api.getSizeChangeRequests(orderId);
    if (orderId) {
      setSizeChangeRequests((prev) => [
        ...prev.filter((request) => String(request.orderId) !== String(orderId)),
        ...requests
      ]);
    } else {
      setSizeChangeRequests(requests);
    }
    return requests;
  };

  const submitSizeChangeRequest = async (orderId, itemIndex, requestedSize) => {
    const response = await api.submitSizeChangeRequest(orderId, itemIndex, requestedSize);
    if (response?.success && response.request) {
      setSizeChangeRequests((prev) => [response.request, ...prev.filter((request) => request.id !== response.request.id)]);
      return response;
    }
    triggerToast(response?.message || 'Unable to submit size-change request.');
    return response;
  };

  const reviewSizeChangeRequest = async (requestId, status) => {
    const response = await api.reviewSizeChangeRequest(requestId, status);
    if (response?.success && response.request) {
      setSizeChangeRequests((prev) => prev.map((request) => request.id === response.request.id ? response.request : request));
      if (response.order) {
        setOrders((prev) => prev.map((order) => order.id === response.order.id ? { ...order, ...response.order } : order));
        setLastCustomerOrder((prev) => prev?.id === response.order.id ? { ...prev, ...response.order } : prev);
      }
      return response;
    }
    triggerToast(response?.message || 'Unable to review size-change request.');
    return response;
  };

  const refreshCashReports = async () => {
    const reports = await api.getCashReports();
    setCashReports(reports);
    return reports;
  };

  const refreshCashReconciliation = async () => {
    const data = await api.getCashReconciliation();
    setCashReconciliation(data);
    return data;
  };

  const refreshOrderAudit = async () => {
    const audit = await api.getOrderAudit();
    setOrderAudit(audit);
    return audit;
  };

  const reviewOrder = async (orderId, decision) => {
    const response = await api.reviewOrder(orderId, decision);
    if (response?.success && response.order) {
      const updated = response.order;
      setOrders((prev) => prev.map((order) => String(order.id) === String(orderId) ? { ...order, ...updated } : order));
      setLastCustomerOrder((prev) => prev && String(prev.id) === String(orderId) ? { ...prev, ...updated } : prev);
      return response;
    }
    triggerToast(response?.message || 'Unable to review this order.');
    return response;
  };

  const submitCashReport = async (orderId, amount) => {
    const response = await api.submitCashReport(orderId, amount);
    if (response?.success) {
      setCashReports((prev) => [response.report, ...prev.filter((item) => String(item.id) !== String(response.report.id))]);
      setOrders((prev) => prev.map((order) => String(order.id) === String(orderId) ? { ...order, paymentStatus: 'pending_manager_verification' } : order));
      triggerToast('Cash collection submitted for Manager verification.');
      return response;
    }
    triggerToast(response?.message || 'Unable to report collected cash.');
    return response;
  };

  const reviewCashReport = async (reportId, decision, note = '') => {
    const response = await api.reviewCashReport(reportId, decision, note);
    if (response?.success) {
      const report = response.report;
      setCashReports((prev) => [report, ...prev.filter((item) => String(item.id) !== String(report.id))]);
      setOrders((prev) => prev.map((order) => String(order.id) === String(report.orderId)
        ? { ...order, paymentStatus: report.paymentStatus, amountAlreadyPaid: report.amountAlreadyPaid }
        : order));
      triggerToast(response.discrepancy ? 'Cash discrepancy flagged for Manager review.' : `Cash report ${decision === 'verify' ? 'verified' : 'updated'}.`);
      await refreshCashReconciliation();
      return response;
    }
    triggerToast(response?.message || 'Unable to review cash report.');
    return response;
  };

  const closeCashReconciliation = async (data) => {
    const response = await api.closeCashReconciliation(data);
    if (response?.success) {
      await refreshCashReconciliation();
      triggerToast('Cash reconciliation saved.');
    } else {
      triggerToast(response?.message || 'Unable to save cash reconciliation.');
    }
    return response;
  };

  // Toggle item stock status (Staff / Manager) with PostgreSQL persistence
  const toggleItemStock = async (itemId) => {
    let nextStockState = false;
    let nextQuantity = 0;
    let itemName = itemId;

    // 1. Functional state updater to ensure synchronous fresh state from previous state (no stale closures)
    setMenuCategories((prevCats) => {
      let currentItem = null;
      for (const cat of prevCats) {
        const found = cat.items.find((i) => i.id === itemId);
        if (found) {
          currentItem = found;
          break;
        }
      }

      const currentStock = currentItem ? currentItem.inStock !== false : true;
      nextStockState = !currentStock;
      nextQuantity = nextStockState ? 50 : 0;
      itemName = currentItem ? currentItem.name : itemId;

      return prevCats.map((cat) => ({
        ...cat,
        items: cat.items.map((item) => {
          if (item.id === itemId) {
            return {
              ...item,
              inStock: nextStockState,
              available: nextStockState
            };
          }
          return item;
        })
      }));
    });

    try {
      // 2. Persist to PostgreSQL via REST API
      const res = await api.updateProductStock(itemId, nextStockState, nextQuantity, itemName);

      // 3. Broadcast via Socket.IO
      if (socket && socket.connected) {
        socket.emit('stock:toggle', { itemId, inStock: nextStockState, quantity: nextQuantity, name: itemName });
      }

      return res;
    } catch (err) {
      console.error('Failed to update product stock:', err);
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
    if (o.status !== 'served' || o.paymentStatus !== 'paid') return false;
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
  const currentMonthLabel = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'Asia/Manila' }).format(new Date());

  const monthlySalesData = [
    { month: 'Jan', revenue: 310500, orders: 1820, avgTicket: 170.6, percent: 60, growth: '+8.4%' },
    { month: 'Feb', revenue: 345800, orders: 1980, avgTicket: 174.6, percent: 67, growth: '+11.3%' },
    { month: 'Mar', revenue: 390200, orders: 2150, avgTicket: 181.4, percent: 76, growth: '+12.8%' },
    { month: 'Apr', revenue: 412000, orders: 2240, avgTicket: 183.9, percent: 80, growth: '+5.5%' },
    { month: 'May', revenue: 438500, orders: 2390, avgTicket: 183.4, percent: 85, growth: '+6.4%' },
    { month: 'Jun', revenue: 462100, orders: 2480, avgTicket: 186.3, percent: 90, growth: '+5.3%' },
    { month: 'Jul', revenue: 489400, orders: 2590, avgTicket: 188.9, percent: 95, growth: '+5.9%' },
    {
      month: currentMonthLabel,
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
        sizeChangeRequests,
        refreshSizeChangeRequests,
        submitSizeChangeRequest,
        reviewSizeChangeRequest,
        cashReports,
        cashReconciliation,
        orderAudit,
        refreshCashReports,
        refreshCashReconciliation,
        refreshOrderAudit,
        reviewOrder,
        submitCashReport,
        reviewCashReport,
        closeCashReconciliation,
        syncProductStock,
        saveProduct,
        lastCustomerOrder,
        setLastCustomerOrder,
        placeOrder,
        updateOrderStatus,
        adjustOrder,
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
