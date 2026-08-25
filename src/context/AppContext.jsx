import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AppContext = createContext();

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5050';

const initialCategories = [
  {
    id: 'coffee',
    category: 'Coffee Drinks',
    items: [
      {
        id: 'cf1',
        name: 'Caramel Macchiato',
        description: 'Rich espresso, velvety steamed milk, and sweet caramel drizzle',
        price: 49,
        sizes: [
          { label: '12 oz', size: '12 oz', price: 49 },
          { label: '16 oz', size: '16 oz', price: 69 },
          { label: '22 oz', size: '22 oz', price: 89 }
        ],
        tag: 'Popular',
        inStock: true,
        image: '/images/products/caramelmacc.png'
      },
      {
        id: 'cf2',
        name: 'Iced Mocha',
        description: 'Dark Dutch cocoa folded into double shot espresso and chilled milk',
        price: 60,
        sizes: [
          { label: '12 oz', size: '12 oz', price: 60 },
          { label: '16 oz', size: '16 oz', price: 80 },
          { label: '22 oz', size: '22 oz', price: 105 }
        ],
        tag: 'Indulgent',
        inStock: true,
        image: '/images/products/icemocha.png'
      },
      {
        id: 'cf3',
        name: 'Spanish Latte',
        description: 'Espresso infused with sweet condensed milk and fresh whole milk',
        price: 49,
        sizes: [
          { label: '12 oz', size: '12 oz', price: 49 },
          { label: '16 oz', size: '16 oz', price: 69 },
          { label: '22 oz', size: '22 oz', price: 89 }
        ],
        tag: 'Best Seller',
        inStock: true,
        image: '/images/products/spanish.png'
      },
      {
        id: 'cf4',
        name: 'Oreo Dalgona',
        description: 'Whipped espresso froth layered over creamy chilled milk & Oreo crumbles',
        price: 55,
        sizes: [
          { label: '12 oz', size: '12 oz', price: 55 },
          { label: '16 oz', size: '16 oz', price: 75 },
          { label: '22 oz', size: '22 oz', price: 95 }
        ],
        tag: 'Signature',
        inStock: true,
        image: '/images/products/oreodalgona.png'
      }
    ]
  },
  {
    id: 'noncoffee',
    category: 'Non-Coffee Drinks',
    items: [
      {
        id: 'nc1',
        name: 'Black Forest',
        description: 'Rich chocolate blend with dark cherry syrup and whipped cream',
        price: 55,
        sizes: [
          { label: '12 oz', size: '12 oz', price: 55 },
          { label: '16 oz', size: '16 oz', price: 75 },
          { label: '22 oz', size: '22 oz', price: 95 }
        ],
        tag: 'Decadent',
        inStock: true,
        image: '/images/products/cocoadream.png'
      },
      {
        id: 'nc2',
        name: 'Blueberry Cream',
        description: 'Smooth organic blueberry puree blended with rich fresh milk',
        price: 49,
        sizes: [
          { label: '12 oz', size: '12 oz', price: 49 },
          { label: '16 oz', size: '16 oz', price: 69 },
          { label: '22 oz', size: '22 oz', price: 89 }
        ],
        tag: 'Fruity',
        inStock: true,
        image: '/images/products/blueberrysoda.png'
      },
      {
        id: 'nc3',
        name: 'Strawberry Cream',
        description: 'Sweet strawberry infusion folded into thick velvety cream',
        price: 49,
        sizes: [
          { label: '12 oz', size: '12 oz', price: 49 },
          { label: '16 oz', size: '16 oz', price: 69 },
          { label: '22 oz', size: '22 oz', price: 89 }
        ],
        tag: 'Popular',
        inStock: true,
        image: '/images/products/strawberry.png'
      },
      {
        id: 'nc4',
        name: 'Cocoa Dream',
        description: 'Premium Dutch dark chocolate blend topped with chocolate dust',
        price: 55,
        sizes: [
          { label: '12 oz', size: '12 oz', price: 55 },
          { label: '16 oz', size: '16 oz', price: 75 },
          { label: '22 oz', size: '22 oz', price: 95 }
        ],
        tag: 'Rich',
        inStock: true,
        image: '/images/products/garlicparmesan.png'
      },
      {
        id: 'nc5',
        name: 'Creamy Taro',
        description: 'Sweet purple taro root blended into silky sweet milk tea',
        price: 49,
        sizes: [
          { label: '12 oz', size: '12 oz', price: 49 },
          { label: '16 oz', size: '16 oz', price: 69 },
          { label: '22 oz', size: '22 oz', price: 89 }
        ],
        tag: 'Smooth',
        inStock: true,
        image: '/images/products/tarocream.png'
      },
      {
        id: 'nc6',
        name: 'Oreo & Strawberry',
        description: 'Crushed Oreo cookies paired with fresh strawberry cream',
        price: 55,
        sizes: [
          { label: '12 oz', size: '12 oz', price: 55 },
          { label: '16 oz', size: '16 oz', price: 75 },
          { label: '22 oz', size: '22 oz', price: 95 }
        ],
        tag: 'Special',
        inStock: true,
        image: '/images/products/strawberrymilk.png'
      },
      {
        id: 'nc7',
        name: 'Matcha',
        description: 'Authentic Uji Japanese matcha whisked with fresh whole milk',
        price: 65,
        sizes: [
          { label: '12 oz', size: '12 oz', price: 65 },
          { label: '16 oz', size: '16 oz', price: 85 },
          { label: '22 oz', size: '22 oz', price: 105 }
        ],
        tag: 'Authentic',
        inStock: true,
        image: '/images/products/matcha.png'
      },
      {
        id: 'nc8',
        name: 'Oreo Matcha',
        description: 'Uji matcha latte layered with crunchy Oreo cookie crumbles',
        price: 75,
        sizes: [
          { label: '12 oz', size: '12 oz', price: 75 },
          { label: '16 oz', size: '16 oz', price: 95 },
          { label: '22 oz', size: '22 oz', price: 115 }
        ],
        tag: 'Best Seller',
        inStock: true,
        image: '/images/products/sourcream.png'
      }
    ]
  },
  {
    id: 'soda',
    category: 'Soda & Refreshers',
    items: [
      {
        id: 'sd1',
        name: 'Blueberry Fizz',
        description: 'Refreshing sparkling soda infused with sweet blueberry syrup',
        price: 49,
        sizes: [
          { size: '12oz', price: 49 },
          { size: '16oz', price: 69 },
          { size: '22oz', price: 89 }
        ],
        tag: 'Fizzy',
        inStock: true,
        image: '/images/products/whitecheddar.png'
      },
      {
        id: 'sd2',
        name: 'Sparkling Berry',
        description: 'Bubbly mixed berry refresher with crushed mint and ice',
        price: 49,
        sizes: [
          { size: '12oz', price: 49 },
          { size: '16oz', price: 69 },
          { size: '22oz', price: 89 }
        ],
        tag: 'Cooling',
        inStock: true,
        image: '/images/products/strawberrysoda.png'
      },
      {
        id: 'sd3',
        name: 'Apple Fizz',
        description: 'Crisp green apple sparkling drink over crushed ice',
        price: 49,
        sizes: [
          { size: '12oz', price: 49 },
          { size: '16oz', price: 69 },
          { size: '22oz', price: 89 }
        ],
        tag: 'Crisp',
        inStock: true,
        image: '/images/products/salt.png'
      }
    ]
  },
  {
    id: 'ricemeals',
    category: 'Rice Meals',
    items: [
      { id: 'rm1', name: 'Flavored Chicken (Original, Buffalo, Garlic Parmesan)', description: 'Crispy fried chicken choice of Original, Buffalo or Garlic Parmesan with steamed rice', price: 89, tag: 'Popular', inStock: true, image: '/images/products/buffalo.png' },
      { id: 'rm2', name: 'Chicken Parmigiana', description: 'Breaded chicken breast baked with rich marinara sauce and melted cheese over rice', price: 139, tag: 'Signature', inStock: true, image: '/images/products/shredded.png' },
      { id: 'rm3', name: 'Chicken Katsu', description: 'Japanese style crispy breaded chicken cutlet with savoury katsu sauce and rice', price: 89, tag: 'Best Seller', inStock: true, image: '/images/products/chickenkatsu.png' },
      { id: 'rm4', name: 'Pork Sisig', description: 'Sizzling minced pork seasoned with calamansi, chillies, onions, and topped with rice', price: 89, tag: 'Classic', inStock: true, image: '/images/products/porksisig.png' },
      { id: 'rm5', name: 'Pork Steak', description: 'Tender pork chops seared in soy-citrus sauce and caramelized onions with rice', price: 89, tag: 'Savoury', inStock: true, image: '/images/products/porksteak.png' },
      { id: 'rm6', name: 'Crispy Belly', description: 'Golden deep-fried pork belly served with soy vinegar sauce and garlic rice', price: 89, tag: 'Crispy', inStock: true, image: '/images/products/crispybelly.png' },
      { id: 'rm7', name: 'Hungarian w/ Egg', description: 'Grilled smoky Hungarian sausage served with sunny-side up egg and garlic rice', price: 135, tag: 'Hearty', inStock: true, image: '/images/products/hungarian.png' },
    ]
  },
  {
    id: 'waffles',
    category: 'Waffles',
    items: [
      { id: 'wf1', name: 'Strawberry & Cream Waffle', description: 'Freshly baked Belgian waffle topped with strawberry puree and whipped cream', price: 75, tag: 'Sweet', inStock: true, image: '/images/products/strawberrywaffle.png' },
      { id: 'wf2', name: 'Blueberry & Cream Waffle', description: 'Golden crisp waffle loaded with blueberry topping and whipped cream', price: 75, tag: 'Fruity', inStock: true, image: '/images/products/chococookieewaffles.png' },
      { id: 'wf3', name: 'Almond Caramel Waffle', description: 'Warm waffle topped with toasted sliced almonds and butter caramel sauce', price: 75, tag: 'Popular', inStock: true, image: '/images/products/almondcaramelwaffle.png' },
      { id: 'wf4', name: 'Chocolate Cookie Waffle', description: 'Decadent chocolate drizzle waffle topped with crushed cookie pieces', price: 75, tag: 'Indulgent', inStock: true, image: '/images/products/cheesestick.png' },
      { id: 'wf5', name: 'Cheesy Cheese Waffle', description: 'Warm savoury cheese waffle topped with melted cheddar cheese', price: 75, tag: 'Savoury', inStock: true, image: '/images/products/cheesequesa.png' }
    ]
  },
  {
    id: 'pasta',
    category: 'Pasta',
    items: [
      { id: 'ps1', name: 'Lasagna', description: 'Layered pasta sheets with rich beef ragu, creamy bechamel & melted mozzarella', price: 69, tag: 'Signature', inStock: true, image: '/images/products/lasagna.png' },
      { id: 'ps2', name: 'Spaghetti', description: 'Classic Filipino style sweet savoury spaghetti sauce with sliced hotdog & cheese', price: 99, tag: 'Classic', inStock: true, image: '/images/products/beefspag.png' },
      { id: 'ps3', name: 'Carbonara', description: 'Rich cream sauce pasta tossed with crispy bacon bits & parmesan cheese', price: 129, tag: 'Creamy', inStock: true, image: '/images/products/carbonara.png' }
    ]
  },
  {
    id: 'pikapika',
    category: 'Pika-Pika (Snacks)',
    items: [
      { id: 'pk1', name: 'Kropek', description: 'Crispy deep-fried prawn crackers served with spicy vinegar dip', price: 45, tag: 'Crunchy', inStock: true, image: '/images/products/kropek.png' },
      { id: 'pk2', name: 'Fries in Basket', description: 'Crispy potato fries available in Cheese, BBQ, Sour Cream, White Cheddar, or Salt', price: 55, tag: 'Popular', inStock: true, image: '/images/products/fries.png' },
      { id: 'pk3', name: 'Cheese Sticks', description: 'Golden fried spring roll wrappers filled with gooey cheddar cheese sticks', price: 99, tag: 'Cheesy', inStock: true, image: '/images/products/bbqfries.png' },
      { id: 'pk4', name: 'Overload Fries', description: 'Crispy French fries smothered in melted cheese sauce, bacon bits & jalapeños', price: 99, tag: 'Overloaded', inStock: true, image: '/images/products/cheesefries.png' },
      { id: 'pk5', name: 'Overload Nachos', description: 'Crispy corn tortilla chips topped with ground beef, cheese sauce, salsa & jalapeños', price: 120, tag: 'Best Seller', inStock: true, image: '/images/products/nachos.png' },
      { id: 'pk6', name: 'Chicken Tenders', description: 'Crispy golden fried chicken breast tenders served with dip choice', price: 120, tag: 'Crispy', inStock: true, image: '/images/products/chickenskin.png' }
    ]
  },
  {
    id: 'quesadilla',
    category: 'Quesadilla',
    items: [
      { id: 'qd1', name: 'Cheesy Quesa', description: 'Toasted flour tortilla stuffed with melted cheddar & mozzarella blend', price: 89, tag: 'Cheesy', inStock: true, image: '/images/products/hamcheesequesa.png' },
      { id: 'qd2', name: 'Ham & Cheese Quesa', description: 'Grilled tortilla loaded with savory ham slices and melted cheese', price: 89, tag: 'Classic', inStock: true, image: '/images/products/beefquesa.png' },
      { id: 'qd3', name: 'Beef Quesa', description: 'Toasted tortilla filled with seasoned ground beef and melted cheese', price: 99, tag: 'Popular', inStock: true, image: '/images/products/kikiamsquid.png' },
      { id: 'qd4', name: 'Quesa Supreme', description: 'Loaded tortilla with beef, ham, bell peppers, onions, and double melted cheese', price: 109, tag: 'Supreme', inStock: true, image: '/images/products/hotdog.png' }
    ]
  },
  {
    id: 'sandwiches',
    category: 'Sandwiches & Burgers',
    items: [
      { id: 'sw1', name: 'Hotdog Overload', description: 'Jumbo grilled hotdog in toasted bun with cheese sauce, mayo & bacon bits', price: 89, tag: 'Loaded', inStock: true, image: '/images/products/chickensandwich.png' },
      { id: 'sw2', name: 'Crispy Chicken Sandwich', description: 'Crispy fried chicken thigh filet with lettuce, mayo & pickles on toasted brioche', price: 99, tag: 'Crispy', inStock: true, image: '/images/products/clubhouse.png' },
      { id: 'sw3', name: 'Scialla\'s Clubhouse', description: 'Triple decker toasted sandwich with ham, chicken, bacon, egg, cheese & lettuce', price: 120, tag: 'Signature', inStock: true, image: '/images/products/beefburger.png' },
      { id: 'sw4', name: 'Scialla\'s Beef Burger', description: 'Juicy 100% pure beef patty with melted cheddar, caramelized onions & house sauce', price: 139, tag: 'Gourmet', inStock: true, image: '/images/products/4cheese.png' }
    ]
  },
  {
    id: 'pizza',
    category: 'Pizza',
    items: [
      { id: 'pz1', name: 'Ham & Cheese Pizza', description: 'Hand-tossed pizza crust with rich tomato sauce, savory ham & melted cheese', price: 175, tag: 'Classic', inStock: true, image: '/images/products/hamcheesepizza.png' },
      { id: 'pz2', name: 'Bacon & Cheese Pizza', description: 'Loaded with smoky bacon strips and melted mozzarella cheese blend', price: 175, tag: 'Smoky', inStock: true, image: '/images/products/pepperoni.png' },
      { id: 'pz3', name: 'Four Cheese Pizza', description: 'Decadent mix of Mozzarella, Cheddar, Parmesan & Blue Cheese on thin crust', price: 175, tag: 'Cheesy', inStock: true, image: '/images/products/4cheese.png' },
      { id: 'pz4', name: 'Garlic White Pizza', description: 'Creamy garlic white sauce pizza topped with mozzarella and herbs', price: 175, tag: 'Garlicky', inStock: true, image: '/images/products/hamcheesepizza.png' },
      { id: 'pz5', name: 'Shawarma Pizza', description: 'Topped with tender shawarma beef, onions, tomatoes & garlic sauce drizzle', price: 180, tag: 'Special', inStock: true, image: '/images/products/pepperoni.png' },
      { id: 'pz6', name: 'Meat Lovers Pizza', description: 'Overloaded with pepperoni, bacon, ham, ground beef & sausage', price: 199, tag: 'Overloaded', inStock: true, image: '/images/products/pepperoni.png' }
    ]
  },
  {
    id: 'drinkaddons',
    category: 'Drink Add-ons',
    items: [
      { id: 'da1', name: 'Sweetener Syrup', description: 'Extra liquid cane sugar or vanilla sweetener', price: 10, tag: 'Add-on', inStock: true, image: '/images/products/caramelmacc.png' },
      { id: 'da2', name: '1 Shot Espresso', description: 'Extra shot of rich single-origin espresso', price: 10, tag: 'Coffee', inStock: true, image: '/images/products/spanish.png' },
      { id: 'da3', name: 'Strawberry Flavor', description: 'Extra organic strawberry syrup shot', price: 10, tag: 'Fruity', inStock: true, image: '/images/products/strawberry.png' },
      { id: 'da4', name: 'Blueberry Flavor', description: 'Extra organic blueberry syrup shot', price: 10, tag: 'Fruity', inStock: true, image: '/images/products/blueberrysoda.png' },
      { id: 'da5', name: 'Almond Syrup', description: 'Nutty almond syrup shot', price: 10, tag: 'Nutty', inStock: true, image: '/images/products/almondcaramelwaffle.png' },
      { id: 'da6', name: 'Oreo Crumbles', description: 'Extra crunchy crushed Oreo cookies', price: 10, tag: 'Topping', inStock: true, image: '/images/products/oreodalgona.png' },
      { id: 'da7', name: 'Caramel Drizzle', description: 'Rich caramel sauce swirl', price: 10, tag: 'Topping', inStock: true, image: '/images/products/icemocha.png' },
      { id: 'da8', name: 'Chocolate Drizzle', description: 'Rich Dutch cocoa chocolate sauce drizzle', price: 15, tag: 'Topping', inStock: true, image: '/images/products/cocoadream.png' },
      { id: 'da9', name: 'Bobba Pearls', description: 'Chewy tapioca boba pearls', price: 20, tag: 'Chewy', inStock: true, image: '/images/products/tarocream.png' },
      { id: 'da10', name: 'Nata de Coco', description: 'Sweet chewy coconut nata cubes', price: 20, tag: 'Chewy', inStock: true, image: '/images/products/strawberrysoda.png' },
      { id: 'da11', name: 'Coffee Jelly', description: 'Handcrafted espresso coffee jelly cubes', price: 20, tag: 'Jelly', inStock: true, image: '/images/products/matcha.png' }
    ]
  },
  {
    id: 'foodaddons',
    category: 'Food Add-ons',
    items: [
      { id: 'fa1', name: 'Extra Egg', description: 'Fried sunny-side up or poached egg', price: 20, tag: 'Side', inStock: true, image: '/images/products/hungarian.png' },
      { id: 'fa2', name: 'Extra Lettuce', description: 'Fresh green leaf lettuce portion', price: 20, tag: 'Fresh', inStock: true, image: '/images/products/crispybelly.png' },
      { id: 'fa3', name: 'Extra Cheese', description: 'Melted cheddar or mozzarella cheese slice', price: 20, tag: 'Cheesy', inStock: true, image: '/images/products/cheesefries.png' },
      { id: 'fa4', name: 'Extra Mayonnaise', description: 'Creamy garlic mayo dip portion', price: 25, tag: 'Sauce', inStock: true, image: '/images/products/garlicparmesan.png' }
    ]
  }
];

export function AppProvider({ children }) {
  const [activeRole, setActiveRole] = useState('customer'); // 'customer' | 'staff' | 'manager'
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('scialla_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [menuCategories, setMenuCategories] = useState(initialCategories);
  const [orders, setOrders] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [lastCustomerOrder, setLastCustomerOrder] = useState(null);

  // Real-Time WebSocket Connection
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch Staff List from DB if Manager
  const refreshStaffList = async () => {
    const data = await api.getStaffList();
    if (Array.isArray(data)) {
      const formatted = data.map(s => ({
        ...s,
        name: `${s.first_name} ${s.last_name}`
      }));
      setStaffList(formatted);
    }
  };

  useEffect(() => {
    // Validate stored token on load with backend
    const token = localStorage.getItem('scialla_token');
    if (token) {
      api.getCurrentUser().then(user => {
        if (user) {
          setCurrentUser(user);
          setActiveRole(user.role);
        } else {
          // Invalidate user if backend rejects token or staff is inactive
          logout();
        }
      });
    }

    // Fetch initial orders
    api.getOrders().then(data => {
      if (Array.isArray(data)) {
        setOrders(data);
      }
    });

    let ws;
    let reconnectTimeout;

    const connectWebSocket = () => {
      try {
        ws = new WebSocket(WS_URL);

        ws.onopen = () => {
          console.log(`⚡ Scialla Real-Time WebSocket connected on ${WS_URL}`);
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const { type, data } = JSON.parse(event.data);
            if (type === 'order:new') {
              setOrders((prev) => {
                if (prev.some((o) => o.id === data.id)) return prev;
                return [data, ...prev];
              });
            } else if (type === 'order:status-changed') {
              setOrders((prev) =>
                prev.map((ord) => (ord.id === data.id ? { ...ord, status: data.status } : ord))
              );
              setLastCustomerOrder((prev) => (prev && prev.id === data.id ? { ...prev, status: data.status } : prev));
            } else if (type === 'stock:updated') {
              setMenuCategories((prevCats) =>
                prevCats.map((cat) => ({
                  ...cat,
                  items: cat.items.map((item) =>
                    item.id === data.itemId ? { ...item, inStock: data.inStock } : item
                  )
                }))
              );
            }
          } catch (err) {
            console.error('WebSocket message parsing error:', err);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          reconnectTimeout = setTimeout(connectWebSocket, 4000);
        };

        ws.onerror = () => {
          setIsConnected(false);
        };

        setSocket(ws);
      } catch (err) {
        setIsConnected(false);
      }
    };

    connectWebSocket();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

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
      return { success: true, user: response.user };
    } else {
      return { success: false, message: response?.message || 'Authentication failed.' };
    }
  };

  const logout = () => {
    api.logout();
    localStorage.removeItem('scialla_token');
    localStorage.removeItem('scialla_user');
    setCurrentUser(null);
    setActiveRole('customer');
  };

  const openAuthModal = () => {
    setIsAuthModalOpen(true);
  };

  // Place order from Customer UI
  const placeOrder = (orderData) => {
    const rawItems = orderData.items || [];
    const itemMap = new Map();
    rawItems.forEach((item) => {
      const cleanName = item.name ? item.name.replace(/^\d+x\s*/i, '').trim() : 'Item';
      const key = `${item.id || cleanName}-${item.price}`;
      if (itemMap.has(key)) {
        const existing = itemMap.get(key);
        itemMap.set(key, { ...existing, qty: existing.qty + (item.qty || 1) });
      } else {
        itemMap.set(key, { ...item, name: cleanName, qty: item.qty || 1 });
      }
    });
    const consolidatedItems = Array.from(itemMap.values());

    const newOrder = {
      id: orderData.orderNum || `SC-${Math.floor(1000 + Math.random() * 9000)}`,
      table: orderData.table,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      items: consolidatedItems,
      total: orderData.total,
      paymentMethod: orderData.paymentMethod,
      status: 'new'
    };

    setOrders((prev) => {
      if (prev.some((o) => o.id === newOrder.id)) return prev;
      return [newOrder, ...prev];
    });
    setLastCustomerOrder(newOrder);

    // Broadcast over Real-Time WebSocket if connected, else HTTP POST
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'order:create', data: newOrder }));
    } else {
      api.createOrder(newOrder);
    }
  };

  // Update order status (Staff / Manager)
  const updateOrderStatus = (orderId, newStatus) => {
    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, status: newStatus } : ord))
    );

    if (lastCustomerOrder && lastCustomerOrder.id === orderId) {
      setLastCustomerOrder((prev) => ({ ...prev, status: newStatus }));
      if (newStatus === 'completed') {
        setTimeout(() => {
          setLastCustomerOrder(null);
        }, 4000);
      }
    }

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'order:update-status', data: { id: orderId, status: newStatus } }));
    }

    api.updateOrderStatus(orderId, newStatus);
  };

  // Toggle item stock status (Staff / Manager)
  const toggleItemStock = (itemId) => {
    let nextStockState = false;
    setMenuCategories((prevCats) =>
      prevCats.map((cat) => ({
        ...cat,
        items: cat.items.map((item) => {
          if (item.id === itemId) {
            nextStockState = !item.inStock;
            return { ...item, inStock: nextStockState };
          }
          return item;
        })
      }))
    );

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'stock:toggle', data: { itemId, inStock: nextStockState } }));
    }
  };

  // Calculate dynamic sales metrics for Manager
  const completedOrders = orders.filter((o) => o.status === 'completed' || o.status === 'ready' || o.status === 'preparing');
  const todayRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0) + 12450;
  const todayOrderCount = completedOrders.length + 38;
  const avgOrderValue = todayOrderCount > 0 ? (todayRevenue / todayOrderCount).toFixed(2) : 0;

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
        logout,
        isAuthModalOpen,
        setIsAuthModalOpen,
        openAuthModal,
        menuCategories,
        orders,
        staffList,
        refreshStaffList,
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
