-- Scialla Database Schema for PostgreSQL

-- Managers Table
CREATE TABLE IF NOT EXISTS managers (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staff Table
CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'Staff',
    status VARCHAR(20) DEFAULT 'Active',
    created_by INTEGER REFERENCES managers(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Guest Sessions Table (Anonymous Device / Customer Identification)
CREATE TABLE IF NOT EXISTS guest_sessions (
    id VARCHAR(64) PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(50) PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    timestamp VARCHAR(50),
    total NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'new',
    guest_session_id VARCHAR(64) REFERENCES guest_sessions(id) ON DELETE SET NULL,
    user_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(50) REFERENCES orders(id) ON DELETE CASCADE,
    item_id VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    size VARCHAR(50) DEFAULT '',
    qty INTEGER NOT NULL,
    price NUMERIC(10, 2) NOT NULL
);

-- Password Reset Verification Codes Table
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
);

CREATE INDEX IF NOT EXISTS idx_reset_codes_user_role ON password_reset_codes (user_id, role);
CREATE INDEX IF NOT EXISTS idx_reset_codes_email_role ON password_reset_codes (email, role);
CREATE INDEX IF NOT EXISTS idx_reset_codes_expires_at ON password_reset_codes (expires_at);

-- Customer Notifications Table
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
);

CREATE INDEX IF NOT EXISTS idx_customer_notifs_guest ON customer_notifications (guest_session_id);
CREATE INDEX IF NOT EXISTS idx_customer_notifs_order ON customer_notifications (order_id);

