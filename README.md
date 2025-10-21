# Centralized Collaboration Dashboard - IT-Engineering Coordination Platform

## Project Overview

A full-stack web application designed for IT-Engineering coordination with features including:

- **Centralized Dashboard**: Single interface for both IT and Engineering teams
- **Calendar & Equipment Booking**: Shared calendar with equipment booking to prevent conflicts
- **Task Management**: Task upload with urgency tagging and automated "Must Do" highlighting
- **Personnel Coordination**: Check-in/check-out system with real-time status visibility
- **Quick Links**: Dedicated panel for recurring meeting links and important resources
- **Shared Glossary**: Searchable HVAC and BMS terminology database with user contributions

## Technology Stack

### Backend
- **Language**: Rust
- **Web Framework**: Actix Web 4.4
- **Database**: SQLite with SQLX
- **Authentication**: JWT (JSON Web Tokens)
- **Additional**: CORS support, Bcrypt for password hashing

### Frontend
- **Framework**: React 18
- **Routing**: React Router DOM v6
- **HTTP Client**: Axios
- **Notifications**: React Toastify
- **Styling**: Custom CSS

### Database
- **Type**: SQLite
- **Schema**: Normalized design with triggers and indexes
- **Features**: Audit logging, automated timestamps, views for current status

## Project Structure

```
3124-capstone-prototype/
├── backend/
│   ├── src/
│   │   ├── main.rs              # Application entry point
│   │   ├── models.rs            # Data models
│   │   ├── auth.rs              # JWT authentication
│   │   └── handlers/            # API route handlers
│   │       ├── mod.rs
│   │       ├── auth_handler.rs
│   │       ├── calendar_handler.rs
│   │       ├── equipment_handler.rs
│   │       ├── task_handler.rs
│   │       ├── personnel_handler.rs
│   │       ├── quick_link_handler.rs
│   │       └── glossary_handler.rs
│   ├── Cargo.toml               # Rust dependencies
│   └── .env                     # Environment configuration
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── Auth/           # Login/Register
│   │   │   ├── Dashboard/      # Main dashboard
│   │   │   ├── Layout/         # App layout & navigation
│   │   │   ├── Calendar/       # Calendar & events
│   │   │   ├── Equipment/      # Equipment management
│   │   │   ├── Tasks/          # Task management
│   │   │   ├── Personnel/      # Personnel status
│   │   │   ├── QuickLinks/     # Quick links
│   │   │   └── Glossary/       # Glossary
│   │   ├── context/            # React Context (Auth)
│   │   ├── services/           # API services
│   │   ├── App.js              # Main app component
│   │   └── index.js            # Entry point
│   ├── package.json            # Node dependencies
│   └── public/                 # Static files
├── database_schema.sql         # Database schema
├── seed_data.sql               # Initial seed data
└── README.md                   # This file
```

## Prerequisites

### Backend Requirements
- Rust (latest stable version)
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```
- Cargo (comes with Rust)

### Frontend Requirements
- Node.js (v16 or higher)
- npm or yarn

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd 3124-capstone-prototype
```

### 2. Database Setup

Initialize the SQLite database:

```bash
# Create database from schema
sqlite3 dashboard.db < database_schema.sql

# Insert seed data
sqlite3 dashboard.db < seed_data.sql
```

The database will be created in the root directory as `dashboard.db`.

### 3. Backend Setup

```bash
cd backend

# Install dependencies (automatically done by cargo)
# Build the project
cargo build

# Run the backend server
cargo run
```

The backend will start on `http://localhost:8080`

**Default Configuration** (`.env` file):
- `DATABASE_URL=sqlite:../dashboard.db`
- `HOST=127.0.0.1`
- `PORT=8080`
- `JWT_SECRET=your-secret-key-change-this-in-production`
- `JWT_EXPIRATION=86400` (24 hours)
- `CORS_ORIGIN=http://localhost:3000`

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

The frontend will start on `http://localhost:3000`

## Default User Accounts

The seed data includes the following test accounts:

| Username  | Password | Department  | Role  |
| --------- | -------- | ----------- | ----- |
| admin     | admin123 | Admin       | admin |
| john_it   | admin123 | IT          | user  |
| sarah_eng | admin123 | Engineering | user  |

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Users
- `GET /api/users/me` - Get current user
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/department/{department}` - Get users by department

### Calendar
- `POST /api/calendar` - Create event
- `GET /api/calendar` - Get all events (with filters)
- `GET /api/calendar/{id}` - Get event by ID
- `PUT /api/calendar/{id}` - Update event
- `DELETE /api/calendar/{id}` - Delete event

### Equipment
- `POST /api/equipment` - Create equipment (admin only)
- `GET /api/equipment` - Get all equipment
- `GET /api/equipment/available` - Get available equipment

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - Get all bookings
- `GET /api/bookings/my` - Get user's bookings
- `PUT /api/bookings/{id}/status` - Update booking status
- `DELETE /api/bookings/{id}` - Delete booking

### Tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks` - Get all tasks (with filters)
- `GET /api/tasks/urgent` - Get urgent tasks
- `GET /api/tasks/my` - Get user's tasks
- `GET /api/tasks/{id}` - Get task by ID
- `PUT /api/tasks/{id}` - Update task
- `DELETE /api/tasks/{id}` - Delete task

### Personnel
- `POST /api/personnel/status` - Update status
- `GET /api/personnel/status` - Get all current statuses
- `GET /api/personnel/status/me` - Get user's status
- `GET /api/personnel/status/history/{user_id}` - Get status history
- `GET /api/personnel/status/department/{department}` - Get statuses by department

### Quick Links
- `POST /api/quick-links` - Create quick link
- `GET /api/quick-links` - Get all quick links
- `GET /api/quick-links/pinned` - Get pinned links
- `GET /api/quick-links/{id}` - Get link by ID
- `PUT /api/quick-links/{id}` - Update link
- `DELETE /api/quick-links/{id}` - Delete link

### Glossary
- `GET /api/glossary/categories` - Get all categories
- `POST /api/glossary/terms` - Create term
- `GET /api/glossary/terms` - Get all terms
- `POST /api/glossary/terms/search` - Search terms
- `GET /api/glossary/terms/{id}` - Get term by ID
- `PUT /api/glossary/terms/{id}` - Update term
- `DELETE /api/glossary/terms/{id}` - Delete term

## Features Implementation Status

### ✅ Completed Features

1. **Authentication System**
   - JWT-based authentication
   - User registration and login
   - Role-based access control (admin/user)
   - Password hashing with Bcrypt

2. **Database Schema**
   - Normalized SQLite database design
   - Full CRUD operations for all entities
   - Automated timestamps and triggers
   - Audit logging capability

3. **Backend API**
   - RESTful API with Actix Web
   - CORS support for frontend integration
   - Error handling and validation
   - All 7 feature modules implemented

4. **Frontend Foundation**
   - React application structure
   - Routing with protected routes
   - Authentication context
   - Dashboard with real-time data
   - Responsive layout with sidebar navigation

### 🚧 In Progress / To Be Completed

1. **Calendar Component**
   - Visual calendar interface
   - Event creation/editing modal
   - Equipment booking integration
   - Conflict detection UI

2. **Task Management Component**
   - Task list with filtering
   - Urgency level visualization
   - Task creation/editing forms
   - File attachments

3. **Equipment Management Component**
   - Equipment list and search
   - Booking calendar view
   - Availability checker
   - Booking approval workflow

4. **Personnel Coordination Component**
   - Status update interface
   - Real-time status dashboard
   - Location tracking
   - Department filtering

5. **Quick Links Component**
   - Link management interface
   - Pin/unpin functionality
   - Category organization
   - Link validation

6. **Glossary Component**
   - Search interface
   - Category navigation
   - Term creation/editing
   - Related terms linking

## Development Commands

### Backend

```bash
# Run in development mode
cargo run

# Run with auto-reload (install cargo-watch first)
cargo install cargo-watch
cargo watch -x run

# Run tests
cargo test

# Build for production
cargo build --release
```

### Frontend

```bash
# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

## Environment Configuration

### Backend `.env` Variables

```env
DATABASE_URL=sqlite:../dashboard.db
HOST=127.0.0.1
PORT=8080
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRATION=86400
CORS_ORIGIN=http://localhost:3000
RUST_LOG=info
```

### Frontend Environment Variables

Create `.env` file in `frontend/` directory:

```env
REACT_APP_API_URL=http://localhost:8080/api
```

## Production Deployment

### Backend Deployment

1. Build the release binary:
   ```bash
   cargo build --release
   ```

2. Copy the binary and database to your server

3. Set production environment variables

4. Run with a process manager (systemd, PM2, etc.)

### Frontend Deployment

1. Build the production bundle:
   ```bash
   npm run build
   ```

2. Serve the `build/` directory with a web server (Nginx, Apache, etc.)

3. Configure reverse proxy to backend API

## Troubleshooting

### Backend Issues

**Database not found:**
- Ensure `dashboard.db` is created in the root directory
- Check `DATABASE_URL` in `.env` points to correct path

**Port already in use:**
- Change `PORT` in `.env` file
- Kill existing process using the port

### Frontend Issues

**API connection refused:**
- Ensure backend is running on port 8080
- Check CORS configuration in backend `.env`

**Module not found:**
- Run `npm install` to install dependencies
- Delete `node_modules` and `package-lock.json`, then reinstall

## Future Enhancements

- Real-time updates with WebSockets
- Email notifications for urgent tasks/deadlines
- Mobile responsive improvements
- File upload support for tasks
- Advanced search and filtering
- Data visualization charts
- Export functionality (PDF/Excel)
- Integration with external calendars (Google Calendar, Outlook)
- AI-powered glossary suggestions

## Contributing

This is a capstone project for SBE3124. For questions or contributions, please contact the project team.

## License

This project is developed as part of an academic capstone project.

## Acknowledgments

- Supervisor and IWSP work team for feedback and requirements
- SIT academic team for guidance
- All interns and staff who provided valuable input

---

**Project Type**: System Performance, Intelligence and Sustainability in Buildings (Workflow Process Optimization)

**Date**: October 2025
