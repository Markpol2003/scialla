import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext();

const initialCategories = [
  {
    id: 'espresso',
    category: 'Espresso & Classics',
    items: [
      { id: 'c1', name: 'Espresso', description: 'Pure rich single-origin double shot', price: 110, tag: 'Bold', inStock: true },
      { id: 'c2', name: 'Americano', description: 'Double shot espresso poured over hot mountain water', price: 130, tag: 'Classic', inStock: true },
      { id: 'c3', name: 'Macchiato', description: 'Rich espresso marked with velvety milk foam', price: 140, tag: 'Rich', inStock: true },
      { id: 'c4', name: 'Cappuccino', description: 'Equal parts espresso, steamed milk, and airy microfoam', price: 160, tag: 'Popular', inStock: true },
      { id: 'c5', name: 'Latte', description: 'Smooth espresso folded into creamy steamed whole milk', price: 165, tag: 'Smooth', inStock: true },
    ]
  },
  {
    id: 'specialty',
    category: 'Specialty Drinks',
    items: [
      { id: 'c6', name: 'Iced Vanilla Latte', description: 'Double espresso, oat milk, organic vanilla bean syrup', price: 180, tag: 'Best Seller', featured: true, inStock: true },
      { id: 'c7', name: 'Flat White', description: 'Double ristretto shots topped with silky microfoam', price: 170, tag: 'Silky', inStock: true },
      { id: 'c8', name: 'Spanish Latte', description: 'Rich espresso infused with condensed and fresh milk', price: 175, tag: 'Sweet', featured: true, inStock: true },
      { id: 'c9', name: 'Cortado', description: 'Equal parts intense espresso and warm textured milk', price: 150, tag: 'Balanced', inStock: true },
      { id: 'c10', name: 'Mocha', description: 'Dark Dutch cocoa, double espresso, and steamed milk', price: 175, tag: 'Indulgent', inStock: true },
      { id: 'c11', name: 'Affogato', description: 'Hot espresso poured over a scoop of vanilla gelato', price: 190, tag: 'Dessert', inStock: true },
    ]
  },
  {
    id: 'coldbrew',
    category: 'Cold Brew & Refreshers',
    items: [
      { id: 'c12', name: 'Scialla Cold Brew', description: 'Slow-steeped for 24 hours, extra smooth & low acidity', price: 150, tag: 'Signature', featured: true, inStock: true },
      { id: 'c13', name: 'Iced Caramel Cold Brew', description: '24hr cold brew topped with salted caramel cold foam', price: 185, tag: 'Creamy', inStock: true },
      { id: 'c14', name: 'Cold Brew Float', description: 'Smooth cold brew with handcrafted vanilla bean ice cream', price: 195, tag: 'Special', inStock: true },
    ]
  },
  {
    id: 'pastries',
    category: 'Fresh Bakery & Pastries',
    items: [
      { id: 'p1', name: 'Butter Croissant', description: 'Flaky Golden French butter croissant, baked fresh daily', price: 120, tag: 'Fresh', inStock: true },
      { id: 'p2', name: 'Almond Croissant', description: 'Filled with rich almond frangipane and sliced almonds', price: 145, tag: 'Popular', inStock: true },
      { id: 'p3', name: 'Chocolate Muffin', description: 'Decadent dark chocolate chunk bakery muffin', price: 115, tag: 'Sweet', inStock: true },
      { id: 'p4', name: 'Cinnamon Roll', description: 'Warm warm cinnamon swirl topped with cream cheese frosting', price: 130, tag: 'Warm', inStock: true },
    ]
  }
];

const initialInventory = [
  { id: 'inv1', name: 'Espresso Coffee Beans', category: 'Coffee', stock: 8.5, unit: 'kg', minThreshold: 5.0 },
  { id: 'inv2', name: 'Fresh Whole Milk', category: 'Dairy', stock: 14, unit: 'bottles', minThreshold: 10 },
  { id: 'inv3', name: 'Barista Oat Milk', category: 'Dairy', stock: 6, unit: 'cartons', minThreshold: 8 },
  { id: 'inv4', name: 'Organic Vanilla Syrup', category: 'Syrups', stock: 4, unit: 'bottles', minThreshold: 3 },
  { id: 'inv5', name: 'Salted Caramel Sauce', category: 'Syrups', stock: 2, unit: 'bottles', minThreshold: 4 },
  { id: 'inv6', name: 'Butter Croissants', category: 'Bakery', stock: 18, unit: 'pcs', minThreshold: 10 },
];

const initialOrders = [
  {
    id: 'SC-1040',
    table: 'Table #2',
    timestamp: new Date(Date.now() - 8 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    items: [
      { id: 'c8', name: 'Spanish Latte', qty: 2, price: 175 },
      { id: 'p1', name: 'Butter Croissant', qty: 1, price: 120 }
    ],
    total: 470,
    paymentMethod: 'GCash',
    status: 'new' // 'new', 'preparing', 'ready', 'completed', 'cancelled'
  },
  {
    id: 'SC-1041',
    table: 'Table #5',
    timestamp: new Date(Date.now() - 15 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    items: [
      { id: 'c4', name: 'Cappuccino', qty: 1, price: 160 },
      { id: 'c12', name: 'Scialla Cold Brew', qty: 1, price: 150 }
    ],
    total: 310,
    paymentMethod: 'Maya',
    status: 'preparing'
  },
  {
    id: 'SC-1039',
    table: 'Takeout',
    timestamp: new Date(Date.now() - 35 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    items: [
      { id: 'c6', name: 'Iced Vanilla Latte', qty: 1, price: 180 },
      { id: 'p2', name: 'Almond Croissant', qty: 1, price: 145 }
    ],
    total: 325,
    paymentMethod: 'Cash',
    status: 'ready'
  },
  {
    id: 'SC-1038',
    table: 'Table #1',
    timestamp: new Date(Date.now() - 50 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    items: [
      { id: 'c2', name: 'Americano', qty: 2, price: 130 }
    ],
    total: 260,
    paymentMethod: 'Card',
    status: 'completed'
  }
];

const initialStaff = [
  { id: 's1', name: 'Marco Santos', role: 'Head Barista', status: 'On Shift', avatarText: 'MS' },
  { id: 's2', name: 'Elena Reyes', role: 'Barista', status: 'On Shift', avatarText: 'ER' },
  { id: 's3', name: 'Carlos Dizon', role: 'Cashier / Staff', status: 'On Break', avatarText: 'CD' },
  { id: 's4', name: 'Sofia Mendoza', role: 'Manager', status: 'Active', avatarText: 'SM' },
];

export function AppProvider({ children }) {
  const [activeRole, setActiveRole] = useState('customer'); // 'customer' | 'staff' | 'manager'
  const [currentUser, setCurrentUser] = useState(null); // null or { name, email, role }
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'

  const [menuCategories, setMenuCategories] = useState(initialCategories);
  const [orders, setOrders] = useState(initialOrders);
  const [inventory, setInventory] = useState(initialInventory);
  const [staffList] = useState(initialStaff);
  const [lastCustomerOrder, setLastCustomerOrder] = useState(null);

  // Authentication Handlers
  const login = (email, password, targetRole) => {
    const role = targetRole || (email.includes('manager') ? 'manager' : email.includes('staff') ? 'staff' : 'customer');
    const nameMap = {
      staff: 'Marco Santos',
      manager: 'Sofia Mendoza',
      customer: 'Coffee Lover'
    };

    const user = {
      email,
      name: nameMap[role] || email.split('@')[0],
      role
    };

    setCurrentUser(user);
    setActiveRole(role);
    setIsAuthModalOpen(false);
  };

  const signup = (name, email, password, role) => {
    const user = { name, email, role };
    setCurrentUser(user);
    setActiveRole(role);
    setIsAuthModalOpen(false);
  };

  const logout = () => {
    setCurrentUser(null);
    setActiveRole('customer');
  };

  const openAuthModal = (mode = 'login', defaultRole = 'customer') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  // Place order from Customer UI
  const placeOrder = (orderData) => {
    const newOrder = {
      id: orderData.orderNum || `SC-${Math.floor(1000 + Math.random() * 9000)}`,
      table: orderData.table,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      items: orderData.items,
      total: orderData.total,
      paymentMethod: orderData.paymentMethod,
      status: 'new'
    };

    setOrders((prev) => [newOrder, ...prev]);
    setLastCustomerOrder(newOrder);

    // Auto update mock inventory
    setInventory((prevInv) =>
      prevInv.map((item) => {
        if (item.id === 'inv1') return { ...item, stock: Math.max(0, Number((item.stock - 0.2).toFixed(1))) };
        if (item.id === 'inv2') return { ...item, stock: Math.max(0, item.stock - 1) };
        return item;
      })
    );
  };

  // Update order status (Staff / Manager)
  const updateOrderStatus = (orderId, newStatus) => {
    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, status: newStatus } : ord))
    );

    if (lastCustomerOrder && lastCustomerOrder.id === orderId) {
      setLastCustomerOrder((prev) => ({ ...prev, status: newStatus }));
    }
  };

  // Toggle item stock status (Staff / Manager)
  const toggleItemStock = (itemId) => {
    setMenuCategories((prevCats) =>
      prevCats.map((cat) => ({
        ...cat,
        items: cat.items.map((item) =>
          item.id === itemId ? { ...item, inStock: !item.inStock } : item
        )
      }))
    );
  };

  // Adjust inventory stock (+ or -)
  const adjustInventoryStock = (invId, delta) => {
    setInventory((prev) =>
      prev.map((item) =>
        item.id === invId
          ? { ...item, stock: Math.max(0, Number((item.stock + delta).toFixed(1))) }
          : item
      )
    );
  };

  // Restock inventory item (Manager)
  const restockInventory = (invId, amount) => {
    adjustInventoryStock(invId, amount);
  };

  // Calculate dynamic sales metrics for Manager
  const completedOrders = orders.filter((o) => o.status === 'completed' || o.status === 'ready' || o.status === 'preparing');
  const todayRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0) + 12450; // base sales + live
  const todayOrderCount = completedOrders.length + 38; // base count + live
  const avgOrderValue = todayOrderCount > 0 ? (todayRevenue / todayOrderCount).toFixed(2) : 0;

  // Calculate top products
  const productSalesMap = {};
  orders.forEach((ord) => {
    ord.items.forEach((item) => {
      productSalesMap[item.name] = (productSalesMap[item.name] || 0) + item.qty;
    });
  });

  const topProducts = [
    { name: 'Spanish Latte', count: (productSalesMap['Spanish Latte'] || 0) + 84, price: 175 },
    { name: 'Scialla Cold Brew', count: (productSalesMap['Scialla Cold Brew'] || 0) + 71, price: 150 },
    { name: 'Iced Vanilla Latte', count: (productSalesMap['Iced Vanilla Latte'] || 0) + 64, price: 180 },
    { name: 'Cappuccino', count: (productSalesMap['Cappuccino'] || 0) + 48, price: 160 },
    { name: 'Butter Croissant', count: (productSalesMap['Butter Croissant'] || 0) + 42, price: 120 },
  ].sort((a, b) => b.count - a.count);

  return (
    <AppContext.Provider
      value={{
        activeRole,
        setActiveRole,
        currentUser,
        login,
        signup,
        logout,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authMode,
        setAuthMode,
        openAuthModal,
        menuCategories,
        orders,
        inventory,
        staffList,
        lastCustomerOrder,
        placeOrder,
        updateOrderStatus,
        toggleItemStock,
        restockInventory,
        adjustInventoryStock,
        todayRevenue,
        todayOrderCount,
        avgOrderValue,
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
