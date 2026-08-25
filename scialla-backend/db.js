const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

// Create PostgreSQL Connection Pool
const connectionString = process.env.DATABASE_URL;

let pool = null;

if (connectionString) {
  pool = new Pool({
    connectionString,
    ssl: isProduction || connectionString.includes('render.com')
      ? { rejectUnauthorized: false }
      : false
  });

  pool.on('connect', () => {
    console.log('✅ PostgreSQL Database connected successfully.');
  });

  pool.on('error', (err) => {
    console.error('❌ Unexpected PostgreSQL Pool Error:', err);
  });
} else {
  console.warn('⚠️ DATABASE_URL environment variable is not defined. Database operations will use fallback memory storage.');
}

module.exports = {
  pool,
  query: async (text, params) => {
    if (!pool) return null;
    return pool.query(text, params);
  }
};
