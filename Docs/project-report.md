# IT-Engineering Collaboration Dashboard
## Project Report

**Project Type**: System Performance, Intelligence and Sustainability in Buildings (Workflow Process Optimization)  
**Version**: 1.4.2  
**Date**: December 2025

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Project Overview](#2-project-overview)
3. [Technology Stack](#3-technology-stack)
4. [System Architecture](#4-system-architecture)
5. [Feature Overview](#5-feature-overview)
6. [Database Design](#6-database-design)
7. [Security Implementation](#7-security-implementation)
8. [Development Decisions & Rationale](#8-development-decisions--rationale)
9. [Future Considerations](#9-future-considerations)

---

## 1. Executive Summary

The IT-Engineering Collaboration Dashboard is a full-stack web application designed to bridge communication gaps between IT and Engineering teams within building management environments. The platform provides a centralized interface for task management, equipment booking, personnel coordination, and knowledge sharing—specifically tailored for HVAC and BMS (Building Management System) operations.

### Key Achievements
- **Unified Platform**: Single interface serving both IT and Engineering departments
- **Real-time Coordination**: Task assignment, equipment booking, and personnel tracking
- **Knowledge Management**: Searchable glossary for technical terminology
- **Role-based Access**: Secure authentication with project-level permissions

---

## 2. Project Overview

### Problem Statement
In building management environments, IT and Engineering teams often operate in silos despite having interdependent workflows. This leads to:
- Scheduling conflicts for shared equipment
- Miscommunication on task priorities
- Difficulty tracking personnel availability
- Knowledge gaps between departments

### Solution
A centralized collaboration dashboard that provides:
- Shared calendar and equipment booking system
- Task management with urgency tagging
- Real-time personnel check-in/check-out visibility
- Collaborative glossary for technical terms
- Project management with team coordination

### Target Users
- **IT Technicians**: Managing network infrastructure, server maintenance
- **Engineering Staff**: HVAC technicians, BMS specialists
- **Team Leads**: Project coordination, resource allocation
- **Administrators**: User management, system oversight

---

## 3. Technology Stack

### Backend

| Technology    | Version       | Purpose                                          |
| ------------- | ------------- | ------------------------------------------------ |
| **Rust**      | Latest Stable | Core programming language                        |
| **Actix Web** | 4.4           | High-performance web framework                   |
| **SQLite**    | 3.x           | Embedded relational database                     |
| **SQLx**      | 0.7           | Async SQL toolkit with compile-time verification |
| **JWT**       | -             | JSON Web Tokens for authentication               |
| **bcrypt**    | -             | Password hashing                                 |
| **UUID**      | -             | Unique identifier generation                     |

#### Rationale for Rust + Actix Web
1. **Performance**: Rust's zero-cost abstractions and memory safety provide excellent runtime performance without garbage collection overhead
2. **Safety**: Compile-time guarantees prevent common bugs like null pointer dereferences and data races
3. **Concurrency**: Actix Web's actor model efficiently handles concurrent requests
4. **Resource Efficiency**: Low memory footprint ideal for deployment scenarios
5. **Reliability**: Type system catches errors at compile time rather than runtime

### Frontend

| Technology       | Version | Purpose                      |
| ---------------- | ------- | ---------------------------- |
| **React**        | 18      | UI component library         |
| **TypeScript**   | 5.x     | Type-safe JavaScript         |
| **Vite**         | Latest  | Build tool and dev server    |
| **Tailwind CSS** | 3.x     | Utility-first CSS framework  |
| **shadcn/ui**    | Latest  | Accessible component library |
| **Lucide React** | Latest  | Icon library                 |
| **date-fns**     | Latest  | Date manipulation utilities  |

#### Rationale for React + TypeScript + Vite
1. **Developer Experience**: Hot module replacement, fast builds, excellent error messages
2. **Type Safety**: TypeScript catches errors during development and improves code maintainability
3. **Component Architecture**: React's component model promotes reusability and separation of concerns
4. **Modern Tooling**: Vite provides near-instant dev server startup and optimized production builds
5. **Ecosystem**: Large community, extensive libraries, and well-documented patterns

### Database

| Technology | Purpose                                        |
| ---------- | ---------------------------------------------- |
| **SQLite** | Embedded database requiring no separate server |

#### Rationale for SQLite
1. **Simplicity**: Zero configuration, single file database
2. **Portability**: Easy deployment without database server setup
3. **Performance**: Excellent read performance for typical workloads
4. **Reliability**: ACID compliant with proven stability
5. **Development**: Same database in development and production

---

## 4. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Browser                          │
│                     (React + TypeScript)                        │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTP/REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Actix Web Server                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Middleware  │  │   Routes     │  │      Models          │  │
│  │  - Auth      │  │  - /auth     │  │  - User              │  │
│  │  - Logging   │  │  - /users    │  │  - Task              │  │
│  │              │  │  - /tasks    │  │  - Project           │  │
│  │              │  │  - /projects │  │  - Event             │  │
│  │              │  │  - /calendar │  │  - Equipment         │  │
│  │              │  │  - /equipment│  │  - Notification      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │ SQLx Queries
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SQLite Database                             │
│           (database.sqlite - Single File)                       │
└─────────────────────────────────────────────────────────────────┘
```

### Backend Structure

```
backend/src/
├── main.rs              # Application entry point, server configuration
├── error.rs             # Custom error types and handling
├── middleware/
│   ├── auth.rs          # JWT authentication middleware
│   └── logging.rs       # Request/response logging
├── models/
│   ├── mod.rs           # Module exports
│   ├── users.rs         # User-related types
│   ├── tasks.rs         # Task and assignee types
│   ├── projects.rs      # Project and member types
│   ├── events.rs        # Calendar event types
│   ├── equipment.rs     # Equipment and booking types
│   ├── glossary.rs      # Glossary term types
│   ├── notifications.rs # Notification types
│   ├── locations.rs     # Location tracking types
│   ├── quick_links.rs   # Quick link types
│   └── sessions.rs      # Session management types
└── routes/
    ├── mod.rs           # Route configuration
    ├── auth.rs          # Login, register, logout
    ├── users.rs         # User management
    ├── tasks.rs         # Task CRUD + assignees
    ├── projects.rs      # Project management + members
    ├── events.rs        # Calendar events + attendees
    ├── equipment.rs     # Equipment + bookings
    ├── dashboard.rs     # Dashboard statistics
    ├── glossary.rs      # Terminology management
    ├── notifications.rs # Notification handling
    ├── locations.rs     # Personnel location tracking
    ├── quick_links.rs   # Quick links management
    └── search.rs        # Global search functionality
```

### Frontend Structure

```
frontend/src/
├── App.tsx              # Main application component, routing
├── main.tsx             # Application entry point
├── index.css            # Global styles
├── components/
│   ├── TeamDashboard.tsx    # Main dashboard with statistics
│   ├── DashboardCalendar.tsx # Calendar view with events
│   ├── TaskManagement.tsx   # Task list, creation, assignment
│   ├── Projects.tsx         # Project management
│   ├── EquipmentBooking.tsx # Equipment reservation
│   ├── Personnel.tsx        # Staff check-in/out tracking
│   ├── LocationTracker.tsx  # Personnel location display
│   ├── Glossary.tsx         # Technical terminology
│   ├── NotificationCenter.tsx # Notifications panel
│   ├── QuickLinks.tsx       # Frequently used links
│   ├── Profile.tsx          # User profile management
│   ├── Login.tsx            # Authentication
│   ├── Register.tsx         # User registration
│   └── ui/                  # shadcn/ui components
├── context/
│   └── AuthContext.tsx      # Authentication state management
└── services/
    └── api.ts               # API client and type definitions
```

---

## 5. Feature Overview

### 5.1 Team Dashboard
**Component**: `TeamDashboard.tsx`

The central hub displaying:
- **Statistics Cards**: Active projects, team members, completed tasks, meetings today
- **Interactive Drill-down**: Click cards to see detailed lists
- **Today's Tasks**: Tasks assigned to the current user for today
- **Search & Filter**: Filter detailed views by status, department, etc.

### 5.2 Calendar & Events
**Component**: `DashboardCalendar.tsx`

- **Monthly Calendar View**: Visual date picker with event indicators
- **Event Types**: Meetings, deadlines, deliveries (color-coded)
- **Event Details Modal**: View and manage event attendees
- **Attendee Management**: Add/remove attendees from events

### 5.3 Task Management
**Component**: `TaskManagement.tsx`

- **Task Creation**: Title, description, deadline, urgency level
- **Project Association**: Link tasks to projects
- **Assignee Management**: Add/remove task assignees
- **Urgency Levels**: Urgent, High, Medium, Low (color-coded)
- **Calendar Integration**: Visual deadline indicators
- **Completion Tracking**: Mark tasks complete with pagination for completed tasks
- **Equipment Booking**: Integrated booking interface

### 5.4 Project Management
**Component**: `Projects.tsx`

- **Project CRUD**: Create, read, update, delete projects
- **Role-based Permissions**:
  - Owner: Full control, can delete project
  - Admin: Can manage members and tasks
  - Member: View access, assigned tasks
- **Team Management**: Add/remove members with role assignment
- **Task Organization**: View and manage project-specific tasks
- **Paginated Views**: Navigate through tasks efficiently

### 5.5 Equipment Booking
**Component**: `EquipmentBooking.tsx`

- **Equipment Catalog**: List of available equipment
- **Booking Calendar**: Visual availability view
- **Conflict Prevention**: Prevent double-booking
- **My Bookings**: View personal reservations

### 5.6 Personnel Tracking
**Components**: `Personnel.tsx`, `LocationTracker.tsx`

- **Check-in/Check-out**: Real-time status updates
- **Location Display**: Current location of team members
- **Availability Status**: At a glance team availability

### 5.7 Glossary
**Component**: `Glossary.tsx`

- **Searchable Database**: HVAC and BMS terminology
- **User Contributions**: Add new terms and definitions
- **Category Organization**: Grouped by technical domain
- **CSV Data Source**: Easy bulk updates

### 5.8 Notifications
**Component**: `NotificationCenter.tsx`

- **Real-time Alerts**: Task assignments, meeting reminders
- **Deadline Warnings**: Upcoming deadline notifications
- **Read/Unread Status**: Track notification state

### 5.9 Quick Links
**Component**: `QuickLinks.tsx`

- **Pinned Resources**: Frequently accessed links
- **Meeting Links**: Quick access to recurring meetings
- **External Resources**: Documentation, tools, etc.

---

## 6. Database Design

### Entity Relationship Overview

```
users (1) ←→ (M) sessions
users (1) ←→ (M) tasks [created_by]
users (1) ←→ (M) task_assignees ←→ (M) tasks
users (1) ←→ (M) events [created_by]
users (1) ←→ (M) event_attendees ←→ (M) events
users (1) ←→ (M) project_members ←→ (M) projects
users (1) ←→ (M) equipment_bookings ←→ (M) equipment
users (1) ←→ (M) locations
users (1) ←→ (M) notifications
users (1) ←→ (M) quick_links
```

### Core Tables

| Table                | Purpose                             |
| -------------------- | ----------------------------------- |
| `users`              | User accounts and authentication    |
| `sessions`           | JWT session management              |
| `projects`           | Project definitions                 |
| `project_members`    | Project membership with roles       |
| `tasks`              | Task definitions with project links |
| `task_assignees`     | Task-user assignments               |
| `events`             | Calendar events                     |
| `event_attendees`    | Event-user attendance               |
| `equipment`          | Equipment inventory                 |
| `equipment_bookings` | Equipment reservations              |
| `locations`          | Personnel locations                 |
| `glossary_terms`     | Technical terminology               |
| `notifications`      | User notifications                  |
| `quick_links`        | Saved resource links                |

---

## 7. Security Implementation

### Authentication
- **JWT Tokens**: Stateless authentication with configurable expiration
- **Password Hashing**: bcrypt with appropriate work factor
- **Session Management**: Token-based with secure storage

### Authorization
- **Route Protection**: Middleware validates JWT on protected endpoints
- **Role-based Access**: Project-level permissions (owner/admin/member)
- **Resource Ownership**: Users can only modify their own resources

### Data Protection
- **Input Validation**: Server-side validation on all inputs
- **SQL Injection Prevention**: Parameterized queries via SQLx
- **CORS Configuration**: Restricted cross-origin requests

---

## 8. Development Decisions & Rationale

### Why Rust over Node.js/Python?
1. **Type Safety at Compile Time**: Catches errors before deployment
2. **Memory Safety**: No null pointer exceptions or buffer overflows
3. **Performance**: Native code execution without runtime overhead
4. **Reliability**: If it compiles, it likely runs correctly
5. **Modern Tooling**: Cargo provides excellent dependency management

### Why SQLite over PostgreSQL/MySQL?
1. **Deployment Simplicity**: No separate database server required
2. **Development Parity**: Same database in dev and production
3. **Sufficient Scale**: Appropriate for team-sized workloads
4. **Reduced Infrastructure**: Single binary + database file deployment

### Why shadcn/ui over Material-UI/Chakra?
1. **Copy-Paste Components**: Full source code control
2. **Customization**: Easy to modify without overriding styles
3. **Accessibility**: Built on Radix UI primitives
4. **Tailwind Integration**: Native Tailwind CSS styling
5. **No Runtime Dependency**: Components become part of codebase

### Why Vite over Create React App?
1. **Speed**: Near-instant dev server startup
2. **HMR**: Fast hot module replacement
3. **Build Performance**: Rollup-based optimized production builds
4. **Modern Defaults**: ESM-first approach
5. **Active Maintenance**: CRA is effectively deprecated

---

## 9. Future Considerations

### Potential Enhancements
1. **Real-time Updates**: WebSocket integration for live data sync
2. **Mobile App**: React Native companion application
3. **Email Notifications**: SMTP integration for email alerts
4. **File Attachments**: Document upload for tasks/projects
5. **Reporting**: Analytics and report generation
6. **Calendar Integration**: Google/Outlook calendar sync
7. **API Rate Limiting**: Prevent abuse on public endpoints
8. **Audit Logging**: Track all data modifications

### Scalability Path
1. **Database Migration**: PostgreSQL for larger deployments
2. **Caching Layer**: Redis for session storage and caching
3. **Load Balancing**: Multiple backend instances
4. **CDN**: Static asset distribution

---

## Appendix A: API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### Users
- `GET /api/users` - List all users
- `GET /api/users/me` - Current user info
- `PUT /api/users/me` - Update current user

### Tasks
- `GET /api/tasks` - List tasks (with filters)
- `POST /api/tasks` - Create task
- `PUT /api/tasks/{id}` - Update task
- `DELETE /api/tasks/{id}` - Delete task
- `GET /api/tasks/{id}/assignees` - Get task assignees
- `POST /api/tasks/{id}/assignees` - Add assignees
- `DELETE /api/tasks/{id}/assignees/{user_id}` - Remove assignee

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/{id}` - Get project details
- `PUT /api/projects/{id}` - Update project
- `DELETE /api/projects/{id}` - Delete project
- `GET /api/projects/{id}/members` - Get project members
- `POST /api/projects/{id}/members` - Add member
- `DELETE /api/projects/{id}/members/{user_id}` - Remove member

### Events
- `GET /api/calendar/events` - List events (date range)
- `POST /api/calendar/events` - Create event
- `PUT /api/calendar/events/{id}` - Update event
- `DELETE /api/calendar/events/{id}` - Delete event
- `GET /api/calendar/events/{id}/attendees` - Get attendees
- `POST /api/calendar/events/{id}/attendees` - Add attendees
- `DELETE /api/calendar/events/{id}/attendees/{user_id}` - Remove attendee

### Equipment
- `GET /api/equipment` - List equipment
- `POST /api/equipment/bookings` - Create booking
- `GET /api/equipment/bookings/my` - My bookings
- `DELETE /api/equipment/bookings/{id}` - Cancel booking

### Dashboard
- `GET /api/dashboard` - Dashboard statistics

### Other
- `GET /api/glossary` - List glossary terms
- `POST /api/glossary` - Add term
- `GET /api/notifications` - List notifications
- `GET /api/locations` - Get personnel locations
- `GET /api/quick-links` - Get quick links

---

*Document generated December 2025*
