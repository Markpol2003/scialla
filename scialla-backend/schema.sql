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
    customer_name VARCHAR(100),
    table_name VARCHAR(50) NOT NULL,
    timestamp VARCHAR(50),
    total NUMERIC(10, 2) NOT NULL,
    amount_already_paid NUMERIC(10, 2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending_manager_approval',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
    guest_session_id VARCHAR(64) REFERENCES guest_sessions(id) ON DELETE SET NULL,
    user_id INTEGER,
    items_json TEXT,
    accepted_by_id INTEGER,
    accepted_by_staff_id INTEGER,
    accepted_by_name VARCHAR(150),
    accepted_at TIMESTAMP,
    completed_by_id INTEGER,
    completed_by_staff_id INTEGER,
    completed_by_name VARCHAR(150),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(50) REFERENCES orders(id) ON DELETE CASCADE,
    order_item_id VARCHAR(64) UNIQUE,
    item_id VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    size VARCHAR(50) DEFAULT '',
    qty INTEGER NOT NULL,
    price NUMERIC(10, 2) NOT NULL
);

-- Customer size-change requests are separate from order progress; only managers may review them.
CREATE TABLE IF NOT EXISTS order_size_change_requests (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS order_size_change_requests_order_idx
    ON order_size_change_requests (order_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS order_size_change_requests_status_idx
    ON order_size_change_requests (status, requested_at DESC);

-- Immutable order and cash events used by the Manager audit view.
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
CREATE INDEX IF NOT EXISTS order_audit_log_order_idx ON order_audit_log (order_id, created_at DESC);

-- Staff cash reports remain pending until a Manager verifies them.
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
CREATE UNIQUE INDEX IF NOT EXISTS cash_collection_one_pending_per_order_idx
    ON cash_collection_reports (order_id) WHERE status = 'pending_manager_verification';
CREATE INDEX IF NOT EXISTS cash_collection_status_idx
    ON cash_collection_reports (status, reported_at DESC);

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

