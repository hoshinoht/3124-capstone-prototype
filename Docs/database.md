# Database Schema Design
## IT-Engineering Collaboration Dashboard

---

## Table of Contents
1. [Users & Authentication](#1-users--authentication)
2. [Calendar & Events](#2-calendar--events)
3. [Task Management](#3-task-management)
4. [Equipment & Bookings](#4-equipment--bookings)
5. [Location Tracking](#5-location-tracking)
6. [Quick Links](#6-quick-links)
7. [Glossary](#7-glossary)
8. [Notifications](#8-notifications)
9. [Database Relationships Diagram](#database-relationships)
10. [Indexes & Performance](#indexes--performance)

---

## 1. Users & Authentication

### `users`
Primary table for storing user information.

| Column          | Type         | Constraints      | Description                 |
| --------------- | ------------ | ---------------- | --------------------------- |
| `id`            | UUID         | PRIMARY KEY      | Unique user identifier      |
| `email`         | VARCHAR(255) | UNIQUE, NOT NULL | User email address          |
| `password_hash` | VARCHAR(255) | NOT NULL         | Hashed password (bcrypt)    |
| `first_name`    | VARCHAR(100) | NOT NULL         | User's first name           |
| `last_name`     | VARCHAR(100) | NOT NULL         | User's last name            |
| `department`    | ENUM         | NOT NULL         | 'IT', 'Engineering', 'Both' |
| `role`          | ENUM         | NOT NULL         | 'Admin', 'Member', 'Viewer' |
| `is_active`     | BOOLEAN      | DEFAULT TRUE     | Account status              |
| `created_at`    | TIMESTAMP    | DEFAULT NOW()    | Account creation time       |
| `updated_at`    | TIMESTAMP    | DEFAULT NOW()    | Last update time            |
| `last_login`    | TIMESTAMP    | NULL             | Last login timestamp        |

**Indexes:**
- `idx_users_email` on `email`
- `idx_users_department` on `department`

---

### `sessions`
For managing user sessions.

| Column       | Type         | Constraints             | Description         |
| ------------ | ------------ | ----------------------- | ------------------- |
| `id`         | UUID         | PRIMARY KEY             | Session identifier  |
| `user_id`    | UUID         | FOREIGN KEY → users(id) | Reference to user   |
| `token`      | VARCHAR(500) | UNIQUE, NOT NULL        | Session token (JWT) |
| `expires_at` | TIMESTAMP    | NOT NULL                | Token expiration    |
| `created_at` | TIMESTAMP    | DEFAULT NOW()           | Session start time  |
| `ip_address` | VARCHAR(45)  | NULL                    | User's IP address   |
| `user_agent` | TEXT         | NULL                    | Browser/device info |

**Indexes:**
- `idx_sessions_token` on `token`
- `idx_sessions_user_id` on `user_id`

---

## 2. Calendar & Events

### `events`
Stores all calendar events.

| Column            | Type         | Constraints              | Description                       |
| ----------------- | ------------ | ------------------------ | --------------------------------- |
| `id`              | UUID         | PRIMARY KEY              | Unique event identifier           |
| `title`           | VARCHAR(255) | NOT NULL                 | Event title                       |
| `description`     | TEXT         | NULL                     | Event description                 |
| `event_type`      | ENUM         | NOT NULL                 | 'deadline', 'meeting', 'delivery' |
| `event_date`      | DATE         | NOT NULL                 | Event date                        |
| `start_time`      | TIME         | NOT NULL                 | Event start time                  |
| `end_time`        | TIME         | NULL                     | Event end time (for meetings)     |
| `location`        | VARCHAR(255) | NULL                     | Physical/virtual location         |
| `meeting_url`     | TEXT         | NULL                     | Meeting link (if applicable)      |
| `created_by`      | UUID         | FOREIGN KEY → users(id)  | Event creator                     |
| `department`      | ENUM         | NULL                     | 'IT', 'Engineering', 'Both'       |
| `is_recurring`    | BOOLEAN      | DEFAULT FALSE            | Recurring event flag              |
| `recurrence_rule` | TEXT         | NULL                     | iCal RRULE format                 |
| `parent_event_id` | UUID         | FOREIGN KEY → events(id) | For recurring events              |
| `created_at`      | TIMESTAMP    | DEFAULT NOW()            | Creation timestamp                |
| `updated_at`      | TIMESTAMP    | DEFAULT NOW()            | Last update timestamp             |

**Indexes:**
- `idx_events_date` on `event_date`
- `idx_events_type` on `event_type`
- `idx_events_created_by` on `created_by`
- `idx_events_date_type` on `(event_date, event_type)`

---

### `event_attendees`
Many-to-many relationship between events and users.

| Column     | Type      | Constraints              | Description                       |
| ---------- | --------- | ------------------------ | --------------------------------- |
| `id`       | UUID      | PRIMARY KEY              | Unique identifier                 |
| `event_id` | UUID      | FOREIGN KEY → events(id) | Reference to event                |
| `user_id`  | UUID      | FOREIGN KEY → users(id)  | Reference to user                 |
| `status`   | ENUM      | DEFAULT 'pending'        | 'pending', 'accepted', 'declined' |
| `added_at` | TIMESTAMP | DEFAULT NOW()            | When attendee was added           |

**Indexes:**
- `idx_event_attendees_event` on `event_id`
- `idx_event_attendees_user` on `user_id`
- `unique_event_attendee` UNIQUE on `(event_id, user_id)`

---

## 3. Task Management

### `tasks`
Stores all tasks with urgency levels.

| Column         | Type         | Constraints             | Description                           |
| -------------- | ------------ | ----------------------- | ------------------------------------- |
| `id`           | UUID         | PRIMARY KEY             | Unique task identifier                |
| `title`        | VARCHAR(255) | NOT NULL                | Task title                            |
| `description`  | TEXT         | NULL                    | Task description                      |
| `urgency`      | ENUM         | NOT NULL                | 'urgent', 'high', 'medium', 'low'     |
| `status`       | ENUM         | DEFAULT 'pending'       | 'pending', 'in-progress', 'completed' |
| `department`   | ENUM         | NOT NULL                | 'IT', 'Engineering', 'Both'           |
| `assignee_id`  | UUID         | FOREIGN KEY → users(id) | Assigned user                         |
| `created_by`   | UUID         | FOREIGN KEY → users(id) | Task creator                          |
| `deadline`     | TIMESTAMP    | NOT NULL                | Task deadline                         |
| `completed_at` | TIMESTAMP    | NULL                    | Completion timestamp                  |
| `created_at`   | TIMESTAMP    | DEFAULT NOW()           | Creation timestamp                    |
| `updated_at`   | TIMESTAMP    | DEFAULT NOW()           | Last update timestamp                 |

**Indexes:**
- `idx_tasks_urgency` on `urgency`
- `idx_tasks_status` on `status`
- `idx_tasks_assignee` on `assignee_id`
- `idx_tasks_deadline` on `deadline`
- `idx_tasks_urgent_pending` on `(urgency, status)` WHERE urgency='urgent' AND status!='completed'

---

### `task_history`
Audit trail for task changes.

| Column          | Type         | Constraints             | Description                                       |
| --------------- | ------------ | ----------------------- | ------------------------------------------------- |
| `id`            | UUID         | PRIMARY KEY             | Unique identifier                                 |
| `task_id`       | UUID         | FOREIGN KEY → tasks(id) | Reference to task                                 |
| `user_id`       | UUID         | FOREIGN KEY → users(id) | User who made change                              |
| `action`        | ENUM         | NOT NULL                | 'created', 'updated', 'status_changed', 'deleted' |
| `field_changed` | VARCHAR(100) | NULL                    | Field that was modified                           |
| `old_value`     | TEXT         | NULL                    | Previous value                                    |
| `new_value`     | TEXT         | NULL                    | New value                                         |
| `created_at`    | TIMESTAMP    | DEFAULT NOW()           | Change timestamp                                  |

**Indexes:**
- `idx_task_history_task` on `task_id`
- `idx_task_history_user` on `user_id`
- `idx_task_history_created` on `created_at`

---

## 4. Equipment & Bookings

### `equipment`
Stores equipment inventory.

| Column             | Type         | Constraints         | Description                                    |
| ------------------ | ------------ | ------------------- | ---------------------------------------------- |
| `id`               | UUID         | PRIMARY KEY         | Unique equipment identifier                    |
| `name`             | VARCHAR(255) | NOT NULL            | Equipment name                                 |
| `category`         | VARCHAR(100) | NOT NULL            | Equipment category                             |
| `location`         | VARCHAR(255) | NOT NULL            | Physical location                              |
| `status`           | ENUM         | DEFAULT 'available' | 'available', 'booked', 'in-use', 'maintenance' |
| `serial_number`    | VARCHAR(100) | UNIQUE              | Serial/asset number                            |
| `purchase_date`    | DATE         | NULL                | Date purchased                                 |
| `last_maintenance` | DATE         | NULL                | Last maintenance date                          |
| `notes`            | TEXT         | NULL                | Additional information                         |
| `created_at`       | TIMESTAMP    | DEFAULT NOW()       | Creation timestamp                             |
| `updated_at`       | TIMESTAMP    | DEFAULT NOW()       | Last update timestamp                          |

**Indexes:**
- `idx_equipment_status` on `status`
- `idx_equipment_category` on `category`
- `idx_equipment_location` on `location`

---

### `bookings`
Equipment booking records.

| Column         | Type      | Constraints                 | Description                        |
| -------------- | --------- | --------------------------- | ---------------------------------- |
| `id`           | UUID      | PRIMARY KEY                 | Unique booking identifier          |
| `equipment_id` | UUID      | FOREIGN KEY → equipment(id) | Reference to equipment             |
| `user_id`      | UUID      | FOREIGN KEY → users(id)     | User who booked                    |
| `department`   | ENUM      | NOT NULL                    | 'IT', 'Engineering'                |
| `start_date`   | DATE      | NOT NULL                    | Booking start date                 |
| `end_date`     | DATE      | NOT NULL                    | Booking end date                   |
| `purpose`      | TEXT      | NOT NULL                    | Reason for booking                 |
| `status`       | ENUM      | DEFAULT 'active'            | 'active', 'completed', 'cancelled' |
| `created_at`   | TIMESTAMP | DEFAULT NOW()               | Booking creation time              |
| `updated_at`   | TIMESTAMP | DEFAULT NOW()               | Last update time                   |
| `cancelled_at` | TIMESTAMP | NULL                        | Cancellation time                  |

**Indexes:**
- `idx_bookings_equipment` on `equipment_id`
- `idx_bookings_user` on `user_id`
- `idx_bookings_dates` on `(start_date, end_date)`
- `idx_bookings_status` on `status`

**Constraints:**
- CHECK: `end_date >= start_date`

---

## 5. Location Tracking

### `check_in_records`
Personnel check-in/check-out records.

| Column           | Type         | Constraints             | Description                  |
| ---------------- | ------------ | ----------------------- | ---------------------------- |
| `id`             | UUID         | PRIMARY KEY             | Unique record identifier     |
| `user_id`        | UUID         | FOREIGN KEY → users(id) | Reference to user            |
| `location`       | VARCHAR(255) | NOT NULL                | Location name (manual entry) |
| `check_in_time`  | TIMESTAMP    | NOT NULL                | Check-in timestamp           |
| `check_out_time` | TIMESTAMP    | NULL                    | Check-out timestamp          |
| `notes`          | TEXT         | NULL                    | Optional notes               |
| `created_at`     | TIMESTAMP    | DEFAULT NOW()           | Record creation time         |

**Indexes:**
- `idx_checkin_user` on `user_id`
- `idx_checkin_time` on `check_in_time`
- `idx_checkin_location` on `location`
- `idx_checkin_active` on `user_id` WHERE `check_out_time IS NULL`

---

### `user_locations`
Current location snapshot for quick queries.

| Column             | Type         | Constraints                          | Description             |
| ------------------ | ------------ | ------------------------------------ | ----------------------- |
| `user_id`          | UUID         | PRIMARY KEY, FOREIGN KEY → users(id) | Reference to user       |
| `current_location` | VARCHAR(255) | NULL                                 | Current location        |
| `check_in_time`    | TIMESTAMP    | NULL                                 | Latest check-in time    |
| `is_checked_in`    | BOOLEAN      | DEFAULT FALSE                        | Current check-in status |
| `updated_at`       | TIMESTAMP    | DEFAULT NOW()                        | Last update time        |

**Note:** This table is updated on check-in/check-out for fast lookups of current locations.

---

## 6. Quick Links

### `quick_links`
Stores meeting links and recurring URLs.

| Column             | Type         | Constraints             | Description                 |
| ------------------ | ------------ | ----------------------- | --------------------------- |
| `id`               | UUID         | PRIMARY KEY             | Unique link identifier      |
| `title`            | VARCHAR(255) | NOT NULL                | Link title/name             |
| `url`              | TEXT         | NOT NULL                | Meeting URL                 |
| `description`      | TEXT         | NULL                    | Link description            |
| `meeting_datetime` | TIMESTAMP    | NULL                    | Scheduled meeting time      |
| `created_by`       | UUID         | FOREIGN KEY → users(id) | Link creator                |
| `department`       | ENUM         | NULL                    | 'IT', 'Engineering', 'Both' |
| `is_recurring`     | BOOLEAN      | DEFAULT FALSE           | Recurring meeting flag      |
| `is_active`        | BOOLEAN      | DEFAULT TRUE            | Active status               |
| `created_at`       | TIMESTAMP    | DEFAULT NOW()           | Creation timestamp          |
| `updated_at`       | TIMESTAMP    | DEFAULT NOW()           | Last update timestamp       |

**Indexes:**
- `idx_quicklinks_creator` on `created_by`
- `idx_quicklinks_department` on `department`
- `idx_quicklinks_active` on `is_active`

---

### `user_quick_links`
User-specific quick links (optional personalization).

| Column          | Type         | Constraints                   | Description        |
| --------------- | ------------ | ----------------------------- | ------------------ |
| `id`            | UUID         | PRIMARY KEY                   | Unique identifier  |
| `user_id`       | UUID         | FOREIGN KEY → users(id)       | Reference to user  |
| `quick_link_id` | UUID         | FOREIGN KEY → quick_links(id) | Reference to link  |
| `is_pinned`     | BOOLEAN      | DEFAULT FALSE                 | User pinned status |
| `custom_label`  | VARCHAR(255) | NULL                          | User's custom name |
| `added_at`      | TIMESTAMP    | DEFAULT NOW()                 | When added to user |

**Indexes:**
- `idx_user_links_user` on `user_id`
- `unique_user_link` UNIQUE on `(user_id, quick_link_id)`

---

## 7. Glossary

### `glossary_categories`
Categories for organizing terms.

| Column               | Type         | Constraints                           | Description                     |
| -------------------- | ------------ | ------------------------------------- | ------------------------------- |
| `id`                 | UUID         | PRIMARY KEY                           | Unique category identifier      |
| `name`               | VARCHAR(255) | NOT NULL                              | Category name                   |
| `parent_category_id` | UUID         | FOREIGN KEY → glossary_categories(id) | Parent category (for hierarchy) |
| `display_order`      | INTEGER      | DEFAULT 0                             | Display order                   |
| `created_at`         | TIMESTAMP    | DEFAULT NOW()                         | Creation timestamp              |
| `updated_at`         | TIMESTAMP    | DEFAULT NOW()                         | Last update timestamp           |

**Indexes:**
- `idx_glossary_cat_parent` on `parent_category_id`
- `idx_glossary_cat_order` on `display_order`

---

### `glossary_terms`
IT/Engineering terminology database.

| Column           | Type         | Constraints                           | Description                 |
| ---------------- | ------------ | ------------------------------------- | --------------------------- |
| `id`             | UUID         | PRIMARY KEY                           | Unique term identifier      |
| `acronym`        | VARCHAR(50)  | NOT NULL                              | Acronym/short form          |
| `full_name`      | VARCHAR(255) | NOT NULL                              | Full term name              |
| `definition`     | TEXT         | NULL                                  | Detailed definition         |
| `category_id`    | UUID         | FOREIGN KEY → glossary_categories(id) | Reference to category       |
| `parent_term_id` | UUID         | FOREIGN KEY → glossary_terms(id)      | Parent term (for sub-items) |
| `created_by`     | UUID         | FOREIGN KEY → users(id)               | User who added term         |
| `approved_by`    | UUID         | FOREIGN KEY → users(id)               | Admin who approved          |
| `is_approved`    | BOOLEAN      | DEFAULT FALSE                         | Approval status             |
| `usage_count`    | INTEGER      | DEFAULT 0                             | Search popularity counter   |
| `created_at`     | TIMESTAMP    | DEFAULT NOW()                         | Creation timestamp          |
| `updated_at`     | TIMESTAMP    | DEFAULT NOW()                         | Last update timestamp       |

**Indexes:**
- `idx_glossary_acronym` on `acronym`
- `idx_glossary_category` on `category_id`
- `idx_glossary_approved` on `is_approved`
- Full-text index on `(acronym, full_name, definition)`

---

### `glossary_history`
Version history for term changes.

| Column       | Type      | Constraints                      | Description                                 |
| ------------ | --------- | -------------------------------- | ------------------------------------------- |
| `id`         | UUID      | PRIMARY KEY                      | Unique identifier                           |
| `term_id`    | UUID      | FOREIGN KEY → glossary_terms(id) | Reference to term                           |
| `user_id`    | UUID      | FOREIGN KEY → users(id)          | User who made change                        |
| `action`     | ENUM      | NOT NULL                         | 'created', 'updated', 'approved', 'deleted' |
| `old_value`  | JSONB     | NULL                             | Previous state (JSON)                       |
| `new_value`  | JSONB     | NULL                             | New state (JSON)                            |
| `created_at` | TIMESTAMP | DEFAULT NOW()                    | Change timestamp                            |

**Indexes:**
- `idx_glossary_history_term` on `term_id`
- `idx_glossary_history_created` on `created_at`

---

## 8. Notifications

### `notifications`
System notifications for users.

| Column                | Type         | Constraints             | Description                                        |
| --------------------- | ------------ | ----------------------- | -------------------------------------------------- |
| `id`                  | UUID         | PRIMARY KEY             | Unique notification identifier                     |
| `user_id`             | UUID         | FOREIGN KEY → users(id) | Recipient user                                     |
| `type`                | ENUM         | NOT NULL                | 'urgent', 'meeting', 'shipping', 'info', 'success' |
| `title`               | VARCHAR(255) | NOT NULL                | Notification title                                 |
| `message`             | TEXT         | NOT NULL                | Notification message                               |
| `related_entity_type` | VARCHAR(50)  | NULL                    | 'task', 'event', 'booking', etc.                   |
| `related_entity_id`   | UUID         | NULL                    | Reference to related entity                        |
| `is_read`             | BOOLEAN      | DEFAULT FALSE           | Read status                                        |
| `read_at`             | TIMESTAMP    | NULL                    | When marked as read                                |
| `created_at`          | TIMESTAMP    | DEFAULT NOW()           | Notification creation time                         |
| `expires_at`          | TIMESTAMP    | NULL                    | Auto-delete time                                   |

**Indexes:**
- `idx_notifications_user` on `user_id`
- `idx_notifications_read` on `(user_id, is_read)`
- `idx_notifications_created` on `created_at`
- `idx_notifications_type` on `type`

---

### `notification_preferences`
User notification settings.

| Column              | Type        | Constraints             | Description               |
| ------------------- | ----------- | ----------------------- | ------------------------- |
| `id`                | UUID        | PRIMARY KEY             | Unique identifier         |
| `user_id`           | UUID        | FOREIGN KEY → users(id) | Reference to user         |
| `notification_type` | VARCHAR(50) | NOT NULL                | Type of notification      |
| `is_enabled`        | BOOLEAN     | DEFAULT TRUE            | Enable/disable this type  |
| `delivery_method`   | ENUM        | DEFAULT 'in-app'        | 'in-app', 'email', 'both' |
| `updated_at`        | TIMESTAMP   | DEFAULT NOW()           | Last update time          |

**Indexes:**
- `idx_notif_prefs_user` on `user_id`
- `unique_user_notif_type` UNIQUE on `(user_id, notification_type)`

---

## Database Relationships

### Entity Relationship Diagram (ERD) Summary

```
users (1) ←→ (M) sessions
users (1) ←→ (M) events [created_by]
users (1) ←→ (M) event_attendees ←→ (M) events
users (1) ←→ (M) tasks [assignee_id, created_by]
users (1) ←→ (M) task_history
users (1) ←→ (M) bookings
users (1) ←→ (M) check_in_records
users (1) ←→ (1) user_locations
users (1) ←→ (M) quick_links [created_by]
users (1) ←→ (M) user_quick_links ←→ (M) quick_links
users (1) ←→ (M) glossary_terms [created_by, approved_by]
users (1) ←→ (M) glossary_history
users (1) ←→ (M) notifications
users (1) ←→ (M) notification_preferences

equipment (1) ←→ (M) bookings

glossary_categories (1) ←→ (M) glossary_terms
glossary_categories (1) ←→ (M) glossary_categories [parent_category_id]
glossary_terms (1) ←→ (M) glossary_terms [parent_term_id]
glossary_terms (1) ←→ (M) glossary_history

events (1) ←→ (M) events [parent_event_id for recurring]
```

---

## Indexes & Performance

### Critical Indexes for Performance

1. **Calendar Queries** (most frequent):
   ```sql
   CREATE INDEX idx_events_date_range ON events (event_date, start_time);
   CREATE INDEX idx_events_user_date ON event_attendees (user_id, event_id);
   ```

2. **Task Dashboard** (urgent task filtering):
   ```sql
   CREATE INDEX idx_tasks_urgent_dashboard ON tasks (urgency, status, deadline) 
   WHERE status != 'completed';
   ```

3. **Equipment Availability** (booking conflicts):
   ```sql
   CREATE INDEX idx_bookings_overlap ON bookings (equipment_id, start_date, end_date, status)
   WHERE status = 'active';
   ```

4. **Location Tracking** (active check-ins):
   ```sql
   CREATE INDEX idx_checkin_active_users ON check_in_records (user_id, check_in_time)
   WHERE check_out_time IS NULL;
   ```

5. **Notification Feed** (unread count):
   ```sql
   CREATE INDEX idx_notifications_unread ON notifications (user_id, created_at)
   WHERE is_read = FALSE;
   ```

6. **Glossary Search** (full-text):
   ```sql
   CREATE INDEX idx_glossary_fulltext ON glossary_terms 
   USING GIN (to_tsvector('english', acronym || ' ' || full_name || ' ' || COALESCE(definition, '')));
   ```

---

## Data Retention & Cleanup Policies

### Recommended Policies

1. **Sessions**: Delete expired sessions older than 7 days
2. **Notifications**: Auto-delete read notifications older than 30 days
3. **Task History**: Retain for 1 year, then archive
4. **Check-in Records**: Retain for 6 months for active queries
5. **Booking History**: Keep completed bookings for 1 year
6. **Glossary History**: Retain indefinitely for audit purposes

---

## Security Considerations

1. **Password Storage**: Use bcrypt with minimum 12 rounds
2. **Session Tokens**: Use JWT with short expiration (24 hours)
3. **Row-Level Security**: Implement department-based access control
4. **Audit Logging**: Track all sensitive operations (task deletion, user modifications)
5. **Data Encryption**: Encrypt sensitive fields (passwords, session tokens) at rest
6. **SQL Injection Prevention**: Use parameterized queries exclusively

---

## Migration Strategy

### Recommended Order:
1. Create `users` and `sessions` tables first
2. Create all entity tables (events, tasks, equipment, etc.)
3. Create junction/relationship tables (event_attendees, bookings, etc.)
4. Create history/audit tables
5. Add indexes after initial data load
6. Set up foreign key constraints
7. Configure triggers for auto-updating `updated_at` timestamps

---

## Technology Recommendations

- **Database**: PostgreSQL 14+ (for JSONB, full-text search, and advanced indexing)
- **ORM**: Prisma (TypeScript) or Django ORM (Python)
- **Migrations**: Flyway or built-in ORM migration tools
- **Backup Strategy**: Daily automated backups with 30-day retention

---

*Last Updated: December 2025*
*Version: 1.0.0*
