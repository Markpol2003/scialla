const http = require('http');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Server } = require('socket.io');
require('dotenv').config();

const db = require('./db');

const PORT = process.env.PORT || 10000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_URL = process.env.FRONTEND_URL || '';
const JWT_SECRET = process.env.JWT_SECRET || (NODE_ENV === 'production' ? null : 'scialla_dev_jwt_secret_key_2026');

if (NODE_ENV === 'production' && !JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET environment variable is missing in production!');
  process.exit(1);
}

const app = express();

// Allowed Origins for CORS
const allowedOrigins = [
  FRONTEND_URL,
  FRONTEND_URL && FRONTEND_URL.endsWith('/') ? FRONTEND_URL.slice(0, -1) : (FRONTEND_URL ? `${FRONTEND_URL}/` : ''),
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5050',
  'http://127.0.0.1:5173',
  'http://localhost:4173'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server) or matching allowedOrigins
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy violation: Origin ${origin} not allowed.`));
  },
  credentials: true
}));

app.use(express.json());

// Root & Health Status Endpoints
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Scialla API is running'
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Scialla API'
  });
});

// Middleware: Verify JWT Token
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET || 'scialla_dev_jwt_secret_key_2026');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
  }
}

// Middleware: Require Manager Role
function verifyManager(req, res, next) {
  if (!req.user || req.user.role !== 'manager') {
    return res.status(403).json({ success: false, message: 'Forbidden. Manager privilege required.' });
  }
  next();
}

// Middleware: Require Database Connection
function requireDatabase(req, res, next) {
  if (!db.pool) {
    return res.status(503).json({
      success: false,
      message: 'Database service unavailable. PostgreSQL connection is required.'
    });
  }
  next();
}

// Optional Auth Extraction Middleware (for routes accessible by both guests and signed-in users)
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET || 'scialla_dev_jwt_secret_key_2026');
      req.user = decoded;
    } catch {
      // Ignore invalid token for optional auth
    }
  }
  next();
}

// Auto-run schema migrations on startup
async function initDatabaseMigrations() {
  if (!db.pool) return;
  try {
    // 1. Ensure guest_sessions table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS guest_sessions (
        id VARCHAR(64) PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Ensure orders table has guest_session_id, user_id, updated_at
    await db.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_session_id VARCHAR(64);
    `);
    await db.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id INTEGER;
    `);
    await db.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);

    console.log('✅ PostgreSQL Database schema migrations verified successfully.');
  } catch (err) {
    console.error('⚠️ Database migration error:', err);
  }
}

initDatabaseMigrations();

// Initial Manager Seed Mechanism via Environment Variables
async function seedInitialManager() {
  if (!db.pool) return;
  const initialEmail = process.env.INITIAL_MANAGER_EMAIL;
  const initialPassword = process.env.INITIAL_MANAGER_PASSWORD;
  const initialFirstName = process.env.INITIAL_MANAGER_FIRST_NAME || 'Store';
  const initialLastName = process.env.INITIAL_MANAGER_LAST_NAME || 'Manager';

  if (!initialEmail || !initialPassword) {
    return;
  }

  try {
    const checkRes = await db.query('SELECT COUNT(*) FROM managers');
    const count = parseInt(checkRes.rows[0].count, 10);
    if (count === 0) {
      const hashedPassword = bcrypt.hashSync(initialPassword, 10);
      await db.query(
        'INSERT INTO managers (first_name, last_name, email, password_hash, status) VALUES ($1, $2, $3, $4, $5)',
        [initialFirstName, initialLastName, initialEmail.trim().toLowerCase(), hashedPassword, 'Active']
      );
      console.log(`✅ Initial Manager seeded from environment variables: ${initialEmail}`);
    }
  } catch (err) {
    console.error('Error seeding initial manager from environment variables:', err);
  }
}

seedInitialManager();

// ==================== AUTHENTICATION ROUTES ====================

// Anonymous Guest Session Creation
app.post('/api/auth/guest-session', async (req, res) => {
  try {
    const guestSessionId = crypto.randomUUID();

    if (db.pool) {
      await db.query(
        'INSERT INTO guest_sessions (id, created_at, last_active) VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
        [guestSessionId]
      );
      console.log(`👤 [Auth] Created new anonymous guest session: ${guestSessionId}`);
    }

    return res.status(201).json({
      success: true,
      guestSessionId,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Create Guest Session Error:', err);
    // Fallback in-memory UUID if DB is offline
    const fallbackId = crypto.randomUUID();
    return res.status(201).json({
      success: true,
      guestSessionId: fallbackId,
      offline: true
    });
  }
});

// Anonymous Guest Session Validation / Heartbeat
app.get('/api/auth/guest-session/validate', async (req, res) => {
  const guestSessionId = req.headers['x-guest-session'] || req.query.id;

  if (!guestSessionId || typeof guestSessionId !== 'string') {
    return res.status(400).json({ success: false, valid: false, message: 'Guest session ID is required.' });
  }

  try {
    if (db.pool) {
      const result = await db.query('SELECT * FROM guest_sessions WHERE id = $1', [guestSessionId]);
      if (result.rows.length > 0) {
        await db.query('UPDATE guest_sessions SET last_active = CURRENT_TIMESTAMP WHERE id = $1', [guestSessionId]);
        return res.json({ success: true, valid: true, guestSessionId });
      }
      // If valid UUID format but not in DB (e.g. after DB reset), re-register it
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(guestSessionId)) {
        await db.query(
          'INSERT INTO guest_sessions (id, created_at, last_active) VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (id) DO UPDATE SET last_active = CURRENT_TIMESTAMP',
          [guestSessionId]
        );
        return res.json({ success: true, valid: true, guestSessionId });
      }
      return res.status(404).json({ success: false, valid: false, message: 'Invalid guest session.' });
    }

    return res.json({ success: true, valid: true, guestSessionId, offline: true });
  } catch (err) {
    console.error('Validate Guest Session Error:', err);
    return res.json({ success: true, valid: true, guestSessionId, offline: true });
  }
});

// Manager Login
app.post('/api/auth/manager/login', requireDatabase, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  try {
    const result = await db.query('SELECT * FROM managers WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (!result || result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const manager = result.rows[0];

    const isMatch = bcrypt.compareSync(password, manager.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: manager.id, email: manager.email, name: `${manager.first_name} ${manager.last_name}`, role: 'manager' },
      JWT_SECRET || 'scialla_dev_jwt_secret_key_2026',
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: manager.id,
        first_name: manager.first_name,
        last_name: manager.last_name,
        name: `${manager.first_name} ${manager.last_name}`,
        email: manager.email,
        role: 'manager',
        status: manager.status
      }
    });
  } catch (err) {
    console.error('Manager Login Error:', err);
    return res.status(500).json({ success: false, message: 'Server error during manager login.' });
  }
});

// Staff Login
app.post('/api/auth/staff/login', requireDatabase, async (req, res) => {
  const { username, email, password } = req.body;
  const loginIdentifier = (username || email || '').trim();

  if (!loginIdentifier || !password) {
    return res.status(400).json({ success: false, message: 'Username/Email and password are required.' });
  }

  try {
    const result = await db.query(
      'SELECT * FROM staff WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)',
      [loginIdentifier]
    );

    if (!result || result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid username/email or password.' });
    }

    const staffMember = result.rows[0];

    // Check account status
    if (staffMember.status === 'Inactive' || staffMember.status === 'Resigned') {
      return res.status(403).json({
        success: false,
        message: 'Your account is no longer active. Please contact the manager.'
      });
    }

    const isMatch = bcrypt.compareSync(password, staffMember.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username/email or password.' });
    }

    const token = jwt.sign(
      {
        id: staffMember.id,
        email: staffMember.email,
        username: staffMember.username,
        name: `${staffMember.first_name} ${staffMember.last_name}`,
        role: 'staff',
        staffRole: staffMember.role
      },
      JWT_SECRET || 'scialla_dev_jwt_secret_key_2026',
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: staffMember.id,
        first_name: staffMember.first_name,
        last_name: staffMember.last_name,
        name: `${staffMember.first_name} ${staffMember.last_name}`,
        email: staffMember.email,
        username: staffMember.username,
        role: 'staff',
        staffRole: staffMember.role,
        status: staffMember.status
      }
    });
  } catch (err) {
    console.error('Staff Login Error:', err);
    return res.status(500).json({ success: false, message: 'Server error during staff login.' });
  }
});

// Get Current User Profile (Auth validation)
app.get('/api/auth/me', verifyToken, async (req, res) => {
  try {
    if (req.user.role === 'staff' && db.pool) {
      const result = await db.query('SELECT status FROM staff WHERE id = $1', [req.user.id]);
      if (result.rows.length === 0 || result.rows[0].status !== 'Active') {
        return res.status(403).json({ success: false, message: 'Your account is no longer active.' });
      }
    }
    return res.json({ success: true, user: req.user });
  } catch (err) {
    return res.json({ success: true, user: req.user });
  }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  return res.json({ success: true, message: 'Logged out successfully.' });
});

// ==================== STAFF MANAGEMENT ROUTES (MANAGER-ONLY) ====================

// Get All Staff Members
app.get('/api/staff', requireDatabase, verifyToken, verifyManager, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, first_name, last_name, email, username, role, status, created_at, updated_at FROM staff ORDER BY id ASC'
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Get Staff Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch staff list.' });
  }
});

// Create New Staff Member
app.post('/api/staff', requireDatabase, verifyToken, verifyManager, async (req, res) => {
  const { first_name, last_name, email, username, role, password } = req.body;

  if (!first_name || !last_name || !email || !username || !password) {
    return res.status(400).json({ success: false, message: 'All fields (first_name, last_name, email, username, password) are required.' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const staffRole = role || 'Staff';

  try {
    const dupCheck = await db.query('SELECT * FROM staff WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($2)', [email, username]);
    if (dupCheck.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email or username is already in use.' });
    }

    const insertRes = await db.query(
      `INSERT INTO staff (first_name, last_name, email, username, password_hash, role, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'Active', $7)
       RETURNING id, first_name, last_name, email, username, role, status, created_at`,
      [first_name, last_name, email, username, hashedPassword, staffRole, req.user.id || 1]
    );
    return res.status(201).json({ success: true, staff: insertRes.rows[0] });
  } catch (err) {
    console.error('Create Staff Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create staff member.' });
  }
});

// Update Staff Member Details
app.put('/api/staff/:id', requireDatabase, verifyToken, verifyManager, async (req, res) => {
  const staffId = parseInt(req.params.id, 10);
  const { first_name, last_name, email, username, role } = req.body;

  try {
    const updateRes = await db.query(
      `UPDATE staff 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           email = COALESCE($3, email),
           username = COALESCE($4, username),
           role = COALESCE($5, role),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING id, first_name, last_name, email, username, role, status, created_at, updated_at`,
      [first_name, last_name, email, username, role, staffId]
    );
    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }
    return res.json({ success: true, staff: updateRes.rows[0] });
  } catch (err) {
    console.error('Update Staff Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update staff member.' });
  }
});

// Update Staff Status (Active, Inactive, Resigned)
app.patch('/api/staff/:id/status', requireDatabase, verifyToken, verifyManager, async (req, res) => {
  const staffId = parseInt(req.params.id, 10);
  const { status } = req.body;

  if (!['Active', 'Inactive', 'Resigned'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status. Must be Active, Inactive, or Resigned.' });
  }

  try {
    const resDb = await db.query(
      'UPDATE staff SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, first_name, last_name, status',
      [status, staffId]
    );
    if (resDb.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }
    return res.json({ success: true, staff: resDb.rows[0] });
  } catch (err) {
    console.error('Update Staff Status Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update staff status.' });
  }
});

// Reset Staff Password
app.patch('/api/staff/:id/password', requireDatabase, verifyToken, verifyManager, async (req, res) => {
  const staffId = parseInt(req.params.id, 10);
  const { password } = req.body;

  if (!password || password.length < 4) {
    return res.status(400).json({ success: false, message: 'New password must be at least 4 characters long.' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    const resDb = await db.query(
      'UPDATE staff SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id',
      [hashedPassword, staffId]
    );
    if (resDb.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }
    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Reset Staff Password Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reset staff password.' });
  }
});

// ==================== REAL-TIME ORDERS ROUTES & HELPERS ====================

// Helper: Save & Format Order in PostgreSQL with Ownership
async function saveOrderToDatabase(orderData, userId = null, guestSessionId = null) {
  const orderId = orderData.id || orderData.orderNum || `SC-${Math.floor(1000 + Math.random() * 9000)}`;
  const tableName = orderData.table || orderData.table_name || 'Table 1';
  const timestamp = orderData.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const total = parseFloat(orderData.total) || 0;
  const paymentMethod = orderData.paymentMethod || orderData.payment_method || 'Cash';
  const status = orderData.status || 'new';
  const items = orderData.items || [];
  const assignedUserId = userId || orderData.user_id || null;
  const assignedGuestId = guestSessionId || orderData.guest_session_id || orderData.guestSessionId || null;

  if (db.pool) {
    // Ensure guest session is registered if present
    if (assignedGuestId) {
      try {
        await db.query(
          'INSERT INTO guest_sessions (id, created_at, last_active) VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (id) DO UPDATE SET last_active = CURRENT_TIMESTAMP',
          [assignedGuestId]
        );
      } catch (err) {
        console.warn('Guest session registration note:', err.message);
      }
    }

    await db.query(
      `INSERT INTO orders (id, table_name, timestamp, total, payment_method, status, guest_session_id, user_id, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         total = EXCLUDED.total,
         table_name = EXCLUDED.table_name,
         guest_session_id = COALESCE(EXCLUDED.guest_session_id, orders.guest_session_id),
         user_id = COALESCE(EXCLUDED.user_id, orders.user_id),
         updated_at = CURRENT_TIMESTAMP`,
      [orderId, tableName, timestamp, total, paymentMethod, status, assignedGuestId, assignedUserId]
    );

    // Delete existing items for order re-inserts if any
    await db.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);

    for (const item of items) {
      const itemName = item.name || item.product_name || item.productName || item.item_name || 'Item';
      const itemSize = item.size || item.selectedSize || '';
      const itemQty = parseInt(item.qty || item.quantity || 1, 10);
      const itemPrice = parseFloat(item.price || 0);
      const itemId = String(item.id || item.item_id || item.originalId || '');

      await db.query(
        'INSERT INTO order_items (order_id, item_id, name, size, qty, price) VALUES ($1, $2, $3, $4, $5, $6)',
        [orderId, itemId, itemName, itemSize, itemQty, itemPrice]
      );
    }
    console.log(`✅ [DB] Order ${orderId} successfully persisted in PostgreSQL (Guest: ${assignedGuestId || 'None'}, User: ${assignedUserId || 'None'}).`);
  }

  // Construct complete normalized order object for real-time emission and API response
  const formattedItems = items.map((item) => {
    const itemName = item.name || item.product_name || item.productName || item.item_name || 'Item';
    const itemSize = item.size || item.selectedSize || '';
    const itemQty = parseInt(item.qty || item.quantity || 1, 10);
    const itemPrice = parseFloat(item.price || 0);
    const itemId = String(item.id || item.item_id || item.originalId || '');

    return {
      id: itemId,
      item_id: itemId,
      name: itemName,
      product_name: itemName,
      productName: itemName,
      item_name: itemName,
      size: itemSize,
      qty: itemQty,
      quantity: itemQty,
      price: itemPrice
    };
  });

  return {
    id: orderId,
    orderId,
    table: tableName,
    timestamp,
    total,
    paymentMethod,
    status,
    guest_session_id: assignedGuestId,
    user_id: assignedUserId,
    updatedAt: new Date().toISOString(),
    items: formattedItems
  };
}

// Get Orders (Filtered by Role / Ownership)
app.get('/api/orders', requireDatabase, optionalAuth, async (req, res) => {
  try {
    const isStaffOrManager = req.user && (req.user.role === 'staff' || req.user.role === 'manager');
    const guestSessionId = req.headers['x-guest-session'] || req.query.guestSessionId;
    const userId = req.user ? req.user.id : null;

    let ordersQuery = 'SELECT * FROM orders ORDER BY created_at DESC';
    let queryParams = [];

    // If customer / guest, filter to orders they own
    if (!isStaffOrManager) {
      if (userId && guestSessionId) {
        ordersQuery = 'SELECT * FROM orders WHERE user_id = $1 OR guest_session_id = $2 ORDER BY created_at DESC';
        queryParams = [userId, guestSessionId];
      } else if (userId) {
        ordersQuery = 'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC';
        queryParams = [userId];
      } else if (guestSessionId) {
        ordersQuery = 'SELECT * FROM orders WHERE guest_session_id = $1 ORDER BY created_at DESC';
        queryParams = [guestSessionId];
      } else {
        // Fallback for demo or initial state
        ordersQuery = 'SELECT * FROM orders ORDER BY created_at DESC LIMIT 50';
      }
    }

    const ordersRes = await db.query(ordersQuery, queryParams);
    const itemsRes = await db.query('SELECT * FROM order_items ORDER BY id ASC');

    const itemsByOrderId = {};
    itemsRes.rows.forEach((item) => {
      if (!itemsByOrderId[item.order_id]) itemsByOrderId[item.order_id] = [];
      const itemName = item.name || 'Item';
      itemsByOrderId[item.order_id].push({
        id: item.item_id || item.id,
        item_id: item.item_id || item.id,
        name: itemName,
        product_name: itemName,
        productName: itemName,
        item_name: itemName,
        size: item.size || '',
        qty: parseInt(item.qty, 10),
        quantity: parseInt(item.qty, 10),
        price: parseFloat(item.price)
      });
    });

    const formattedOrders = ordersRes.rows.map((o) => ({
      id: o.id,
      orderId: o.id,
      table: o.table_name,
      timestamp: o.timestamp,
      total: parseFloat(o.total),
      paymentMethod: o.payment_method,
      status: o.status,
      guest_session_id: o.guest_session_id,
      user_id: o.user_id,
      updatedAt: o.updated_at || o.created_at,
      items: itemsByOrderId[o.id] || []
    }));

    return res.json(formattedOrders);
  } catch (err) {
    console.error('Get Orders Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch orders.' });
  }
});

// Get Single Order by ID (Validates Ownership)
app.get('/api/orders/:id', requireDatabase, optionalAuth, async (req, res) => {
  const orderId = req.params.id;
  const guestSessionId = req.headers['x-guest-session'] || req.query.guestSessionId;
  const isStaffOrManager = req.user && (req.user.role === 'staff' || req.user.role === 'manager');

  try {
    const ordersRes = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (ordersRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const orderRow = ordersRes.rows[0];

    // Ownership Verification
    const isOwner = isStaffOrManager ||
      (orderRow.user_id && req.user && orderRow.user_id === req.user.id) ||
      (orderRow.guest_session_id && guestSessionId && orderRow.guest_session_id === guestSessionId) ||
      (!orderRow.user_id && !orderRow.guest_session_id); // Legacy fallback

    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'You are not authorized to view this order.' });
    }

    const itemsRes = await db.query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id ASC', [orderId]);
    const formattedItems = itemsRes.rows.map((item) => ({
      id: item.item_id || item.id,
      item_id: item.item_id || item.id,
      name: item.name || 'Item',
      product_name: item.name || 'Item',
      productName: item.name || 'Item',
      item_name: item.name || 'Item',
      size: item.size || '',
      qty: parseInt(item.qty, 10),
      quantity: parseInt(item.qty, 10),
      price: parseFloat(item.price)
    }));

    return res.json({
      success: true,
      order: {
        id: orderRow.id,
        orderId: orderRow.id,
        table: orderRow.table_name,
        timestamp: orderRow.timestamp,
        total: parseFloat(orderRow.total),
        paymentMethod: orderRow.payment_method,
        status: orderRow.status,
        guest_session_id: orderRow.guest_session_id,
        user_id: orderRow.user_id,
        updatedAt: orderRow.updated_at || orderRow.created_at,
        items: formattedItems
      }
    });
  } catch (err) {
    console.error('Get Order By ID Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch order details.' });
  }
});

// Create Order (HTTP POST) - Public for Customer Checkout
app.post('/api/orders', requireDatabase, optionalAuth, async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const guestSessionId = req.headers['x-guest-session'] || req.body.guestSessionId || req.body.guest_session_id || null;

    const fullOrder = await saveOrderToDatabase(req.body, userId, guestSessionId);

    // Emit real-time Socket.IO event strictly to staff dashboards and customer's room
    io.to('staff:orders').emit('order:created', fullOrder);
    io.to(`order:${fullOrder.id}`).emit('order:created', fullOrder);
    if (guestSessionId) {
      io.to(`guest:${guestSessionId}`).emit('order:created', fullOrder);
    }
    if (userId) {
      io.to(`user:${userId}`).emit('order:created', fullOrder);
    }

    console.log(`📡 [Socket] Targeted emission for new order ${fullOrder.id} (Staff + Owner)`);

    return res.status(201).json({ success: true, order: fullOrder });
  } catch (err) {
    console.error('Create Order Error:', err);
    return res.status(400).json({ success: false, message: 'Invalid order payload.' });
  }
});

// Update Order Status (PATCH) - Targeted Status Updates
app.patch('/api/orders/:id', requireDatabase, optionalAuth, async (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, message: 'Status is required.' });
  }

  try {
    let updatedAt = new Date().toISOString();

    if (db.pool) {
      const updateRes = await db.query(
        'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING updated_at',
        [status, orderId]
      );
      if (updateRes.rows.length > 0 && updateRes.rows[0].updated_at) {
        updatedAt = new Date(updateRes.rows[0].updated_at).toISOString();
      }
      console.log(`💾 [DB] Order ${orderId} status updated in PostgreSQL to: ${status}`);
    }

    const payload = {
      id: orderId,
      orderId,
      status,
      updatedAt
    };

    // 1. Emit targeted status update strictly to the customer/device listening to this order
    io.to(`order:${orderId}`).emit('order:status_updated', payload);
    console.log(`📡 [Socket] Targeted order:status_updated (${status}) to room order:${orderId}`);

    // 2. Emit status update to staff room for staff dashboard synchronizations
    io.to('staff:orders').emit('order:status_updated', payload);
    console.log(`📡 [Socket] Emitted order:status_updated (${status}) for ${orderId} to staff:orders`);

    return res.json({ success: true, order: payload });
  } catch (err) {
    console.error('Update Order Status Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update order status.' });
  }
});

// HTTP & Socket.IO Server Setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.some((o) => o && origin.startsWith(o))) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Socket.IO Real-Time Event Handlers with Authentication & Ownership Verification
io.on('connection', (socket) => {
  console.log(`⚡ [Socket] Client connected: ${socket.id}`);

  // Handshake authentication for logged-in users and anonymous guests
  const auth = socket.handshake.auth || {};
  const token = auth.token;
  const guestSessionId = auth.guestSessionId || socket.handshake.query?.guestSessionId;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET || 'scialla_dev_jwt_secret_key_2026');
      socket.data.user = decoded;
      socket.data.role = decoded.role;
      if (decoded.role === 'staff' || decoded.role === 'manager') {
        socket.join('staff:orders');
        console.log(`🛡️ [Socket Auth] Staff/Manager ${decoded.id} joined staff:orders`);
      }
      socket.join(`user:${decoded.id}`);
    } catch {
      // Invalid token ignored
    }
  }

  if (guestSessionId && typeof guestSessionId === 'string') {
    socket.data.guestSessionId = guestSessionId;
    socket.join(`guest:${guestSessionId}`);
    console.log(`👤 [Socket Auth] Guest session connected: guest:${guestSessionId}`);
  }

  // Customer joins order-specific room for targeted status tracking with server verification
  socket.on('join:order', async (orderId) => {
    if (!orderId) return;

    let isAuthorized = false;

    // Staff and managers can monitor any order
    if (socket.data.role === 'staff' || socket.data.role === 'manager') {
      isAuthorized = true;
    } else if (db.pool) {
      try {
        const ordRes = await db.query('SELECT user_id, guest_session_id FROM orders WHERE id = $1', [orderId]);
        if (ordRes.rows.length > 0) {
          const row = ordRes.rows[0];
          if (row.user_id && socket.data.user?.id && row.user_id === socket.data.user.id) {
            isAuthorized = true;
          } else if (row.guest_session_id && socket.data.guestSessionId && row.guest_session_id === socket.data.guestSessionId) {
            isAuthorized = true;
          } else if (!row.user_id && !row.guest_session_id) {
            // Legacy order fallback
            isAuthorized = true;
          }
        }
      } catch (err) {
        console.error('Error verifying order ownership in join:order:', err);
      }
    } else {
      isAuthorized = true;
    }

    if (isAuthorized) {
      const room = `order:${orderId}`;
      socket.join(room);
      console.log(`📌 [Socket] Client ${socket.id} joined verified room: ${room}`);
    } else {
      console.warn(`🚫 [Socket] Unauthorized attempt to join order:${orderId} by ${socket.id}`);
      socket.emit('error:unauthorized', { message: `Unauthorized: You do not own order #${orderId}` });
    }
  });

  // Customer leaves order room
  socket.on('leave:order', (orderId) => {
    if (orderId) {
      const room = `order:${orderId}`;
      socket.leave(room);
      console.log(`🚪 [Socket] Client ${socket.id} left room: ${room}`);
    }
  });

  // Order creation via Socket.IO
  socket.on('order:create', async (orderData) => {
    try {
      const userId = socket.data.user ? socket.data.user.id : null;
      const guestSessionId = socket.data.guestSessionId || orderData.guest_session_id || orderData.guestSessionId || null;
      const fullOrder = await saveOrderToDatabase(orderData, userId, guestSessionId);

      io.to('staff:orders').emit('order:created', fullOrder);
      io.to(`order:${fullOrder.id}`).emit('order:created', fullOrder);
      if (guestSessionId) {
        io.to(`guest:${guestSessionId}`).emit('order:created', fullOrder);
      }
      console.log(`📡 [Socket Event] Created & emitted targeted order:created for ${fullOrder.id}`);
    } catch (err) {
      console.error('Error processing order:create socket event:', err);
    }
  });

  // Order status update via Socket.IO (Staff / Manager)
  socket.on('order:update_status', async ({ id, status }) => {
    if (!id || !status) return;
    try {
      let updatedAt = new Date().toISOString();

      if (db.pool) {
        const updateRes = await db.query(
          'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING updated_at',
          [status, id]
        );
        if (updateRes.rows.length > 0 && updateRes.rows[0].updated_at) {
          updatedAt = new Date(updateRes.rows[0].updated_at).toISOString();
        }
        console.log(`💾 [Socket DB] Order ${id} status updated to: ${status}`);
      }

      const payload = {
        id,
        orderId: id,
        status,
        updatedAt
      };

      // Targeted emission strictly to order room and staff room
      io.to(`order:${id}`).emit('order:status_updated', payload);
      io.to('staff:orders').emit('order:status_updated', payload);
      console.log(`📡 [Socket Event] Targeted order:status_updated for ${id} -> ${status}`);
    } catch (err) {
      console.error('Error processing order:update_status socket event:', err);
    }
  });

  // Stock availability toggle via Socket.IO
  socket.on('stock:toggle', (data) => {
    io.emit('stock:updated', data);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 [Socket] Client disconnected: ${socket.id}`);
  });
});

// Start Server listening on process.env.PORT || 10000 on 0.0.0.0
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Scialla Production Node Backend listening on 0.0.0.0:${PORT}`);
  console.log(`⚡ Socket.IO Server bound to HTTP server on port ${PORT}`);
});


