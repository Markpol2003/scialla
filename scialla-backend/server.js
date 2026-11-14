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
const { initializeCatalog, registerCatalogRoutes } = require('./productCatalog');
const { registerProductImages } = require('./productImages');
const emailService = require('./emailService');

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
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  'http://localhost:5050',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://localhost:4173'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }
    // Allow any localhost or 127.0.0.1 origin regardless of port
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    const currentFrontend = process.env.FRONTEND_URL || FRONTEND_URL;
    if (currentFrontend && (origin === currentFrontend || origin === currentFrontend.replace(/\/$/, ''))) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin) || allowedOrigins.some((o) => o && origin.startsWith(o))) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy violation: Origin ${origin} not allowed.`));
  },
  credentials: true
}));

app.use(express.json());
registerProductImages(app, { verifyToken, verifyManager });

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

    // Ensure backwards compatibility for existing managers and staff tables
    await db.query(`ALTER TABLE managers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active';`);
    await db.query(`ALTER TABLE staff ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active';`);
    await db.query(`ALTER TABLE staff ADD COLUMN IF NOT EXISTS username VARCHAR(100);`);
    await db.query(`ALTER TABLE staff ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'Staff';`);
    await db.query(`ALTER TABLE staff ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);

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
        customer_name VARCHAR(100),
        table_name VARCHAR(50) NOT NULL,
        timestamp VARCHAR(50),
        total NUMERIC(10, 2) NOT NULL,
        amount_already_paid NUMERIC(10, 2) NOT NULL DEFAULT 0,
        payment_method VARCHAR(50),
        status VARCHAR(50) DEFAULT 'pending_manager_approval',
        payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
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

    // Allow orders without payment selection; preserve historical payment values.
    await db.query(`ALTER TABLE orders ALTER COLUMN payment_method DROP NOT NULL;`);
    await db.query(`ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending_manager_approval';`);
    const paymentStatusColumn = await db.query(
      "SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'orders' AND column_name = 'payment_status'"
    );
    if (paymentStatusColumn.rows.length === 0) {
      await db.query(`ALTER TABLE orders ADD COLUMN payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid';`);
    }
    const paymentTrackingColumn = await db.query(
      "SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'orders' AND column_name = 'amount_already_paid'"
    );
    if (paymentTrackingColumn.rows.length === 0) {
      await db.query(`ALTER TABLE orders ADD COLUMN amount_already_paid NUMERIC(10, 2) NOT NULL DEFAULT 0;`);
    }
    await db.query(`UPDATE orders SET status = CASE status WHEN 'new' THEN 'approved' WHEN 'completed' THEN 'served' ELSE status END WHERE status IN ('new', 'completed');`);
    await db.query(`UPDATE orders SET payment_status = CASE WHEN amount_already_paid >= total AND total > 0 THEN 'paid' ELSE 'unpaid' END WHERE status NOT IN ('cancelled', 'pending_manager_approval') AND payment_status = 'unpaid';`);

    // Add missing columns to orders if it already existed
    await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(100);`);
    await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_session_id VARCHAR(64);`);
    await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id INTEGER;`);
    await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS items_json TEXT;`);
    await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS items TEXT;`);
    await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_by_id INTEGER;`);
    await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_by_staff_id INTEGER;`);
    await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_by_name VARCHAR(150);`);
    await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_by VARCHAR(150);`);
    await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS staff_name VARCHAR(150);`);
    await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS handled_by VARCHAR(150);`);
    await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS staff_id INTEGER;`);
    await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP;`);
    await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_by_id INTEGER;`);
    await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_by_staff_id INTEGER;`);
    await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_by_name VARCHAR(150);`);
    await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_by VARCHAR(150);`);
    await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;`);
    await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);

    await db.query(`
      CREATE TABLE IF NOT EXISTS order_size_change_requests (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(50) NOT NULL,
        item_index INTEGER NOT NULL,
        item_id VARCHAR(50),
        item_name VARCHAR(255) NOT NULL,
        original_size VARCHAR(50) NOT NULL,
        requested_size VARCHAR(50) NOT NULL,
        original_price NUMERIC(10, 2) NOT NULL,
        requested_price NUMERIC(10, 2) NOT NULL,
        customer_name VARCHAR(100),
        user_id INTEGER,
        guest_session_id VARCHAR(64),
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        reviewed_by_id INTEGER,
        reviewed_by_name VARCHAR(150),
        reviewed_at TIMESTAMP
      );
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS order_size_change_requests_order_idx ON order_size_change_requests (order_id, requested_at DESC);`);
    await db.query(`CREATE INDEX IF NOT EXISTS order_size_change_requests_status_idx ON order_size_change_requests (status, requested_at DESC);`);

    // 5. Order Items Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(50) NOT NULL,
        order_item_id VARCHAR(64) UNIQUE,
        item_id VARCHAR(50),
        name VARCHAR(255) NOT NULL,
        size VARCHAR(50) DEFAULT '',
        qty INTEGER NOT NULL,
        price NUMERIC(10, 2) NOT NULL
      );
    `);
    await db.query(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS order_item_id VARCHAR(64);`);
    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS order_items_order_item_id_idx ON order_items (order_item_id) WHERE order_item_id IS NOT NULL;`);

    await db.query(`
      CREATE TABLE IF NOT EXISTS order_audit_log (
        id BIGSERIAL PRIMARY KEY,
        order_id VARCHAR(50),
        actor_id INTEGER,
        actor_role VARCHAR(30) NOT NULL,
        action VARCHAR(60) NOT NULL,
        before_data JSONB,
        after_data JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS order_audit_log_order_idx ON order_audit_log (order_id, created_at DESC);`);

    await db.query(`
      CREATE TABLE IF NOT EXISTS cash_collection_reports (
        id BIGSERIAL PRIMARY KEY,
        order_id VARCHAR(50) NOT NULL,
        staff_id INTEGER NOT NULL,
        staff_name VARCHAR(150),
        amount_reported NUMERIC(10, 2) NOT NULL CHECK (amount_reported > 0),
        status VARCHAR(40) NOT NULL DEFAULT 'pending_manager_verification',
        reported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        reviewed_by_id INTEGER,
        reviewed_by_name VARCHAR(150),
        reviewed_at TIMESTAMP,
        review_note TEXT
      );
    `);
    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS cash_collection_one_pending_per_order_idx ON cash_collection_reports (order_id) WHERE status = 'pending_manager_verification';`);
    await db.query(`CREATE INDEX IF NOT EXISTS cash_collection_status_idx ON cash_collection_reports (status, reported_at DESC);`);

    await db.query(`
      CREATE TABLE IF NOT EXISTS cash_reconciliations (
        id BIGSERIAL PRIMARY KEY,
        manager_id INTEGER NOT NULL,
        manager_name VARCHAR(150),
        opened_at TIMESTAMP NOT NULL,
        closed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        opening_cash NUMERIC(10, 2) NOT NULL DEFAULT 0,
        closing_cash NUMERIC(10, 2) NOT NULL,
        expected_cash NUMERIC(10, 2) NOT NULL,
        reported_cash NUMERIC(10, 2) NOT NULL,
        verified_cash NUMERIC(10, 2) NOT NULL,
        variance NUMERIC(10, 2) NOT NULL,
        note TEXT
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

    await initializeCatalog(db);

    // 7. Password Reset Codes Table — pg does NOT support multi-statement queries; each must be separate
    await db.query(`
      CREATE TABLE IF NOT EXISTS password_reset_codes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        email VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        code_hash TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        attempt_count INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 5,
        used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_reset_codes_user_role ON password_reset_codes (user_id, role)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_reset_codes_email_role ON password_reset_codes (email, role)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_reset_codes_expires_at ON password_reset_codes (expires_at)`);

    // 8. Customer Notifications Table — each statement separate
    await db.query(`
      CREATE TABLE IF NOT EXISTS customer_notifications (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(50) REFERENCES orders(id) ON DELETE CASCADE,
        guest_session_id VARCHAR(64),
        user_id INTEGER,
        status VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_order_status_notification UNIQUE (order_id, status)
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_customer_notifs_guest ON customer_notifications (guest_session_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_customer_notifs_order ON customer_notifications (order_id)`);

    console.log('✅ PostgreSQL Database schema and tables verified successfully.');
  } catch (err) {
    console.error('⚠️ Database migration error:', err);
  }
}

const databaseReady = initDatabaseMigrations();

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

// Initial Staff Seed Mechanism
async function seedInitialStaff() {
  if (!db.pool) return;
  if (process.env.NODE_ENV === 'production') {
    console.log('🔒 [Seed] Production environment detected: skipping demo staff seeding (staff must be created via Manager Portal).');
    return;
  }
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
      console.log('✅ [Seed] Demo staff accounts created (Maria Santos / John Cruz). Default password: password123');
      if (process.env.NODE_ENV === 'production') {
        console.warn('⚠️  [SECURITY] PRODUCTION: Default staff credentials are publicly known! Reset passwords via the Manager Portal immediately.');
      }
    } else {
      console.log(`ℹ️  [Seed] Staff table has ${count} account(s) — skipping auto-seed (existing accounts preserved).`);
    }
  } catch (err) {
    console.error('[Seed] Error seeding initial staff:', err.message);
  }
}

// Seeds run ONLY after migrations complete — prevents race condition on new DB setups
databaseReady.then(async () => {
  await seedInitialManager();
  await seedInitialStaff();
}).catch((err) => {
  console.error('[Startup] Seed phase failed after migrations:', err.message);
});

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
    const result = await db.query('SELECT * FROM managers WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))', [email]);
    if (!result || result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const manager = result.rows[0];

    // Check account status before verifying password
    if (manager.status && manager.status !== 'Active') {
      console.log(`[Auth] Manager login blocked: account not active (id=${manager.id}, status=${manager.status})`);
      return res.status(403).json({
        success: false,
        message: 'Your manager account is inactive. Please contact system support.'
      });
    }

    if (!manager.password_hash) {
      console.error(`[Auth] Manager account has no password hash (id=${manager.id})`);
      return res.status(500).json({ success: false, message: 'Account configuration error. Please contact support.' });
    }

    const isMatch = await bcrypt.compare(password, manager.password_hash);
    if (!isMatch) {
      console.log(`[Auth] Manager login failed: incorrect password (id=${manager.id})`);
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: manager.id, email: manager.email, name: `${manager.first_name} ${manager.last_name}`, role: 'manager' },
      JWT_SECRET || 'scialla_dev_jwt_secret_key_2026',
      { expiresIn: '24h' }
    );

    console.log(`[Auth] Manager login successful: ${manager.email} (id=${manager.id})`);

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
    console.error('[Auth] Manager Login Error:', err.message);
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || (err.message && (err.message.includes('timeout') || err.message.includes('Connection terminated')))) {
      return res.status(503).json({ success: false, message: 'Database service is temporarily unavailable. Please try again shortly.' });
    }
    return res.status(500).json({ success: false, message: 'Server error during login. Please try again.' });
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
      'SELECT * FROM staff WHERE LOWER(TRIM(username)) = LOWER(TRIM($1)) OR LOWER(TRIM(email)) = LOWER(TRIM($1))',
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

    if (!staffMember.password_hash) {
      console.error(`[Auth] Staff account has no password hash (id=${staffMember.id})`);
      return res.status(500).json({ success: false, message: 'Account configuration error. Please contact the manager.' });
    }

    const isMatch = await bcrypt.compare(password, staffMember.password_hash);
    if (!isMatch) {
      console.log(`[Auth] Staff login failed: incorrect password (id=${staffMember.id})`);
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

    console.log(`[Auth] Staff login successful: ${staffMember.username || staffMember.email} (id=${staffMember.id})`);

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
    console.error('[Auth] Staff Login Error:', err.message);
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || (err.message && (err.message.includes('timeout') || err.message.includes('Connection terminated')))) {
      return res.status(503).json({ success: false, message: 'Database service is temporarily unavailable. Please try again shortly.' });
    }
    return res.status(500).json({ success: false, message: 'Server error during login. Please try again.' });
  }
});

// Get Current User Profile (Auth validation)
app.get('/api/auth/me', verifyToken, async (req, res) => {
  try {
    if (req.user.role === 'staff' && db.pool) {
      const result = await db.query(
        'SELECT id, first_name, last_name, email, username, role, status FROM staff WHERE id = $1',
        [req.user.id]
      );
      if (result.rows.length === 0 || result.rows[0].status !== 'Active') {
        return res.status(403).json({ success: false, message: 'Your account is no longer active.' });
      }
      const s = result.rows[0];
      return res.json({
        success: true,
        user: {
          id: s.id,
          first_name: s.first_name,
          last_name: s.last_name,
          name: `${s.first_name} ${s.last_name}`,
          email: s.email,
          username: s.username,
          role: 'staff',
          staffRole: s.role,
          status: s.status
        }
      });
    }
    if (req.user.role === 'manager' && db.pool) {
      const result = await db.query(
        'SELECT id, first_name, last_name, email, status FROM managers WHERE id = $1',
        [req.user.id]
      );
      if (result.rows.length > 0) {
        const m = result.rows[0];
        return res.json({
          success: true,
          user: {
            id: m.id,
            first_name: m.first_name,
            last_name: m.last_name,
            name: `${m.first_name} ${m.last_name}`,
            email: m.email,
            role: 'manager',
            status: m.status
          }
        });
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

// ==================== FORGOT PASSWORD (EMAIL VERIFICATION) ====================

// Step 1 & 2: Request 6-Digit Password Reset Verification Code
app.post('/api/auth/forgot-password/request', requireDatabase, async (req, res) => {
  const { email, role } = req.body;

  if (!email || !role) {
    return res.status(400).json({ success: false, message: 'Email address and role are required.' });
  }

  const cleanRole = (role || '').trim().toLowerCase();
  if (cleanRole !== 'staff' && cleanRole !== 'manager') {
    return res.status(400).json({ success: false, message: 'Invalid role specified.' });
  }

  const cleanEmail = (email || '').trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
  }

  try {
    // Lookup user fresh from PostgreSQL by role and email
    let user = null;
    if (cleanRole === 'manager') {
      const result = await db.query(
        `SELECT id, first_name, last_name, email, status 
         FROM managers 
         WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) 
           AND (status = 'Active' OR status IS NULL)`,
        [cleanEmail]
      );
      if (result && result.rows.length > 0) {
        user = result.rows[0];
      }
    } else if (cleanRole === 'staff') {
      const result = await db.query(
        `SELECT id, first_name, last_name, email, username, status 
         FROM staff 
         WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) 
           AND status = 'Active'`,
        [cleanEmail]
      );
      if (result && result.rows.length > 0) {
        user = result.rows[0];
      }
    }

    // If account exists, check cooldown, invalidate previous codes, and send code to CURRENT email
    if (user) {
      // Enforce 45-second Resend Cooldown on this account
      const cooldownRes = await db.query(
        `SELECT created_at FROM password_reset_codes 
         WHERE user_id = $1 AND role = $2 AND created_at > (CURRENT_TIMESTAMP - INTERVAL '45 seconds')
         ORDER BY created_at DESC LIMIT 1`,
        [user.id, cleanRole]
      );

      if (cooldownRes && cooldownRes.rows.length > 0) {
        return res.status(429).json({
          success: false,
          message: 'Please wait before requesting another verification code (45-second cooldown).'
        });
      }

      // Invalidate any previous un-used codes for this account ID
      await db.query(
        `UPDATE password_reset_codes 
         SET used_at = CURRENT_TIMESTAMP 
         WHERE user_id = $1 AND role = $2 AND used_at IS NULL`,
        [user.id, cleanRole]
      );

      // Generate cryptographically secure random 6-digit code
      const rawCode = crypto.randomInt(100000, 1000000).toString();

      // Store SHA-256 hash of the code
      const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');

      // 10 minutes expiration
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      // Store using current user email from DB
      await db.query(
        `INSERT INTO password_reset_codes (user_id, email, role, code_hash, expires_at, attempt_count, max_attempts)
         VALUES ($1, $2, $3, $4, $5, 0, 5)`,
        [user.id, user.email.trim(), cleanRole, codeHash, expiresAt]
      );

      // Dispatch verification email dynamically to the user's CURRENT registered email
      const targetEmail = user.email.trim();
      emailService.sendResetCodeEmail({
        to: targetEmail,
        name: user.first_name || (cleanRole === 'manager' ? 'Store Manager' : 'Staff Member'),
        code: rawCode,
        role: cleanRole
      }).then(() => {
        console.log(`[Password Reset] Verification email sent to ${emailService.maskEmail(targetEmail)} (${cleanRole})`);
      }).catch((err) => {
        console.error('[Password Reset] Email dispatch error:', err.message || err);
      });
    }

    // Generic response to prevent account enumeration
    return res.json({
      success: true,
      message: 'If an account exists for this email, a verification code has been sent.'
    });
  } catch (err) {
    console.error('Forgot Password Request Error:', err);
    return res.status(500).json({ success: false, message: 'Server error processing password reset request.' });
  }
});

// Step 3 & 4: Verify 6-Digit Reset Code
app.post('/api/auth/forgot-password/verify', requireDatabase, async (req, res) => {
  const { email, role, code } = req.body;

  if (!email || !role || !code) {
    return res.status(400).json({ success: false, message: 'Email, role, and verification code are required.' });
  }

  const cleanRole = (role || '').trim().toLowerCase();
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanCode = (code || '').toString().trim();

  if (!/^\d{6}$/.test(cleanCode)) {
    return res.status(400).json({ success: false, message: 'Verification code must be exactly 6 digits.' });
  }

  try {
    // Lookup user fresh from PostgreSQL by role and current email
    let user = null;
    if (cleanRole === 'manager') {
      const result = await db.query(
        `SELECT id, first_name, last_name, email, status 
         FROM managers 
         WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) 
           AND (status = 'Active' OR status IS NULL)`,
        [cleanEmail]
      );
      if (result && result.rows.length > 0) {
        user = result.rows[0];
      }
    } else if (cleanRole === 'staff') {
      const result = await db.query(
        `SELECT id, first_name, last_name, email, username, status 
         FROM staff 
         WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) 
           AND status = 'Active'`,
        [cleanEmail]
      );
      if (result && result.rows.length > 0) {
        user = result.rows[0];
      }
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code.'
      });
    }

    // Retrieve active reset code by account user_id
    const codeRes = await db.query(
      `SELECT * FROM password_reset_codes 
       WHERE user_id = $1 AND role = $2 AND used_at IS NULL 
       ORDER BY created_at DESC LIMIT 1`,
      [user.id, cleanRole]
    );

    if (!codeRes || codeRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active verification code found. Please request a new code.'
      });
    }

    const resetRecord = codeRes.rows[0];

    // Check expiration
    if (new Date(resetRecord.expires_at) < new Date()) {
      await db.query('UPDATE password_reset_codes SET used_at = CURRENT_TIMESTAMP WHERE id = $1', [resetRecord.id]);
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired (10-minute limit). Please request a new code.'
      });
    }

    // Check max attempts
    if (resetRecord.attempt_count >= resetRecord.max_attempts) {
      await db.query('UPDATE password_reset_codes SET used_at = CURRENT_TIMESTAMP WHERE id = $1', [resetRecord.id]);
      return res.status(400).json({
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a new code.'
      });
    }

    // Timing-safe comparison of code hash
    const inputHash = crypto.createHash('sha256').update(cleanCode).digest('hex');
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(inputHash, 'hex'),
      Buffer.from(resetRecord.code_hash, 'hex')
    );

    if (!isMatch) {
      const newAttempts = resetRecord.attempt_count + 1;
      await db.query('UPDATE password_reset_codes SET attempt_count = $1 WHERE id = $2', [newAttempts, resetRecord.id]);
      const remaining = resetRecord.max_attempts - newAttempts;

      if (remaining <= 0) {
        await db.query('UPDATE password_reset_codes SET used_at = CURRENT_TIMESTAMP WHERE id = $1', [resetRecord.id]);
        return res.status(400).json({
          success: false,
          message: 'Maximum verification attempts exceeded. Please request a new code.'
        });
      }

      return res.status(400).json({
        success: false,
        message: `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
      });
    }

    // Code is valid: generate short-lived signed Reset Token (JWT, 10-minute validity)
    const resetToken = jwt.sign(
      {
        resetCodeId: resetRecord.id,
        userId: user.id,
        email: user.email.trim(),
        role: cleanRole,
        purpose: 'password_reset'
      },
      JWT_SECRET || 'scialla_dev_jwt_secret_key_2026',
      { expiresIn: '10m' }
    );

    return res.json({
      success: true,
      resetToken,
      message: 'Verification code accepted.'
    });
  } catch (err) {
    console.error('Verify Reset Code Error:', err);
    return res.status(500).json({ success: false, message: 'Server error verifying reset code.' });
  }
});

// Step 5: Update Password (with verified Reset Token)
app.post('/api/auth/forgot-password/reset', requireDatabase, async (req, res) => {
  const { resetToken, newPassword, confirmPassword } = req.body;

  if (!resetToken || !newPassword || !confirmPassword) {
    return res.status(400).json({ success: false, message: 'Reset token, new password, and confirmation are required.' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'New password and confirmation do not match.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
  }

  try {
    let decoded;
    try {
      decoded = jwt.verify(resetToken, JWT_SECRET || 'scialla_dev_jwt_secret_key_2026');
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Password reset session has expired or is invalid. Please request a new verification code.'
      });
    }

    if (!decoded || decoded.purpose !== 'password_reset' || !decoded.resetCodeId || !decoded.userId || !decoded.role) {
      return res.status(400).json({ success: false, message: 'Invalid password reset authorization.' });
    }

    // Verify reset code has not already been used
    const codeCheck = await db.query(
      'SELECT * FROM password_reset_codes WHERE id = $1 AND user_id = $2 AND role = $3 AND used_at IS NULL',
      [decoded.resetCodeId, decoded.userId, decoded.role]
    );

    if (!codeCheck || codeCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'This verification code has already been used or invalidated. Please request a new code.'
      });
    }

    // Hash new password using bcrypt (matching existing Scialla authentication)
    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    // Update password in the correct table based on role
    if (decoded.role === 'manager') {
      const updateRes = await db.query(
        'UPDATE managers SET password_hash = $1 WHERE id = $2 RETURNING id, email',
        [hashedPassword, decoded.userId]
      );
      if (updateRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Manager account not found.' });
      }
    } else if (decoded.role === 'staff') {
      const updateRes = await db.query(
        'UPDATE staff SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email',
        [hashedPassword, decoded.userId]
      );
      if (updateRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Staff account not found.' });
      }
    }

    // Invalidate reset code immediately to prevent replay
    await db.query(
      'UPDATE password_reset_codes SET used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [decoded.resetCodeId]
    );

    // Invalidate any other pending codes for this user
    await db.query(
      'UPDATE password_reset_codes SET used_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND role = $2 AND used_at IS NULL',
      [decoded.userId, decoded.role]
    );

    console.log(`🔐 [Auth] Successfully reset password for ${decoded.role} (User ID: ${decoded.userId})`);

    return res.json({
      success: true,
      role: decoded.role,
      message: 'Your password has been changed successfully.'
    });
  } catch (err) {
    console.error('Reset Password Error:', err);
    return res.status(500).json({ success: false, message: 'Server error updating password.' });
  }
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

  const cleanFirstName = (first_name || '').toString().trim();
  const cleanLastName = (last_name || '').toString().trim();
  const cleanEmail = (email || '').toString().trim();
  const cleanUsername = (username || '').toString().trim();
  const staffRole = (role || 'Staff').toString().trim();

  if (!cleanFirstName || !cleanLastName || !cleanEmail || !cleanUsername || !password) {
    return res.status(400).json({ success: false, message: 'All fields (first_name, last_name, email, username, password) are required.' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    // Unique check against both staff and managers
    const dupCheck = await db.query(
      `SELECT id FROM staff WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) OR LOWER(TRIM(username)) = LOWER(TRIM($2))
       UNION
       SELECT id FROM managers WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))`,
      [cleanEmail, cleanUsername]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email or username is already in use by another account.' });
    }

    const insertRes = await db.query(
      `INSERT INTO staff (first_name, last_name, email, username, password_hash, role, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'Active', $7)
       RETURNING id, first_name, last_name, email, username, role, status, created_at`,
      [cleanFirstName, cleanLastName, cleanEmail, cleanUsername, hashedPassword, staffRole, req.user.id || 1]
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

  if (isNaN(staffId)) {
    return res.status(400).json({ success: false, message: 'Invalid staff ID.' });
  }

  const cleanFirstName = first_name !== undefined && first_name !== null ? first_name.toString().trim() : null;
  const cleanLastName = last_name !== undefined && last_name !== null ? last_name.toString().trim() : null;
  const cleanEmail = email !== undefined && email !== null ? email.toString().trim() : null;
  const cleanUsername = username !== undefined && username !== null ? username.toString().trim() : null;
  const cleanRole = role !== undefined && role !== null ? role.toString().trim() : null;

  try {
    // Unique check against other staff accounts and managers
    if (cleanEmail || cleanUsername) {
      const dupCheck = await db.query(
        `SELECT id FROM staff 
         WHERE id != $1 
           AND ((LOWER(TRIM(email)) = LOWER(TRIM(COALESCE($2, ''))) AND $2 IS NOT NULL AND $2 != '')
             OR (LOWER(TRIM(username)) = LOWER(TRIM(COALESCE($3, ''))) AND $3 IS NOT NULL AND $3 != ''))
         UNION
         SELECT id FROM managers 
         WHERE (LOWER(TRIM(email)) = LOWER(TRIM(COALESCE($2, ''))) AND $2 IS NOT NULL AND $2 != '')`,
        [staffId, cleanEmail, cleanUsername]
      );
      if (dupCheck.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Email or username is already in use by another account.' });
      }
    }

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
      [cleanFirstName, cleanLastName, cleanEmail, cleanUsername, cleanRole, staffId]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    // Invalidate previous unused reset codes for this staff account
    await db.query(
      'UPDATE password_reset_codes SET used_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND role = $2 AND used_at IS NULL',
      [staffId, 'staff']
    );

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

// Master Add-on Price Definitions for Server-side Verification
const ADDON_PRICES = {
  da1: { id: 'da1', name: 'Sweetener Syrup', price: 10 },
  da2: { id: 'da2', name: '1 Shot Espresso', price: 10 },
  da3: { id: 'da3', name: 'Strawberry Flavor', price: 10 },
  da4: { id: 'da4', name: 'Blueberry Flavor', price: 10 },
  da5: { id: 'da5', name: 'Almond Syrup', price: 10 },
  da6: { id: 'da6', name: 'Oreo Crumbles', price: 10 },
  da7: { id: 'da7', name: 'Caramel Drizzle', price: 10 },
  da8: { id: 'da8', name: 'Chocolate Drizzle', price: 15 },
  da9: { id: 'da9', name: 'Boba Pearls', price: 20 },
  da10: { id: 'da10', name: 'Nata de Coco', price: 20 },
  da11: { id: 'da11', name: 'Coffee Jelly', price: 20 },
  fa1: { id: 'fa1', name: 'Extra Egg', price: 20 },
  fa2: { id: 'fa2', name: 'Extra Lettuce', price: 20 },
  fa3: { id: 'fa3', name: 'Extra Cheese', price: 20 },
  fa4: { id: 'fa4', name: 'Extra Mayonnaise', price: 25 }
};

// Memory store fallback for development / offline resilience
const memoryOrdersMap = new Map();

async function writeOrderAudit(executor, req, orderId, action, beforeData = null, afterData = null) {
  await executor.query(
    `INSERT INTO order_audit_log (order_id, actor_id, actor_role, action, before_data, after_data)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
    [orderId, req.user?.id || null, req.user?.role || 'customer', action,
      beforeData == null ? null : JSON.stringify(beforeData), afterData == null ? null : JSON.stringify(afterData)]
  );
}

// Helper: Save & Format Order in PostgreSQL with Ownership and Audit Trail
async function saveOrderToDatabase(orderData, userId = null, guestSessionId = null) {
  const orderId = orderData.id || orderData.orderNum || `SC-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const tableName = orderData.table || orderData.table_name || 'Table 1';
  const timestamp = orderData.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const items = orderData.items || [];
  const calculatedTotal = items.reduce((acc, it) => acc + (parseFloat(it.price) || 0) * (parseInt(it.qty || it.quantity || 1, 10) || 1), 0);
  const total = orderData.total !== undefined && orderData.total !== null ? (parseFloat(orderData.total) || 0) : calculatedTotal;
  const paymentMethod = 'Cash';
  const customerName = orderData.customer_name || orderData.customerName || null;
  const status = 'pending_manager_approval';
  const assignedUserId = userId || orderData.user_id || null;
  const assignedGuestId = guestSessionId || orderData.guest_session_id || orderData.guestSessionId || null;
  const acceptedById = orderData.accepted_by_id || orderData.accepted_by_staff_id || orderData.staff_id || null;
  const acceptedByName = orderData.accepted_by_name || orderData.accepted_by || orderData.staff_name || orderData.handled_by || null;
  const acceptedAt = orderData.accepted_at || null;
  const completedById = orderData.completed_by_id || orderData.completed_by_staff_id || null;
  const completedByName = orderData.completed_by_name || orderData.completed_by || null;
  const completedAt = orderData.completed_at || null;
  let createdAt = new Date().toISOString();

  // Resolve current add-on catalog prices for newly submitted order snapshots.
  let addonPrices = ADDON_PRICES;
  if (db.pool && items.some(item => Array.isArray(item.addons) && item.addons.length)) {
    const result = await db.query("SELECT item_id, name, price FROM product_stock WHERE category_id IN ('drinkaddons', 'foodaddons')");
    addonPrices = Object.fromEntries(result.rows.map(row => [row.item_id, { id: row.item_id, name: row.name, price: Number(row.price) }]));
  }

  // Construct complete normalized order object for real-time emission and DB storage
  const formattedItems = items.map((item) => {
    const rawName = item.rawName || item.name || item.product_name || item.productName || item.item_name || 'Item';
    const cleanName = typeof rawName === 'string'
      ? rawName.replace(/^\d+x\s*/i, '').trim()
      : 'Item';
    const itemSize = item.size || item.selectedSize || '';
    const itemQty = parseInt(item.qty || item.quantity || item.count || 1, 10) || 1;
    const itemPrice = parseFloat(item.price || 0) || 0;
    const itemId = String(item.originalId || item.item_id || item.id || '').replace(/-\d+\s*oz$/i, '');

    // Authoritative add-on sanitation
    const itemAddons = (Array.isArray(item.addons) ? item.addons : [])
      .map((a) => {
        const addonId = typeof a === 'string' ? a : (a.id || a.addon_id);
        const master = addonPrices[addonId];
        if (master) {
          return { id: master.id, name: master.name, price: master.price };
        }
        if (typeof a === 'object' && a.name && typeof a.price === 'number') {
          return { id: a.id || 'addon', name: a.name, price: a.price };
        }
        return null;
      })
      .filter(Boolean);

    return {
      order_item_id: crypto.randomUUID(),
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
      price: itemPrice,
      addons: itemAddons
    };
  });

  const itemsJson = JSON.stringify(formattedItems);

  if (db.pool) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      if (assignedGuestId) {
        await client.query(
          'INSERT INTO guest_sessions (id, created_at, last_active) VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (id) DO UPDATE SET last_active = CURRENT_TIMESTAMP',
          [assignedGuestId]
        );
      }
      const inserted = await client.query(
        `INSERT INTO orders (
           id, customer_name, table_name, timestamp, total, amount_already_paid, payment_method, payment_status, status,
           guest_session_id, user_id, items_json, accepted_by_id, accepted_by_staff_id, accepted_by_name,
           accepted_at, completed_by_id, completed_by_staff_id, completed_by_name, completed_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, 0, $6, 'unpaid', $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO NOTHING RETURNING id, created_at`,
        [
          orderId, customerName, tableName, timestamp, total, paymentMethod, status,
          assignedGuestId, assignedUserId, itemsJson,
          acceptedById, acceptedById, acceptedByName,
          acceptedAt, completedById, completedById, completedByName, completedAt
        ]
      );
      if (!inserted.rows.length) {
        const duplicateError = new Error('Order reference already exists.');
        duplicateError.code = 'DUPLICATE_ORDER_ID';
        throw duplicateError;
      }
      for (const item of formattedItems) {
        await client.query(
          'INSERT INTO order_items (order_id, order_item_id, item_id, name, size, qty, price) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [orderId, item.order_item_id, item.id, item.name, item.size, item.qty, item.price]
        );
      }
      await client.query('COMMIT');
      createdAt = new Date(inserted.rows[0].created_at).toISOString();
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('Error inserting customer order and items:', err);
      throw err;
    } finally {
      client.release();
    }

  }

  const orderResult = {
    id: orderId,
    orderId,
    customer_name: customerName,
    customerName,
    table: tableName,
    timestamp,
    total,
    amountAlreadyPaid: 0,
    additionalPayable: 0,
    paymentStatus: 'unpaid',
    paymentMethod,
    status,
    guest_session_id: assignedGuestId,
    user_id: assignedUserId,
    accepted_by_id: acceptedById,
    accepted_by_staff_id: acceptedById,
    accepted_by_name: acceptedByName,
    accepted_at: acceptedAt,
    completed_by_id: completedById,
    completed_by_staff_id: completedById,
    completed_by_name: completedByName,
    completed_at: completedAt,
    createdAt,
    updatedAt: createdAt,
    items: formattedItems
  };

  memoryOrdersMap.set(orderId, orderResult);
  return orderResult;
}

// Helper for standard Order SELECT query with staff and manager JOINs
function getOrdersSelectSql(whereClause = '', orderLimit = 'ORDER BY o.created_at DESC') {
  return `
    SELECT 
      o.id,
      o.customer_name,
      o.table_name,
      o.timestamp,
      o.total,
      o.amount_already_paid,
      o.payment_status,
      o.payment_method,
      o.status,
      o.guest_session_id,
      o.user_id,
      COALESCE(o.items_json, o.items) AS items_json,
      COALESCE(o.accepted_by_staff_id, o.accepted_by_id, o.staff_id) AS accepted_by_id,
      COALESCE(o.accepted_by_staff_id, o.accepted_by_id, o.staff_id) AS accepted_by_staff_id,
      COALESCE(
        NULLIF(TRIM(CONCAT(s_acc.first_name, ' ', s_acc.last_name)), ''),
        s_acc.username,
        NULLIF(TRIM(CONCAT(m_acc.first_name, ' ', m_acc.last_name)), ''),
        o.accepted_by_name,
        o.accepted_by,
        o.staff_name,
        o.handled_by
      ) AS accepted_by_name,
      o.accepted_at,
      COALESCE(o.completed_by_staff_id, o.completed_by_id) AS completed_by_id,
      COALESCE(o.completed_by_staff_id, o.completed_by_id) AS completed_by_staff_id,
      COALESCE(
        NULLIF(TRIM(CONCAT(s_comp.first_name, ' ', s_comp.last_name)), ''),
        s_comp.username,
        NULLIF(TRIM(CONCAT(m_comp.first_name, ' ', m_comp.last_name)), ''),
        o.completed_by_name,
        o.completed_by
      ) AS completed_by_name,
      o.completed_at,
      o.created_at,
      o.updated_at
    FROM orders o
    LEFT JOIN staff s_acc ON s_acc.id = COALESCE(o.accepted_by_staff_id, o.accepted_by_id, o.staff_id)
    LEFT JOIN managers m_acc ON m_acc.id = COALESCE(o.accepted_by_staff_id, o.accepted_by_id, o.staff_id)
    LEFT JOIN staff s_comp ON s_comp.id = COALESCE(o.completed_by_staff_id, o.completed_by_id)
    LEFT JOIN managers m_comp ON m_comp.id = COALESCE(o.completed_by_staff_id, o.completed_by_id)
    ${whereClause}
    ${orderLimit}
  `;
}

// Get Orders (Filtered by Role / Ownership with Full Staff Audit Trail)
app.get('/api/orders', requireDatabase, optionalAuth, async (req, res) => {
  try {
    const isManager = req.user?.role === 'manager';
    const isStaff = req.user?.role === 'staff';
    const isStaffOrManager = isStaff || isManager;
    const guestSessionId = req.headers['x-guest-session'] || req.query.guestSessionId;
    const userId = req.user ? req.user.id : null;

    let ordersQuery = getOrdersSelectSql('', 'ORDER BY o.created_at DESC');
    let queryParams = [];

    if (isStaff) {
      ordersQuery = getOrdersSelectSql("WHERE o.status IN ('approved', 'preparing', 'ready', 'served')", 'ORDER BY o.created_at DESC');
    }

    // If customer / guest, filter strictly to orders they own
    if (!isStaffOrManager) {
      if (userId && guestSessionId) {
        ordersQuery = getOrdersSelectSql('WHERE (o.user_id = $1 OR o.guest_session_id = $2)', 'ORDER BY o.created_at DESC');
        queryParams = [userId, guestSessionId];
      } else if (userId) {
        ordersQuery = getOrdersSelectSql('WHERE o.user_id = $1', 'ORDER BY o.created_at DESC');
        queryParams = [userId];
      } else if (guestSessionId) {
        ordersQuery = getOrdersSelectSql('WHERE o.guest_session_id = $1', 'ORDER BY o.created_at DESC');
        queryParams = [guestSessionId];
      } else {
        ordersQuery = getOrdersSelectSql('WHERE FALSE', 'ORDER BY o.created_at DESC');
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
      let orderItems = [];
      if (o.items_json) {
        try {
          const parsed = JSON.parse(o.items_json);
          if (Array.isArray(parsed) && parsed.length > 0) {
            orderItems = parsed;
          }
        } catch {}
      }
      if (orderItems.length === 0) {
        orderItems = itemsByOrderId[o.id] || [];
      }

      const accId = o.accepted_by_staff_id || o.accepted_by_id || null;
      const compId = o.completed_by_staff_id || o.completed_by_id || null;

      return {
        id: o.id,
        orderId: o.id,
        customer_name: o.customer_name || null,
        customerName: o.customer_name || null,
        table: o.table_name,
        timestamp: o.timestamp,
        total: parseFloat(o.total),
        amountAlreadyPaid: parseFloat(o.amount_already_paid) || 0,
        paymentStatus: o.payment_status || 'unpaid',
        additionalPayable: Number(Math.max(0, parseFloat(o.total) - (parseFloat(o.amount_already_paid) || 0)).toFixed(2)),
        paymentMethod: o.payment_method,
        status: o.status,
        guest_session_id: o.guest_session_id,
        user_id: o.user_id,
        accepted_by_id: accId,
        accepted_by_staff_id: accId,
        accepted_by_name: o.accepted_by_name || null,
        accepted_at: o.accepted_at,
        completed_by_id: compId,
        completed_by_staff_id: compId,
        completed_by_name: o.completed_by_name || null,
        completed_at: o.completed_at,
        createdAt: o.created_at,
        updatedAt: o.updated_at || o.created_at,
        items: orderItems
      };
    });

    return res.json({ success: true, orders: formattedOrders });
  } catch (err) {
    console.error('Get Orders Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch orders.' });
  }
});

// Get Single Order Details by ID
app.get('/api/orders/:id', requireDatabase, optionalAuth, async (req, res) => {
  try {
    const orderId = req.params.id;
    const singleOrderQuery = getOrdersSelectSql('WHERE o.id = $1', '');
    const orderRes = await db.query(singleOrderQuery, [orderId]);

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const orderRow = orderRes.rows[0];
    if (!canAccessCustomerOrder(req, orderRow)) {
      return res.status(403).json({ success: false, message: 'You cannot view this order.' });
    }
    let formattedItems = [];
    if (orderRow.items_json) {
      try {
        const parsed = JSON.parse(orderRow.items_json);
        if (Array.isArray(parsed) && parsed.length > 0) {
          formattedItems = parsed;
        }
      } catch {}
    }

    if (formattedItems.length === 0) {
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
    }

    const accId = orderRow.accepted_by_staff_id || orderRow.accepted_by_id || null;
    const compId = orderRow.completed_by_staff_id || orderRow.completed_by_id || null;

    return res.json({
      success: true,
      order: {
        id: orderRow.id,
        orderId: orderRow.id,
        customer_name: orderRow.customer_name || null,
        customerName: orderRow.customer_name || null,
        table: orderRow.table_name,
        timestamp: orderRow.timestamp,
        total: parseFloat(orderRow.total),
        amountAlreadyPaid: parseFloat(orderRow.amount_already_paid) || 0,
        paymentStatus: orderRow.payment_status || 'unpaid',
        additionalPayable: Number(Math.max(0, parseFloat(orderRow.total) - (parseFloat(orderRow.amount_already_paid) || 0)).toFixed(2)),
        paymentMethod: orderRow.payment_method,
        status: orderRow.status,
        guest_session_id: orderRow.guest_session_id,
        user_id: orderRow.user_id,
        accepted_by_id: accId,
        accepted_by_staff_id: accId,
        accepted_by_name: orderRow.accepted_by_name || null,
        accepted_at: orderRow.accepted_at,
        completed_by_id: compId,
        completed_by_staff_id: compId,
        completed_by_name: orderRow.completed_by_name || null,
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

function canAccessCustomerOrder(req, order) {
  if (req.user && ['staff', 'manager'].includes(req.user.role)) return true;
  if (req.user?.role === 'customer') return String(order.user_id) === String(req.user.id);
  const guestSessionId = req.headers['x-guest-session'];
  return Boolean(guestSessionId && order.guest_session_id && guestSessionId === order.guest_session_id);
}

function formatSizeChangeRequest(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    itemIndex: row.item_index,
    itemId: row.item_id,
    itemName: row.item_name,
    originalSize: row.original_size,
    requestedSize: row.requested_size,
    originalPrice: Number(row.original_price),
    requestedPrice: Number(row.requested_price),
    customerName: row.customer_name || 'Guest customer',
    status: row.status,
    requestedAt: row.requested_at,
    reviewedByName: row.reviewed_by_name || null,
    reviewedAt: row.reviewed_at || null
  };
}

// Customer submits a size-change request. The order itself stays untouched until a manager reviews it.
app.post('/api/orders/:id/size-change-requests', requireDatabase, optionalAuth, async (req, res) => {
  const orderId = req.params.id;
  const itemIndex = Number(req.body?.itemIndex);
  const requestedSize = String(req.body?.requestedSize || '').trim();
  try {
    if (req.user && req.user.role !== 'customer') {
      return res.status(403).json({ success: false, message: 'Only the order customer can request a size change.' });
    }
    if (!Number.isInteger(itemIndex) || itemIndex < 0 || !requestedSize) {
      return res.status(400).json({ success: false, message: 'Choose an order item and requested size.' });
    }
    const orderRes = await db.query('SELECT id, customer_name, user_id, guest_session_id, items_json, status FROM orders WHERE id = $1', [orderId]);
    if (!orderRes.rows.length) return res.status(404).json({ success: false, message: 'Order not found.' });
    const order = orderRes.rows[0];
    if (!canAccessCustomerOrder(req, order)) return res.status(403).json({ success: false, message: 'You cannot request a change for this order.' });
    if (!['approved', 'preparing', 'ready'].includes(order.status)) {
      return res.status(409).json({ success: false, message: 'This order can no longer be changed.' });
    }
    let items = [];
    try { items = JSON.parse(order.items_json || '[]'); } catch {}
    const item = items[itemIndex];
    if (!item) return res.status(404).json({ success: false, message: 'Order item not found.' });
    if (!item.size || item.size === requestedSize) return res.status(400).json({ success: false, message: 'Choose a different size.' });
    const productId = String(item.originalId || item.item_id || item.id || '').replace(/-\d+\s*oz$/i, '');
    const productRes = await db.query('SELECT sizes FROM product_stock WHERE item_id = $1', [productId]);
    let sizes = productRes.rows[0]?.sizes || [];
    if (typeof sizes === 'string') { try { sizes = JSON.parse(sizes); } catch { sizes = []; } }
    const requestedOption = Array.isArray(sizes) ? sizes.find((size) => size.size === requestedSize) : null;
    if (!requestedOption) return res.status(400).json({ success: false, message: 'That size is not available for this item.' });
    const pending = await db.query(
      "SELECT id FROM order_size_change_requests WHERE order_id = $1 AND item_index = $2 AND status = 'pending' LIMIT 1",
      [orderId, itemIndex]
    );
    if (pending.rows.length) return res.status(409).json({ success: false, message: 'A size-change request for this item is already pending.' });
    const userId = req.user?.id || null;
    const guestSessionId = req.user ? null : req.headers['x-guest-session'];
    const inserted = await db.query(
      `INSERT INTO order_size_change_requests
        (order_id, item_index, item_id, item_name, original_size, requested_size, original_price, requested_price, customer_name, user_id, guest_session_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [orderId, itemIndex, productId || null, item.name || item.rawName || 'Item', item.size,
        requestedOption.size, Number(item.price) || 0, Number(requestedOption.price) || 0, order.customer_name, userId, guestSessionId]
    );
    const request = formatSizeChangeRequest(inserted.rows[0]);
    await writeOrderAudit(db, req, orderId, 'size_change_requested', null, request);
    io.to('manager:orders').emit('size-change-request:updated', request);
    io.to('staff:orders').emit('size-change-request:updated', request);
    if (order.guest_session_id) io.to(`guest:${order.guest_session_id}`).emit('size-change-request:updated', request);
    if (order.user_id) io.to(`user:${order.user_id}`).emit('size-change-request:updated', request);
    return res.status(201).json({ success: true, request });
  } catch (err) {
    console.error('Create Size Change Request Error:', err);
    return res.status(500).json({ success: false, message: 'Unable to submit size-change request.' });
  }
});

// Staff and manager may view request status; only manager may make a decision.
app.get('/api/size-change-requests', requireDatabase, verifyToken, async (req, res) => {
  if (!['staff', 'manager'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Staff or manager authorization is required.' });
  try {
    const result = await db.query('SELECT * FROM order_size_change_requests ORDER BY requested_at DESC');
    return res.json({ success: true, requests: result.rows.map(formatSizeChangeRequest) });
  } catch (err) {
    console.error('Get Size Change Requests Error:', err);
    return res.status(500).json({ success: false, message: 'Unable to load size-change requests.' });
  }
});

app.get('/api/orders/:id/size-change-requests', requireDatabase, optionalAuth, async (req, res) => {
  try {
    const orderRes = await db.query('SELECT user_id, guest_session_id FROM orders WHERE id = $1', [req.params.id]);
    if (!orderRes.rows.length) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (!canAccessCustomerOrder(req, orderRes.rows[0])) return res.status(403).json({ success: false, message: 'You cannot view this order.' });
    const result = await db.query('SELECT * FROM order_size_change_requests WHERE order_id = $1 ORDER BY requested_at DESC', [req.params.id]);
    return res.json({ success: true, requests: result.rows.map(formatSizeChangeRequest) });
  } catch (err) {
    console.error('Get Order Size Change Requests Error:', err);
    return res.status(500).json({ success: false, message: 'Unable to load size-change requests.' });
  }
});

app.patch('/api/size-change-requests/:requestId', verifyToken, verifyManager, requireDatabase, async (req, res) => {
  const decision = String(req.body?.status || '').toLowerCase();
  if (!['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ success: false, message: 'Decision must be approved or rejected.' });
  }
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const requestRes = await client.query('SELECT * FROM order_size_change_requests WHERE id = $1 FOR UPDATE', [req.params.requestId]);
    if (!requestRes.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ success: false, message: 'Size-change request not found.' }); }
    const requestRow = requestRes.rows[0];
    if (requestRow.status !== 'pending') { await client.query('ROLLBACK'); return res.status(409).json({ success: false, message: 'This request has already been reviewed.' }); }

    let updatedOrder = null;
    if (decision === 'approved') {
      const orderRes = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [requestRow.order_id]);
      if (!orderRes.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ success: false, message: 'Order not found.' }); }
      const order = orderRes.rows[0];
      let items = [];
      try { items = JSON.parse(order.items_json || '[]'); } catch {}
      const item = items[requestRow.item_index];
      const currentProductId = item ? String(item.originalId || item.item_id || item.id || '').replace(/-\d+\s*oz$/i, '') : '';
      if (!item || currentProductId !== String(requestRow.item_id || '') || item.size !== requestRow.original_size) {
        await client.query('ROLLBACK');
        return res.status(409).json({ success: false, message: 'The order item changed since this request was submitted.' });
      }
      const oldPrice = Number(item.price) || Number(requestRow.original_price) || 0;
      const newPrice = Number(requestRow.requested_price) || 0;
      const qty = Number(item.qty || item.quantity || 1);
      item.order_item_id = item.order_item_id || crypto.randomUUID();
      item.size = requestRow.requested_size;
      item.price = newPrice;
      items[requestRow.item_index] = item;
      const nextTotal = Number((Number(order.total) + (newPrice - oldPrice) * qty).toFixed(2));
      const nextPaymentStatus = Number(order.amount_already_paid || 0) >= nextTotal ? 'paid' : 'unpaid';
      await client.query('UPDATE orders SET total = $1, items_json = $2, payment_status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4', [nextTotal, JSON.stringify(items), nextPaymentStatus, requestRow.order_id]);
      const itemUpdate = await client.query('UPDATE order_items SET size = $1, price = $2, order_item_id = $3 WHERE order_id = $4 AND order_item_id = $5',
        [requestRow.requested_size, newPrice, item.order_item_id, requestRow.order_id, item.order_item_id]);
      if (itemUpdate.rowCount === 0) {
        await client.query('UPDATE order_items SET size = $1, price = $2, order_item_id = $3 WHERE order_id = $4 AND item_id = $5 AND size = $6',
          [requestRow.requested_size, newPrice, item.order_item_id, requestRow.order_id, requestRow.item_id, requestRow.original_size]);
      }
      updatedOrder = {
        id: order.id, orderId: order.id, customer_name: order.customer_name, customerName: order.customer_name,
        table: order.table_name, timestamp: order.timestamp, total: nextTotal,
        amountAlreadyPaid: Number(order.amount_already_paid) || 0,
        additionalPayable: Number(Math.max(0, nextTotal - Number(order.amount_already_paid || 0)).toFixed(2)),
        paymentMethod: order.payment_method, status: order.status, user_id: order.user_id,
        paymentStatus: nextPaymentStatus,
        guest_session_id: order.guest_session_id, items
      };
    }

    const reviewerId = req.user.id;
    const reviewer = await client.query('SELECT first_name, last_name FROM managers WHERE id = $1', [reviewerId]);
    const reviewerName = reviewer.rows[0] ? `${reviewer.rows[0].first_name} ${reviewer.rows[0].last_name}`.trim() : 'Manager';
    const reviewed = await client.query(
      `UPDATE order_size_change_requests SET status = $1, reviewed_by_id = $2, reviewed_by_name = $3, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`, [decision, reviewerId, reviewerName, req.params.requestId]
    );
    await writeOrderAudit(client, req, requestRow.order_id, decision === 'approved' ? 'size_change_approved' : 'size_change_rejected',
      { requestId: requestRow.id, size: requestRow.original_size, status: requestRow.status },
      { requestId: requestRow.id, size: requestRow.requested_size, status: decision });
    await client.query('COMMIT');
    const request = formatSizeChangeRequest(reviewed.rows[0]);
    io.to('manager:orders').emit('size-change-request:updated', request);
    io.to('staff:orders').emit('size-change-request:updated', request);
    if (updatedOrder) {
      io.to(`order:${updatedOrder.id}`).emit('order:updated', updatedOrder);
      if (decision === 'approved') {
        io.to('staff:orders').emit('order:updated', updatedOrder);
        io.to('manager:orders').emit('order:updated', updatedOrder);
      }
      if (updatedOrder.guest_session_id) io.to(`guest:${updatedOrder.guest_session_id}`).emit('order:updated', updatedOrder);
      if (updatedOrder.user_id) io.to(`user:${updatedOrder.user_id}`).emit('order:updated', updatedOrder);
    }
    const notificationPayload = updatedOrder || { id: requestRow.order_id, user_id: requestRow.user_id, guest_session_id: requestRow.guest_session_id };
    await createAndEmitOrderNotification(requestRow.order_id, decision === 'approved' ? 'size_change_approved' : 'size_change_rejected', notificationPayload);
    return res.json({ success: true, request, order: updatedOrder });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Review Size Change Request Error:', err);
    return res.status(500).json({ success: false, message: 'Unable to review size-change request.' });
  } finally {
    client.release();
  }
});

// Create Order (HTTP POST) - Public for Customer Checkout with Stock Validation
app.post('/api/orders', requireDatabase, optionalAuth, async (req, res) => {
  try {
    if (req.user && req.user.role !== 'customer') {
      return res.status(403).json({ success: false, message: 'Only customers can submit new orders.' });
    }
    const userId = req.user ? req.user.id : null;
    const guestSessionId = req.headers['x-guest-session'] || req.body.guestSessionId || req.body.guest_session_id || null;
    const orderItems = req.body.items || [];

    // Backend Stock Verification to prevent overselling
    if (db.pool && Array.isArray(orderItems) && orderItems.length > 0) {
      for (const it of orderItems) {
        const itemId = String(it.id || it.item_id || it.originalId || '');
        if (itemId) {
          const baseItemId = String(it.originalId || itemId.replace(/-\d+ oz$/, ''));
          const stockCheck = await db.query(
            'SELECT in_stock, quantity, name, active FROM product_stock WHERE item_id = $1 OR item_id = $2',
            [itemId, baseItemId]
          );
          if (stockCheck.rows.length > 0) {
            const sRow = stockCheck.rows[0];
            if (sRow.active === false || sRow.in_stock === false || (typeof sRow.quantity === 'number' && sRow.quantity <= 0)) {
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

    // New customer orders wait in the Manager queue until approval.
    io.to('manager:orders').emit('order:created', fullOrder);
    io.to(`order:${fullOrder.id}`).emit('order:created', fullOrder);
    if (guestSessionId) {
      io.to(`guest:${guestSessionId}`).emit('order:created', fullOrder);
    }
    if (userId) {
      io.to(`user:${userId}`).emit('order:created', fullOrder);
    }

    console.log(`📡 [Socket] Targeted emission for new order ${fullOrder.id} (Staff + Owner)`);

    // Emit initial lifecycle notification
    await writeOrderAudit(db, req, fullOrder.id, 'order_created', null, fullOrder);
    io.to('manager:orders').emit('notification:manager_new_order', {
      orderId: fullOrder.id, customerName: fullOrder.customer_name, requestedAt: fullOrder.createdAt
    });
    await createAndEmitOrderNotification(fullOrder.id, 'pending_manager_approval', fullOrder);

    return res.status(201).json({ success: true, order: fullOrder });
  } catch (err) {
    console.error('Create Order Error:', err);
    if (err.code === 'DUPLICATE_ORDER_ID') return res.status(409).json({ success: false, message: 'Order reference already exists. Please submit again.' });
    return res.status(500).json({ success: false, message: 'Unable to save the order. Please retry.' });
  }
});

app.patch('/api/orders/:id/approval', verifyToken, verifyManager, requireDatabase, async (req, res) => {
  const decision = String(req.body?.decision || '').toLowerCase();
  if (!['approve', 'reject', 'cancel'].includes(decision)) {
    return res.status(400).json({ success: false, message: 'Choose approve, reject, or cancel.' });
  }
  const orderId = req.params.id;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const orderRes = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [orderId]);
    if (!orderRes.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ success: false, message: 'Order not found.' }); }
    const current = orderRes.rows[0];
    if (decision !== 'cancel' && current.status !== 'pending_manager_approval') {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Only pending orders can be approved or rejected.' });
    }
    if (decision === 'cancel' && current.status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'This order is already cancelled.' });
    }
    const nextStatus = decision === 'approve' ? 'approved' : 'cancelled';
    await client.query('UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [nextStatus, orderId]);
    const action = decision === 'approve' ? 'order_approved' : decision === 'reject' ? 'order_rejected' : 'order_cancelled';
    await writeOrderAudit(client, req, orderId, action, { status: current.status }, { status: nextStatus });
    await client.query('COMMIT');
    const order = {
      id: current.id, orderId: current.id, customer_name: current.customer_name, customerName: current.customer_name,
      table: current.table_name, timestamp: current.timestamp, total: Number(current.total),
      amountAlreadyPaid: Number(current.amount_already_paid) || 0, paymentStatus: current.payment_status || 'unpaid',
      status: nextStatus, user_id: current.user_id, guest_session_id: current.guest_session_id,
      items: JSON.parse(current.items_json || '[]'), updatedAt: new Date().toISOString()
    };
    if (decision === 'approve') io.to('staff:orders').emit('order:created', order);
    io.to('manager:orders').emit('order:updated', order);
    io.to(`order:${orderId}`).emit('order:updated', order);
    if (order.guest_session_id) io.to(`guest:${order.guest_session_id}`).emit('order:updated', order);
    if (order.user_id) io.to(`user:${order.user_id}`).emit('order:updated', order);
    await createAndEmitOrderNotification(orderId, decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'cancelled', order);
    return res.json({ success: true, order });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Order Approval Error:', err);
    return res.status(500).json({ success: false, message: 'Unable to review order.' });
  } finally {
    client.release();
  }
});

// Manager-only order edits; payment collection remains a separate Staff report and Manager verification flow.
app.patch('/api/orders/:id/adjustment', verifyToken, verifyManager, requireDatabase, async (req, res) => {
  const orderId = req.params.id;
  const { items, action } = req.body || {};
  const client = await db.pool.connect();
  try {
    if (action !== 'adjust') return res.status(400).json({ success: false, message: 'Use the cash collection workflow to report or verify payments.' });
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ success: false, message: 'An order must contain at least one item.' });
    await client.query('BEGIN');
    const currentRes = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [orderId]);
    if (!currentRes.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ success: false, message: 'Order not found.' }); }
    const current = currentRes.rows[0];
    if (current.status === 'cancelled' || current.status === 'served') {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'This order can no longer be edited.' });
    }
    let oldItems = [];
    try { oldItems = JSON.parse(current.items_json || '[]'); } catch {}
    const nextItems = items.map((item) => {
      const name = String(item.name || item.rawName || item.product_name || 'Item').trim().slice(0, 255);
      const qty = Math.max(1, parseInt(item.qty || item.quantity || 1, 10) || 1);
      const price = Math.max(0, Number(item.price) || 0);
      const orderItemId = item.order_item_id || item.orderItemId || crypto.randomUUID();
      const itemId = String(item.originalId || item.item_id || item.id || '');
      return { ...item, id: itemId, item_id: itemId, originalId: item.originalId || itemId,
        order_item_id: orderItemId, name, rawName: name, product_name: name, productName: name,
        item_name: name, qty, quantity: qty, price, size: String(item.size || '').slice(0, 50) };
    });
    const nextTotal = Number(nextItems.reduce((sum, item) => {
      const addonTotal = Array.isArray(item.addons) ? item.addons.reduce((addonSum, addon) => addonSum + (Number(addon.price) || 0), 0) : 0;
      return sum + (item.price + addonTotal) * item.qty;
    }, 0).toFixed(2));
    const paymentStatus = Number(current.amount_already_paid || 0) >= nextTotal ? 'paid' : 'unpaid';
    await client.query('UPDATE orders SET total = $1, items_json = $2, payment_status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4', [nextTotal, JSON.stringify(nextItems), paymentStatus, orderId]);
    await client.query("UPDATE cash_collection_reports SET status = 'voided', review_note = 'Order was modified before cash verification.' WHERE order_id = $1 AND status = 'pending_manager_verification'", [orderId]);
    await client.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
    for (const item of nextItems) {
      await client.query(
        'INSERT INTO order_items (order_id, order_item_id, item_id, name, size, qty, price) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [orderId, item.order_item_id, item.item_id, item.name, item.size, item.qty, item.price]
      );
    }
    await writeOrderAudit(client, req, orderId, 'order_modified',
      { total: Number(current.total), items: oldItems }, { total: nextTotal, items: nextItems });
    await client.query('COMMIT');
    const savedRes = await db.query(getOrdersSelectSql('WHERE o.id = $1', ''), [orderId]);
    const saved = savedRes.rows[0];
    const savedItems = saved.items_json ? JSON.parse(saved.items_json) : nextItems;
    const order = {
      id: saved.id, orderId: saved.id, customer_name: saved.customer_name, customerName: saved.customer_name,
      table: saved.table_name, timestamp: saved.timestamp, total: Number(saved.total),
      amountAlreadyPaid: Number(saved.amount_already_paid) || 0, paymentStatus: saved.payment_status,
      paymentMethod: saved.payment_method,
      status: saved.status, guest_session_id: saved.guest_session_id, user_id: saved.user_id,
      accepted_by_name: saved.accepted_by_name || null, accepted_at: saved.accepted_at,
      completed_by_name: saved.completed_by_name || null, completed_at: saved.completed_at,
      createdAt: saved.created_at, updatedAt: saved.updated_at, items: savedItems
    };
    io.to(`order:${orderId}`).to('staff:orders').emit('order:updated', order);
    io.to('manager:orders').emit('order:updated', order);
    if (order.guest_session_id) io.to(`guest:${order.guest_session_id}`).emit('order:adjusted', order);
    if (order.user_id) io.to(`user:${order.user_id}`).emit('order:adjusted', order);
    return res.json({ success: true, order });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Order Adjustment Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update order payment or items.' });
  } finally {
    client.release();
  }
});

app.post('/api/orders/:id/cash-reports', verifyToken, async (req, res, next) => {
  if (req.user.role !== 'staff') return res.status(403).json({ success: false, message: 'Only Staff can report collected cash.' });
  return next();
}, requireDatabase, async (req, res) => {
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) !== amount * 100) {
    return res.status(400).json({ success: false, message: 'Enter a positive cash amount with up to two decimals.' });
  }
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const orderRes = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!orderRes.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ success: false, message: 'Order not found.' }); }
    const order = orderRes.rows[0];
    if (['pending_manager_approval', 'cancelled'].includes(order.status)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Cash can only be reported for an approved order.' });
    }
    const staffRes = await client.query('SELECT first_name, last_name FROM staff WHERE id = $1', [req.user.id]);
    const staffName = staffRes.rows[0] ? `${staffRes.rows[0].first_name} ${staffRes.rows[0].last_name}`.trim() : req.user.name || 'Staff';
    const insertRes = await client.query(
      `INSERT INTO cash_collection_reports (order_id, staff_id, staff_name, amount_reported)
       VALUES ($1,$2,$3,$4) RETURNING *`, [order.id, req.user.id, staffName, amount]
    );
    await client.query("UPDATE orders SET payment_status = 'pending_manager_verification', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [order.id]);
    await writeOrderAudit(client, req, order.id, 'cash_collection_reported', null, { reportId: insertRes.rows[0].id, amount, status: 'pending_manager_verification' });
    await client.query('COMMIT');
    const report = { ...insertRes.rows[0], customer_name: order.customer_name, total: Number(order.total), expected_amount: Number(order.total) - Number(order.amount_already_paid || 0) };
    io.to('manager:orders').emit('cash:reported', report);
    return res.status(201).json({ success: true, report });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') return res.status(409).json({ success: false, message: 'A cash collection is already awaiting Manager verification for this order.' });
    console.error('Cash Report Error:', err);
    return res.status(500).json({ success: false, message: 'Unable to record cash collection.' });
  } finally {
    client.release();
  }
});

app.get('/api/cash-reports', verifyToken, requireDatabase, async (req, res) => {
  if (!['staff', 'manager'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Staff or Manager authorization is required.' });
  try {
    const staffFilter = req.user.role === 'staff' ? 'WHERE r.staff_id = $1' : '';
    const params = req.user.role === 'staff' ? [req.user.id] : [];
    const result = await db.query(
      `SELECT r.*, o.customer_name, o.total, o.amount_already_paid, o.payment_status, o.status AS order_status,
              GREATEST(0, o.total - o.amount_already_paid) AS expected_amount
       FROM cash_collection_reports r JOIN orders o ON o.id = r.order_id
       ${staffFilter} ORDER BY r.reported_at DESC`, params
    );
    return res.json({ success: true, reports: result.rows });
  } catch (err) {
    console.error('Get Cash Reports Error:', err);
    return res.status(500).json({ success: false, message: 'Unable to load cash collection reports.' });
  }
});

app.patch('/api/cash-reports/:reportId', verifyToken, verifyManager, requireDatabase, async (req, res) => {
  const decision = String(req.body?.decision || '').toLowerCase();
  if (!['verify', 'flag', 'refund'].includes(decision)) return res.status(400).json({ success: false, message: 'Choose verify, flag, or refund.' });
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const reportRes = await client.query('SELECT * FROM cash_collection_reports WHERE id = $1 FOR UPDATE', [req.params.reportId]);
    if (!reportRes.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ success: false, message: 'Cash report not found.' }); }
    const report = reportRes.rows[0];
    const orderRes = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [report.order_id]);
    if (!orderRes.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ success: false, message: 'Order not found.' }); }
    const order = orderRes.rows[0];
    const managerRes = await client.query('SELECT first_name,last_name FROM managers WHERE id = $1', [req.user.id]);
    const managerName = managerRes.rows[0] ? `${managerRes.rows[0].first_name} ${managerRes.rows[0].last_name}`.trim() : 'Manager';
    let nextPaymentStatus;
    let reportStatus;
    let action;
    let nextAmountAlreadyPaid = Number(order.amount_already_paid) || 0;
    if (decision === 'verify' || decision === 'flag') {
      if (report.status !== 'pending_manager_verification') {
        await client.query('ROLLBACK');
        return res.status(409).json({ success: false, message: 'This cash report has already been reviewed.' });
      }
      const expected = Number((Number(order.total) - Number(order.amount_already_paid || 0)).toFixed(2));
      if (decision === 'flag' || Number(report.amount_reported) !== expected) {
        reportStatus = 'payment_discrepancy';
        nextPaymentStatus = 'payment_discrepancy';
        action = 'cash_discrepancy_flagged';
      } else {
        reportStatus = 'verified';
        nextPaymentStatus = 'paid';
        action = 'cash_payment_verified';
        nextAmountAlreadyPaid = Number((nextAmountAlreadyPaid + Number(report.amount_reported)).toFixed(2));
      }
    } else {
      if (report.status !== 'verified') {
        await client.query('ROLLBACK');
        return res.status(409).json({ success: false, message: 'Only a verified cash payment can be refunded.' });
      }
      reportStatus = 'refunded';
      nextPaymentStatus = 'refunded';
      action = 'cash_refunded';
      nextAmountAlreadyPaid = Number(Math.max(0, nextAmountAlreadyPaid - Number(report.amount_reported)).toFixed(2));
    }
    const updatedReport = await client.query(
      `UPDATE cash_collection_reports SET status = $1, reviewed_by_id = $2, reviewed_by_name = $3,
       reviewed_at = CURRENT_TIMESTAMP, review_note = $4 WHERE id = $5 RETURNING *`,
      [reportStatus, req.user.id, managerName, String(req.body?.note || '').slice(0, 500), report.id]
    );
    await client.query('UPDATE orders SET amount_already_paid = $1, payment_status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', [nextAmountAlreadyPaid, nextPaymentStatus, order.id]);
    await writeOrderAudit(client, req, order.id, action,
      { reportId: report.id, paymentStatus: order.payment_status, amountAlreadyPaid: Number(order.amount_already_paid) || 0 },
      { reportId: report.id, reportStatus, paymentStatus: nextPaymentStatus, amountReported: Number(report.amount_reported) });
    await client.query('COMMIT');
    const payload = {
      ...updatedReport.rows[0], orderId: order.id, customer_name: order.customer_name,
      total: Number(order.total), paymentStatus: nextPaymentStatus,
      amountAlreadyPaid: nextAmountAlreadyPaid
    };
    io.to('manager:orders').emit('cash:updated', payload);
    io.to('staff:orders').emit('cash:updated', payload);
    io.to(`order:${order.id}`).emit('cash:updated', payload);
    if (order.guest_session_id) io.to(`guest:${order.guest_session_id}`).emit('cash:updated', payload);
    if (order.user_id) io.to(`user:${order.user_id}`).emit('cash:updated', payload);
    const updatedOrder = { id: order.id, orderId: order.id, paymentStatus: nextPaymentStatus, amountAlreadyPaid: payload.amountAlreadyPaid };
    io.to('staff:orders').to('manager:orders').to(`order:${order.id}`).emit('order:updated', updatedOrder);
    if (order.guest_session_id) io.to(`guest:${order.guest_session_id}`).emit('order:updated', updatedOrder);
    if (order.user_id) io.to(`user:${order.user_id}`).emit('order:updated', updatedOrder);
    return res.json({ success: true, report: payload, discrepancy: reportStatus === 'payment_discrepancy' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Cash Review Error:', err);
    return res.status(500).json({ success: false, message: 'Unable to review cash payment.' });
  } finally {
    client.release();
  }
});

app.get('/api/cash-reconciliation', verifyToken, verifyManager, requireDatabase, async (req, res) => {
  try {
    const [summary, staffTotals, lastClose, reports] = await Promise.all([
      db.query(`SELECT
        COALESCE(SUM(amount_reported) FILTER (WHERE status <> 'voided'),0) AS reported_total,
        COALESCE(SUM(amount_reported) FILTER (WHERE status = 'verified'),0) AS verified_total,
        COUNT(*) FILTER (WHERE status = 'pending_manager_verification') AS pending_count,
        COUNT(*) FILTER (WHERE status = 'payment_discrepancy') AS discrepancy_count
        FROM cash_collection_reports`),
      db.query(`SELECT staff_id, staff_name,
        COALESCE(SUM(amount_reported) FILTER (WHERE status <> 'voided'),0) AS reported,
        COALESCE(SUM(amount_reported) FILTER (WHERE status = 'verified'),0) AS verified
        FROM cash_collection_reports GROUP BY staff_id, staff_name ORDER BY staff_name`),
      db.query('SELECT closed_at, closing_cash FROM cash_reconciliations ORDER BY closed_at DESC LIMIT 1'),
      db.query(`SELECT r.*, o.customer_name, o.total,
        GREATEST(0,o.total-o.amount_already_paid) AS expected_amount
        FROM cash_collection_reports r JOIN orders o ON o.id=r.order_id
        WHERE r.status IN ('pending_manager_verification','payment_discrepancy') ORDER BY r.reported_at`)
    ]);
    return res.json({ success: true, summary: summary.rows[0], staffTotals: staffTotals.rows, lastClose: lastClose.rows[0] || null, reports: reports.rows });
  } catch (err) {
    console.error('Cash Reconciliation Fetch Error:', err);
    return res.status(500).json({ success: false, message: 'Unable to load cash reconciliation.' });
  }
});

app.post('/api/cash-reconciliation', verifyToken, verifyManager, requireDatabase, async (req, res) => {
  const openingCash = Number(req.body?.openingCash);
  const closingCash = Number(req.body?.closingCash);
  if (![openingCash, closingCash].every((value) => Number.isFinite(value) && value >= 0 && Math.round(value * 100) === value * 100)) {
    return res.status(400).json({ success: false, message: 'Enter valid opening and closing cash amounts.' });
  }
  try {
    const lastRes = await db.query('SELECT closed_at FROM cash_reconciliations ORDER BY closed_at DESC LIMIT 1');
    const openedAt = lastRes.rows[0]?.closed_at || new Date(new Date().setHours(0, 0, 0, 0));
    const [amountsRes, managerRes] = await Promise.all([
      db.query(`SELECT
        COALESCE(SUM(amount_reported) FILTER (WHERE status <> 'voided'),0) AS reported,
        COALESCE(SUM(amount_reported) FILTER (WHERE status = 'verified'),0) AS verified
        FROM cash_collection_reports WHERE reported_at > $1`, [openedAt]),
      db.query('SELECT first_name,last_name FROM managers WHERE id = $1', [req.user.id])
    ]);
    const amounts = amountsRes.rows[0];
    const expectedCash = Number((openingCash + Number(amounts.verified || 0)).toFixed(2));
    const variance = Number((closingCash - expectedCash).toFixed(2));
    const managerName = managerRes.rows[0] ? `${managerRes.rows[0].first_name} ${managerRes.rows[0].last_name}`.trim() : 'Manager';
    const saved = await db.query(
      `INSERT INTO cash_reconciliations (manager_id, manager_name, opened_at, opening_cash, closing_cash, expected_cash, reported_cash, verified_cash, variance, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [req.user.id, managerName, openedAt, openingCash, closingCash, expectedCash, Number(amounts.reported || 0), Number(amounts.verified || 0), variance, String(req.body?.note || '').slice(0, 500)]
    );
    await writeOrderAudit(db, req, null, 'cash_reconciliation_closed', null, saved.rows[0]);
    io.to('manager:orders').emit('cash:reconciled', saved.rows[0]);
    return res.status(201).json({ success: true, reconciliation: saved.rows[0] });
  } catch (err) {
    console.error('Cash Reconciliation Save Error:', err);
    return res.status(500).json({ success: false, message: 'Unable to save cash reconciliation.' });
  }
});

app.get('/api/order-audit', verifyToken, verifyManager, requireDatabase, async (req, res) => {
  try {
    const orderId = req.query.orderId || null;
    const result = await db.query(
      `SELECT * FROM order_audit_log WHERE ($1::varchar IS NULL OR order_id = $1) ORDER BY created_at DESC LIMIT 300`, [orderId]
    );
    return res.json({ success: true, audit: result.rows });
  } catch (err) {
    console.error('Order Audit Fetch Error:', err);
    return res.status(500).json({ success: false, message: 'Unable to load the audit log.' });
  }
});

// Update fulfillment status only. Approval and cancellation use Manager-only actions.
app.patch('/api/orders/:id', requireDatabase, verifyToken, async (req, res) => {
  const orderId = req.params.id;
  const { status: rawStatus, staffName: clientStaffName } = req.body;
  if (!['staff', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Staff or manager authorization is required.' });
  }
  if (req.user.role === 'staff' && !['preparing', 'ready', 'served', 'completed', 'accepted'].includes(rawStatus)) {
    return res.status(403).json({ success: false, message: 'Staff cannot approve, cancel, or change payment status.' });
  }

  if (!rawStatus) {
    return res.status(400).json({ success: false, message: 'Status is required.' });
  }

  const status = rawStatus === 'completed' ? 'served' : rawStatus === 'accepted' ? 'preparing' : rawStatus;
  if (!['preparing', 'ready', 'served'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Unsupported order status.' });
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

      const validTransition = status === 'preparing'
        ? ['approved', 'preparing'].includes(currentOrder.status)
        : status === 'ready'
          ? ['preparing', 'ready'].includes(currentOrder.status)
          : ['ready', 'served'].includes(currentOrder.status);
      if (!validTransition) {
        const conflictAccId = currentOrder.accepted_by_staff_id || currentOrder.accepted_by_id || null;
        const conflictCompId = currentOrder.completed_by_staff_id || currentOrder.completed_by_id || null;
        const conflictPayload = {
          id: orderId,
          orderId,
          status: currentOrder.status,
          accepted_by_id: conflictAccId,
          accepted_by_staff_id: conflictAccId,
          accepted_by_name: currentOrder.accepted_by_name || null,
          accepted_at: currentOrder.accepted_at,
          completed_by_id: conflictCompId,
          completed_by_staff_id: conflictCompId,
          completed_by_name: currentOrder.completed_by_name || null,
          completed_at: currentOrder.completed_at
        };
        // Broadcast current state to ensure all staff queues stay synchronized
        io.to('staff:orders').emit('order:status_updated', conflictPayload);
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
        // Query database to retrieve exact registered full display name
        try {
          if (req.user && req.user.role === 'manager') {
            const mgRes = await db.query('SELECT first_name, last_name FROM managers WHERE id = $1', [authenticatedStaffId]);
            if (mgRes.rows.length > 0) {
              const mgRow = mgRes.rows[0];
              authenticatedStaffName = `${mgRow.first_name || ''} ${mgRow.last_name || ''}`.trim();
            }
          } else {
            const stRes = await db.query('SELECT first_name, last_name, username FROM staff WHERE id = $1', [authenticatedStaffId]);
            if (stRes.rows.length > 0) {
              const stRow = stRes.rows[0];
              authenticatedStaffName = `${stRow.first_name || ''} ${stRow.last_name || ''}`.trim() || stRow.username;
            }
          }
        } catch (err) {
          console.warn('Error fetching authenticated staff name from DB:', err.message);
        }
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
        // Record registered staff who accepted order (without overwriting if already set)
        if (authenticatedStaffId || authenticatedStaffName) {
          if (!currentOrder.accepted_by_name && !currentOrder.accepted_by_id && !currentOrder.accepted_by_staff_id) {
            updateSql += `, accepted_by_id = $${paramIdx++}, accepted_by_staff_id = $${paramIdx++}, accepted_by_name = $${paramIdx++}, accepted_at = CURRENT_TIMESTAMP`;
            params.push(authenticatedStaffId, authenticatedStaffId, authenticatedStaffName);
          }
        }
      } else if (status === 'served') {
        // Record registered staff who completed order (without overwriting accepted_by_*)
        if (authenticatedStaffId || authenticatedStaffName) {
          updateSql += `, completed_by_id = $${paramIdx++}, completed_by_staff_id = $${paramIdx++}, completed_by_name = $${paramIdx++}, completed_at = CURRENT_TIMESTAMP`;
          params.push(authenticatedStaffId, authenticatedStaffId, authenticatedStaffName);
        }
      }

      updateSql += ' WHERE id = $2 RETURNING *';

      const updateRes = await db.query(updateSql, params);
      if (updateRes.rows.length > 0) {
        const row = updateRes.rows[0];
        updatedAt = new Date(row.updated_at).toISOString();

        // Query with full JOINs to guarantee authentic display names
        const refetchRes = await db.query(getOrdersSelectSql('WHERE o.id = $1', ''), [orderId]);
        const finalRow = refetchRes.rows.length > 0 ? refetchRes.rows[0] : row;

        const accId = finalRow.accepted_by_staff_id || finalRow.accepted_by_id || null;
        const compId = finalRow.completed_by_staff_id || finalRow.completed_by_id || null;

        updatedOrder = {
          id: finalRow.id,
          orderId: finalRow.id,
          status: finalRow.status,
          table: finalRow.table_name,
          total: parseFloat(finalRow.total),
          paymentMethod: finalRow.payment_method,
          paymentStatus: finalRow.payment_status || 'unpaid',
          amountAlreadyPaid: Number(finalRow.amount_already_paid) || 0,
          customer_name: finalRow.customer_name || null,
          customerName: finalRow.customer_name || null,
          guest_session_id: finalRow.guest_session_id,
          user_id: finalRow.user_id,
          accepted_by_id: accId,
          accepted_by_staff_id: accId,
          accepted_by_name: finalRow.accepted_by_name || null,
          accepted_at: finalRow.accepted_at,
          completed_by_id: compId,
          completed_by_staff_id: compId,
          completed_by_name: finalRow.completed_by_name || null,
          completed_at: finalRow.completed_at,
          updatedAt
        };
      }
      await writeOrderAudit(db, req, orderId, 'order_status_updated', { status: currentOrder.status }, { status });
      console.log(`💾 [DB] Order ${orderId} updated to ${status} by ${authenticatedStaffName || 'Staff'}`);
    }

    if (memoryOrdersMap.has(orderId)) {
      const memOrder = memoryOrdersMap.get(orderId);
      memOrder.status = status;
      memOrder.updatedAt = updatedAt;
      if (status === 'preparing') {
        if (!memOrder.accepted_by_name) {
          memOrder.accepted_by_id = authenticatedStaffId;
          memOrder.accepted_by_staff_id = authenticatedStaffId;
          memOrder.accepted_by_name = authenticatedStaffName;
          memOrder.accepted_at = updatedAt;
        }
      } else if (status === 'served') {
        memOrder.completed_by_id = authenticatedStaffId;
        memOrder.completed_by_staff_id = authenticatedStaffId;
        memOrder.completed_by_name = authenticatedStaffName;
        memOrder.completed_at = updatedAt;
      }
    }

    const payload = updatedOrder || memoryOrdersMap.get(orderId) || {
      id: orderId,
      orderId,
      status,
      accepted_by_id: status === 'preparing' ? authenticatedStaffId : null,
      accepted_by_staff_id: status === 'preparing' ? authenticatedStaffId : null,
      accepted_by_name: status === 'preparing' ? (authenticatedStaffName || clientStaffName || null) : null,
      accepted_at: status === 'preparing' ? updatedAt : null,
      completed_by_id: status === 'served' ? authenticatedStaffId : null,
      completed_by_staff_id: status === 'served' ? authenticatedStaffId : null,
      completed_by_name: status === 'served' ? (authenticatedStaffName || clientStaffName || null) : null,
      completed_at: status === 'served' ? updatedAt : null,
      updatedAt
    };

    // 1. Emit targeted status update to order room and staff room
    io.to(`order:${orderId}`).to('staff:orders').emit('order:status_updated', payload);
    if (payload.guest_session_id) {
      io.to(`guest:${payload.guest_session_id}`).emit('order:status_updated', payload);
    }
    if (payload.user_id) {
      io.to(`user:${payload.user_id}`).emit('order:status_updated', payload);
    }

    // 2. Emit updated staff presence and live order counts
    getStaffOnDutyWithStats().then((list) => {
      io.emit('staff:presence', list);
    });

    // 3. Create and emit persistent lifecycle notification
    await createAndEmitOrderNotification(orderId, status, payload);

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

// ==================== REAL-TIME NOTIFICATIONS HELPER ====================
async function createAndEmitOrderNotification(orderId, status, extraData = {}) {
  if (!orderId || !status) return null;

  try {
    let order = null;
    let guestSessionId = extraData.guest_session_id || extraData.guestSessionId || null;
    let userId = extraData.user_id || extraData.userId || null;

    if (db.pool) {
      const ordRes = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
      if (ordRes.rows.length > 0) {
        order = ordRes.rows[0];
        guestSessionId = order.guest_session_id || guestSessionId;
        userId = order.user_id || userId;
      }
    }

    const cleanId = String(orderId).replace(/^#/, '');
    let title = 'Order Update';
    let message = `Order #${cleanId} status is now ${status}.`;

    if (status === 'pending_manager_approval' || status === 'new' || status === 'received') {
      title = 'Order Awaiting Approval';
      message = `Your order #${cleanId} is waiting for Manager approval.`;
    } else if (status === 'approved') {
      title = 'Order Approved';
      message = `Your order #${cleanId} was approved and sent to Staff for preparation.`;
    } else if (status === 'rejected') {
      title = 'Order Not Approved';
      message = `Your order #${cleanId} was not approved. Please contact the cafe for assistance.`;
    } else if (status === 'accepted' || status === 'preparing') {
      title = 'Order Accepted';
      message = 'Your order has been accepted and is being prepared.';
    } else if (status === 'ready') {
      title = 'Your order is ready!';
      message = 'Your order has been crafted and is ready!';
    } else if (status === 'served' || status === 'completed') {
      title = 'Order Served';
      message = 'Your order has been served. Thank you!';
    } else if (status === 'size_change_approved') {
      title = 'Size Change Approved';
      message = `Your requested size change for order #${cleanId} was approved.`;
    } else if (status === 'size_change_rejected') {
      title = 'Size Change Not Approved';
      message = `Your requested size change for order #${cleanId} was not approved. The original size remains on your order.`;
    } else if (status === 'cancelled') {
      title = 'Order Cancelled';
      message = `Order #${cleanId} was cancelled. Please contact staff for assistance.`;
    }

    let notificationRecord = {
      order_id: orderId,
      orderId,
      guest_session_id: guestSessionId,
      user_id: userId,
      status,
      title,
      message,
      is_read: false,
      created_at: new Date().toISOString()
    };
    let shouldEmit = true;

    if (db.pool) {
      try {
        const notifRes = await db.query(
          `INSERT INTO customer_notifications (order_id, guest_session_id, user_id, status, title, message, is_read, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, FALSE, CURRENT_TIMESTAMP)
           ON CONFLICT (order_id, status) DO NOTHING
           RETURNING *`,
          [orderId, guestSessionId, userId, status, title, message]
        );
        if (notifRes.rows.length > 0) {
          const nr = notifRes.rows[0];
          notificationRecord = {
            id: nr.id,
            order_id: nr.order_id,
            orderId: nr.order_id,
            guest_session_id: nr.guest_session_id,
            user_id: nr.user_id,
            status: nr.status,
            title: nr.title,
            message: nr.message,
            is_read: nr.is_read,
            created_at: nr.created_at,
            accepted_by_name: extraData.accepted_by_name || (order ? order.accepted_by_name : null),
            completed_by_name: extraData.completed_by_name || (order ? order.completed_by_name : null)
          };
        } else {
          shouldEmit = false;
        }
      } catch (err) {
        console.warn('Customer notification persistence note:', err.message);
      }
    }

    // Emit targeted notification strictly to owner rooms
    if (!shouldEmit) return notificationRecord;
    io.to(`order:${orderId}`).emit('notification:new', notificationRecord);
    if (guestSessionId) {
      io.to(`guest:${guestSessionId}`).emit('notification:new', notificationRecord);
    }
    if (userId) {
      io.to(`user:${userId}`).emit('notification:new', notificationRecord);
    }

    console.log(`🔔 [Notification] Targeted dispatch for order #${cleanId} (${status})`);
    return notificationRecord;
  } catch (err) {
    console.error('Create Order Notification Error:', err);
    return null;
  }
}

// ==================== CUSTOMER NOTIFICATIONS REST API ====================

// GET /api/notifications - Fetch persistent customer notifications
app.get('/api/notifications', requireDatabase, optionalAuth, async (req, res) => {
  try {
    const guestSessionId = req.headers['x-guest-session'] || req.query.guestSessionId;
    const userId = req.user ? req.user.id : null;

    if (!userId && !guestSessionId) {
      return res.json([]);
    }

    let query = '';
    let params = [];

    if (userId && guestSessionId) {
      query = `SELECT id, order_id as "orderId", status, title, message, is_read as "read", created_at as "timestamp"
               FROM customer_notifications
               WHERE user_id = $1 OR guest_session_id = $2
               ORDER BY created_at DESC LIMIT 50`;
      params = [userId, guestSessionId];
    } else if (userId) {
      query = `SELECT id, order_id as "orderId", status, title, message, is_read as "read", created_at as "timestamp"
               FROM customer_notifications
               WHERE user_id = $1
               ORDER BY created_at DESC LIMIT 50`;
      params = [userId];
    } else {
      query = `SELECT id, order_id as "orderId", status, title, message, is_read as "read", created_at as "timestamp"
               FROM customer_notifications
               WHERE guest_session_id = $1
               ORDER BY created_at DESC LIMIT 50`;
      params = [guestSessionId];
    }

    const result = await db.query(query, params);
    const notifications = result.rows.map((row) => ({
      id: String(row.id),
      key: `${row.orderId}-${row.status}`,
      orderId: row.orderId,
      status: row.status,
      title: row.title,
      message: row.message,
      read: Boolean(row.read),
      timestamp: new Date(row.timestamp).toISOString()
    }));

    return res.json(notifications);
  } catch (err) {
    console.error('Get Notifications Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
});

// PATCH /api/notifications/:id/read - Mark single notification as read
app.patch('/api/notifications/:id/read', requireDatabase, optionalAuth, async (req, res) => {
  try {
    const notifId = req.params.id;
    if (notifId.includes('-')) {
      const [orderId, status] = notifId.split('-');
      await db.query('UPDATE customer_notifications SET is_read = TRUE WHERE order_id = $1 AND status = $2', [orderId, status]);
    } else {
      await db.query('UPDATE customer_notifications SET is_read = TRUE WHERE id = $1', [notifId]);
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Mark Notification Read Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to mark notification as read.' });
  }
});

// PATCH /api/notifications/read-all - Mark all notifications as read
app.patch('/api/notifications/read-all', requireDatabase, optionalAuth, async (req, res) => {
  try {
    const guestSessionId = req.headers['x-guest-session'] || req.body?.guestSessionId;
    const userId = req.user ? req.user.id : null;

    if (userId) {
      await db.query('UPDATE customer_notifications SET is_read = TRUE WHERE user_id = $1', [userId]);
    }
    if (guestSessionId) {
      await db.query('UPDATE customer_notifications SET is_read = TRUE WHERE guest_session_id = $1', [guestSessionId]);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Mark All Notifications Read Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to mark all as read.' });
  }
});

// DELETE /api/notifications - Clear notifications for customer
app.delete('/api/notifications', requireDatabase, optionalAuth, async (req, res) => {
  try {
    const guestSessionId = req.headers['x-guest-session'] || req.query.guestSessionId;
    const userId = req.user ? req.user.id : null;

    if (userId) {
      await db.query('DELETE FROM customer_notifications WHERE user_id = $1', [userId]);
    }
    if (guestSessionId) {
      await db.query('DELETE FROM customer_notifications WHERE guest_session_id = $1', [guestSessionId]);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Clear Notifications Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to clear notifications.' });
  }
});

// Helper: Authenticate and register socket connection
async function registerAuthenticatedSocket(socket, decoded) {
  socket.data.user = decoded;
  socket.data.role = decoded.role;

  if (decoded.role === 'staff' || decoded.role === 'manager') {
    socket.join('staff:orders');
  }
  if (decoded.role === 'manager') socket.join('manager:orders');

  socket.join(`user:${decoded.id}`);

  if (decoded.role === 'staff') {
    let staffName = decoded.name;
    let staffRole = decoded.staffRole || decoded.role || 'Barista';

    if (db.pool) {
      try {
        const stRes = await db.query('SELECT first_name, last_name, username, role FROM staff WHERE id = $1', [decoded.id]);
        if (stRes.rows.length > 0) {
          const st = stRes.rows[0];
          staffName = `${st.first_name || ''} ${st.last_name || ''}`.trim() || st.username;
          staffRole = st.role || staffRole;
        }
      } catch (err) {
        console.warn('Error fetching staff profile for socket auth:', err.message);
      }
    }

    activeStaffSockets.set(socket.id, {
      id: decoded.id,
      name: staffName || decoded.name || 'Staff',
      email: decoded.email,
      role: staffRole,
      loginTime: new Date().toISOString()
    });

    console.log(`[Socket Auth] Staff ${decoded.id} (${staffName || decoded.name || 'Staff'}) connected`);
    getStaffOnDutyWithStats().then((list) => {
      io.emit('staff:presence', list);
    });
  } else if (decoded.role === 'manager') {
    console.log(`[Socket Auth] Manager ${decoded.id} (${decoded.name || 'Manager'}) connected`);
  }
}

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
      registerAuthenticatedSocket(socket, decoded);
    } catch {
      // Invalid token ignored
    }
  }

  if (guestSessionId && typeof guestSessionId === 'string') {
    socket.data.guestSessionId = guestSessionId;
    socket.join(`guest:${guestSessionId}`);
    console.log(`👤 [Socket Auth] Guest session connected: guest:${guestSessionId}`);
  }

  // Dynamic socket authentication handler (allows instant room joining upon login without reconnect race)
  socket.on('authenticate', async (payload) => {
    const rawToken = typeof payload === 'string' ? payload : (payload?.token || null);
    if (!rawToken) return;

    try {
      const decoded = jwt.verify(rawToken, JWT_SECRET || 'scialla_dev_jwt_secret_key_2026');
      await registerAuthenticatedSocket(socket, decoded);
      socket.emit('authenticated', { success: true, user: decoded });
    } catch (err) {
      console.warn('[Socket Auth] Authentication event failed:', err.message);
      socket.emit('authenticated', { success: false, message: 'Invalid token' });
    }
  });

  // Socket logout handler to cleanly remove presence and leave staff rooms
  socket.on('logout', () => {
    if (activeStaffSockets.has(socket.id)) {
      activeStaffSockets.delete(socket.id);
      getStaffOnDutyWithStats().then((list) => {
        io.emit('staff:presence', list);
      });
    }
    socket.leave('staff:orders');
    socket.leave('manager:orders');
    if (socket.data.user?.id) {
      socket.leave(`user:${socket.data.user.id}`);
    }
    socket.data.user = null;
    socket.data.role = null;
    console.log(`🚪 [Socket] Client ${socket.id} signed out`);
  });

  // Dynamic guest session registration handler
  socket.on('register:guest', (guestId) => {
    if (guestId && typeof guestId === 'string') {
      socket.data.guestSessionId = guestId;
      socket.join(`guest:${guestId}`);
      console.log(`👤 [Socket Auth] Dynamic guest session registered: guest:${guestId}`);
    }
  });

  // Customer joins order-specific room for targeted status tracking with server verification
  socket.on('join:order', async (data) => {
    const orderId = typeof data === 'object' ? data.orderId : data;
    const providedGuestId = typeof data === 'object' ? data.guestSessionId : null;
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
          const activeGuestId = socket.data.guestSessionId || providedGuestId;
          if (row.user_id && socket.data.user?.id && row.user_id === socket.data.user.id) {
            isAuthorized = true;
          } else if (row.guest_session_id && activeGuestId && row.guest_session_id === activeGuestId) {
            isAuthorized = true;
            socket.data.guestSessionId = activeGuestId;
            socket.join(`guest:${activeGuestId}`);
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
      if (['staff', 'manager'].includes(socket.data.role)) return;
      const userId = socket.data.user ? socket.data.user.id : null;
      const guestSessionId = socket.data.guestSessionId || orderData.guest_session_id || orderData.guestSessionId || null;
      const fullOrder = await saveOrderToDatabase(orderData, userId, guestSessionId);

      io.to('manager:orders').emit('order:created', fullOrder);
      io.to(`order:${fullOrder.id}`).emit('order:created', fullOrder);
      if (guestSessionId) {
        io.to(`guest:${guestSessionId}`).emit('order:created', fullOrder);
      }
      if (userId) {
        io.to(`user:${userId}`).emit('order:created', fullOrder);
      }
      console.log(`📡 [Socket Event] Created & emitted targeted order:created for ${fullOrder.id}`);

      await writeOrderAudit(db, { user: socket.data.user || null }, fullOrder.id, 'order_created', null, fullOrder);
      // Emit initial lifecycle notification
      createAndEmitOrderNotification(fullOrder.id, 'pending_manager_approval', fullOrder).catch((e) => {
        console.warn('Error emitting initial socket order notification:', e.message);
      });
    } catch (err) {
      console.error('Error processing order:create socket event:', err);
    }
  });

  // Order status update via Socket.IO (Staff / Manager)
  socket.on('order:update_status', async ({ id, status: rawStatus, staffName: clientStaffName }) => {
    if (!id || !rawStatus) return;
    const status = rawStatus === 'completed' ? 'served' : rawStatus === 'accepted' ? 'preparing' : rawStatus;
    if (!['staff', 'manager'].includes(socket.data.role)) return;
    if (!['preparing', 'ready', 'served'].includes(status)) return;

    try {
      let updatedAt = new Date().toISOString();
      let updatedOrder = null;

      if (db.pool) {
        const currentOrderRes = await db.query('SELECT status FROM orders WHERE id = $1', [id]);
        const currentStatus = currentOrderRes.rows[0]?.status;
        const validTransition = status === 'preparing'
          ? ['approved', 'preparing'].includes(currentStatus)
          : status === 'ready'
            ? ['preparing', 'ready'].includes(currentStatus)
            : ['ready', 'served'].includes(currentStatus);
        if (!validTransition) return;
        const staffId = socket.data.user?.id || null;
        let staffName = socket.data.user?.name;

        if (staffId) {
          try {
            if (socket.data.role === 'manager') {
              const mgRes = await db.query('SELECT first_name, last_name FROM managers WHERE id = $1', [staffId]);
              if (mgRes.rows.length > 0) {
                const mgRow = mgRes.rows[0];
                staffName = `${mgRow.first_name || ''} ${mgRow.last_name || ''}`.trim();
              }
            } else {
              const stRes = await db.query('SELECT first_name, last_name, username FROM staff WHERE id = $1', [staffId]);
              if (stRes.rows.length > 0) {
                const stRow = stRes.rows[0];
                staffName = `${stRow.first_name || ''} ${stRow.last_name || ''}`.trim() || stRow.username;
              }
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
          if (staffId || staffName) {
            updateSql += `, accepted_by_id = $${pIdx++}, accepted_by_staff_id = $${pIdx++}, accepted_by_name = $${pIdx++}, accepted_at = CURRENT_TIMESTAMP`;
            params.push(staffId, staffId, staffName);
          }
        } else if (status === 'served') {
          if (staffId || staffName) {
            updateSql += `, completed_by_id = $${pIdx++}, completed_by_staff_id = $${pIdx++}, completed_by_name = $${pIdx++}, completed_at = CURRENT_TIMESTAMP`;
            params.push(staffId, staffId, staffName);
          }
        }

        updateSql += ' WHERE id = $2 RETURNING *';

        const updateRes = await db.query(updateSql, params);
        if (updateRes.rows.length > 0) {
          const row = updateRes.rows[0];
          updatedAt = new Date(row.updated_at).toISOString();

          // Refetch with LEFT JOINs to guarantee joined display names
          const refetchRes = await db.query(getOrdersSelectSql('WHERE o.id = $1', ''), [id]);
          const finalRow = refetchRes.rows.length > 0 ? refetchRes.rows[0] : row;

          const accId = finalRow.accepted_by_staff_id || finalRow.accepted_by_id || null;
          const compId = finalRow.completed_by_staff_id || finalRow.completed_by_id || null;

          updatedOrder = {
            id: finalRow.id,
            orderId: finalRow.id,
            status: finalRow.status,
            table: finalRow.table_name,
            total: parseFloat(finalRow.total),
            paymentMethod: finalRow.payment_method,
            paymentStatus: finalRow.payment_status || 'unpaid',
            amountAlreadyPaid: Number(finalRow.amount_already_paid) || 0,
            customer_name: finalRow.customer_name || null,
            customerName: finalRow.customer_name || null,
            guest_session_id: finalRow.guest_session_id,
            user_id: finalRow.user_id,
            accepted_by_id: accId,
            accepted_by_staff_id: accId,
            accepted_by_name: finalRow.accepted_by_name || null,
            accepted_at: finalRow.accepted_at,
            completed_by_id: compId,
            completed_by_staff_id: compId,
            completed_by_name: finalRow.completed_by_name || null,
            completed_at: finalRow.completed_at,
            updatedAt
          };
        }
        console.log(`💾 [Socket DB] Order ${id} status updated to: ${status}`);
      }

      const currentStaffId = socket.data.user?.id || null;
      const currentStaffName = socket.data.user?.name || clientStaffName || null;

      if (memoryOrdersMap.has(id)) {
        const memOrder = memoryOrdersMap.get(id);
        memOrder.status = status;
        memOrder.updatedAt = updatedAt;
        if (status === 'preparing') {
          if (!memOrder.accepted_by_name) {
            memOrder.accepted_by_id = currentStaffId;
            memOrder.accepted_by_staff_id = currentStaffId;
            memOrder.accepted_by_name = currentStaffName;
            memOrder.accepted_at = updatedAt;
          }
        } else if (status === 'served') {
          memOrder.completed_by_id = currentStaffId;
          memOrder.completed_by_staff_id = currentStaffId;
          memOrder.completed_by_name = currentStaffName;
          memOrder.completed_at = updatedAt;
        }
      }

      const payload = updatedOrder || memoryOrdersMap.get(id) || {
        id,
        orderId: id,
        status,
        accepted_by_id: status === 'preparing' ? currentStaffId : null,
        accepted_by_staff_id: status === 'preparing' ? currentStaffId : null,
        accepted_by_name: status === 'preparing' ? currentStaffName : null,
        accepted_at: status === 'preparing' ? updatedAt : null,
        completed_by_id: status === 'served' ? currentStaffId : null,
        completed_by_staff_id: status === 'served' ? currentStaffId : null,
        completed_by_name: status === 'served' ? currentStaffName : null,
        completed_at: status === 'served' ? updatedAt : null,
        updatedAt
      };

      // Targeted emission strictly to order room, staff room, and owner rooms
      io.to(`order:${id}`).to('staff:orders').emit('order:status_updated', payload);
      if (payload.guest_session_id) {
        io.to(`guest:${payload.guest_session_id}`).emit('order:status_updated', payload);
      }
      if (payload.user_id) {
        io.to(`user:${payload.user_id}`).emit('order:status_updated', payload);
      }
      console.log(`📡 [Socket Event] Targeted order:status_updated for ${id} -> ${status}`);

      // Emit lifecycle notification
      createAndEmitOrderNotification(id, status, payload).catch((e) => {
        console.warn('Error emitting socket order status notification:', e.message);
      });
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

registerCatalogRoutes(app, db, io, { requireDatabase, verifyToken, verifyManager });

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
databaseReady
  .then(() => {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Scialla Production Node Backend listening on 0.0.0.0:${PORT}`);
      console.log(`⚡ Socket.IO Server bound to HTTP server on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('⚠️ [Startup] Database migration encountered an issue:', err.message);
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Scialla Backend listening on 0.0.0.0:${PORT} (recovery mode)`);
    });
  });


