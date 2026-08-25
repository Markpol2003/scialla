const http = require('http');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { WebSocketServer } = require('ws');
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
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5050',
  'http://127.0.0.1:5173'
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

// ==================== REAL-TIME ORDERS ROUTES ====================

// Get All Orders
app.get('/api/orders', requireDatabase, async (req, res) => {
  try {
    const ordersRes = await db.query('SELECT * FROM orders ORDER BY created_at DESC');
    const itemsRes = await db.query('SELECT * FROM order_items');

    const itemsByOrderId = {};
    itemsRes.rows.forEach(item => {
      if (!itemsByOrderId[item.order_id]) itemsByOrderId[item.order_id] = [];
      itemsByOrderId[item.order_id].push({
        id: item.item_id,
        name: item.name,
        size: item.size || '',
        qty: item.qty,
        price: parseFloat(item.price)
      });
    });

    const formattedOrders = ordersRes.rows.map(o => ({
      id: o.id,
      table: o.table_name,
      timestamp: o.timestamp,
      total: parseFloat(o.total),
      paymentMethod: o.payment_method,
      status: o.status,
      items: itemsByOrderId[o.id] || []
    }));

    return res.json(formattedOrders);
  } catch (err) {
    console.error('Get Orders Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch orders.' });
  }
});

// Create Order (HTTP POST) - Public for Customer Checkout
app.post('/api/orders', requireDatabase, async (req, res) => {
  try {
    const orderData = req.body;
    const orderId = orderData.id || orderData.orderNum || `SC-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder = {
      id: orderId,
      table: orderData.table || 'Table 1',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      items: orderData.items || [],
      total: parseFloat(orderData.total) || 0,
      paymentMethod: orderData.paymentMethod || 'Cash',
      status: 'new'
    };

    await db.query(
      'INSERT INTO orders (id, table_name, timestamp, total, payment_method, status) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING',
      [newOrder.id, newOrder.table, newOrder.timestamp, newOrder.total, newOrder.paymentMethod, newOrder.status]
    );

    for (const item of newOrder.items) {
      const itemSize = item.size || item.selectedSize || '';
      await db.query(
        'INSERT INTO order_items (order_id, item_id, name, size, qty, price) VALUES ($1, $2, $3, $4, $5, $6)',
        [newOrder.id, item.id || null, item.name, itemSize, item.qty || 1, item.price || 0]
      );
    }

    // Broadcast real-time WebSocket update
    broadcast('order:new', newOrder);

    return res.status(201).json({ success: true, order: newOrder });
  } catch (err) {
    console.error('Create Order Error:', err);
    return res.status(400).json({ success: false, message: 'Invalid order payload.' });
  }
});

// Update Order Status (PATCH) - Protected: Requires Authenticated Staff or Manager
app.patch('/api/orders/:id', requireDatabase, verifyToken, async (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, message: 'Status is required.' });
  }

  try {
    await db.query('UPDATE orders SET status = $1 WHERE id = $2', [status, orderId]);

    const updatedOrderPayload = { id: orderId, status };
    broadcast('order:status-changed', updatedOrderPayload);

    return res.json({ success: true, order: updatedOrderPayload });
  } catch (err) {
    console.error('Update Order Status Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update order status.' });
  }
});

// HTTP & WebSocket Server Setup
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

function broadcast(type, data) {
  const payload = JSON.stringify({ type, data });
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // 1 = OPEN
      try {
        client.send(payload);
      } catch (err) {
        // Ignored disconnected client error
      }
    }
  });
}

wss.on('connection', (ws) => {
  ws.on('message', async (messageBuffer) => {
    try {
      const msg = JSON.parse(messageBuffer.toString('utf8'));

      if (msg.type === 'order:create') {
        const orderId = msg.data.id || msg.data.orderNum || `SC-${Math.floor(1000 + Math.random() * 9000)}`;
        const newOrder = {
          id: orderId,
          table: msg.data.table || 'Table 1',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          items: msg.data.items || [],
          total: parseFloat(msg.data.total) || 0,
          paymentMethod: msg.data.paymentMethod || 'Cash',
          status: 'new'
        };

        if (db.pool) {
          await db.query(
            'INSERT INTO orders (id, table_name, timestamp, total, payment_method, status) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING',
            [newOrder.id, newOrder.table, newOrder.timestamp, newOrder.total, newOrder.paymentMethod, newOrder.status]
          );

          for (const item of newOrder.items) {
            const itemSize = item.size || item.selectedSize || '';
            await db.query(
              'INSERT INTO order_items (order_id, item_id, name, size, qty, price) VALUES ($1, $2, $3, $4, $5, $6)',
              [newOrder.id, item.id || null, item.name, itemSize, item.qty || 1, item.price || 0]
            );
          }
        }

        broadcast('order:new', newOrder);
      } else if (msg.type === 'stock:toggle') {
        broadcast('stock:updated', msg.data);
      }
    } catch (e) {
      console.error('WebSocket Message Processing Error:', e);
    }
  });
});

// Start Server listening on process.env.PORT || 10000 on 0.0.0.0
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Scialla Production Node Backend listening on 0.0.0.0:${PORT}`);
  console.log(`⚡ WebSocket Server bound to same HTTP port`);
});
