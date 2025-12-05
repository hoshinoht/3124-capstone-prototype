# Changelog
## IT-Engineering Collaboration Dashboard

All notable changes to this project will be documented in this file.

---

## [1.3.0] - December 2025

### 🎉 New Features

#### **Projects Module Enhancements**
- **Member & Task Counts**: Project cards now display accurate member and task counts
  - Backend API updated to include `memberCount` and `taskCount` in project list response
  - Counts are calculated dynamically from `project_members` and `tasks` tables

#### **Task Pagination in Project Details**
- **Paginated Task List**: Project tasks are now paginated instead of scrollable
  - 5 tasks displayed per page
  - Navigation controls with previous/next buttons
  - Page indicator showing current page and total pages
  - "Showing X-Y of Z" count display
  - Automatic page reset when switching projects

### 🌏 Data Improvements

#### **Singapore Location Data**
- **Realistic Singapore Locations**: Updated all placeholder locations to actual Singapore business districts
  - Changi Business Park
  - Marina Bay Financial Centre
  - Jurong Industrial Estate
  - Suntec City
  - Tuas
  - One-North
- Updated `check_in_records` and `user_locations` tables in schema.sql

### 🔧 Technical Improvements

#### **Backend Updates**
- **projects.rs**: Enhanced `get_projects` endpoint to include member and task counts per project
  - Added SQL queries to count members and tasks for each project
  - Returns `memberCount` and `taskCount` in API response

#### **Frontend Updates**
- **Projects.tsx**:
  - Added `ChevronLeft` and `ChevronRight` icons from lucide-react
  - New state: `taskPage` for pagination tracking
  - New constant: `tasksPerPage = 5`
  - Pagination controls with disabled states at boundaries
  - Page reset on project selection

---

## [1.2.0] - December 2025

### 🎨 UI/UX Improvements

#### **Login & Register Pages Redesign**
- **White Frosted Glass Effect**: Updated card backgrounds from dark to white frosted glass
  - Background: `rgba(255, 255, 255, 0.85)` with `backdrop-filter: blur(12px)`
  - Clean, modern aesthetic with subtle transparency
- **Responsive Card Width**: Cards now use 60% width on desktop (`sm:w-3/5`) and full width on mobile
- **Taller Input Fields**: Increased input height to 56px using inline styles to override component defaults
- **Consistent Styling**: Matching design between Login and Register pages

#### **Team Dashboard Enhancements**
- **Clickable Stat Cards**: Dashboard statistics are now interactive
  - Click on "Active Projects" to view all projects
  - Click on "Team Members" to view personnel tracking
  - Click on "Completed Tasks" to view task list
  - Click on "Meetings Today" to view meetings
- **Detail View Panel**: New expandable view when clicking stat cards
  - Search functionality for filtering data
  - Dropdown filters (status, urgency, etc.)
  - Back to Overview button
  - Smooth transitions and loading states
- **Proper Table Structure**: Replaced CSS grid with proper HTML table elements
  - `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>` structure
  - Fixed column widths for consistent layout
  - Proper border-collapse styling
- **Enhanced Table Spacing**: Improved row padding with inline styles
  - 20px vertical padding on all table cells
  - Bottom borders between rows (`border-b border-gray-100`)
  - Hover states on rows (`hover:bg-gray-50`)

### 🔧 Technical Improvements

#### **Component Updates**
- **TeamDashboard.tsx**:
  - Added `activeDetail` state for tracking which detail view is open
  - Added `detailData`, `detailLoading`, `searchQuery`, `filterValue` states
  - New `handleCardClick(view)` function for fetching relevant data
  - New `handleBackToOverview()` function for navigation
  - API integration with `projectsApi`, `usersApi`, `tasksApi`, `eventsApi`
  - Conditional rendering for overview vs detail views

- **Login.tsx & Register.tsx**:
  - Inline style overrides for component defaults
  - Responsive width classes with Tailwind breakpoints
  - Updated card styling with frosted glass effect

### 🐛 Bug Fixes

- Fixed input height not applying due to shadcn/ui Input component's default `h-9` class
- Fixed table layout rendering in single column (replaced CSS grid with HTML tables)
- Fixed table row spacing not applying (replaced Tailwind classes with inline styles)

---

## [1.1.0] - December 2025

### 🎉 Major Features Added

#### **Team Dashboard** (NEW)
- **Overview Section**: New main dashboard with comprehensive project statistics
  - Active Projects: 12
  - Team Members: 24
  - Completed Tasks: 87
  - Meetings Today: 3
- **Recent Meetings Panel**: Displays upcoming and completed meetings with:
  - Meeting status badges (Upcoming/Completed)
  - Host information
  - Date, time, duration, and participant count
  - Quick "Join Meeting" button
- **Quick Links Panel**: One-click access to important resources
  - Pinned meetings (black badge indicator)
  - Meeting subtitles and host information
  - External link icons for easy navigation
  - Meeting schedule timestamps

#### **Task Management Enhancements**
- **Tabbed Interface**: Complete redesign with 4 tabs
  1. **Tasks Tab**: View and manage all tasks
  2. **Add Task Tab**: Create new tasks with form validation
  3. **Equipment Booking Tab**: Book and manage equipment
  4. **Personnel Tab** (NEW): Real-time personnel tracking
- **Calendar Integration**: Side-by-side calendar view (November 2025)
  - Month navigation (previous/next)
  - Date selection highlighting
- **Task List Features**:
  - Checkbox completion tracking
  - Urgency badges (urgent/low)
  - Due date display with clock icon
  - Delete functionality per task
  - Strikethrough for completed tasks

#### **Personnel Location Tracker** (NEW)
- **Real-time Stats Dashboard**:
  - Clocked In counter (green card)
  - Total Hours worked
  - Average Hours per person
- **Export Functionality**: Blue "Export Data" button for data export
- **Advanced Filtering**:
  - Search by name or location
  - Site filter dropdown (All Sites, Client Site, Corporate, Manufacturing, Distribution)
  - Status filter (All Status, Active, Completed)
- **Personnel Cards**:
  - Color-coded avatar circles with initials
  - Role and department information
  - Location icons:
    - 🏢 Orange Building: Client Sites
    - 🏢 Blue Building: Corporate Headquarters
    - 🏭 Gray Factory: Manufacturing Plants
    - 📍 Green MapPin: Distribution Centers
  - Check In/Out times
  - Hours worked counter
  - Method indicator (Mobile/Desktop)
  - Status badges (Active in green, Completed in gray)
- **Sample Personnel Data**: 6 pre-populated personnel records

#### **Glossary Redesign** (NEW)
- **Modern UI Overhaul**:
  - Clean header with book icon
  - Professional search bar with category filters
  - Stats cards showing term counts
- **Category Filter Buttons**:
  - All (shows all 40 terms)
  - IT (21 terms)
  - Engineering (19 terms)
  - General (project management terms)
  - Black button styling for active filter
- **Two-Column Grid Layout**:
  - Large term cards with term name and full definition
  - Color-coded category badges:
    - Blue for IT terms
    - Green for Engineering terms
    - Purple for General terms
- **40 Pre-populated Terms**:
  - **IT Terms**: API, CI/CD, REST, SCADA, PLC, VPN, SSH, JWT, DNS, SQL, HTTPS, IoT, OAuth, CDN, CORS, WebSocket, etc.
  - **Engineering Terms**: SAT, PAD, CDWR, RAT, OAT, AHU, VAV, FCU, HMI, MAT, DP, BMS, VFD, CWST, etc.
  - **General Terms**: SLA, KPI, RMA, ETA, SOW, POC, QA, ROI, SOP, FAT, etc.
- **Add Term Functionality**:
  - Modal dialog with form
  - Fields: Term/Acronym, Definition, Category
  - Automatic uppercase conversion for acronyms
  - Form validation

#### **Equipment Booking Features**
- **Booking Form**:
  - Equipment name input
  - Start/End time pickers
  - Booked by field
  - Purpose description
  - Black "Book Equipment" button
- **Booking List**:
  - Purple calendar icon for each booking
  - Time range display
  - Booked by information
  - Purpose details
  - Delete functionality
- **Sample Bookings**: Conference Room A bookings pre-populated

### 🔄 Updated Features

#### **Database Schema Updates**
- **tasks table**: Added `is_completed` BOOLEAN field for checkbox tracking
- **Indexes**: Added `idx_tasks_completed` on `is_completed` field
- Enhanced glossary_terms with full-text search support
- Optimized indexes for personnel location queries

#### **API Endpoints Added**

##### Dashboard API (NEW Section)
- `GET /dashboard/data` - Get dashboard statistics

##### Task Management API
- `GET /tasks/urgent` - Quick access to urgent tasks
- Enhanced task filtering with checkbox completion status

##### Location Tracking API
- `GET /locations/current` - Get all currently checked-in personnel
- `GET /locations/history` - Personnel check-in history with filtering
- Enhanced personnel search with site and status filters

##### Glossary API
- Simplified category structure (IT, Engineering, General)
- Full-text search across all fields
- Category filtering in term queries

### 🎨 UI/UX Improvements

- **Consistent Black Button Theme**: All primary actions use black buttons
- **Professional Card Design**: Clean borders and consistent spacing
- **Color-Coded Badges**: 
  - Red for urgent items
  - Green for low priority/active status
  - Blue for informational items
  - Purple for general categories
  - Black for pinned/important items
- **Icon Integration**: Lucide React icons throughout (Building, Factory, MapPin, Calendar, Clock, Bell, Download, etc.)
- **Responsive Grid Layouts**: 2-column and 3-column grids for better space utilization
- **Hover States**: Smooth transitions on all interactive elements

### 📊 Data & Statistics

- **40 Glossary Terms**: Comprehensive IT/Engineering terminology
- **6 Personnel Records**: Sample tracking data
- **4 Tasks**: Mix of urgent and low priority
- **2 Equipment Bookings**: Conference room schedules
- **5 Recent Meetings**: With varied statuses
- **5 Quick Links**: Including 3 pinned items

### 🔧 Technical Improvements

- **TypeScript Interfaces**: 
  - `PersonnelRecord` for location tracking
  - Enhanced `Task` interface with completion boolean
  - `EquipmentBooking` interface
- **State Management**: 
  - Personnel search and filtering state
  - Tab navigation state
  - Calendar month navigation
- **Helper Functions**:
  - `getLocationIcon()` - Returns appropriate icon for location type
  - `getAvatarColor()` - Generates consistent colors for avatars
  - `filteredPersonnel` - Advanced filtering logic

### 📝 Documentation Updates

- **Database Schema**: Updated with new fields and indexes
- **API Documentation**: 
  - Added Dashboard API section
  - Enhanced all existing sections with new endpoints
  - Updated response examples
- **CHANGELOG.md**: Created comprehensive change log (this file)

### 🐛 Bug Fixes

- Fixed task completion checkbox state management
- Improved calendar date selection visual feedback
- Enhanced search functionality across all components

### 🚀 Performance Optimizations

- Added specialized indexes for personnel location queries
- Optimized glossary full-text search
- Improved filtering performance with memoization

---

## [1.0.0] - November 2025

### Initial Release

- Dashboard with Calendar and Quick Links
- Task Management with urgency levels
- Equipment Booking system
- Location Tracker with check-in/check-out
- Shared Glossary for terminology
- Notification Center
- User Authentication
- Complete Database Schema (20+ tables)
- REST API (60+ endpoints)

---

## Future Roadmap

### Planned for v1.2.0
- [ ] Real-time notifications via WebSocket
- [ ] Mobile app version
- [ ] Advanced reporting and analytics
- [ ] Integration with external calendar systems (Google Calendar, Outlook)
- [ ] Automated task reminders
- [ ] Equipment maintenance scheduling
- [ ] Role-based access control (RBAC)
- [ ] Export functionality for all modules
- [ ] Dark mode theme
- [ ] Multi-language support

### Under Consideration
- [ ] Slack/Teams integration
- [ ] Voice-based check-in/check-out
- [ ] QR code scanning for equipment
- [ ] AI-powered task prioritization
- [ ] Collaborative document editing
- [ ] Video meeting integration
- [ ] Time tracking and reporting
- [ ] Resource allocation optimizer

---

## Migration Guide

### From v1.0.0 to v1.1.0

#### Database Migrations Required:
```sql
-- Add is_completed field to tasks table
ALTER TABLE tasks ADD COLUMN is_completed BOOLEAN DEFAULT FALSE;

-- Create index for checkbox filtering
CREATE INDEX idx_tasks_completed ON tasks(is_completed);

-- Update existing completed tasks
UPDATE tasks SET is_completed = TRUE WHERE status = 'completed';
```

#### Frontend Changes:
1. Update `TaskManagement` component import to use new tabbed interface
2. Add `TeamDashboard` component to main dashboard route
3. Update `Glossary` component with new category structure
4. No breaking changes to existing API endpoints

#### API Changes:
- **New endpoints**: See API Documentation for full list
- **Backward compatible**: All v1.0.0 endpoints still functional
- **Deprecated**: None

---

## Contributors

- **Development Team**: IT-Engineering Collaboration Hub
- **Academic Project**: Singapore Institute of Technology
- **Industry Work-Study Programme (IWSP)**: 2024-2025

---

## License

Internal Academic Project - All Rights Reserved

---

*For questions or support, contact the development team.*
