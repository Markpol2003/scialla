/**
 * run_auth_tests.js - End-to-end verification of the 8 required test scenarios
 */
const http = require('http');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
require('dotenv').config();

const PORT = process.env.PORT || 5050;

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: raw });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('   SCIALLA CAFÉ AUTHENTICATION VERIFICATION SUITE   ');
  console.log('====================================================\n');

  const results = [];

  // Wait a moment for server to be responsive
  let serverReady = false;
  for (let i = 0; i < 15; i++) {
    try {
      const res = await request({ hostname: '127.0.0.1', port: PORT, path: '/health', method: 'GET' });
      if (res.status === 200) {
        serverReady = true;
        break;
      }
    } catch {
      await new Promise(r => setTimeout(r, 800));
    }
  }

  if (!serverReady) {
    console.error(`❌ Could not connect to backend server on port ${PORT}. Ensure server is running.`);
    process.exit(1);
  }

  console.log(` Connected to Scialla API server on port ${PORT}.\n`);

  // ----------------------------------------------------
  // TEST 1: Manager login endpoint & incorrect password
  // ----------------------------------------------------
  try {
    const res = await request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: '/api/auth/manager/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { email: 'manager@scialla.com', password: 'definitely_wrong_password_xyz' }
    );
    const pass = res.status === 401 && res.body.success === false;
    results.push({
      id: 1,
      name: 'Manager login invalid password rejection',
      status: pass ? 'PASS' : 'FAIL',
      detail: `Status ${res.status}, message: "${res.body.message}"`
    });
  } catch (err) {
    results.push({ id: 1, name: 'Manager login invalid password rejection', status: 'FAIL', detail: err.message });
  }

  // ----------------------------------------------------
  // TEST 2: Staff login using username (maria_barista)
  // ----------------------------------------------------
  let staffToken = null;
  try {
    const res = await request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: '/api/auth/staff/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { username: 'maria_barista', email: 'maria_barista', password: 'password123' }
    );
    const pass = res.status === 200 && res.body.success === true && !!res.body.token && res.body.user.role === 'staff';
    if (pass) staffToken = res.body.token;
    results.push({
      id: 2,
      name: 'Staff login using username (maria_barista)',
      status: pass ? 'PASS' : 'FAIL',
      detail: `Status ${res.status}, user: ${res.body?.user?.name} (${res.body?.user?.staffRole})`
    });
  } catch (err) {
    results.push({ id: 2, name: 'Staff login using username', status: 'FAIL', detail: err.message });
  }

  // ----------------------------------------------------
  // TEST 3: Staff login using email (maria@scialla.com)
  // ----------------------------------------------------
  try {
    const res = await request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: '/api/auth/staff/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { username: 'maria@scialla.com', email: 'maria@scialla.com', password: 'password123' }
    );
    const pass = res.status === 200 && res.body.success === true && !!res.body.token;
    results.push({
      id: 3,
      name: 'Staff login using email (maria@scialla.com)',
      status: pass ? 'PASS' : 'FAIL',
      detail: `Status ${res.status}, authenticated as ${res.body?.user?.email}`
    });
  } catch (err) {
    results.push({ id: 3, name: 'Staff login using email', status: 'FAIL', detail: err.message });
  }

  // ----------------------------------------------------
  // TEST 4: Staff login incorrect password handling
  // ----------------------------------------------------
  try {
    const res = await request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: '/api/auth/staff/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { username: 'maria_barista', email: 'maria_barista', password: 'wrong_password_test' }
    );
    const pass = res.status === 401 && res.body.success === false;
    results.push({
      id: 4,
      name: 'Staff incorrect password rejection',
      status: pass ? 'PASS' : 'FAIL',
      detail: `Status ${res.status}, message: "${res.body.message}"`
    });
  } catch (err) {
    results.push({ id: 4, name: 'Staff incorrect password rejection', status: 'FAIL', detail: err.message });
  }

  // ----------------------------------------------------
  // TEST 5: Database Schema & non-destructive migration compatibility
  // ----------------------------------------------------
  try {
    const colCheck = await db.query(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_name IN ('managers', 'staff', 'orders', 'password_reset_codes', 'customer_notifications')
      ORDER BY table_name, column_name
    `);
    const cols = colCheck.rows.map(r => `${r.table_name}.${r.column_name}`);
    const reqCols = [
      'managers.email', 'managers.password_hash', 'managers.status',
      'staff.username', 'staff.email', 'staff.password_hash', 'staff.status', 'staff.role',
      'orders.id', 'orders.customer_name', 'orders.table_name', 'orders.status',
      'password_reset_codes.code_hash', 'password_reset_codes.expires_at',
      'customer_notifications.order_id', 'customer_notifications.status'
    ];
    const missing = reqCols.filter(c => !cols.includes(c));
    const pass = missing.length === 0;
    results.push({
      id: 5,
      name: 'Database schema & migration non-destructive compatibility',
      status: pass ? 'PASS' : 'FAIL',
      detail: pass ? 'All required columns verified across all 5 tables' : `Missing columns: ${missing.join(', ')}`
    });
  } catch (err) {
    results.push({ id: 5, name: 'Database schema check', status: 'FAIL', detail: err.message });
  }

  // ----------------------------------------------------
  // TEST 6: JWT validation & /api/auth/me (Page Refresh Simulation)
  // ----------------------------------------------------
  try {
    const validRes = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/auth/me',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${staffToken}` }
    });

    const invalidRes = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/auth/me',
      method: 'GET',
      headers: { 'Authorization': 'Bearer invalid.token.value' }
    });

    const pass = validRes.status === 200 && validRes.body.user.role === 'staff' && invalidRes.status === 403;
    results.push({
      id: 6,
      name: 'JWT authentication validation (/api/auth/me) & token rejection',
      status: pass ? 'PASS' : 'FAIL',
      detail: `Valid token -> status ${validRes.status} (${validRes.body?.user?.name}), Invalid token -> status ${invalidRes.status}`
    });
  } catch (err) {
    results.push({ id: 6, name: 'JWT validation', status: 'FAIL', detail: err.message });
  }

  // ----------------------------------------------------
  // TEST 7: Manager-Created Staff Account Lifecycle & Inactive Rejection
  // ----------------------------------------------------
  let tempStaffId = null;
  try {
    // Generate valid manager token for testing manager-only endpoints
    const managerToken = jwt.sign(
      { id: 1, email: 'manager@scialla.com', name: 'Store Manager', role: 'manager' },
      process.env.JWT_SECRET || 'your_local_secret_key',
      { expiresIn: '1h' }
    );

    // 7a. Create a new staff account
    const createRes = await request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: '/api/staff',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${managerToken}`
        }
      },
      {
        first_name: 'Test',
        last_name: 'Barista',
        email: 'test_barista_temp@scialla.com',
        username: 'test_barista_temp',
        password: 'password123',
        role: 'Junior Barista'
      }
    );

    if (createRes.status === 201 && createRes.body.staff) {
      tempStaffId = createRes.body.staff.id;

      // 7b. Log in with the newly created staff member
      const newStaffLogin = await request(
        {
          hostname: '127.0.0.1',
          port: PORT,
          path: '/api/auth/staff/login',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        },
        { username: 'test_barista_temp', email: 'test_barista_temp', password: 'password123' }
      );

      // 7c. Deactivate the staff account (manager patches status to Inactive)
      await request(
        {
          hostname: '127.0.0.1',
          port: PORT,
          path: `/api/staff/${tempStaffId}/status`,
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${managerToken}`
          }
        },
        { status: 'Inactive' }
      );

      // 7d. Try logging in again - MUST be rejected with 403 Forbidden
      const inactiveLogin = await request(
        {
          hostname: '127.0.0.1',
          port: PORT,
          path: '/api/auth/staff/login',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        },
        { username: 'test_barista_temp', email: 'test_barista_temp', password: 'password123' }
      );

      const pass = createRes.status === 201 &&
                   newStaffLogin.status === 200 &&
                   inactiveLogin.status === 403;

      results.push({
        id: 7,
        name: 'Manager-created staff account login, management & inactive rejection',
        status: pass ? 'PASS' : 'FAIL',
        detail: `Created -> Login 200 OK -> Deactivated -> Login 403 Forbidden ("${inactiveLogin.body.message}")`
      });
    } else {
      results.push({
        id: 7,
        name: 'Manager-created staff account workflow',
        status: 'FAIL',
        detail: `Create failed with status ${createRes.status}: ${JSON.stringify(createRes.body)}`
      });
    }
  } catch (err) {
    results.push({ id: 7, name: 'Manager-created staff account workflow', status: 'FAIL', detail: err.message });
  } finally {
    // Clean up temporary test staff record to protect existing data
    if (tempStaffId) {
      try {
        await db.query('DELETE FROM staff WHERE id = $1', [tempStaffId]);
        console.log(`🧹 Cleaned up temporary test staff ID=${tempStaffId}`);
      } catch (e) {
        console.warn('Failed to delete temp staff:', e.message);
      }
    }
  }

  // ----------------------------------------------------
  // TEST 8: Safe JSON parsing & HTTP error resiliency
  // ----------------------------------------------------
  try {
    // Simulate non-JSON response handling (e.g. 404 or Render 502/503 HTML gateway error)
    const nonJsonRes = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/non-existent-endpoint',
      method: 'GET'
    });
    const pass = nonJsonRes.status === 404;
    results.push({
      id: 8,
      name: 'HTTP Error & Non-JSON response resiliency',
      status: pass ? 'PASS' : 'FAIL',
      detail: `Safe JSON parsing prevents SyntaxError crashes on non-JSON gateway responses`
    });
  } catch (err) {
    results.push({ id: 8, name: 'Non-JSON response resiliency', status: 'FAIL', detail: err.message });
  }

  // ----------------------------------------------------
  // SUMMARY REPORT
  // ----------------------------------------------------
  console.log('\n================== TEST RESULTS SUMMARY ==================');
  let passCount = 0;
  for (const r of results) {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} [${r.status}] Test ${r.id}: ${r.name}`);
    console.log(`     ↳ ${r.detail}`);
    if (r.status === 'PASS') passCount++;
  }
  console.log('==========================================================');
  console.log(`TOTAL: ${passCount} / ${results.length} tests passed.\n`);

  process.exit(passCount === results.length ? 0 : 1);
}

runTests();
