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
    location TEXT NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_equipment_location ON equipment(location);

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

-- Insert sample equipment
INSERT OR IGNORE INTO equipment (id, name, category, location, status, serial_number)
VALUES 
    ('cf9e6679-7425-40de-944b-e07fc1f90aec', 'Oscilloscope OSC-2000', 'Testing', 'Lab 3', 'available', 'OSC2000-12345'),
    ('df9e6679-7425-40de-944b-e07fc1f90aed', 'Network Analyzer NA-500', 'Testing', 'Lab 1', 'available', 'NA500-67890'),
    ('ef9e6679-7425-40de-944b-e07fc1f90aee', 'Power Supply PS-1000', 'Power', 'Lab 2', 'available', 'PS1000-11111');

-- Insert sample glossary categories
INSERT OR IGNORE INTO glossary_categories (id, name, display_order)
VALUES 
    ('5f9e6679-7425-40de-944b-e07fc1f90af5', 'IT & Engineering Common Terms', 1),
    ('6f9e6679-7425-40de-944b-e07fc1f90af6', 'HVAC Abbreviations', 2),
    ('7f9e6679-7425-40de-944b-e07fc1f90af7', 'Network Terminology', 3);

-- Insert sample glossary terms
INSERT OR IGNORE INTO glossary_terms (id, acronym, full_name, definition, category_id, created_by, is_approved)
VALUES 
    ('4f9e6679-7425-40de-944b-e07fc1f90af4', 'API', 'Application Programming Interface', 'A set of protocols and tools for building software applications', '5f9e6679-7425-40de-944b-e07fc1f90af5', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('8f9e6679-7425-40de-944b-e07fc1f90af8', 'HVAC', 'Heating, Ventilation, and Air Conditioning', 'System for regulating indoor climate', '6f9e6679-7425-40de-944b-e07fc1f90af6', '550e8400-e29b-41d4-a716-446655440000', 1),
    ('9f9e6679-7425-40de-944b-e07fc1f90af9', 'DNS', 'Domain Name System', 'Hierarchical naming system for computers and services', '7f9e6679-7425-40de-944b-e07fc1f90af7', '550e8400-e29b-41d4-a716-446655440000', 1);

-- Insert sample tasks
INSERT OR IGNORE INTO tasks (id, title, description, urgency, status, is_completed, department, assignee_id, created_by, deadline)
VALUES 
    ('af9e6679-7425-40de-944b-e07fc1f90b00', 'Server Migration', 'Migrate production servers to new data center', 'urgent', 'in-progress', 0, 'IT', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', date('now', '+2 days')),
    ('bf9e6679-7425-40de-944b-e07fc1f90b01', 'Network Security Audit', 'Perform quarterly security audit', 'high', 'pending', 0, 'IT', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', date('now', '+7 days')),
    ('cf9e6679-7425-40de-944b-e07fc1f90b02', 'HVAC System Maintenance', 'Routine maintenance on building HVAC', 'medium', 'pending', 0, 'Engineering', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', date('now', '+14 days')),
    ('df9e6679-7425-40de-944b-e07fc1f90b03', 'Update Documentation', 'Update API documentation for new endpoints', 'low', 'completed', 1, 'IT', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', date('now', '-1 days'));

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
