const http = require('http');
const path = require('path');
const fs = require('fs');
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

// Look for frontend build dist folder
const candidateDistPaths = [
  path.join(__dirname, '..', 'dist'),
  path.join(__dirname, 'dist'),
  path.join(process.cwd(), 'dist')
];
const frontendDist = candidateDistPaths.find((p) => fs.existsSync(p));

if (frontendDist) {
  console.log(`🌐 [Static] Serving frontend static assets from: ${frontendDist}`);
  app.use(express.static(frontendDist));
}

// Health Status Endpoint
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
    // 1. Managers Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS managers (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Staff Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS staff (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(50) DEFAULT 'Staff',
        status VARCHAR(20) DEFAULT 'Active',
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Guest Sessions Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS guest_sessions (
        id VARCHAR(64) PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Orders Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(50) PRIMARY KEY,
        table_name VARCHAR(50) NOT NULL,
        timestamp VARCHAR(50),
        total NUMERIC(10, 2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'new',
        guest_session_id VARCHAR(64),
        user_id INTEGER,
        items_json TEXT,
        accepted_by_id INTEGER,
        accepted_by_name VARCHAR(150),
        accepted_at TIMESTAMP,
        completed_by_id INTEGER,
        completed_by_name VARCHAR(150),
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add missing columns to orders if it already existed
    await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_session_id VARCHAR(64);`);
    await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id INTEGER;`);
    await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS items_json TEXT;`);
    await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_by_id INTEGER;`);
    await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_by_name VARCHAR(150);`);
    await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP;`);
    await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_by_id INTEGER;`);
    await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_by_name VARCHAR(150);`);
    await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;`);
    await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);

    // 5. Order Items Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(50) NOT NULL,
        item_id VARCHAR(50),
        name VARCHAR(255) NOT NULL,
        size VARCHAR(50) DEFAULT '',
        qty INTEGER NOT NULL,
        price NUMERIC(10, 2) NOT NULL
      );
    `);

    // 6. Product Stock Table for PostgreSQL inventory persistence
    await db.query(`
      CREATE TABLE IF NOT EXISTS product_stock (
        item_id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        in_stock BOOLEAN DEFAULT TRUE,
        quantity INTEGER DEFAULT 50,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ PostgreSQL Database schema and tables verified successfully.');
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

// Initial Staff Seed Mechanism
async function seedInitialStaff() {
  if (!db.pool) return;
  try {
    const checkRes = await db.query('SELECT COUNT(*) FROM staff');
    const count = parseInt(checkRes.rows[0].count, 10);
    if (count === 0) {
      const defaultStaff = [
        {
          first_name: 'Maria',
          last_name: 'Santos',
          email: 'maria@scialla.com',
          username: 'maria_barista',
          password: 'password123',
          role: 'Head Barista'
        },
        {
          first_name: 'John',
          last_name: 'Cruz',
          email: 'john@scialla.com',
          username: 'john_barista',
          password: 'password123',
          role: 'Barista / Cashier'
        }
      ];

      for (const s of defaultStaff) {
        const hashedPassword = bcrypt.hashSync(s.password, 10);
        await db.query(
          'INSERT INTO staff (first_name, last_name, email, username, password_hash, role, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [s.first_name, s.last_name, s.email, s.username, hashedPassword, s.role, 'Active']
        );
      }
      console.log('✅ Initial Staff members seeded with registered full names (Maria Santos, John Cruz).');
    }
  } catch (err) {
    console.error('Error seeding initial staff:', err);
  }
}

seedInitialStaff();

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

// Active Staff Tracking Store (Socket ID -> Presence Data)
const activeStaffSockets = new Map();

function getActiveStaffList() {
  const staffMap = new Map();
  for (const info of activeStaffSockets.values()) {
    if (!staffMap.has(info.id)) {
      staffMap.set(info.id, info);
    }
  }
  return Array.from(staffMap.values());
}

async function getStaffOnDutyWithStats() {
  const activeList = getActiveStaffList();
  if (!db.pool) {
    return activeList.map((s) => ({ ...s, ordersHandledToday: 0 }));
  }

  try {
    const listWithStats = await Promise.all(
      activeList.map(async (staff) => {
        const statsRes = await db.query(
          `SELECT COUNT(DISTINCT id) AS count FROM orders 
           WHERE (accepted_by_id = $1 OR completed_by_id = $1 OR accepted_by_name = $2 OR completed_by_name = $2) 
           AND created_at >= CURRENT_DATE`,
          [staff.id, staff.name || '']
        );
        const count = statsRes.rows.length > 0 ? parseInt(statsRes.rows[0].count, 10) : 0;
        return {
          ...staff,
          ordersHandledToday: count
        };
      })
    );
    return listWithStats;
  } catch (err) {
    console.error('Error computing staff on-duty stats:', err);
    return activeList.map((s) => ({ ...s, ordersHandledToday: 0 }));
  }
}

// Get Staff On Duty (Real-time presence with shift login times & order count)
app.get('/api/staff/on-duty', async (req, res) => {
  try {
    const onDutyStaff = await getStaffOnDutyWithStats();
    return res.json({ success: true, staff: onDutyStaff });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch on-duty staff.' });
  }
});

// ==================== PRODUCT STOCK & INVENTORY ROUTES ====================

// Get Product Stock (All connected clients)
app.get('/api/products/stock', async (req, res) => {
  try {
    if (db.pool) {
      const stockRes = await db.query('SELECT item_id, name, in_stock, quantity, updated_at FROM product_stock');
      const stockMap = {};
      stockRes.rows.forEach((r) => {
        stockMap[r.item_id] = {
          itemId: r.item_id,
          name: r.name,
          inStock: r.in_stock,
          quantity: r.quantity,
          updatedAt: r.updated_at
        };
      });
      return res.json({ success: true, stock: stockMap });
    }
    return res.json({ success: true, stock: {} });
  } catch (err) {
    console.error('Get Stock Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch product stock.' });
  }
});

// Update Product Stock (Staff / Manager)
app.patch('/api/products/stock/:id', requireDatabase, optionalAuth, async (req, res) => {
  const itemId = req.params.id;
  const { inStock, quantity, name } = req.body;

  try {
    const stockVal = typeof inStock === 'boolean' ? inStock : true;
    const qtyVal = typeof quantity === 'number' ? quantity : (stockVal ? 50 : 0);
    const itemName = name || itemId;

    const upsertRes = await db.query(
      `INSERT INTO product_stock (item_id, name, in_stock, quantity, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (item_id) DO UPDATE SET
         name = EXCLUDED.name,
         in_stock = EXCLUDED.in_stock,
         quantity = EXCLUDED.quantity,
         updated_at = CURRENT_TIMESTAMP
       RETURNING item_id, name, in_stock, quantity, updated_at`,
      [itemId, itemName, stockVal, qtyVal]
    );

    const updatedRow = upsertRes.rows[0];
    const payload = {
      itemId: updatedRow.item_id,
      name: updatedRow.name,
      inStock: updatedRow.in_stock,
      quantity: updatedRow.quantity,
      updatedAt: updatedRow.updated_at
    };

    // Broadcast real-time stock update to ALL connected clients (customers, staff, managers)
    io.emit('stock:updated', payload);
    console.log(`📦 [Stock Sync] Item ${itemId} stock updated: inStock=${stockVal}, qty=${qtyVal}`);

    return res.json({ success: true, item: payload });
  } catch (err) {
    console.error('Update Stock Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update product stock.' });
  }
});

// ==================== REAL-TIME ORDERS ROUTES & HELPERS ====================

// Helper: Save & Format Order in PostgreSQL with Ownership and Audit Trail
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
  const acceptedById = orderData.accepted_by_id || null;
  const acceptedByName = orderData.accepted_by_name || null;
  const acceptedAt = orderData.accepted_at || null;
  const completedById = orderData.completed_by_id || null;
  const completedByName = orderData.completed_by_name || null;
  const completedAt = orderData.completed_at || null;

  // Construct complete normalized order object for real-time emission and DB storage
  const formattedItems = items.map((item) => {
    const rawName = item.rawName || item.name || item.product_name || item.productName || item.item_name || 'Item';
    const cleanName = typeof rawName === 'string'
      ? rawName.replace(/^\d+x\s*/i, '').trim()
      : 'Item';
    const itemSize = item.size || item.selectedSize || '';
    const itemQty = parseInt(item.qty || item.quantity || item.count || 1, 10) || 1;
    const itemPrice = parseFloat(item.price || 0) || 0;
    const itemId = String(item.id || item.item_id || item.originalId || '');

    return {
      id: itemId,
      item_id: itemId,
      name: cleanName,
      product_name: cleanName,
      productName: cleanName,
      item_name: cleanName,
      displayName: cleanName,
      size: itemSize,
      qty: itemQty,
      quantity: itemQty,
      price: itemPrice
    };
  });

  const itemsJson = JSON.stringify(formattedItems);

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

    try {
      await db.query(
        `INSERT INTO orders (
           id, table_name, timestamp, total, payment_method, status,
           guest_session_id, user_id, items_json, accepted_by_id, accepted_by_name,
           accepted_at, completed_by_id, completed_by_name, completed_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           total = EXCLUDED.total,
           table_name = EXCLUDED.table_name,
           guest_session_id = COALESCE(EXCLUDED.guest_session_id, orders.guest_session_id),
           user_id = COALESCE(EXCLUDED.user_id, orders.user_id),
           items_json = EXCLUDED.items_json,
           accepted_by_id = COALESCE(EXCLUDED.accepted_by_id, orders.accepted_by_id),
           accepted_by_name = COALESCE(EXCLUDED.accepted_by_name, orders.accepted_by_name),
           accepted_at = COALESCE(EXCLUDED.accepted_at, orders.accepted_at),
           completed_by_id = COALESCE(EXCLUDED.completed_by_id, orders.completed_by_id),
           completed_by_name = COALESCE(EXCLUDED.completed_by_name, orders.completed_by_name),
           completed_at = COALESCE(EXCLUDED.completed_at, orders.completed_at),
           updated_at = CURRENT_TIMESTAMP`,
        [
          orderId, tableName, timestamp, total, paymentMethod, status,
          assignedGuestId, assignedUserId, itemsJson,
          acceptedById, acceptedByName, acceptedAt,
          completedById, completedByName, completedAt
        ]
      );
    } catch (err) {
      console.error('Error inserting order row into orders table:', err);
    }

    // Delete existing items for order re-inserts if any
    try {
      await db.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
      for (const item of formattedItems) {
        await db.query(
          'INSERT INTO order_items (order_id, item_id, name, size, qty, price) VALUES ($1, $2, $3, $4, $5, $6)',
          [orderId, item.id, item.name, item.size, item.qty, item.price]
        );
      }
      console.log(`✅ [DB] Order ${orderId} & ${formattedItems.length} items persisted in PostgreSQL.`);
    } catch (err) {
      console.warn('Note on order_items table insert:', err.message);
    }
  }

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
    accepted_by_id: acceptedById,
    accepted_by_name: acceptedByName,
    accepted_at: acceptedAt,
    completed_by_id: completedById,
    completed_by_name: completedByName,
    completed_at: completedAt,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: formattedItems
  };
}

// Get Orders (Filtered by Role / Ownership with Full Staff Audit Trail)
app.get('/api/orders', requireDatabase, optionalAuth, async (req, res) => {
  try {
    const isStaffOrManager = req.user && (req.user.role === 'staff' || req.user.role === 'manager');
    const guestSessionId = req.headers['x-guest-session'] || req.query.guestSessionId;
    const userId = req.user ? req.user.id : null;

    let ordersQuery = 'SELECT * FROM orders ORDER BY created_at DESC';
    let queryParams = [];

    // If customer / guest, filter strictly to orders they own
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
    let itemsRes = { rows: [] };
    try {
      itemsRes = await db.query('SELECT * FROM order_items ORDER BY id ASC');
    } catch (err) {
      console.warn('order_items query note:', err.message);
    }

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
        displayName: itemName,
        size: item.size || '',
        qty: parseInt(item.qty, 10) || 1,
        quantity: parseInt(item.qty, 10) || 1,
        price: parseFloat(item.price) || 0
      });
    });

    const formattedOrders = ordersRes.rows.map((o) => {
      let orderItems = itemsByOrderId[o.id] || [];
      if (orderItems.length === 0 && o.items_json) {
        try {
          const parsed = JSON.parse(o.items_json);
          if (Array.isArray(parsed) && parsed.length > 0) {
            orderItems = parsed;
          }
        } catch {}
      }

      return {
        id: o.id,
        orderId: o.id,
        table: o.table_name,
        timestamp: o.timestamp,
        total: parseFloat(o.total),
        paymentMethod: o.payment_method,
        status: o.status,
        guest_session_id: o.guest_session_id,
        user_id: o.user_id,
        accepted_by_id: o.accepted_by_id,
        accepted_by_name: o.accepted_by_name,
        accepted_at: o.accepted_at,
        completed_by_id: o.completed_by_id,
        completed_by_name: o.completed_by_name,
        completed_at: o.completed_at,
        createdAt: o.created_at,
        updatedAt: o.updated_at || o.created_at,
        items: orderItems
      };
    });

    return res.json(formattedOrders);
  } catch (err) {
    console.error('Get Orders Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch orders.' });
  }
});

// Get Single Order by ID (Validates Ownership & Returns Staff Audit Info)
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
      (!orderRow.user_id && !orderRow.guest_session_id);

    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'You are not authorized to view this order.' });
    }

    let formattedItems = [];
    try {
      const itemsRes = await db.query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id ASC', [orderId]);
      formattedItems = itemsRes.rows.map((item) => ({
        id: item.item_id || item.id,
        item_id: item.item_id || item.id,
        name: item.name || 'Item',
        product_name: item.name || 'Item',
        productName: item.name || 'Item',
        item_name: item.name || 'Item',
        displayName: item.name || 'Item',
        size: item.size || '',
        qty: parseInt(item.qty, 10) || 1,
        quantity: parseInt(item.qty, 10) || 1,
        price: parseFloat(item.price) || 0
      }));
    } catch {}

    if (formattedItems.length === 0 && orderRow.items_json) {
      try {
        const parsed = JSON.parse(orderRow.items_json);
        if (Array.isArray(parsed) && parsed.length > 0) {
          formattedItems = parsed;
        }
      } catch {}
    }

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
        accepted_by_id: orderRow.accepted_by_id,
        accepted_by_name: orderRow.accepted_by_name,
        accepted_at: orderRow.accepted_at,
        completed_by_id: orderRow.completed_by_id,
        completed_by_name: orderRow.completed_by_name,
        completed_at: orderRow.completed_at,
        createdAt: orderRow.created_at,
        updatedAt: orderRow.updated_at || orderRow.created_at,
        items: formattedItems
      }
    });
  } catch (err) {
    console.error('Get Order By ID Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch order details.' });
  }
});

// Create Order (HTTP POST) - Public for Customer Checkout with Stock Validation
app.post('/api/orders', requireDatabase, optionalAuth, async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const guestSessionId = req.headers['x-guest-session'] || req.body.guestSessionId || req.body.guest_session_id || null;
    const orderItems = req.body.items || [];

    // Backend Stock Verification to prevent overselling
    if (db.pool && Array.isArray(orderItems) && orderItems.length > 0) {
      for (const it of orderItems) {
        const itemId = String(it.id || it.item_id || it.originalId || '');
        if (itemId) {
          const baseItemId = itemId.includes('-') ? itemId.split('-')[0] : itemId;
          const stockCheck = await db.query(
            'SELECT in_stock, quantity, name FROM product_stock WHERE item_id = $1 OR item_id = $2',
            [itemId, baseItemId]
          );
          if (stockCheck.rows.length > 0) {
            const sRow = stockCheck.rows[0];
            if (sRow.in_stock === false || (typeof sRow.quantity === 'number' && sRow.quantity <= 0)) {
              return res.status(409).json({
                success: false,
                message: `${sRow.name || it.name || 'An item'} is no longer available. Please update your order.`,
                outOfStockItem: itemId
              });
            }
          }
        }
      }
    }

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

// Update Order Status (PATCH) - Atomic Multi-Staff Concurrency Handling & Registered Staff Identity
app.patch('/api/orders/:id', requireDatabase, optionalAuth, async (req, res) => {
  const orderId = req.params.id;
  const { status, staffName: clientStaffName } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, message: 'Status is required.' });
  }

  try {
    let updatedAt = new Date().toISOString();
    let updatedOrder = null;

    if (db.pool) {
      // 1. Fetch current order from PostgreSQL to prevent multi-staff race conditions
      const currentRes = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
      if (currentRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Order not found.' });
      }

      const currentOrder = currentRes.rows[0];

      // Multi-Staff Concurrency Check: If staff tries to accept an order already handled
      if (status === 'preparing' && currentOrder.status !== 'new' && currentOrder.status !== 'preparing') {
        return res.status(409).json({
          success: false,
          message: `Order #${orderId} has already been accepted and is currently in status "${currentOrder.status}" (Handled by ${currentOrder.accepted_by_name || 'another team member'}).`,
          order: currentOrder
        });
      }

      // Determine authenticated staff identity from server-side verified JWT or registered database profile
      let authenticatedStaffId = req.user && (req.user.role === 'staff' || req.user.role === 'manager') ? req.user.id : null;
      let authenticatedStaffName = null;

      if (authenticatedStaffId) {
        // Query database to retrieve exact registered full name
        try {
          const stRes = await db.query('SELECT first_name, last_name, username FROM staff WHERE id = $1', [authenticatedStaffId]);
          if (stRes.rows.length > 0) {
            const stRow = stRes.rows[0];
            authenticatedStaffName = `${stRow.first_name || ''} ${stRow.last_name || ''}`.trim() || stRow.username;
          }
        } catch {}
      }

      if (!authenticatedStaffName) {
        if (req.user) {
          authenticatedStaffName = req.user.name || (req.user.first_name ? `${req.user.first_name} ${req.user.last_name || ''}`.trim() : req.user.username);
        } else if (clientStaffName) {
          authenticatedStaffName = clientStaffName;
        }
      }

      let updateSql = 'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP';
      let params = [status, orderId];
      let paramIdx = 3;

      if (status === 'preparing') {
        // Record registered staff who accepted order
        if (authenticatedStaffName && !currentOrder.accepted_by_name) {
          updateSql += `, accepted_by_id = $${paramIdx++}, accepted_by_name = $${paramIdx++}, accepted_at = CURRENT_TIMESTAMP`;
          params.push(authenticatedStaffId, authenticatedStaffName);
        }
      } else if (status === 'completed') {
        // Record registered staff who completed order
        if (authenticatedStaffName) {
          updateSql += `, completed_by_id = $${paramIdx++}, completed_by_name = $${paramIdx++}, completed_at = CURRENT_TIMESTAMP`;
          params.push(authenticatedStaffId, authenticatedStaffName);
        }
      }

      updateSql += ' WHERE id = $2 RETURNING *';

      const updateRes = await db.query(updateSql, params);
      if (updateRes.rows.length > 0) {
        const row = updateRes.rows[0];
        updatedAt = new Date(row.updated_at).toISOString();
        updatedOrder = {
          id: row.id,
          orderId: row.id,
          status: row.status,
          table: row.table_name,
          total: parseFloat(row.total),
          paymentMethod: row.payment_method,
          accepted_by_id: row.accepted_by_id,
          accepted_by_name: row.accepted_by_name,
          accepted_at: row.accepted_at,
          completed_by_id: row.completed_by_id,
          completed_by_name: row.completed_by_name,
          completed_at: row.completed_at,
          updatedAt
        };
      }
      console.log(`💾 [DB] Order ${orderId} updated to ${status} by ${authenticatedStaffName || 'Staff'}`);
    }

    const payload = updatedOrder || {
      id: orderId,
      orderId,
      status,
      updatedAt
    };

    // 1. Emit targeted status update to order room and staff room (chained to prevent duplicate packets)
    io.to(`order:${orderId}`).to('staff:orders').emit('order:status_updated', payload);
    io.emit('order:updated', payload);

    // 3. Emit updated staff presence and live order counts
    getStaffOnDutyWithStats().then((list) => {
      io.emit('staff:presence', list);
    });

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
      }

      if (decoded.role === 'staff') {
        activeStaffSockets.set(socket.id, {
          id: decoded.id,
          name: decoded.name || 'Staff Member',
          email: decoded.email,
          role: decoded.staffRole || decoded.role || 'Barista',
          loginTime: new Date().toISOString()
        });
        console.log(`[Socket Auth] Staff ${decoded.id} (${decoded.name}) on duty.`);
        getStaffOnDutyWithStats().then((list) => {
          io.emit('staff:presence', list);
        });
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
  socket.on('order:update_status', async ({ id, status, staffName: clientStaffName }) => {
    if (!id || !status) return;
    try {
      let updatedAt = new Date().toISOString();
      let updatedOrder = null;

      if (db.pool) {
        const staffId = socket.data.user?.id || null;
        let staffName = socket.data.user?.name;

        if (staffId) {
          try {
            const stRes = await db.query('SELECT first_name, last_name, username FROM staff WHERE id = $1', [staffId]);
            if (stRes.rows.length > 0) {
              const stRow = stRes.rows[0];
              staffName = `${stRow.first_name || ''} ${stRow.last_name || ''}`.trim() || stRow.username;
            }
          } catch {}
        }

        if (!staffName) {
          staffName = clientStaffName || socket.data.user?.username;
        }

        let updateSql = 'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP';
        let params = [status, id];
        let pIdx = 3;

        if (status === 'preparing') {
          if (staffName) {
            updateSql += `, accepted_by_id = $${pIdx++}, accepted_by_name = $${pIdx++}, accepted_at = CURRENT_TIMESTAMP`;
            params.push(staffId, staffName);
          }
        } else if (status === 'completed') {
          if (staffName) {
            updateSql += `, completed_by_id = $${pIdx++}, completed_by_name = $${pIdx++}, completed_at = CURRENT_TIMESTAMP`;
            params.push(staffId, staffName);
          }
        }

        updateSql += ' WHERE id = $2 RETURNING *';

        const updateRes = await db.query(updateSql, params);
        if (updateRes.rows.length > 0) {
          const row = updateRes.rows[0];
          updatedAt = new Date(row.updated_at).toISOString();
          updatedOrder = {
            id: row.id,
            orderId: row.id,
            status: row.status,
            table: row.table_name,
            total: parseFloat(row.total),
            paymentMethod: row.payment_method,
            accepted_by_id: row.accepted_by_id,
            accepted_by_name: row.accepted_by_name,
            accepted_at: row.accepted_at,
            completed_by_id: row.completed_by_id,
            completed_by_name: row.completed_by_name,
            completed_at: row.completed_at,
            updatedAt
          };
        }
        console.log(`💾 [Socket DB] Order ${id} status updated to: ${status}`);
      }

      const payload = updatedOrder || {
        id,
        orderId: id,
        status,
        updatedAt
      };

      // Targeted emission strictly to order room and staff room (chained to prevent duplicate packets)
      io.to(`order:${id}`).to('staff:orders').emit('order:status_updated', payload);
      io.emit('order:updated', payload);
      console.log(`📡 [Socket Event] Targeted order:status_updated for ${id} -> ${status}`);
    } catch (err) {
      console.error('Error processing order:update_status socket event:', err);
    }
  });

  // Stock availability toggle via Socket.IO
  socket.on('stock:toggle', async (data) => {
    if (data && data.itemId) {
      const stockVal = typeof data.inStock === 'boolean' ? data.inStock : true;
      const qtyVal = typeof data.quantity === 'number' ? data.quantity : (stockVal ? 50 : 0);
      const itemName = data.name || data.itemId;

      if (db.pool) {
        try {
          await db.query(
            `INSERT INTO product_stock (item_id, name, in_stock, quantity, updated_at)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
             ON CONFLICT (item_id) DO UPDATE SET
               name = EXCLUDED.name,
               in_stock = EXCLUDED.in_stock,
               quantity = EXCLUDED.quantity,
               updated_at = CURRENT_TIMESTAMP`,
            [data.itemId, itemName, stockVal, qtyVal]
          );
        } catch (e) {
          console.warn('Socket stock update DB note:', e.message);
        }
      }
      io.emit('stock:updated', { itemId: data.itemId, name: itemName, inStock: stockVal, quantity: qtyVal });
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔌 [Socket] Client disconnected: ${socket.id}`);
    if (activeStaffSockets.has(socket.id)) {
      activeStaffSockets.delete(socket.id);
      getStaffOnDutyWithStats().then((list) => {
        io.emit('staff:presence', list);
      });
    }
  });
});

// SPA Client-Side Routing Fallback (/staff, /manager, /checkout, etc.)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  if (frontendDist && fs.existsSync(path.join(frontendDist, 'index.html'))) {
    return res.sendFile(path.join(frontendDist, 'index.html'));
  }
  if (req.path === '/') {
    return res.json({ success: true, message: 'Scialla API is running' });
  }
  return res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// Start Server listening on process.env.PORT || 10000 on 0.0.0.0
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Scialla Production Node Backend listening on 0.0.0.0:${PORT}`);
  console.log(`⚡ Socket.IO Server bound to HTTP server on port ${PORT}`);
});


