-- IT-Engineering Collaboration Dashboard Database Schema
-- SQLite version

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS notification_preferences;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS glossary_history;
DROP TABLE IF EXISTS glossary_terms;
DROP TABLE IF EXISTS glossary_categories;
DROP TABLE IF EXISTS user_quick_links;
DROP TABLE IF EXISTS quick_links;
DROP TABLE IF EXISTS user_locations;
DROP TABLE IF EXISTS check_in_records;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS equipment;
DROP TABLE IF EXISTS task_history;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS project_members;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS event_attendees;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;

-- Also drop old tables from previous schema
DROP TABLE IF EXISTS bugs;
DROP TABLE IF EXISTS developers;
DROP TABLE IF EXISTS projects;

-- 1. Users & Authentication

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    department TEXT NOT NULL CHECK (department IN ('IT', 'Engineering', 'Both')),
    role TEXT NOT NULL CHECK (role IN ('Admin', 'Member', 'Viewer')),
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    last_login TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- 2. Projects

CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    created_by TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);

CREATE TABLE IF NOT EXISTS project_members (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    added_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);

-- 2. Calendar & Events

CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL CHECK (event_type IN ('deadline', 'meeting', 'delivery')),
    event_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT,
    location TEXT,
    meeting_url TEXT,
    created_by TEXT NOT NULL,
    department TEXT CHECK (department IN ('IT', 'Engineering', 'Both')),
    is_recurring INTEGER DEFAULT 0,
    recurrence_rule TEXT,
    parent_event_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (parent_event_id) REFERENCES events(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);

CREATE TABLE IF NOT EXISTS event_attendees (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    added_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_attendees_event ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user ON event_attendees(user_id);

-- 3. Task Management

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    urgency TEXT NOT NULL CHECK (urgency IN ('urgent', 'high', 'medium', 'low')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
    is_completed INTEGER DEFAULT 0,
    department TEXT NOT NULL CHECK (department IN ('IT', 'Engineering', 'Both')),
    project_id TEXT,
    assignee_id TEXT,
    created_by TEXT NOT NULL,
    deadline TEXT NOT NULL,
    completed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_urgency ON tasks(urgency);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(is_completed);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);

CREATE TABLE IF NOT EXISTS task_history (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'status_changed', 'deleted')),
    field_changed TEXT,
    old_value TEXT,
    new_value TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_task_history_task ON task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_history_user ON task_history(user_id);
CREATE INDEX IF NOT EXISTS idx_task_history_created ON task_history(created_at);

-- 4. Equipment & Bookings

CREATE TABLE IF NOT EXISTS equipment (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'booked', 'in-use', 'maintenance')),
    serial_number TEXT UNIQUE,
    purchase_date TEXT,
    last_maintenance TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_equipment_category ON equipment(category);

CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    equipment_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    department TEXT NOT NULL CHECK (department IN ('IT', 'Engineering', 'Both')),
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    purpose TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    cancelled_at TEXT,
    FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_bookings_equipment ON bookings(equipment_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- 5. Location Tracking

CREATE TABLE IF NOT EXISTS check_in_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    location TEXT NOT NULL,
    check_in_time TEXT NOT NULL,
    check_out_time TEXT,
    notes TEXT,
    device_type TEXT DEFAULT 'desktop' CHECK (device_type IN ('desktop', 'mobile')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_checkin_user ON check_in_records(user_id);
CREATE INDEX IF NOT EXISTS idx_checkin_time ON check_in_records(check_in_time);
CREATE INDEX IF NOT EXISTS idx_checkin_location ON check_in_records(location);

CREATE TABLE IF NOT EXISTS user_locations (
    user_id TEXT PRIMARY KEY,
    location TEXT,
    last_check_in TEXT,
    is_checked_in INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Quick Links

CREATE TABLE IF NOT EXISTS quick_links (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    meeting_datetime TEXT,
    created_by TEXT NOT NULL,
    department TEXT CHECK (department IN ('IT', 'Engineering', 'Both')),
    is_recurring INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_quicklinks_creator ON quick_links(created_by);
CREATE INDEX IF NOT EXISTS idx_quicklinks_department ON quick_links(department);
CREATE INDEX IF NOT EXISTS idx_quicklinks_active ON quick_links(is_active);

CREATE TABLE IF NOT EXISTS user_quick_links (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    quick_link_id TEXT NOT NULL,
    is_pinned INTEGER DEFAULT 0,
    custom_label TEXT,
    added_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (quick_link_id) REFERENCES quick_links(id) ON DELETE CASCADE,
    UNIQUE (user_id, quick_link_id)
);

CREATE INDEX IF NOT EXISTS idx_user_links_user ON user_quick_links(user_id);

-- 7. Glossary

CREATE TABLE IF NOT EXISTS glossary_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_category_id TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (parent_category_id) REFERENCES glossary_categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_glossary_cat_parent ON glossary_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_glossary_cat_order ON glossary_categories(display_order);

CREATE TABLE IF NOT EXISTS glossary_terms (
    id TEXT PRIMARY KEY,
    acronym TEXT NOT NULL,
    full_name TEXT NOT NULL,
    definition TEXT,
    category_id TEXT,
    parent_term_id TEXT,
    created_by TEXT NOT NULL,
    approved_by TEXT,
    is_approved INTEGER DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES glossary_categories(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_term_id) REFERENCES glossary_terms(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_glossary_acronym ON glossary_terms(acronym);
CREATE INDEX IF NOT EXISTS idx_glossary_category ON glossary_terms(category_id);
CREATE INDEX IF NOT EXISTS idx_glossary_approved ON glossary_terms(is_approved);

CREATE TABLE IF NOT EXISTS glossary_history (
    id TEXT PRIMARY KEY,
    term_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'approved', 'deleted')),
    old_value TEXT,
    new_value TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (term_id) REFERENCES glossary_terms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_glossary_history_term ON glossary_history(term_id);
CREATE INDEX IF NOT EXISTS idx_glossary_history_created ON glossary_history(created_at);

-- 8. Notifications

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('urgent', 'meeting', 'shipping', 'info', 'success')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_entity_type TEXT,
    related_entity_id TEXT,
    is_read INTEGER DEFAULT 0,
    read_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

CREATE TABLE IF NOT EXISTS notification_preferences (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    notification_type TEXT NOT NULL,
    is_enabled INTEGER DEFAULT 1,
    delivery_method TEXT DEFAULT 'in-app' CHECK (delivery_method IN ('in-app', 'email', 'both')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_notif_prefs_user ON notification_preferences(user_id);

-- Insert a default admin user (password: admin123)
-- Note: In production, use proper password hashing
INSERT OR IGNORE INTO users (id, email, password_hash, first_name, last_name, department, role, is_active)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'admin@company.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4edaM6ANVzCPKqC.',
    'Admin',
    'User',
    'Both',
    'Admin',
    1
);

-- =====================================================
-- DEMO DATA FOR PROTOTYPE DEMONSTRATION
-- =====================================================

-- Additional demo users (password for all: password123)
INSERT OR IGNORE INTO users (id, email, password_hash, first_name, last_name, department, role, is_active)
VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'michael.chen@company.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4edaM6ANVzCPKqC.', 'Michael', 'Chen', 'Engineering', 'Member', 1),
    ('550e8400-e29b-41d4-a716-446655440002', 'sarah.johnson@company.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4edaM6ANVzCPKqC.', 'Sarah', 'Johnson', 'Engineering', 'Member', 1),
    ('550e8400-e29b-41d4-a716-446655440003', 'david.park@company.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4edaM6ANVzCPKqC.', 'David', 'Park', 'Engineering', 'Member', 1),
    ('550e8400-e29b-41d4-a716-446655440004', 'emily.rodriguez@company.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4edaM6ANVzCPKqC.', 'Emily', 'Rodriguez', 'IT', 'Member', 1),
    ('550e8400-e29b-41d4-a716-446655440005', 'james.wilson@company.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4edaM6ANVzCPKqC.', 'James', 'Wilson', 'IT', 'Member', 1),
    ('550e8400-e29b-41d4-a716-446655440006', 'lisa.anderson@company.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4edaM6ANVzCPKqC.', 'Lisa', 'Anderson', 'Engineering', 'Member', 1),
    ('550e8400-e29b-41d4-a716-446655440007', 'robert.martinez@company.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4edaM6ANVzCPKqC.', 'Robert', 'Martinez', 'IT', 'Admin', 1),
    ('550e8400-e29b-41d4-a716-446655440008', 'jennifer.lee@company.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4edaM6ANVzCPKqC.', 'Jennifer', 'Lee', 'Both', 'Member', 1),
    ('550e8400-e29b-41d4-a716-446655440009', 'william.taylor@company.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4edaM6ANVzCPKqC.', 'William', 'Taylor', 'Engineering', 'Viewer', 1);

-- Demo Projects
INSERT OR IGNORE INTO projects (id, name, description, status, created_by, created_at)
VALUES 
    ('a1234567-89ab-4cde-8001-000000000001', 'Building Automation Upgrade', 'Upgrade the BMS system across all facilities with new HVAC controls and IoT sensors', 'active', '550e8400-e29b-41d4-a716-446655440000', '2025-11-01 09:00:00'),
    ('a1234567-89ab-4cde-8002-000000000002', 'Network Infrastructure Modernization', 'Replace legacy network equipment and implement SD-WAN across all sites', 'active', '550e8400-e29b-41d4-a716-446655440007', '2025-11-15 10:00:00'),
    ('a1234567-89ab-4cde-8003-000000000003', 'Energy Efficiency Initiative', 'Implement energy monitoring and optimization across manufacturing facilities', 'active', '550e8400-e29b-41d4-a716-446655440001', '2025-10-01 08:00:00');

-- Project Members
INSERT OR IGNORE INTO project_members (id, project_id, user_id, role, added_at)
VALUES 
    -- Building Automation Upgrade team
    ('b1234567-89ab-4cde-8001-000000000001', 'a1234567-89ab-4cde-8001-000000000001', '550e8400-e29b-41d4-a716-446655440000', 'owner', '2025-11-01 09:00:00'),
    ('b1234567-89ab-4cde-8001-000000000002', 'a1234567-89ab-4cde-8001-000000000001', '550e8400-e29b-41d4-a716-446655440001', 'admin', '2025-11-01 09:00:00'),
    ('b1234567-89ab-4cde-8001-000000000003', 'a1234567-89ab-4cde-8001-000000000001', '550e8400-e29b-41d4-a716-446655440003', 'member', '2025-11-02 10:00:00'),
    ('b1234567-89ab-4cde-8001-000000000004', 'a1234567-89ab-4cde-8001-000000000001', '550e8400-e29b-41d4-a716-446655440006', 'member', '2025-11-03 11:00:00'),
    -- Network Infrastructure team
    ('b1234567-89ab-4cde-8002-000000000001', 'a1234567-89ab-4cde-8002-000000000002', '550e8400-e29b-41d4-a716-446655440007', 'owner', '2025-11-15 10:00:00'),
    ('b1234567-89ab-4cde-8002-000000000002', 'a1234567-89ab-4cde-8002-000000000002', '550e8400-e29b-41d4-a716-446655440004', 'admin', '2025-11-15 10:00:00'),
    ('b1234567-89ab-4cde-8002-000000000003', 'a1234567-89ab-4cde-8002-000000000002', '550e8400-e29b-41d4-a716-446655440005', 'member', '2025-11-16 09:00:00'),
    -- Energy Efficiency team
    ('b1234567-89ab-4cde-8003-000000000001', 'a1234567-89ab-4cde-8003-000000000003', '550e8400-e29b-41d4-a716-446655440001', 'owner', '2025-10-01 08:00:00'),
    ('b1234567-89ab-4cde-8003-000000000002', 'a1234567-89ab-4cde-8003-000000000003', '550e8400-e29b-41d4-a716-446655440002', 'admin', '2025-10-01 08:00:00'),
    ('b1234567-89ab-4cde-8003-000000000003', 'a1234567-89ab-4cde-8003-000000000003', '550e8400-e29b-41d4-a716-446655440008', 'member', '2025-10-02 09:00:00');

-- Insert sample equipment
INSERT OR IGNORE INTO equipment (id, name, category, status, serial_number, notes)
VALUES 
    ('cf9e6679-7425-40de-944b-e07fc1f90aec', 'Oscilloscope OSC-2000', 'Testing', 'available', 'OSC2000-12345', 'High-precision digital oscilloscope'),
    ('df9e6679-7425-40de-944b-e07fc1f90aed', 'Network Analyzer NA-500', 'Testing', 'available', 'NA500-67890', 'RF network analyzer 9kHz-6GHz'),
    ('ef9e6679-7425-40de-944b-e07fc1f90aee', 'Power Supply PS-1000', 'Power', 'available', 'PS1000-11111', 'Programmable DC power supply'),
    ('c1234567-89ab-4cde-9001-000000000001', 'Thermal Imaging Camera TIC-300', 'Diagnostic', 'available', 'TIC300-22222', 'FLIR thermal camera for electrical inspections'),
    ('c1234567-89ab-4cde-9002-000000000002', 'Digital Multimeter DMM-PRO', 'Testing', 'available', 'DMM-33333', 'Precision multimeter with data logging'),
    ('c1234567-89ab-4cde-9003-000000000003', 'Fiber Optic Tester FOT-100', 'Network', 'booked', 'FOT100-44444', 'OTDR for fiber testing'),
    ('c1234567-89ab-4cde-9004-000000000004', 'Cable Tester CT-2000', 'Network', 'available', 'CT2000-55555', 'Cat5/6/7 cable certifier'),
    ('c1234567-89ab-4cde-9005-000000000005', 'Spectrum Analyzer SA-600', 'Testing', 'maintenance', 'SA600-66666', 'RF spectrum analyzer - calibration due'),
    ('c1234567-89ab-4cde-9006-000000000006', 'Air Quality Monitor AQM-50', 'Environmental', 'available', 'AQM50-77777', 'CO2, PM2.5, temperature, humidity monitoring'),
    ('c1234567-89ab-4cde-9007-000000000007', 'Pressure Calibrator PC-100', 'Calibration', 'available', 'PC100-88888', 'Precision pressure calibrator 0-300 PSI'),
    ('c1234567-89ab-4cde-9008-000000000008', 'Data Logger DL-8CH', 'Monitoring', 'in-use', 'DL8CH-99999', '8-channel temperature/voltage logger'),
    ('c1234567-89ab-4cde-9009-000000000009', 'Clamp Meter CM-400', 'Electrical', 'available', 'CM400-10101', 'AC/DC clamp meter up to 400A'),
    ('c1234567-89ab-4cde-9010-000000000010', 'Vibration Analyzer VA-200', 'Diagnostic', 'available', 'VA200-20202', 'Portable vibration analyzer for motor diagnostics');

-- Equipment Bookings
INSERT OR IGNORE INTO bookings (id, equipment_id, user_id, department, start_date, end_date, purpose, status)
VALUES 
    ('d1234567-89ab-4cde-a001-000000000001', 'c1234567-89ab-4cde-9003-000000000003', '550e8400-e29b-41d4-a716-446655440005', 'IT', '2025-12-02', '2025-12-06', 'Fiber installation in Building B', 'active'),
    ('d1234567-89ab-4cde-a002-000000000002', 'cf9e6679-7425-40de-944b-e07fc1f90aec', '550e8400-e29b-41d4-a716-446655440001', 'Engineering', '2025-12-05', '2025-12-07', 'PLC signal testing', 'active'),
    ('d1234567-89ab-4cde-a003-000000000003', 'c1234567-89ab-4cde-9008-000000000008', '550e8400-e29b-41d4-a716-446655440002', 'Engineering', '2025-12-01', '2025-12-15', 'HVAC performance monitoring', 'active'),
    ('d1234567-89ab-4cde-a004-000000000004', 'c1234567-89ab-4cde-9001-000000000001', '550e8400-e29b-41d4-a716-446655440003', 'Engineering', '2025-12-10', '2025-12-11', 'Electrical panel thermal scan', 'active'),
    ('d1234567-89ab-4cde-a005-000000000005', 'df9e6679-7425-40de-944b-e07fc1f90aed', '550e8400-e29b-41d4-a716-446655440004', 'IT', '2025-12-08', '2025-12-09', 'Wireless site survey', 'active'),
    ('d1234567-89ab-4cde-a006-000000000006', 'c1234567-89ab-4cde-9010-000000000010', '550e8400-e29b-41d4-a716-446655440006', 'Engineering', '2025-12-12', '2025-12-13', 'Motor bearing analysis', 'active'),
    ('d1234567-89ab-4cde-a007-000000000007', 'c1234567-89ab-4cde-9006-000000000006', '550e8400-e29b-41d4-a716-446655440008', 'Both', '2025-12-15', '2025-12-20', 'Indoor air quality assessment', 'active'),
    -- Completed bookings
    ('d1234567-89ab-4cde-a008-000000000008', 'c1234567-89ab-4cde-9004-000000000004', '550e8400-e29b-41d4-a716-446655440005', 'IT', '2025-11-25', '2025-11-27', 'New cable installation certification', 'completed'),
    ('d1234567-89ab-4cde-a009-000000000009', 'c1234567-89ab-4cde-9007-000000000007', '550e8400-e29b-41d4-a716-446655440001', 'Engineering', '2025-11-28', '2025-11-29', 'Pressure transmitter calibration', 'completed');

-- Insert sample glossary categories
INSERT OR IGNORE INTO glossary_categories (id, name, display_order)
VALUES 
    ('e1234567-89ab-4cde-b001-000000000001', 'IT', 1),
    ('e1234567-89ab-4cde-b002-000000000002', 'Engineering', 2),
    ('e1234567-89ab-4cde-b003-000000000003', 'General', 3);

-- Full Glossary Terms from CSV
-- IT Terms
INSERT OR IGNORE INTO glossary_terms (id, acronym, full_name, definition, category_id, created_by, is_approved)
VALUES 
    ('f1234567-89ab-4cde-c001-000000000001', 'API', 'Application Programming Interface', 'A set of protocols and tools for building software applications that specify how software components should interact', 'e1234567-89ab-4cde-b001-000000000001', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c001-000000000002', 'REST', 'Representational State Transfer', 'An architectural style for designing networked applications using HTTP requests to access and manipulate data', 'e1234567-89ab-4cde-b001-000000000001', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c001-000000000003', 'CI/CD', 'Continuous Integration/Continuous Deployment', 'Development practices that automate building, testing, and deploying code changes', 'e1234567-89ab-4cde-b001-000000000001', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c001-000000000004', 'JWT', 'JSON Web Token', 'A compact, URL-safe token format used for securely transmitting information between parties as a JSON object', 'e1234567-89ab-4cde-b001-000000000001', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c001-000000000005', 'OAuth', 'Open Authorization', 'An open standard for access delegation, commonly used for token-based authentication', 'e1234567-89ab-4cde-b001-000000000001', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c001-000000000006', 'DNS', 'Domain Name System', 'The hierarchical naming system that translates human-readable domain names into IP addresses', 'e1234567-89ab-4cde-b001-000000000001', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c001-000000000007', 'HTTPS', 'Hypertext Transfer Protocol Secure', 'An encrypted version of HTTP that uses TLS/SSL for secure communication', 'e1234567-89ab-4cde-b001-000000000001', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c001-000000000008', 'SQL', 'Structured Query Language', 'A programming language used to manage and manipulate relational databases', 'e1234567-89ab-4cde-b001-000000000001', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c001-000000000009', 'NoSQL', 'NoSQL', 'Non-relational database systems designed for distributed data stores with flexible schemas and horizontal scaling', 'e1234567-89ab-4cde-b001-000000000001', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c001-000000000010', 'SSH', 'Secure Shell', 'A cryptographic network protocol for secure remote login and command execution over an unsecured network', 'e1234567-89ab-4cde-b001-000000000001', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c001-000000000011', 'VPN', 'Virtual Private Network', 'A technology that creates a secure, encrypted connection over a less secure network', 'e1234567-89ab-4cde-b001-000000000001', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c001-000000000012', 'IoT', 'Internet of Things', 'A network of physical devices embedded with sensors and software that connect and exchange data', 'e1234567-89ab-4cde-b001-000000000001', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c001-000000000013', 'CDN', 'Content Delivery Network', 'A geographically distributed group of servers that work together to provide fast delivery of internet content', 'e1234567-89ab-4cde-b001-000000000001', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c001-000000000014', 'CORS', 'Cross-Origin Resource Sharing', 'A security feature that allows or restricts web applications from making requests to different domains', 'e1234567-89ab-4cde-b001-000000000001', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c001-000000000015', 'WebSocket', 'WebSocket', 'A communication protocol that provides full-duplex communication channels over a single TCP connection', 'e1234567-89ab-4cde-b001-000000000001', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c001-000000000016', 'CRUD', 'Create, Read, Update, Delete', 'The four basic operations for persistent storage in database applications', 'e1234567-89ab-4cde-b001-000000000001', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c001-000000000017', 'MFA', 'Multi-Factor Authentication', 'A security system requiring multiple methods of authentication to verify user identity', 'e1234567-89ab-4cde-b001-000000000001', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c001-000000000018', 'SDK', 'Software Development Kit', 'A collection of software tools and libraries used to develop applications for specific platforms', 'e1234567-89ab-4cde-b001-000000000001', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c001-000000000019', 'IDE', 'Integrated Development Environment', 'A software application providing comprehensive facilities for software development', 'e1234567-89ab-4cde-b001-000000000001', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c001-000000000020', 'DevOps', 'Development Operations', 'A set of practices combining software development and IT operations to shorten development cycles', 'e1234567-89ab-4cde-b001-000000000001', '550e8400-e29b-41d4-a716-446655440000', 1);

-- Engineering Terms
INSERT OR IGNORE INTO glossary_terms (id, acronym, full_name, definition, category_id, created_by, is_approved)
VALUES 
    ('f1234567-89ab-4cde-c002-000000000001', 'SCADA', 'Supervisory Control and Data Acquisition', 'A control system architecture used for high-level process supervisory management in industrial facilities', 'e1234567-89ab-4cde-b002-000000000002', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c002-000000000002', 'PLC', 'Programmable Logic Controller', 'An industrial computer used to automate manufacturing processes and machinery control', 'e1234567-89ab-4cde-b002-000000000002', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c002-000000000003', 'HMI', 'Human-Machine Interface', 'A user interface that connects an operator to the controller for industrial equipment', 'e1234567-89ab-4cde-b002-000000000002', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c002-000000000004', 'BMS', 'Building Management System', 'A computer-based control system that monitors and manages mechanical and electrical equipment in buildings', 'e1234567-89ab-4cde-b002-000000000002', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c002-000000000005', 'HVAC', 'Heating, Ventilation, and Air Conditioning', 'Technology for indoor environmental comfort through thermal regulation and air quality', 'e1234567-89ab-4cde-b002-000000000002', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c002-000000000006', 'AHU', 'Air Handling Unit', 'A device used to regulate and circulate air as part of an HVAC system', 'e1234567-89ab-4cde-b002-000000000002', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c002-000000000007', 'VAV', 'Variable Air Volume', 'An HVAC system that varies the airflow at a constant temperature to meet zone requirements', 'e1234567-89ab-4cde-b002-000000000002', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c002-000000000008', 'FCU', 'Fan Coil Unit', 'A simple device consisting of a heating/cooling coil and a fan used for temperature control', 'e1234567-89ab-4cde-b002-000000000002', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c002-000000000009', 'VFD', 'Variable Frequency Drive', 'A motor controller that drives an electric motor by varying the frequency and voltage of its power supply', 'e1234567-89ab-4cde-b002-000000000002', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c002-000000000010', 'RTU', 'Remote Terminal Unit', 'A microprocessor-controlled electronic device that interfaces sensors to SCADA systems', 'e1234567-89ab-4cde-b002-000000000002', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c002-000000000011', 'DCS', 'Distributed Control System', 'A computerized control system for industrial processes with distributed control elements', 'e1234567-89ab-4cde-b002-000000000002', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c002-000000000012', 'P&ID', 'Piping and Instrumentation Diagram', 'A detailed diagram showing process equipment, instrumentation, and piping', 'e1234567-89ab-4cde-b002-000000000002', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c002-000000000013', 'CAD', 'Computer-Aided Design', 'Software used to create precision drawings or technical illustrations', 'e1234567-89ab-4cde-b002-000000000002', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c002-000000000014', 'BIM', 'Building Information Modeling', 'A digital representation of physical and functional characteristics of a building', 'e1234567-89ab-4cde-b002-000000000002', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c002-000000000015', 'MEP', 'Mechanical, Electrical, and Plumbing', 'Core building systems that ensure functionality and occupant comfort', 'e1234567-89ab-4cde-b002-000000000002', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c002-000000000016', 'EMS', 'Energy Management System', 'A system of computer-aided tools to monitor, control, and optimize energy consumption', 'e1234567-89ab-4cde-b002-000000000002', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c002-000000000017', 'OAT', 'Outside Air Temperature', 'The temperature of the outdoor ambient air measured for HVAC control purposes', 'e1234567-89ab-4cde-b002-000000000002', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c002-000000000018', 'SAT', 'Supply Air Temperature', 'The temperature of air leaving an air handling unit or cooling/heating coil', 'e1234567-89ab-4cde-b002-000000000002', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c002-000000000019', 'RAT', 'Return Air Temperature', 'The temperature of air returning to the air handling unit from conditioned spaces', 'e1234567-89ab-4cde-b002-000000000002', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c002-000000000020', 'MAT', 'Mixed Air Temperature', 'The temperature of the mixture of return air and outside air in an HVAC system', 'e1234567-89ab-4cde-b002-000000000002', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c002-000000000021', 'DP', 'Differential Pressure', 'The difference in pressure between two points, used for monitoring filters and airflow', 'e1234567-89ab-4cde-b002-000000000002', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c002-000000000022', 'CFM', 'Cubic Feet per Minute', 'A measurement of airflow volume used in HVAC system design and operation', 'e1234567-89ab-4cde-b002-000000000002', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c002-000000000023', 'BTU', 'British Thermal Unit', 'A unit of heat energy commonly used to measure heating and cooling capacity', 'e1234567-89ab-4cde-b002-000000000002', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c002-000000000024', 'kW', 'Kilowatt', 'A unit of electrical power equal to 1000 watts, used to measure energy consumption', 'e1234567-89ab-4cde-b002-000000000002', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('f1234567-89ab-4cde-c002-000000000025', 'PPM', 'Parts Per Million', 'A unit of measurement for concentration, commonly used for air quality and water quality monitoring', 'e1234567-89ab-4cde-b002-000000000002', '550e8400-e29b-41d4-a716-446655440000', 1);

-- Insert sample tasks
-- Daily tasks from November 25 to December 10, 2024
-- Projects: proj-0001 (Building Automation), proj-0002 (Network Infrastructure), proj-0003 (Energy Efficiency)

-- November 25
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1125-4001-8001-000000000001', 'Review BMS sensor data', 'Analyze temperature sensor readings from Building A', 'medium', 'completed', 1, 'Engineering', 'a1234567-89ab-4cde-8001-000000000001', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', '2025-11-25', '2025-11-24 09:00:00'),
    ('a1b2c3d4-1125-4001-8001-000000000002', 'Update firewall rules', 'Add new rules for vendor VPN access', 'high', 'completed', 1, 'IT', 'a1234567-89ab-4cde-8002-000000000002', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440007', '2025-11-25', '2025-11-24 10:00:00'),
    ('a1b2c3d4-1125-4001-8001-000000000003', 'Calibrate pressure sensors', 'Monthly calibration of differential pressure sensors', 'medium', 'completed', 1, 'Engineering', NULL, '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '2025-11-25', '2025-11-24 11:00:00');

-- November 26
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1126-4001-8001-000000000001', 'Network switch replacement', 'Replace aging switch in Server Room B', 'urgent', 'completed', 1, 'IT', 'a1234567-89ab-4cde-8002-000000000002', '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440007', '2025-11-26', '2025-11-25 08:00:00'),
    ('a1b2c3d4-1126-4001-8001-000000000002', 'HVAC filter inspection', 'Inspect and document filter conditions in AHU-1 through AHU-4', 'low', 'completed', 1, 'Engineering', 'a1234567-89ab-4cde-8001-000000000001', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '2025-11-26', '2025-11-25 09:00:00'),
    ('a1b2c3d4-1126-4001-8001-000000000003', 'Update server documentation', 'Document new server configurations', 'low', 'completed', 1, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', '2025-11-26', '2025-11-25 10:00:00'),
    ('a1b2c3d4-1126-4001-8001-000000000004', 'Test backup generators', 'Monthly backup generator test run', 'high', 'completed', 1, 'Engineering', NULL, '550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440001', '2025-11-26', '2025-11-25 11:00:00');

-- November 27
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1127-4001-8001-000000000001', 'Deploy monitoring agents', 'Install monitoring agents on new workstations', 'medium', 'completed', 1, 'IT', 'a1234567-89ab-4cde-8002-000000000002', '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440007', '2025-11-27', '2025-11-26 09:00:00'),
    ('a1b2c3d4-1127-4001-8001-000000000002', 'VFD programming update', 'Update VFD parameters for AHU-3 supply fan', 'high', 'completed', 1, 'Engineering', 'a1234567-89ab-4cde-8001-000000000001', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '2025-11-27', '2025-11-26 10:00:00'),
    ('a1b2c3d4-1127-4001-8001-000000000003', 'Security patch deployment', 'Deploy November security patches to all servers', 'urgent', 'completed', 1, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440007', '2025-11-27', '2025-11-26 11:00:00');

-- November 28 (Thanksgiving - lighter workload)
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1128-4001-8001-000000000001', 'Emergency on-call coverage', 'Holiday on-call system monitoring', 'high', 'completed', 1, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440000', '2025-11-28', '2025-11-27 08:00:00'),
    ('a1b2c3d4-1128-4001-8001-000000000002', 'Building system check', 'Holiday building automation verification', 'medium', 'completed', 1, 'Engineering', 'a1234567-89ab-4cde-8001-000000000001', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', '2025-11-28', '2025-11-27 09:00:00');

-- November 29
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1129-4001-8001-000000000001', 'Post-holiday system verification', 'Verify all systems operational after holiday', 'high', 'completed', 1, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440007', '2025-11-29', '2025-11-28 08:00:00'),
    ('a1b2c3d4-1129-4001-8001-000000000002', 'Chiller performance review', 'Review chiller efficiency data from the week', 'medium', 'completed', 1, 'Engineering', 'a1234567-89ab-4cde-8003-000000000003', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '2025-11-29', '2025-11-28 09:00:00'),
    ('a1b2c3d4-1129-4001-8001-000000000003', 'User access audit', 'Quarterly user access rights review', 'medium', 'completed', 1, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440000', '2025-11-29', '2025-11-28 10:00:00'),
    ('a1b2c3d4-1129-4001-8001-000000000004', 'Update P&ID drawings', 'Update piping diagrams for recent modifications', 'low', 'completed', 1, 'Engineering', 'a1234567-89ab-4cde-8001-000000000001', '550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440001', '2025-11-29', '2025-11-28 11:00:00');

-- November 30
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1130-4001-8001-000000000001', 'Backup verification', 'Verify weekend backup completion', 'high', 'completed', 1, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440007', '2025-11-30', '2025-11-29 08:00:00'),
    ('a1b2c3d4-1130-4001-8001-000000000002', 'Energy report generation', 'Generate monthly energy consumption report', 'medium', 'completed', 1, 'Engineering', 'a1234567-89ab-4cde-8003-000000000003', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '2025-11-30', '2025-11-29 09:00:00'),
    ('a1b2c3d4-1130-4001-8001-000000000003', 'Review vendor proposals', 'Review proposals for new network equipment', 'medium', 'completed', 1, 'IT', 'a1234567-89ab-4cde-8002-000000000002', '550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440000', '2025-11-30', '2025-11-29 10:00:00');

-- December 1
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1201-4001-8001-000000000001', 'Monthly system maintenance', 'First of month scheduled maintenance window', 'high', 'completed', 1, 'IT', 'a1234567-89ab-4cde-8002-000000000002', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440007', '2025-12-01', '2025-11-30 08:00:00'),
    ('a1b2c3d4-1201-4001-8001-000000000002', 'Update control setpoints', 'Adjust temperature setpoints for winter operation', 'medium', 'completed', 1, 'Engineering', 'a1234567-89ab-4cde-8001-000000000001', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '2025-12-01', '2025-11-30 09:00:00'),
    ('a1b2c3d4-1201-4001-8001-000000000003', 'SSL certificate renewal', 'Renew SSL certificates expiring this month', 'urgent', 'completed', 1, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440007', '2025-12-01', '2025-11-30 10:00:00');

-- December 2
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1202-4001-8001-000000000001', 'Network topology update', 'Update network diagrams with new switches', 'medium', 'completed', 1, 'IT', 'a1234567-89ab-4cde-8002-000000000002', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440007', '2025-12-02', '2025-12-01 09:00:00'),
    ('a1b2c3d4-1202-4001-8001-000000000002', 'PLC firmware update', 'Update PLC firmware in Substation 2', 'high', 'completed', 1, 'Engineering', 'a1234567-89ab-4cde-8001-000000000001', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '2025-12-02', '2025-12-01 10:00:00'),
    ('a1b2c3d4-1202-4001-8001-000000000003', 'User training session', 'New employee IT orientation', 'low', 'completed', 1, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440000', '2025-12-02', '2025-12-01 11:00:00'),
    ('a1b2c3d4-1202-4001-8001-000000000004', 'Check valve inspection', 'Inspect check valves in cooling system', 'medium', 'completed', 1, 'Engineering', NULL, '550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440001', '2025-12-02', '2025-12-01 12:00:00');

-- December 3
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1203-4001-8001-000000000001', 'Backup recovery test', 'Test disaster recovery procedures', 'high', 'completed', 1, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440007', '2025-12-03', '2025-12-02 09:00:00'),
    ('a1b2c3d4-1203-4001-8001-000000000002', 'Sensor calibration batch', 'Calibrate flow sensors in Plant B', 'medium', 'completed', 1, 'Engineering', 'a1234567-89ab-4cde-8003-000000000003', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '2025-12-03', '2025-12-02 10:00:00'),
    ('a1b2c3d4-1203-4001-8001-000000000003', 'Software license audit', 'Verify all software licenses current', 'medium', 'completed', 1, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440000', '2025-12-03', '2025-12-02 11:00:00');

-- December 4
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1204-4001-8001-000000000001', 'SCADA system backup', 'Weekly SCADA configuration backup', 'high', 'in-progress', 0, 'Engineering', 'a1234567-89ab-4cde-8001-000000000001', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '2025-12-04', '2025-12-03 09:00:00'),
    ('a1b2c3d4-1204-4001-8001-000000000002', 'Firewall rule review', 'Monthly firewall rule audit', 'high', 'in-progress', 0, 'IT', 'a1234567-89ab-4cde-8002-000000000002', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440007', '2025-12-04', '2025-12-03 10:00:00'),
    ('a1b2c3d4-1204-4001-8001-000000000003', 'Pump seal replacement', 'Replace worn seals on cooling pump 3', 'urgent', 'in-progress', 0, 'Engineering', NULL, '550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440001', '2025-12-04', '2025-12-03 11:00:00'),
    ('a1b2c3d4-1204-4001-8001-000000000004', 'VPN configuration', 'Configure VPN for new remote workers', 'medium', 'in-progress', 0, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440007', '2025-12-04', '2025-12-03 12:00:00');

-- December 5
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1205-4001-8001-000000000001', 'Server patching', 'Apply security patches to production servers', 'urgent', 'pending', 0, 'IT', 'a1234567-89ab-4cde-8002-000000000002', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440007', '2025-12-05', '2025-12-04 09:00:00'),
    ('a1b2c3d4-1205-4001-8001-000000000002', 'Motor bearing inspection', 'Inspect bearings on exhaust fan motors', 'medium', 'pending', 0, 'Engineering', 'a1234567-89ab-4cde-8003-000000000003', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '2025-12-05', '2025-12-04 10:00:00'),
    ('a1b2c3d4-1205-4001-8001-000000000003', 'Database optimization', 'Run monthly database maintenance scripts', 'medium', 'pending', 0, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440007', '2025-12-05', '2025-12-04 11:00:00');

-- December 6
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1206-4001-8001-000000000001', 'Control panel inspection', 'Inspect electrical control panels', 'medium', 'pending', 0, 'Engineering', 'a1234567-89ab-4cde-8001-000000000001', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '2025-12-06', '2025-12-05 09:00:00'),
    ('a1b2c3d4-1206-4001-8001-000000000002', 'Email server maintenance', 'Exchange server maintenance window', 'high', 'pending', 0, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440007', '2025-12-06', '2025-12-05 10:00:00'),
    ('a1b2c3d4-1206-4001-8001-000000000003', 'Update HMI graphics', 'Update HMI screens for new equipment', 'low', 'pending', 0, 'Engineering', 'a1234567-89ab-4cde-8001-000000000001', '550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440001', '2025-12-06', '2025-12-05 11:00:00'),
    ('a1b2c3d4-1206-4001-8001-000000000004', 'Workstation deployment', 'Deploy 5 new workstations to Engineering', 'medium', 'pending', 0, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440000', '2025-12-06', '2025-12-05 12:00:00');

-- December 7
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1207-4001-8001-000000000001', 'Weekend monitoring check', 'Verify weekend monitoring systems', 'high', 'pending', 0, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440007', '2025-12-07', '2025-12-06 08:00:00'),
    ('a1b2c3d4-1207-4001-8001-000000000002', 'HVAC schedule adjustment', 'Adjust weekend HVAC schedules', 'low', 'pending', 0, 'Engineering', 'a1234567-89ab-4cde-8001-000000000001', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '2025-12-07', '2025-12-06 09:00:00');

-- December 8
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1208-4001-8001-000000000001', 'System health check', 'Sunday system health verification', 'medium', 'pending', 0, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440007', '2025-12-08', '2025-12-07 08:00:00'),
    ('a1b2c3d4-1208-4001-8001-000000000002', 'Building walkthrough', 'Weekend building inspection', 'low', 'pending', 0, 'Engineering', NULL, '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', '2025-12-08', '2025-12-07 09:00:00');

-- December 9
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1209-4001-8001-000000000001', 'Weekly project review', 'Review project status and priorities', 'medium', 'pending', 0, 'Both', NULL, '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', '2025-12-09', '2025-12-08 09:00:00'),
    ('a1b2c3d4-1209-4001-8001-000000000002', 'RTU programming update', 'Update RTU configuration for new sensors', 'high', 'pending', 0, 'Engineering', 'a1234567-89ab-4cde-8001-000000000001', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '2025-12-09', '2025-12-08 10:00:00'),
    ('a1b2c3d4-1209-4001-8001-000000000003', 'Printer fleet update', 'Update firmware on network printers', 'low', 'pending', 0, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440007', '2025-12-09', '2025-12-08 11:00:00'),
    ('a1b2c3d4-1209-4001-8001-000000000004', 'Pipe insulation check', 'Inspect pipe insulation in mechanical room', 'medium', 'pending', 0, 'Engineering', 'a1234567-89ab-4cde-8003-000000000003', '550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440001', '2025-12-09', '2025-12-08 12:00:00');

-- December 10
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1210-4001-8001-000000000001', 'Network performance report', 'Generate monthly network performance metrics', 'medium', 'pending', 0, 'IT', 'a1234567-89ab-4cde-8002-000000000002', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440007', '2025-12-10', '2025-12-09 09:00:00'),
    ('a1b2c3d4-1210-4001-8001-000000000002', 'VFD maintenance', 'Preventive maintenance on VFDs', 'high', 'pending', 0, 'Engineering', 'a1234567-89ab-4cde-8001-000000000001', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '2025-12-10', '2025-12-09 10:00:00'),
    ('a1b2c3d4-1210-4001-8001-000000000003', 'Active Directory cleanup', 'Remove inactive user accounts', 'medium', 'pending', 0, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440000', '2025-12-10', '2025-12-09 11:00:00');

-- December 11
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1211-4001-8001-000000000001', 'BACnet integration testing', 'Test BACnet communication with new controllers', 'high', 'pending', 0, 'Engineering', 'a1234567-89ab-4cde-8001-000000000001', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '2025-12-11', '2025-12-10 09:00:00'),
    ('a1b2c3d4-1211-4001-8001-000000000002', 'Antivirus definition update', 'Push latest antivirus definitions to all endpoints', 'medium', 'pending', 0, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440007', '2025-12-11', '2025-12-10 10:00:00'),
    ('a1b2c3d4-1211-4001-8001-000000000003', 'Chiller water treatment', 'Monthly water treatment for chiller system', 'medium', 'pending', 0, 'Engineering', 'a1234567-89ab-4cde-8003-000000000003', '550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440001', '2025-12-11', '2025-12-10 11:00:00');

-- December 12
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1212-4001-8001-000000000001', 'SD-WAN configuration review', 'Review SD-WAN policies and optimize routing', 'high', 'pending', 0, 'IT', 'a1234567-89ab-4cde-8002-000000000002', '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440007', '2025-12-12', '2025-12-11 09:00:00'),
    ('a1b2c3d4-1212-4001-8001-000000000002', 'Cooling tower inspection', 'Quarterly cooling tower inspection and cleaning', 'medium', 'pending', 0, 'Engineering', 'a1234567-89ab-4cde-8003-000000000003', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '2025-12-12', '2025-12-11 10:00:00'),
    ('a1b2c3d4-1212-4001-8001-000000000003', 'Print server migration', 'Migrate print services to new server', 'medium', 'pending', 0, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', '2025-12-12', '2025-12-11 11:00:00'),
    ('a1b2c3d4-1212-4001-8001-000000000004', 'Emergency lighting test', 'Monthly emergency lighting system test', 'low', 'pending', 0, 'Engineering', NULL, '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '2025-12-12', '2025-12-11 12:00:00');

-- December 13 (Saturday - lighter workload)
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1213-4001-8001-000000000001', 'Weekend system monitoring', 'Monitor critical systems over weekend', 'high', 'pending', 0, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440007', '2025-12-13', '2025-12-12 08:00:00'),
    ('a1b2c3d4-1213-4001-8001-000000000002', 'BMS trending review', 'Review BMS data trends for the week', 'low', 'pending', 0, 'Engineering', 'a1234567-89ab-4cde-8001-000000000001', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '2025-12-13', '2025-12-12 09:00:00');

-- December 14 (Sunday - minimal workload)
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1214-4001-8001-000000000001', 'On-call coverage', 'Sunday on-call monitoring shift', 'medium', 'pending', 0, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440007', '2025-12-14', '2025-12-13 08:00:00');

-- December 15
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1215-4001-8001-000000000001', 'Weekly status meeting prep', 'Prepare status reports for weekly review', 'medium', 'pending', 0, 'Both', NULL, '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', '2025-12-15', '2025-12-14 09:00:00'),
    ('a1b2c3d4-1215-4001-8001-000000000002', 'IoT sensor deployment', 'Deploy new IoT sensors in Building C', 'high', 'pending', 0, 'Engineering', 'a1234567-89ab-4cde-8001-000000000001', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '2025-12-15', '2025-12-14 10:00:00'),
    ('a1b2c3d4-1215-4001-8001-000000000003', 'DNS server update', 'Update DNS records for new services', 'medium', 'pending', 0, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440007', '2025-12-15', '2025-12-14 11:00:00'),
    ('a1b2c3d4-1215-4001-8001-000000000004', 'Air quality monitoring setup', 'Configure new air quality monitors', 'medium', 'pending', 0, 'Engineering', 'a1234567-89ab-4cde-8003-000000000003', '550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440001', '2025-12-15', '2025-12-14 12:00:00');

-- December 16
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1216-4001-8001-000000000001', 'Network switch firmware update', 'Update firmware on core switches', 'high', 'pending', 0, 'IT', 'a1234567-89ab-4cde-8002-000000000002', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440007', '2025-12-16', '2025-12-15 09:00:00'),
    ('a1b2c3d4-1216-4001-8001-000000000002', 'Damper actuator replacement', 'Replace faulty damper actuators in AHU-2', 'urgent', 'pending', 0, 'Engineering', 'a1234567-89ab-4cde-8001-000000000001', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '2025-12-16', '2025-12-15 10:00:00'),
    ('a1b2c3d4-1216-4001-8001-000000000003', 'Security camera audit', 'Audit security camera coverage and functionality', 'medium', 'pending', 0, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440000', '2025-12-16', '2025-12-15 11:00:00');

-- December 17
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1217-4001-8001-000000000001', 'Firewall log analysis', 'Analyze firewall logs for security threats', 'high', 'pending', 0, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440007', '2025-12-17', '2025-12-16 09:00:00'),
    ('a1b2c3d4-1217-4001-8001-000000000002', 'Economizer calibration', 'Calibrate economizer controls for winter', 'medium', 'pending', 0, 'Engineering', 'a1234567-89ab-4cde-8001-000000000001', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '2025-12-17', '2025-12-16 10:00:00'),
    ('a1b2c3d4-1217-4001-8001-000000000003', 'UPS battery check', 'Check UPS battery health across all sites', 'high', 'pending', 0, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440007', '2025-12-17', '2025-12-16 11:00:00'),
    ('a1b2c3d4-1217-4001-8001-000000000004', 'Steam trap inspection', 'Inspect steam traps in heating system', 'medium', 'pending', 0, 'Engineering', NULL, '550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440001', '2025-12-17', '2025-12-16 12:00:00');

-- December 18
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1218-4001-8001-000000000001', 'Year-end IT asset inventory', 'Complete year-end IT asset inventory', 'high', 'pending', 0, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', '2025-12-18', '2025-12-17 09:00:00'),
    ('a1b2c3d4-1218-4001-8001-000000000002', 'Fire suppression system test', 'Annual fire suppression system testing', 'urgent', 'pending', 0, 'Engineering', NULL, '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '2025-12-18', '2025-12-17 10:00:00'),
    ('a1b2c3d4-1218-4001-8001-000000000003', 'Backup tape rotation', 'Rotate backup tapes for offsite storage', 'medium', 'pending', 0, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440007', '2025-12-18', '2025-12-17 11:00:00');

-- December 19
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1219-4001-8001-000000000001', 'Year-end project review', 'Review all project progress for year-end reporting', 'high', 'pending', 0, 'Both', NULL, '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', '2025-12-19', '2025-12-18 09:00:00'),
    ('a1b2c3d4-1219-4001-8001-000000000002', 'BMS graphics update', 'Update BMS graphics for new equipment', 'low', 'pending', 0, 'Engineering', 'a1234567-89ab-4cde-8001-000000000001', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '2025-12-19', '2025-12-18 10:00:00'),
    ('a1b2c3d4-1219-4001-8001-000000000003', 'WiFi access point audit', 'Audit WiFi coverage and performance', 'medium', 'pending', 0, 'IT', 'a1234567-89ab-4cde-8002-000000000002', '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440007', '2025-12-19', '2025-12-18 11:00:00'),
    ('a1b2c3d4-1219-4001-8001-000000000004', 'Pump alignment check', 'Check pump alignment on cooling system', 'medium', 'pending', 0, 'Engineering', NULL, '550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440001', '2025-12-19', '2025-12-18 12:00:00');

-- December 20 (Saturday - lighter workload)
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1220-4001-8001-000000000001', 'Weekend monitoring setup', 'Configure holiday weekend monitoring', 'high', 'pending', 0, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440007', '2025-12-20', '2025-12-19 08:00:00'),
    ('a1b2c3d4-1220-4001-8001-000000000002', 'HVAC holiday schedule', 'Set HVAC schedules for holiday period', 'medium', 'pending', 0, 'Engineering', 'a1234567-89ab-4cde-8001-000000000001', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '2025-12-20', '2025-12-19 09:00:00');

-- December 21 (Sunday - minimal workload)
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1221-4001-8001-000000000001', 'Sunday system check', 'Verify all systems before holiday week', 'medium', 'pending', 0, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440007', '2025-12-21', '2025-12-20 08:00:00');

-- December 22 (Pre-holiday week)
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1222-4001-8001-000000000001', 'Pre-holiday backup verification', 'Ensure all backups complete before holidays', 'urgent', 'pending', 0, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440007', '2025-12-22', '2025-12-21 09:00:00'),
    ('a1b2c3d4-1222-4001-8001-000000000002', 'Holiday schedule notification', 'Send holiday schedule to all building occupants', 'medium', 'pending', 0, 'Engineering', NULL, '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', '2025-12-22', '2025-12-21 10:00:00'),
    ('a1b2c3d4-1222-4001-8001-000000000003', 'Network holiday mode config', 'Configure network for reduced holiday traffic', 'medium', 'pending', 0, 'IT', 'a1234567-89ab-4cde-8002-000000000002', '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440007', '2025-12-22', '2025-12-21 11:00:00');

-- December 23
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1223-4001-8001-000000000001', 'Emergency contact list update', 'Update holiday emergency contact list', 'high', 'pending', 0, 'Both', NULL, '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', '2025-12-23', '2025-12-22 09:00:00'),
    ('a1b2c3d4-1223-4001-8001-000000000002', 'Building security walkthrough', 'Final security check before holiday closure', 'high', 'pending', 0, 'Engineering', NULL, '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '2025-12-23', '2025-12-22 10:00:00'),
    ('a1b2c3d4-1223-4001-8001-000000000003', 'Server room temp check', 'Verify server room cooling before holidays', 'high', 'pending', 0, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440007', '2025-12-23', '2025-12-22 11:00:00');

-- December 24 (Christmas Eve - minimal operations)
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1224-4001-8001-000000000001', 'Christmas Eve monitoring', 'Skeleton crew system monitoring', 'medium', 'pending', 0, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440007', '2025-12-24', '2025-12-23 08:00:00'),
    ('a1b2c3d4-1224-4001-8001-000000000002', 'Building setback verification', 'Verify HVAC setback for holiday', 'low', 'pending', 0, 'Engineering', NULL, '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '2025-12-24', '2025-12-23 09:00:00');

-- December 25 (Christmas Day - PUBLIC HOLIDAY - emergency only)
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1225-4001-8001-000000000001', 'Holiday on-call duty', 'Christmas Day emergency on-call coverage', 'high', 'pending', 0, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440000', '2025-12-25', '2025-12-24 08:00:00');

-- December 26 (Boxing Day - reduced operations)
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1226-4001-8001-000000000001', 'Post-holiday system check', 'Verify all systems after Christmas', 'high', 'pending', 0, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440007', '2025-12-26', '2025-12-25 08:00:00'),
    ('a1b2c3d4-1226-4001-8001-000000000002', 'Building reopening prep', 'Prepare building systems for return to normal', 'medium', 'pending', 0, 'Engineering', NULL, '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '2025-12-26', '2025-12-25 09:00:00');

-- December 27 (Saturday - weekend)
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1227-4001-8001-000000000001', 'Weekend system monitoring', 'Post-holiday weekend monitoring', 'medium', 'pending', 0, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440007', '2025-12-27', '2025-12-26 08:00:00');

-- December 28 (Sunday - weekend)
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1228-4001-8001-000000000001', 'Sunday monitoring shift', 'Weekend on-call monitoring', 'low', 'pending', 0, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440007', '2025-12-28', '2025-12-27 08:00:00');

-- December 29 (Return to normal operations)
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1229-4001-8001-000000000001', 'Year-end system audit', 'Complete year-end system audit', 'high', 'pending', 0, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440007', '2025-12-29', '2025-12-28 09:00:00'),
    ('a1b2c3d4-1229-4001-8001-000000000002', 'Energy consumption report', 'Generate December energy consumption report', 'medium', 'pending', 0, 'Engineering', 'a1234567-89ab-4cde-8003-000000000003', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '2025-12-29', '2025-12-28 10:00:00'),
    ('a1b2c3d4-1229-4001-8001-000000000003', 'Network traffic analysis', 'Analyze December network traffic patterns', 'medium', 'pending', 0, 'IT', 'a1234567-89ab-4cde-8002-000000000002', '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440007', '2025-12-29', '2025-12-28 11:00:00'),
    ('a1b2c3d4-1229-4001-8001-000000000004', 'HVAC performance review', 'Review HVAC performance for December', 'medium', 'pending', 0, 'Engineering', 'a1234567-89ab-4cde-8001-000000000001', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '2025-12-29', '2025-12-28 12:00:00');

-- December 30
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1230-4001-8001-000000000001', 'Year-end documentation', 'Complete year-end IT documentation', 'high', 'pending', 0, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', '2025-12-30', '2025-12-29 09:00:00'),
    ('a1b2c3d4-1230-4001-8001-000000000002', 'Equipment inventory finalization', 'Finalize year-end equipment inventory', 'high', 'pending', 0, 'Engineering', NULL, '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '2025-12-30', '2025-12-29 10:00:00'),
    ('a1b2c3d4-1230-4001-8001-000000000003', 'Backup verification - year end', 'Verify all year-end backups complete', 'urgent', 'pending', 0, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440007', '2025-12-30', '2025-12-29 11:00:00'),
    ('a1b2c3d4-1230-4001-8001-000000000004', 'Maintenance schedule 2026', 'Draft maintenance schedule for 2026', 'medium', 'pending', 0, 'Engineering', NULL, '550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440001', '2025-12-30', '2025-12-29 12:00:00');

-- December 31 (New Year's Eve - minimal operations)
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, created_at)
VALUES 
    ('a1b2c3d4-1231-4001-8001-000000000001', 'NYE system monitoring', 'New Year Eve monitoring shift', 'high', 'pending', 0, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440007', '2025-12-31', '2025-12-30 08:00:00'),
    ('a1b2c3d4-1231-4001-8001-000000000002', 'Year-end building check', 'Final building check for the year', 'medium', 'pending', 0, 'Engineering', NULL, '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '2025-12-31', '2025-12-30 09:00:00'),
    ('a1b2c3d4-1231-4001-8001-000000000003', 'Log archive - December', 'Archive December system logs', 'medium', 'pending', 0, 'IT', NULL, '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440007', '2025-12-31', '2025-12-30 10:00:00');

-- Insert sample events
INSERT OR IGNORE INTO events (id, title, description, event_type, event_date, start_time, end_time, location, created_by, department)
VALUES 
    ('1f9e6679-7425-40de-944b-e07fc1f90c00', 'Team Standup', 'Daily standup meeting', 'meeting', date('now'), '09:00', '09:30', 'Conference Room A', '550e8400-e29b-41d4-a716-446655440000', 'Both'),
    ('2f9e6679-7425-40de-944b-e07fc1f90c01', 'Sprint Review', 'End of sprint review meeting', 'meeting', date('now', '+3 days'), '14:00', '15:30', 'Conference Room B', '550e8400-e29b-41d4-a716-446655440000', 'IT'),
    ('3f9e6679-7425-40de-944b-e07fc1f90c02', 'Server Maintenance Window', 'Scheduled maintenance', 'deadline', date('now', '+5 days'), '22:00', '02:00', NULL, '550e8400-e29b-41d4-a716-446655440000', 'IT'),
    ('4f9e6679-7425-40de-944b-e07fc1f90c03', 'Equipment Delivery', 'New oscilloscope delivery', 'delivery', date('now', '+7 days'), '10:00', '12:00', 'Loading Dock', '550e8400-e29b-41d4-a716-446655440000', 'Engineering');

-- Insert sample quick links
INSERT OR IGNORE INTO quick_links (id, title, url, description, created_by, department, is_active)
VALUES 
    ('1a9e6679-7425-40de-944b-e07fc1f90d00', 'Jira Board', 'https://jira.company.com', 'Project management', '550e8400-e29b-41d4-a716-446655440000', 'Both', 1),
    ('2a9e6679-7425-40de-944b-e07fc1f90d01', 'Confluence Wiki', 'https://wiki.company.com', 'Documentation', '550e8400-e29b-41d4-a716-446655440000', 'Both', 1),
    ('3a9e6679-7425-40de-944b-e07fc1f90d02', 'GitHub', 'https://github.com/company', 'Code repository', '550e8400-e29b-41d4-a716-446655440000', 'IT', 1),
    ('4a9e6679-7425-40de-944b-e07fc1f90d03', 'Monitoring Dashboard', 'https://grafana.company.com', 'System monitoring', '550e8400-e29b-41d4-a716-446655440000', 'IT', 1);

-- Insert sample notifications
INSERT OR IGNORE INTO notifications (id, user_id, type, title, message, is_read)
VALUES 
    ('1b9e6679-7425-40de-944b-e07fc1f90e00', '550e8400-e29b-41d4-a716-446655440000', 'urgent', 'Urgent Task', 'Server Migration due in 2 hours', 0),
    ('2b9e6679-7425-40de-944b-e07fc1f90e01', '550e8400-e29b-41d4-a716-446655440000', 'info', 'Equipment Available', 'Oscilloscope available tomorrow', 0),
    ('3b9e6679-7425-40de-944b-e07fc1f90e02', '550e8400-e29b-41d4-a716-446655440000', 'meeting', 'Meeting Reminder', 'Team standup in 30 minutes', 0);

-- Insert sample check-in records (Personnel Tracking)
-- Using date('now') to ensure records appear as "today" for the demo
-- Normal 9-6 work hours with reasonable check-in/out times
-- Locations are realistic Singapore business locations

-- Historical check-in records (past 2 weeks of data)
-- Week of November 25-29, 2025
INSERT OR IGNORE INTO check_in_records (id, user_id, location, check_in_time, check_out_time, notes, device_type)
VALUES 
    -- November 25 (Monday)
    ('h1a2b3c4-1125-4001-8001-000000000001', '550e8400-e29b-41d4-a716-446655440001', 'Changi Business Park', '2025-11-25 08:55:00', '2025-11-25 18:10:00', 'BMS installation support', 'mobile'),
    ('h1a2b3c4-1125-4001-8001-000000000002', '550e8400-e29b-41d4-a716-446655440002', 'Marina Bay Financial Centre', '2025-11-25 09:00:00', '2025-11-25 17:45:00', 'Engineering team meeting', 'desktop'),
    ('h1a2b3c4-1125-4001-8001-000000000003', '550e8400-e29b-41d4-a716-446655440003', 'Tuas', '2025-11-25 08:30:00', '2025-11-25 17:30:00', 'Equipment maintenance', 'mobile'),
    ('h1a2b3c4-1125-4001-8001-000000000004', '550e8400-e29b-41d4-a716-446655440004', 'Raffles Place', '2025-11-25 09:15:00', '2025-11-25 18:20:00', 'Client meeting', 'desktop'),
    ('h1a2b3c4-1125-4001-8001-000000000005', '550e8400-e29b-41d4-a716-446655440005', 'Jurong Industrial Estate', '2025-11-25 08:45:00', '2025-11-25 17:55:00', 'Network infrastructure work', 'mobile'),
    
    -- November 26 (Tuesday)
    ('h1a2b3c4-1126-4001-8001-000000000001', '550e8400-e29b-41d4-a716-446655440001', 'One-North', '2025-11-26 09:05:00', '2025-11-26 18:00:00', 'Science Park project', 'mobile'),
    ('h1a2b3c4-1126-4001-8001-000000000002', '550e8400-e29b-41d4-a716-446655440002', 'Marina Bay Financial Centre', '2025-11-26 08:50:00', '2025-11-26 17:50:00', 'Regular office work', 'desktop'),
    ('h1a2b3c4-1126-4001-8001-000000000003', '550e8400-e29b-41d4-a716-446655440003', 'Jurong Industrial Estate', '2025-11-26 08:40:00', '2025-11-26 18:15:00', 'Production line maintenance', 'mobile'),
    ('h1a2b3c4-1126-4001-8001-000000000004', '550e8400-e29b-41d4-a716-446655440005', 'Suntec City', '2025-11-26 09:00:00', '2025-11-26 17:30:00', 'Network deployment', 'desktop'),
    ('h1a2b3c4-1126-4001-8001-000000000005', '550e8400-e29b-41d4-a716-446655440006', 'Mapletree Business City', '2025-11-26 08:55:00', '2025-11-26 18:05:00', 'HVAC inspection', 'mobile'),
    
    -- November 27 (Wednesday)
    ('h1a2b3c4-1127-4001-8001-000000000001', '550e8400-e29b-41d4-a716-446655440001', 'Changi Business Park', '2025-11-27 09:10:00', '2025-11-27 18:20:00', 'Continued BMS work', 'mobile'),
    ('h1a2b3c4-1127-4001-8001-000000000002', '550e8400-e29b-41d4-a716-446655440002', 'Paya Lebar Quarter', '2025-11-27 09:00:00', '2025-11-27 17:45:00', 'Client site visit', 'mobile'),
    ('h1a2b3c4-1127-4001-8001-000000000003', '550e8400-e29b-41d4-a716-446655440003', 'Tuas', '2025-11-27 08:35:00', '2025-11-27 17:40:00', 'Equipment calibration', 'mobile'),
    ('h1a2b3c4-1127-4001-8001-000000000004', '550e8400-e29b-41d4-a716-446655440004', 'Marina Bay Financial Centre', '2025-11-27 09:05:00', '2025-11-27 18:00:00', 'IT infrastructure review', 'desktop'),
    ('h1a2b3c4-1127-4001-8001-000000000005', '550e8400-e29b-41d4-a716-446655440005', 'Woodlands Regional Centre', '2025-11-27 08:30:00', '2025-11-27 17:30:00', 'Network switch installation', 'mobile'),
    ('h1a2b3c4-1127-4001-8001-000000000006', '550e8400-e29b-41d4-a716-446655440006', 'One-North', '2025-11-27 09:00:00', '2025-11-27 17:55:00', 'Engineering consultation', 'desktop'),
    
    -- November 28 (Thursday)
    ('h1a2b3c4-1128-4001-8001-000000000001', '550e8400-e29b-41d4-a716-446655440001', 'Seletar Aerospace Park', '2025-11-28 08:45:00', '2025-11-28 18:00:00', 'Aerospace facility support', 'mobile'),
    ('h1a2b3c4-1128-4001-8001-000000000002', '550e8400-e29b-41d4-a716-446655440002', 'Marina Bay Financial Centre', '2025-11-28 09:00:00', '2025-11-28 17:50:00', 'Project planning', 'desktop'),
    ('h1a2b3c4-1128-4001-8001-000000000003', '550e8400-e29b-41d4-a716-446655440004', 'Shenton Way', '2025-11-28 09:15:00', '2025-11-28 18:10:00', 'Server maintenance', 'desktop'),
    ('h1a2b3c4-1128-4001-8001-000000000004', '550e8400-e29b-41d4-a716-446655440005', 'Tai Seng', '2025-11-28 08:50:00', '2025-11-28 17:45:00', 'Network troubleshooting', 'mobile'),
    
    -- November 29 (Friday)
    ('h1a2b3c4-1129-4001-8001-000000000001', '550e8400-e29b-41d4-a716-446655440001', 'International Business Park', '2025-11-29 09:00:00', '2025-11-29 17:30:00', 'End of week site visit', 'mobile'),
    ('h1a2b3c4-1129-4001-8001-000000000002', '550e8400-e29b-41d4-a716-446655440002', 'Marina Bay Financial Centre', '2025-11-29 09:05:00', '2025-11-29 17:00:00', 'Weekly wrap-up', 'desktop'),
    ('h1a2b3c4-1129-4001-8001-000000000003', '550e8400-e29b-41d4-a716-446655440003', 'Jurong Industrial Estate', '2025-11-29 08:40:00', '2025-11-29 17:15:00', 'Preventive maintenance', 'mobile'),
    ('h1a2b3c4-1129-4001-8001-000000000004', '550e8400-e29b-41d4-a716-446655440004', 'Raffles Place', '2025-11-29 09:10:00', '2025-11-29 17:20:00', 'Client handover', 'desktop'),
    ('h1a2b3c4-1129-4001-8001-000000000005', '550e8400-e29b-41d4-a716-446655440005', 'Ubi', '2025-11-29 08:55:00', '2025-11-29 17:10:00', 'Cable installation', 'mobile'),
    ('h1a2b3c4-1129-4001-8001-000000000006', '550e8400-e29b-41d4-a716-446655440006', 'Ang Mo Kio Industrial Park', '2025-11-29 09:00:00', '2025-11-29 17:25:00', 'Equipment inspection', 'mobile');

-- Week of December 1-5, 2025
INSERT OR IGNORE INTO check_in_records (id, user_id, location, check_in_time, check_out_time, notes, device_type)
VALUES 
    -- December 1 (Monday)
    ('h1a2b3c4-1201-4001-8001-000000000001', '550e8400-e29b-41d4-a716-446655440001', 'Changi Business Park', '2025-12-01 08:50:00', '2025-12-01 18:05:00', 'Monthly system check', 'mobile'),
    ('h1a2b3c4-1201-4001-8001-000000000002', '550e8400-e29b-41d4-a716-446655440002', 'Marina Bay Financial Centre', '2025-12-01 09:00:00', '2025-12-01 17:55:00', 'December planning', 'desktop'),
    ('h1a2b3c4-1201-4001-8001-000000000003', '550e8400-e29b-41d4-a716-446655440003', 'Tuas', '2025-12-01 08:35:00', '2025-12-01 17:40:00', 'Industrial maintenance', 'mobile'),
    ('h1a2b3c4-1201-4001-8001-000000000004', '550e8400-e29b-41d4-a716-446655440004', 'Suntec City', '2025-12-01 09:10:00', '2025-12-01 18:15:00', 'IT audit preparation', 'desktop'),
    ('h1a2b3c4-1201-4001-8001-000000000005', '550e8400-e29b-41d4-a716-446655440005', 'Kaki Bukit', '2025-12-01 08:45:00', '2025-12-01 17:50:00', 'Network upgrade', 'mobile'),
    ('h1a2b3c4-1201-4001-8001-000000000006', '550e8400-e29b-41d4-a716-446655440006', 'Science Park', '2025-12-01 09:05:00', '2025-12-01 18:00:00', 'Lab equipment check', 'desktop'),
    
    -- December 2 (Tuesday)
    ('h1a2b3c4-1202-4001-8001-000000000001', '550e8400-e29b-41d4-a716-446655440001', 'Loyang', '2025-12-02 08:40:00', '2025-12-02 17:55:00', 'Logistics facility support', 'mobile'),
    ('h1a2b3c4-1202-4001-8001-000000000002', '550e8400-e29b-41d4-a716-446655440002', 'Paya Lebar Quarter', '2025-12-02 09:00:00', '2025-12-02 18:00:00', 'Project review meeting', 'desktop'),
    ('h1a2b3c4-1202-4001-8001-000000000003', '550e8400-e29b-41d4-a716-446655440003', 'Jurong Industrial Estate', '2025-12-02 08:30:00', '2025-12-02 17:45:00', 'Valve maintenance', 'mobile'),
    ('h1a2b3c4-1202-4001-8001-000000000004', '550e8400-e29b-41d4-a716-446655440004', 'Marina Bay Financial Centre', '2025-12-02 09:05:00', '2025-12-02 18:10:00', 'Server deployment', 'desktop'),
    ('h1a2b3c4-1202-4001-8001-000000000005', '550e8400-e29b-41d4-a716-446655440005', 'Defu Lane', '2025-12-02 08:50:00', '2025-12-02 17:40:00', 'Fiber installation', 'mobile'),
    
    -- December 3 (Wednesday)
    ('h1a2b3c4-1203-4001-8001-000000000001', '550e8400-e29b-41d4-a716-446655440001', 'Mapletree Business City', '2025-12-03 09:00:00', '2025-12-03 18:00:00', 'Building automation review', 'mobile'),
    ('h1a2b3c4-1203-4001-8001-000000000002', '550e8400-e29b-41d4-a716-446655440002', 'Marina Bay Financial Centre', '2025-12-03 08:55:00', '2025-12-03 17:50:00', 'Engineering documentation', 'desktop'),
    ('h1a2b3c4-1203-4001-8001-000000000003', '550e8400-e29b-41d4-a716-446655440003', 'Kallang Way', '2025-12-03 08:35:00', '2025-12-03 17:35:00', 'Pump maintenance', 'mobile'),
    ('h1a2b3c4-1203-4001-8001-000000000004', '550e8400-e29b-41d4-a716-446655440004', 'Tanjong Pagar', '2025-12-03 09:10:00', '2025-12-03 18:05:00', 'Data center support', 'desktop'),
    ('h1a2b3c4-1203-4001-8001-000000000005', '550e8400-e29b-41d4-a716-446655440005', 'Changi Business Park', '2025-12-03 08:45:00', '2025-12-03 17:55:00', 'Network monitoring setup', 'mobile'),
    ('h1a2b3c4-1203-4001-8001-000000000006', '550e8400-e29b-41d4-a716-446655440006', 'One-North', '2025-12-03 09:00:00', '2025-12-03 18:00:00', 'R&D facility inspection', 'desktop'),
    
    -- December 4 (Thursday)
    ('h1a2b3c4-1204-4001-8001-000000000001', '550e8400-e29b-41d4-a716-446655440001', 'Jurong Island', '2025-12-04 07:30:00', '2025-12-04 17:00:00', 'Petrochemical facility work', 'mobile'),
    ('h1a2b3c4-1204-4001-8001-000000000002', '550e8400-e29b-41d4-a716-446655440002', 'Suntec City', '2025-12-04 09:00:00', '2025-12-04 18:00:00', 'Client presentation', 'desktop'),
    ('h1a2b3c4-1204-4001-8001-000000000003', '550e8400-e29b-41d4-a716-446655440003', 'Tuas', '2025-12-04 08:00:00', '2025-12-04 17:30:00', 'Motor replacement', 'mobile'),
    ('h1a2b3c4-1204-4001-8001-000000000004', '550e8400-e29b-41d4-a716-446655440004', 'Raffles Place', '2025-12-04 09:05:00', '2025-12-04 18:10:00', 'Executive briefing', 'desktop'),
    ('h1a2b3c4-1204-4001-8001-000000000005', '550e8400-e29b-41d4-a716-446655440005', 'Woodlands Regional Centre', '2025-12-04 08:40:00', '2025-12-04 17:45:00', 'Branch network upgrade', 'mobile');

-- Today's check-ins (December 5, 2025) - these use date('now') for demo purposes
INSERT OR IGNORE INTO check_in_records (id, user_id, location, check_in_time, check_out_time, notes, device_type)
VALUES 
    -- Michael Chen - Field Engineer, checked in at 9:05 AM on mobile, still active
    ('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b01', '550e8400-e29b-41d4-a716-446655440001', 'Changi Business Park', date('now') || ' 09:05:00', NULL, 'On-site support for BMS installation', 'mobile'),
    -- Sarah Johnson - Senior Engineer, checked in at 8:55 AM on desktop, still active  
    ('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b02', '550e8400-e29b-41d4-a716-446655440002', 'Marina Bay Financial Centre', date('now') || ' 08:55:00', NULL, 'Engineering review meeting', 'desktop'),
    -- David Park - Field Technician, checked in at 9:15 AM on mobile, still active
    ('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b03', '550e8400-e29b-41d4-a716-446655440003', 'Jurong Industrial Estate', date('now') || ' 09:15:00', NULL, 'Preventive maintenance on production line', 'mobile'),
    -- Emily Rodriguez - Project Manager, worked 9 AM to 6 PM yesterday on desktop
    ('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b04', '550e8400-e29b-41d4-a716-446655440004', 'Suntec City', date('now', '-1 day') || ' 09:00:00', date('now', '-1 day') || ' 18:05:00', 'Project kickoff and client meetings', 'desktop'),
    -- James Wilson - Equipment Specialist, checked in at 9:10 AM on mobile, still active
    ('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b05', '550e8400-e29b-41d4-a716-446655440005', 'Tuas', date('now') || ' 09:10:00', NULL, 'Equipment inventory and calibration', 'mobile'),
    -- Lisa Anderson - Field Engineer, worked 8:50 AM to 5:55 PM yesterday on desktop
    ('c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b06', '550e8400-e29b-41d4-a716-446655440006', 'One-North', date('now', '-1 day') || ' 08:50:00', date('now', '-1 day') || ' 17:55:00', 'Morning standup and documentation', 'desktop');

-- Update user_locations table for active check-ins
INSERT OR REPLACE INTO user_locations (user_id, location, last_check_in, is_checked_in, updated_at)
VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'Changi Business Park', datetime('now', '-2 hours', '-32 minutes'), 1, datetime('now')),
    ('550e8400-e29b-41d4-a716-446655440002', 'Marina Bay Financial Centre', datetime('now', '-3 hours', '-30 minutes'), 1, datetime('now')),
    ('550e8400-e29b-41d4-a716-446655440003', 'Jurong Industrial Estate', datetime('now', '-4 hours', '-15 minutes'), 1, datetime('now')),
    ('550e8400-e29b-41d4-a716-446655440004', 'Suntec City', datetime('now', '-10 hours'), 0, datetime('now')),
    ('550e8400-e29b-41d4-a716-446655440005', 'Tuas', datetime('now', '-3 hours', '-45 minutes'), 1, datetime('now')),
    ('550e8400-e29b-41d4-a716-446655440006', 'One-North', datetime('now', '-5 hours', '-10 minutes'), 0, datetime('now'));
