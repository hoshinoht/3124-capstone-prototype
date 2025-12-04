# API Documentation
## IT-Engineering Collaboration Dashboard REST API

---

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Dashboard API](#dashboard-api)
4. [Calendar & Events API](#calendar--events-api)
5. [Task Management API](#task-management-api)
6. [Equipment Booking API](#equipment-booking-api)
7. [Location Tracking API](#location-tracking-api)
8. [Quick Links API](#quick-links-api)
9. [Glossary API](#glossary-api)
10. [Notifications API](#notifications-api)
11. [User Management API](#user-management-api)
12. [Search API](#search-api)
13. [Error Handling](#error-handling)

---

## Overview

**Base URL**: `https://api.yourdomain.com/v1`

**Response Format**: JSON

**Date Format**: ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`)

**Pagination**: Cursor-based or offset-based (specified per endpoint)

---

## Authentication

### Login

**POST** `/auth/login`

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "john.smith@company.com",
  "password": "SecurePassword123!"
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john.smith@company.com",
      "firstName": "John",
      "lastName": "Smith",
      "department": "IT",
      "role": "Member"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2025-12-05T10:30:00Z"
  }
}
```

**Error: 401 Unauthorized**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

---

### Logout

**POST** `/auth/logout`

Invalidate current session token.

**Headers:**
```
Authorization: Bearer {token}
```

**Response: 200 OK**
```json
{
  "success": true,
  "message": "Successfully logged out"
}
```

---

### Refresh Token

**POST** `/auth/refresh`

Get a new JWT token before expiration.

**Headers:**
```
Authorization: Bearer {token}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2025-12-05T10:30:00Z"
  }
}
```

---

## Dashboard API

### Get Dashboard Data

**GET** `/dashboard/data`

Retrieve data for the dashboard.

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "tasks": {
      "total": 10,
      "pending": 3,
      "inProgress": 4,
      "completed": 3
    },
    "events": {
      "total": 5,
      "upcoming": 3,
      "past": 2
    },
    "equipment": {
      "total": 20,
      "available": 15,
      "booked": 5
    },
    "notifications": {
      "total": 8,
      "unread": 3
    }
  }
}
```

---

## Calendar & Events API

### Get Events

**GET** `/calendar/events`

Retrieve calendar events with optional filters.

**Query Parameters:**
- `startDate` (required): Start date (YYYY-MM-DD)
- `endDate` (required): End date (YYYY-MM-DD)
- `type` (optional): Filter by event type (`deadline`, `meeting`, `delivery`)
- `department` (optional): Filter by department (`IT`, `Engineering`, `Both`)
- `userId` (optional): Filter events for specific user

**Example Request:**
```
GET /calendar/events?startDate=2026-01-01&endDate=2026-01-31&type=meeting
Authorization: Bearer {token}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "title": "MsTeams Meeting with NUHS",
        "description": "Quarterly review meeting",
        "eventType": "meeting",
        "eventDate": "2026-01-08",
        "startTime": "09:30:00",
        "endTime": "10:30:00",
        "location": "Virtual",
        "meetingUrl": "https://teams.microsoft.com/...",
        "department": "Both",
        "createdBy": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "firstName": "John",
          "lastName": "Smith"
        },
        "attendees": [
          {
            "id": "660e8400-e29b-41d4-a716-446655440001",
            "firstName": "Sarah",
            "lastName": "Chen",
            "status": "accepted"
          }
        ],
        "createdAt": "2025-12-01T08:00:00Z",
        "updatedAt": "2025-12-01T08:00:00Z"
      }
    ],
    "pagination": {
      "total": 1,
      "count": 1
    }
  }
}
```

---

### Create Event

**POST** `/calendar/events`

Create a new calendar event.

**Request Body:**
```json
{
  "title": "Equipment Delivery",
  "description": "Delivery of IAQ sensors to Lab 3",
  "eventType": "delivery",
  "eventDate": "2026-01-15",
  "startTime": "15:00:00",
  "endTime": null,
  "location": "Lab 3",
  "meetingUrl": null,
  "department": "Engineering",
  "attendeeIds": [
    "660e8400-e29b-41d4-a716-446655440001"
  ],
  "isRecurring": false
}
```

**Response: 201 Created**
```json
{
  "success": true,
  "data": {
    "event": {
      "id": "8d9e6679-7425-40de-944b-e07fc1f90ae8",
      "title": "Equipment Delivery",
      "description": "Delivery of IAQ sensors to Lab 3",
      "eventType": "delivery",
      "eventDate": "2026-01-15",
      "startTime": "15:00:00",
      "endTime": null,
      "location": "Lab 3",
      "createdAt": "2025-12-04T12:30:00Z"
    }
  }
}
```

---

### Update Event

**PUT** `/calendar/events/:eventId`

Update an existing event.

**Request Body:** (partial update supported)
```json
{
  "title": "Updated Equipment Delivery Time",
  "startTime": "14:00:00"
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "event": {
      "id": "8d9e6679-7425-40de-944b-e07fc1f90ae8",
      "title": "Updated Equipment Delivery Time",
      "startTime": "14:00:00",
      "updatedAt": "2025-12-04T13:00:00Z"
    }
  }
}
```

---

### Delete Event

**DELETE** `/calendar/events/:eventId`

Delete an event.

**Response: 200 OK**
```json
{
  "success": true,
  "message": "Event deleted successfully"
}
```

---

### Get Event Attendees

**GET** `/calendar/events/:eventId/attendees`

Get list of attendees for an event.

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "attendees": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "firstName": "Sarah",
        "lastName": "Chen",
        "email": "sarah.chen@company.com",
        "department": "Engineering",
        "status": "accepted",
        "addedAt": "2025-12-01T08:00:00Z"
      }
    ]
  }
}
```

---

## Task Management API

### Get Tasks

**GET** `/tasks`

Retrieve tasks with filters.

**Query Parameters:**
- `status` (optional): Filter by status (`pending`, `in-progress`, `completed`)
- `urgency` (optional): Filter by urgency (`urgent`, `high`, `medium`, `low`)
- `department` (optional): Filter by department
- `assigneeId` (optional): Filter by assignee
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Example Request:**
```
GET /tasks?status=pending&urgency=urgent
Authorization: Bearer {token}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "9f9e6679-7425-40de-944b-e07fc1f90ae9",
        "title": "Server Migration - Building A",
        "description": "Migrate all servers from old infrastructure to new cloud-based system",
        "urgency": "urgent",
        "status": "in-progress",
        "department": "IT",
        "assignee": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "firstName": "John",
          "lastName": "Smith",
          "email": "john.smith@company.com"
        },
        "createdBy": {
          "id": "770e8400-e29b-41d4-a716-446655440003",
          "firstName": "Mike",
          "lastName": "Johnson"
        },
        "deadline": "2024-09-05T23:59:59Z",
        "daysUntilDeadline": 2,
        "completedAt": null,
        "createdAt": "2024-09-01T08:00:00Z",
        "updatedAt": "2024-09-03T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 1,
      "limit": 50,
      "offset": 0
    }
  }
}
```

---

### Get Urgent Tasks

**GET** `/tasks/urgent`

Get all urgent uncompleted tasks (shortcut endpoint).

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "9f9e6679-7425-40de-944b-e07fc1f90ae9",
        "title": "Server Migration - Building A",
        "urgency": "urgent",
        "status": "in-progress",
        "deadline": "2024-09-05T23:59:59Z",
        "daysUntilDeadline": 2
      }
    ],
    "count": 1
  }
}
```

---

### Create Task

**POST** `/tasks`

Create a new task.

**Request Body:**
```json
{
  "title": "Update API Documentation",
  "description": "Update API docs for new Engineering endpoints",
  "urgency": "high",
  "department": "Both",
  "assigneeId": "550e8400-e29b-41d4-a716-446655440000",
  "deadline": "2024-09-10T17:00:00Z"
}
```

**Response: 201 Created**
```json
{
  "success": true,
  "data": {
    "task": {
      "id": "af9e6679-7425-40de-944b-e07fc1f90aea",
      "title": "Update API Documentation",
      "description": "Update API docs for new Engineering endpoints",
      "urgency": "high",
      "status": "pending",
      "department": "Both",
      "assigneeId": "550e8400-e29b-41d4-a716-446655440000",
      "deadline": "2024-09-10T17:00:00Z",
      "createdAt": "2024-09-04T09:15:00Z"
    }
  }
}
```

---

### Update Task Status

**PATCH** `/tasks/:taskId/status`

Update task status (separate endpoint for quick status changes).

**Request Body:**
```json
{
  "status": "completed"
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "task": {
      "id": "9f9e6679-7425-40de-944b-e07fc1f90ae9",
      "status": "completed",
      "completedAt": "2024-09-04T15:30:00Z",
      "updatedAt": "2024-09-04T15:30:00Z"
    }
  }
}
```

---

### Update Task

**PUT** `/tasks/:taskId`

Update task details (full update).

**Request Body:**
```json
{
  "title": "Updated Task Title",
  "urgency": "urgent",
  "deadline": "2024-09-06T17:00:00Z"
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "task": {
      "id": "9f9e6679-7425-40de-944b-e07fc1f90ae9",
      "title": "Updated Task Title",
      "urgency": "urgent",
      "deadline": "2024-09-06T17:00:00Z",
      "updatedAt": "2024-09-04T16:00:00Z"
    }
  }
}
```

---

### Delete Task

**DELETE** `/tasks/:taskId`

Delete a task (creates history record before deletion).

**Response: 200 OK**
```json
{
  "success": true,
  "message": "Task deleted successfully"
}
```

---

### Get Task History

**GET** `/tasks/:taskId/history`

Get change history for a task.

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "id": "bf9e6679-7425-40de-944b-e07fc1f90aeb",
        "action": "status_changed",
        "fieldChanged": "status",
        "oldValue": "pending",
        "newValue": "in-progress",
        "changedBy": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "firstName": "John",
          "lastName": "Smith"
        },
        "createdAt": "2024-09-03T10:30:00Z"
      }
    ]
  }
}
```

---

## Equipment Booking API

### Get Equipment

**GET** `/equipment`

Retrieve equipment list with filters.

**Query Parameters:**
- `status` (optional): Filter by status (`available`, `booked`, `in-use`, `maintenance`)
- `category` (optional): Filter by category
- `location` (optional): Filter by location
- `search` (optional): Search by name, category, or location

**Example Request:**
```
GET /equipment?status=available&category=Testing
Authorization: Bearer {token}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "equipment": [
      {
        "id": "cf9e6679-7425-40de-944b-e07fc1f90aec",
        "name": "Oscilloscope OSC-2000",
        "category": "Testing",
        "location": "Lab 3",
        "status": "available",
        "serialNumber": "OSC2000-12345",
        "currentBookings": [],
        "upcomingBookings": [
          {
            "id": "df9e6679-7425-40de-944b-e07fc1f90aed",
            "startDate": "2024-09-10",
            "endDate": "2024-09-12",
            "bookedBy": "Sarah Chen"
          }
        ],
        "createdAt": "2023-05-01T00:00:00Z",
        "updatedAt": "2024-09-01T12:00:00Z"
      }
    ],
    "pagination": {
      "total": 1,
      "count": 1
    }
  }
}
```

---

### Get Equipment Details

**GET** `/equipment/:equipmentId`

Get detailed information about specific equipment.

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "equipment": {
      "id": "cf9e6679-7425-40de-944b-e07fc1f90aec",
      "name": "Oscilloscope OSC-2000",
      "category": "Testing",
      "location": "Lab 3",
      "status": "available",
      "serialNumber": "OSC2000-12345",
      "purchaseDate": "2023-05-01",
      "lastMaintenance": "2024-06-15",
      "notes": "High-precision equipment, handle with care",
      "currentBooking": null,
      "upcomingBookings": [],
      "bookingHistory": [
        {
          "id": "ef9e6679-7425-40de-944b-e07fc1f90aee",
          "bookedBy": "John Smith",
          "startDate": "2024-08-15",
          "endDate": "2024-08-20",
          "status": "completed"
        }
      ]
    }
  }
}
```

---

### Create Equipment Booking

**POST** `/equipment/:equipmentId/bookings`

Book equipment for a date range.

**Request Body:**
```json
{
  "startDate": "2024-09-15",
  "endDate": "2024-09-18",
  "purpose": "Network performance testing for Building B"
}
```

**Response: 201 Created**
```json
{
  "success": true,
  "data": {
    "booking": {
      "id": "ff9e6679-7425-40de-944b-e07fc1f90aef",
      "equipmentId": "cf9e6679-7425-40de-944b-e07fc1f90aec",
      "equipmentName": "Oscilloscope OSC-2000",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "bookedBy": "John Smith",
      "department": "IT",
      "startDate": "2024-09-15",
      "endDate": "2024-09-18",
      "purpose": "Network performance testing for Building B",
      "status": "active",
      "createdAt": "2024-09-04T10:00:00Z"
    }
  }
}
```

**Error: 409 Conflict**
```json
{
  "success": false,
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "Equipment is already booked for this period",
    "details": {
      "conflictingBooking": {
        "id": "df9e6679-7425-40de-944b-e07fc1f90aed",
        "bookedBy": "Sarah Chen",
        "startDate": "2024-09-10",
        "endDate": "2024-09-20"
      }
    }
  }
}
```

---

### Check Equipment Availability

**POST** `/equipment/:equipmentId/check-availability`

Check if equipment is available for specific dates before booking.

**Request Body:**
```json
{
  "startDate": "2024-09-15",
  "endDate": "2024-09-18"
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "isAvailable": true,
    "conflicts": []
  }
}
```

**Response with Conflicts:**
```json
{
  "success": true,
  "data": {
    "isAvailable": false,
    "conflicts": [
      {
        "bookingId": "df9e6679-7425-40de-944b-e07fc1f90aed",
        "bookedBy": "Sarah Chen",
        "department": "Engineering",
        "startDate": "2024-09-10",
        "endDate": "2024-09-20"
      }
    ]
  }
}
```

---

### Get My Bookings

**GET** `/equipment/bookings/me`

Get all bookings for the current user.

**Query Parameters:**
- `status` (optional): Filter by status (`active`, `completed`, `cancelled`)
- `upcoming` (optional): Boolean to get only future bookings

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": "ff9e6679-7425-40de-944b-e07fc1f90aef",
        "equipment": {
          "id": "cf9e6679-7425-40de-944b-e07fc1f90aec",
          "name": "Oscilloscope OSC-2000",
          "location": "Lab 3"
        },
        "startDate": "2024-09-15",
        "endDate": "2024-09-18",
        "purpose": "Network performance testing",
        "status": "active",
        "daysUntilStart": 11,
        "createdAt": "2024-09-04T10:00:00Z"
      }
    ]
  }
}
```

---

### Cancel Booking

**DELETE** `/equipment/bookings/:bookingId`

Cancel an equipment booking.

**Response: 200 OK**
```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "data": {
    "booking": {
      "id": "ff9e6679-7425-40de-944b-e07fc1f90aef",
      "status": "cancelled",
      "cancelledAt": "2024-09-04T11:00:00Z"
    }
  }
}
```

---

## Location Tracking API

### Check In

**POST** `/locations/check-in`

Check in to a location.

**Request Body:**
```json
{
  "location": "Singapore Institute of Technology",
  "notes": "Client meeting"
}
```

**Response: 201 Created**
```json
{
  "success": true,
  "data": {
    "checkIn": {
      "id": "0f9e6679-7425-40de-944b-e07fc1f90af0",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "location": "Singapore Institute of Technology",
      "checkInTime": "2025-10-02T08:53:00Z",
      "notes": "Client meeting"
    }
  }
}
```

---

### Check Out

**POST** `/locations/check-out`

Check out from current location.

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "checkIn": {
      "id": "0f9e6679-7425-40de-944b-e07fc1f90af0",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "location": "Singapore Institute of Technology",
      "checkInTime": "2025-10-02T08:53:00Z",
      "checkOutTime": "2025-10-02T17:30:00Z",
      "duration": "8 hours 37 minutes"
    }
  }
}
```

---

### Get Current Locations

**GET** `/locations/current`

Get all currently checked-in personnel.

**Query Parameters:**
- `department` (optional): Filter by department

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "activeCheckIns": [
      {
        "user": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "firstName": "Peter",
          "lastName": "Tan",
          "department": "IT"
        },
        "location": "Punggol",
        "checkInTime": "2025-10-02T09:45:00Z",
        "duration": "3 hours 15 minutes"
      }
    ],
    "count": 1
  }
}
```

---

### Get User Location History

**GET** `/locations/history`

Get check-in history for current user or specific user.

**Query Parameters:**
- `userId` (optional): Get history for specific user (admin only)
- `startDate` (optional): Filter from date
- `endDate` (optional): Filter to date
- `limit` (optional): Number of results (default: 50)

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "id": "1f9e6679-7425-40de-944b-e07fc1f90af1",
        "location": "Singapore Institute of Technology",
        "checkInTime": "2025-10-01T08:45:00Z",
        "checkOutTime": "2025-10-01T17:30:00Z",
        "duration": "8 hours 45 minutes"
      }
    ],
    "pagination": {
      "total": 1,
      "limit": 50,
      "offset": 0
    }
  }
}
```

---

### Search Team Locations

**GET** `/locations/search`

Search for team members by name and get their current location.

**Query Parameters:**
- `query` (required): Search term (name)
- `date` (optional): Specific date to query (default: today)

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "user": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "firstName": "Abigail",
          "lastName": "Tan",
          "department": "IT"
        },
        "currentLocation": "SIT",
        "checkInTime": "2025-10-02T08:51:00Z",
        "isCheckedIn": true
      }
    ]
  }
}
```

---

## Quick Links API

### Get Quick Links

**GET** `/quick-links`

Get all quick links for the user.

**Query Parameters:**
- `department` (optional): Filter by department
- `isActive` (optional): Filter active/inactive links

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "links": [
      {
        "id": "2f9e6679-7425-40de-944b-e07fc1f90af2",
        "title": "Daily Standup",
        "url": "https://teams.microsoft.com/standup",
        "description": "Daily 9am standup meeting",
        "meetingDatetime": "2025-10-03T09:00:00Z",
        "department": "Both",
        "isRecurring": true,
        "createdBy": {
          "id": "770e8400-e29b-41d4-a716-446655440003",
          "firstName": "Mike",
          "lastName": "Johnson"
        },
        "isPinned": false,
        "createdAt": "2025-09-01T10:00:00Z"
      }
    ]
  }
}
```

---

### Create Quick Link

**POST** `/quick-links`

Create a new quick link.

**Request Body:**
```json
{
  "title": "Engineering Review Meeting",
  "url": "https://zoom.us/j/123456789",
  "description": "Weekly engineering review",
  "meetingDatetime": "2025-10-10T14:00:00Z",
  "department": "Engineering",
  "isRecurring": true
}
```

**Response: 201 Created**
```json
{
  "success": true,
  "data": {
    "link": {
      "id": "3f9e6679-7425-40de-944b-e07fc1f90af3",
      "title": "Engineering Review Meeting",
      "url": "https://zoom.us/j/123456789",
      "description": "Weekly engineering review",
      "meetingDatetime": "2025-10-10T14:00:00Z",
      "department": "Engineering",
      "isRecurring": true,
      "isActive": true,
      "createdAt": "2025-10-04T12:00:00Z"
    }
  }
}
```

---

### Update Quick Link

**PUT** `/quick-links/:linkId`

Update a quick link.

**Request Body:**
```json
{
  "title": "Updated Meeting Title",
  "meetingDatetime": "2025-10-10T15:00:00Z"
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "link": {
      "id": "3f9e6679-7425-40de-944b-e07fc1f90af3",
      "title": "Updated Meeting Title",
      "meetingDatetime": "2025-10-10T15:00:00Z",
      "updatedAt": "2025-10-04T13:00:00Z"
    }
  }
}
```

---

### Delete Quick Link

**DELETE** `/quick-links/:linkId`

Delete a quick link.

**Response: 200 OK**
```json
{
  "success": true,
  "message": "Quick link deleted successfully"
}
```

---

### Pin/Unpin Quick Link

**PATCH** `/quick-links/:linkId/pin`

Toggle pin status for current user.

**Request Body:**
```json
{
  "isPinned": true
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "isPinned": true
  }
}
```

---

## Glossary API

### Get Glossary Terms

**GET** `/glossary/terms`

Get all glossary terms with optional filters.

**Query Parameters:**
- `search` (optional): Search in acronym, full name, or definition
- `categoryId` (optional): Filter by category
- `isApproved` (optional): Filter by approval status (admin only)

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "terms": [
      {
        "id": "4f9e6679-7425-40de-944b-e07fc1f90af4",
        "acronym": "API",
        "fullName": "Application Programming Interface",
        "definition": "A set of protocols and tools for building software applications",
        "category": {
          "id": "5f9e6679-7425-40de-944b-e07fc1f90af5",
          "name": "IT & Engineering Common Terms"
        },
        "subTerms": [],
        "isApproved": true,
        "usageCount": 42,
        "createdBy": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "firstName": "John",
          "lastName": "Smith"
        },
        "createdAt": "2025-06-01T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 1,
      "count": 1
    }
  }
}
```

---

### Get Glossary Categories

**GET** `/glossary/categories`

Get all glossary categories with hierarchical structure.

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "5f9e6679-7425-40de-944b-e07fc1f90af5",
        "name": "HVAC abbreviations",
        "displayOrder": 1,
        "termCount": 15,
        "subCategories": [
          {
            "id": "6f9e6679-7425-40de-944b-e07fc1f90af6",
            "name": "Air Temperatures",
            "displayOrder": 1,
            "termCount": 4
          }
        ]
      }
    ]
  }
}
```

---

### Create Glossary Term

**POST** `/glossary/terms`

Add a new term to the glossary.

**Request Body:**
```json
{
  "acronym": "SCADA",
  "fullName": "Supervisory Control and Data Acquisition",
  "definition": "A control system architecture for industrial automation",
  "categoryId": "5f9e6679-7425-40de-944b-e07fc1f90af5",
  "parentTermId": null
}
```

**Response: 201 Created**
```json
{
  "success": true,
  "data": {
    "term": {
      "id": "7f9e6679-7425-40de-944b-e07fc1f90af7",
      "acronym": "SCADA",
      "fullName": "Supervisory Control and Data Acquisition",
      "definition": "A control system architecture for industrial automation",
      "categoryId": "5f9e6679-7425-40de-944b-e07fc1f90af5",
      "isApproved": false,
      "createdAt": "2025-10-04T14:00:00Z"
    }
  }
}
```

---

### Approve Glossary Term

**PATCH** `/glossary/terms/:termId/approve`

Approve a pending glossary term (admin only).

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "term": {
      "id": "7f9e6679-7425-40de-944b-e07fc1f90af7",
      "isApproved": true,
      "approvedBy": "550e8400-e29b-41d4-a716-446655440000",
      "approvedAt": "2025-10-04T15:00:00Z"
    }
  }
}
```

---

### Update Glossary Term

**PUT** `/glossary/terms/:termId`

Update an existing glossary term.

**Request Body:**
```json
{
  "definition": "Updated definition with more detail"
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "term": {
      "id": "7f9e6679-7425-40de-944b-e07fc1f90af7",
      "definition": "Updated definition with more detail",
      "updatedAt": "2025-10-04T16:00:00Z"
    }
  }
}
```

---

### Delete Glossary Term

**DELETE** `/glossary/terms/:termId`

Delete a glossary term.

**Response: 200 OK**
```json
{
  "success": true,
  "message": "Term deleted successfully"
}
```

---

### Search Glossary

**GET** `/glossary/search`

Full-text search across all glossary terms.

**Query Parameters:**
- `q` (required): Search query
- `limit` (optional): Number of results (default: 20)

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "4f9e6679-7425-40de-944b-e07fc1f90af4",
        "acronym": "API",
        "fullName": "Application Programming Interface",
        "definition": "A set of protocols and tools for building software applications",
        "category": "IT & Engineering Common Terms",
        "relevanceScore": 0.95
      }
    ],
    "count": 1
  }
}
```

---

## Notifications API

### Get Notifications

**GET** `/notifications`

Get notifications for the current user.

**Query Parameters:**
- `isRead` (optional): Filter by read status (boolean)
- `type` (optional): Filter by type (`urgent`, `meeting`, `shipping`, `info`, `success`)
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "8f9e6679-7425-40de-944b-e07fc1f90af8",
        "type": "urgent",
        "title": "Task Deadline Approaching",
        "message": "Server Migration - Building A is due in 2 hours",
        "relatedEntityType": "task",
        "relatedEntityId": "9f9e6679-7425-40de-944b-e07fc1f90ae9",
        "isRead": false,
        "readAt": null,
        "createdAt": "2024-09-05T19:00:00Z"
      }
    ],
    "unreadCount": 1,
    "pagination": {
      "total": 1,
      "limit": 50,
      "offset": 0
    }
  }
}
```

---

### Mark Notification as Read

**PATCH** `/notifications/:notificationId/read`

Mark a single notification as read.

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "notification": {
      "id": "8f9e6679-7425-40de-944b-e07fc1f90af8",
      "isRead": true,
      "readAt": "2024-09-05T20:00:00Z"
    }
  }
}
```

---

### Mark All as Read

**POST** `/notifications/mark-all-read`

Mark all notifications as read for the current user.

**Response: 200 OK**
```json
{
  "success": true,
  "message": "All notifications marked as read",
  "data": {
    "updatedCount": 5
  }
}
```

---

### Delete Notification

**DELETE** `/notifications/:notificationId`

Delete a notification.

**Response: 200 OK**
```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

---

### Clear All Notifications

**DELETE** `/notifications`

Delete all notifications for the current user.

**Response: 200 OK**
```json
{
  "success": true,
  "message": "All notifications cleared",
  "data": {
    "deletedCount": 5
  }
}
```

---

### Get Notification Statistics

**GET** `/notifications/stats`

Get notification statistics by type.

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "stats": {
      "urgent": 2,
      "meeting": 3,
      "shipping": 1,
      "info": 4,
      "success": 2
    },
    "totalUnread": 12,
    "total": 12
  }
}
```

---

### Get Notification Preferences

**GET** `/notifications/preferences`

Get user's notification preferences.

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "preferences": [
      {
        "notificationType": "task_deadline",
        "isEnabled": true,
        "deliveryMethod": "in-app"
      },
      {
        "notificationType": "meeting_reminder",
        "isEnabled": true,
        "deliveryMethod": "both"
      }
    ]
  }
}
```

---

### Update Notification Preferences

**PUT** `/notifications/preferences`

Update notification preferences.

**Request Body:**
```json
{
  "preferences": [
    {
      "notificationType": "task_deadline",
      "isEnabled": true,
      "deliveryMethod": "both"
    }
  ]
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "message": "Preferences updated successfully"
}
```

---

## User Management API

### Get Current User

**GET** `/users/me`

Get the current authenticated user's profile.

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john.smith@company.com",
      "firstName": "John",
      "lastName": "Smith",
      "department": "IT",
      "role": "Member",
      "isActive": true,
      "lastLogin": "2025-10-04T08:30:00Z",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  }
}
```

---

### Update User Profile

**PUT** `/users/me`

Update current user's profile.

**Request Body:**
```json
{
  "firstName": "Jonathan",
  "department": "Both"
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "firstName": "Jonathan",
      "department": "Both",
      "updatedAt": "2025-10-04T16:00:00Z"
    }
  }
}
```

---

### Get All Users

**GET** `/users`

Get all users (admin only or filtered list for members).

**Query Parameters:**
- `department` (optional): Filter by department
- `role` (optional): Filter by role
- `isActive` (optional): Filter active/inactive users
- `search` (optional): Search by name or email

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "firstName": "John",
        "lastName": "Smith",
        "email": "john.smith@company.com",
        "department": "IT",
        "role": "Member",
        "isActive": true
      }
    ],
    "pagination": {
      "total": 1,
      "count": 1
    }
  }
}
```

---

### Create User (Admin Only)

**POST** `/users`

Create a new user account.

**Request Body:**
```json
{
  "email": "new.user@company.com",
  "firstName": "New",
  "lastName": "User",
  "department": "Engineering",
  "role": "Member",
  "password": "TemporaryPassword123!"
}
```

**Response: 201 Created**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "9f9e6679-7425-40de-944b-e07fc1f90af9",
      "email": "new.user@company.com",
      "firstName": "New",
      "lastName": "User",
      "department": "Engineering",
      "role": "Member",
      "isActive": true,
      "createdAt": "2025-10-04T17:00:00Z"
    }
  }
}
```

---

### Update User (Admin Only)

**PUT** `/users/:userId`

Update a user's information (admin only).

**Request Body:**
```json
{
  "role": "Admin",
  "isActive": false
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "9f9e6679-7425-40de-944b-e07fc1f90af9",
      "role": "Admin",
      "isActive": false,
      "updatedAt": "2025-10-04T18:00:00Z"
    }
  }
}
```

---

### Delete User (Admin Only)

**DELETE** `/users/:userId`

Soft delete a user account.

**Response: 200 OK**
```json
{
  "success": true,
  "message": "User deactivated successfully"
}
```

---

## Search API

### Global Search

**GET** `/search`

Search across all entities (tasks, events, equipment, glossary).

**Query Parameters:**
- `q` (required): Search query
- `types` (optional): Comma-separated entity types to search (`tasks`, `events`, `equipment`, `glossary`)
- `limit` (optional): Results per type (default: 5)

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "results": {
      "tasks": [
        {
          "type": "task",
          "id": "9f9e6679-7425-40de-944b-e07fc1f90ae9",
          "title": "Server Migration - Building A",
          "snippet": "Migrate all servers from old infrastructure...",
          "relevanceScore": 0.92
        }
      ],
      "events": [
        {
          "type": "event",
          "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
          "title": "MsTeams Meeting with NUHS",
          "snippet": "Quarterly review meeting",
          "relevanceScore": 0.85
        }
      ],
      "equipment": [],
      "glossary": [
        {
          "type": "glossary",
          "id": "4f9e6679-7425-40de-944b-e07fc1f90af4",
          "acronym": "API",
          "fullName": "Application Programming Interface",
          "relevanceScore": 0.95
        }
      ]
    },
    "totalResults": 3
  }
}
```

---

## Error Handling

### Standard Error Response Format

All API errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

---

### Common Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `INVALID_REQUEST` | Malformed request or validation error |
| 401 | `UNAUTHORIZED` | Missing or invalid authentication token |
| 403 | `FORBIDDEN` | User lacks permission for this action |
| 404 | `NOT_FOUND` | Requested resource doesn't exist |
| 409 | `CONFLICT` | Resource conflict (e.g., booking overlap) |
| 422 | `VALIDATION_ERROR` | Request validation failed |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |
| 503 | `SERVICE_UNAVAILABLE` | Temporary service outage |

---

### Validation Error Example

**Response: 422 Unprocessable Entity**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "fields": [
        {
          "field": "deadline",
          "message": "Deadline must be in the future"
        },
        {
          "field": "title",
          "message": "Title is required"
        }
      ]
    }
  }
}
```

---

## Rate Limiting

**Headers:**
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

**Limits:**
- Standard users: 1000 requests/hour
- Admin users: 5000 requests/hour

**Response when limit exceeded: 429**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 15 minutes.",
    "details": {
      "retryAfter": 900
    }
  }
}
```

---

## Webhooks (Future Feature)

### Webhook Events

Future implementation will support webhooks for:
- `task.created`, `task.updated`, `task.completed`
- `event.created`, `event.updated`, `event.cancelled`
- `booking.created`, `booking.cancelled`, `booking.conflict`
- `location.checked_in`, `location.checked_out`
- `notification.created`

---

## Versioning

**Current Version**: `v1`

API versioning is included in the URL path: `/v1/...`

Breaking changes will result in a new API version (`v2`, `v3`, etc.).

---

## Support

For API support, contact: `api-support@yourdomain.com`

**API Status Page**: `https://status.yourdomain.com`

---

*Last Updated: December 2025*
*API Version: 1.0.0*