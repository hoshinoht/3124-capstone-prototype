use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

// User Models
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: i64,
    pub username: String,
    pub email: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub full_name: String,
    pub department: String,
    pub role: String,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CreateUserRequest {
    pub username: String,
    pub email: String,
    pub password: String,
    pub full_name: String,
    pub department: String,
    pub role: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub user: UserResponse,
}

#[derive(Debug, Serialize)]
pub struct UserResponse {
    pub id: i64,
    pub username: String,
    pub email: String,
    pub full_name: String,
    pub department: String,
    pub role: String,
}

impl From<User> for UserResponse {
    fn from(user: User) -> Self {
        UserResponse {
            id: user.id,
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            department: user.department,
            role: user.role,
        }
    }
}

// Calendar Event Models
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct CalendarEvent {
    pub id: i64,
    pub title: String,
    pub description: Option<String>,
    pub event_type: String,
    pub start_datetime: DateTime<Utc>,
    pub end_datetime: DateTime<Utc>,
    pub location: Option<String>,
    pub color_code: Option<String>,
    pub created_by: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCalendarEventRequest {
    pub title: String,
    pub description: Option<String>,
    pub event_type: String,
    pub start_datetime: DateTime<Utc>,
    pub end_datetime: DateTime<Utc>,
    pub location: Option<String>,
    pub color_code: Option<String>,
    pub participant_ids: Option<Vec<i64>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCalendarEventRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub event_type: Option<String>,
    pub start_datetime: Option<DateTime<Utc>>,
    pub end_datetime: Option<DateTime<Utc>>,
    pub location: Option<String>,
    pub color_code: Option<String>,
}

// Equipment Models
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Equipment {
    pub id: i64,
    pub name: String,
    pub equipment_type: String,
    pub model: Option<String>,
    pub serial_number: Option<String>,
    pub description: Option<String>,
    pub is_available: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateEquipmentRequest {
    pub name: String,
    pub equipment_type: String,
    pub model: Option<String>,
    pub serial_number: Option<String>,
    pub description: Option<String>,
}

// Equipment Booking Models
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct EquipmentBooking {
    pub id: i64,
    pub equipment_id: i64,
    pub user_id: i64,
    pub project_name: Option<String>,
    pub start_datetime: DateTime<Utc>,
    pub end_datetime: DateTime<Utc>,
    pub purpose: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct EquipmentBookingWithDetails {
    pub id: i64,
    pub equipment_id: i64,
    pub equipment_name: String,
    pub user_id: i64,
    pub user_name: String,
    pub project_name: Option<String>,
    pub start_datetime: DateTime<Utc>,
    pub end_datetime: DateTime<Utc>,
    pub purpose: Option<String>,
    pub status: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateEquipmentBookingRequest {
    pub equipment_id: i64,
    pub project_name: Option<String>,
    pub start_datetime: DateTime<Utc>,
    pub end_datetime: DateTime<Utc>,
    pub purpose: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateBookingStatusRequest {
    pub status: String,
}

// Task Models
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Task {
    pub id: i64,
    pub title: String,
    pub description: Option<String>,
    pub urgency_level: String,
    pub status: String,
    pub deadline: Option<DateTime<Utc>>,
    pub assigned_to: Option<i64>,
    pub assigned_by: i64,
    pub project_name: Option<String>,
    pub tags: Option<String>,
    pub completion_date: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct TaskWithDetails {
    pub id: i64,
    pub title: String,
    pub description: Option<String>,
    pub urgency_level: String,
    pub status: String,
    pub deadline: Option<DateTime<Utc>>,
    pub assigned_to: Option<i64>,
    pub assigned_to_name: Option<String>,
    pub assigned_by: i64,
    pub assigned_by_name: String,
    pub project_name: Option<String>,
    pub tags: Option<String>,
    pub completion_date: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTaskRequest {
    pub title: String,
    pub description: Option<String>,
    pub urgency_level: String,
    pub deadline: Option<DateTime<Utc>>,
    pub assigned_to: Option<i64>,
    pub project_name: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTaskRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub urgency_level: Option<String>,
    pub status: Option<String>,
    pub deadline: Option<DateTime<Utc>>,
    pub assigned_to: Option<i64>,
    pub project_name: Option<String>,
    pub tags: Option<Vec<String>>,
}

// Personnel Status Models
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct PersonnelStatus {
    pub id: i64,
    pub user_id: i64,
    pub status: String,
    pub location: Option<String>,
    pub notes: Option<String>,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct CurrentPersonnelStatus {
    pub id: i64,
    pub user_id: i64,
    pub username: String,
    pub full_name: String,
    pub department: String,
    pub status: String,
    pub location: Option<String>,
    pub notes: Option<String>,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePersonnelStatusRequest {
    pub status: String,
    pub location: Option<String>,
    pub notes: Option<String>,
}

// Quick Link Models
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct QuickLink {
    pub id: i64,
    pub title: String,
    pub url: String,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub category: Option<String>,
    pub display_order: i64,
    pub is_pinned: bool,
    pub created_by: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateQuickLinkRequest {
    pub title: String,
    pub url: String,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub category: Option<String>,
    pub is_pinned: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateQuickLinkRequest {
    pub title: Option<String>,
    pub url: Option<String>,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub category: Option<String>,
    pub display_order: Option<i64>,
    pub is_pinned: Option<bool>,
}

// Glossary Models
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct GlossaryCategory {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub parent_category_id: Option<i64>,
    pub display_order: i64,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct GlossaryTerm {
    pub id: i64,
    pub term: String,
    pub abbreviation: Option<String>,
    pub definition: String,
    pub category_id: Option<i64>,
    pub examples: Option<String>,
    pub related_terms: Option<String>,
    pub created_by: i64,
    pub updated_by: Option<i64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct GlossaryTermWithCategory {
    pub id: i64,
    pub term: String,
    pub abbreviation: Option<String>,
    pub definition: String,
    pub category_id: Option<i64>,
    pub category_name: Option<String>,
    pub examples: Option<String>,
    pub related_terms: Option<String>,
    pub created_by: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateGlossaryTermRequest {
    pub term: String,
    pub abbreviation: Option<String>,
    pub definition: String,
    pub category_id: Option<i64>,
    pub examples: Option<Vec<String>>,
    pub related_terms: Option<Vec<i64>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateGlossaryTermRequest {
    pub term: Option<String>,
    pub abbreviation: Option<String>,
    pub definition: Option<String>,
    pub category_id: Option<i64>,
    pub examples: Option<Vec<String>>,
    pub related_terms: Option<Vec<i64>>,
}

#[derive(Debug, Deserialize)]
pub struct SearchGlossaryRequest {
    pub query: String,
}

// Notification Models
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Notification {
    pub id: i64,
    pub user_id: i64,
    pub title: String,
    pub message: String,
    pub notification_type: String,
    pub is_read: bool,
    pub related_entity_type: Option<String>,
    pub related_entity_id: Option<i64>,
    pub created_at: DateTime<Utc>,
}

// Common Response Types
#[derive(Debug, Serialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub message: Option<String>,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        ApiResponse {
            success: true,
            data: Some(data),
            message: None,
        }
    }

    pub fn error(message: String) -> ApiResponse<()> {
        ApiResponse {
            success: false,
            data: None,
            message: Some(message),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct PaginatedResponse<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub page: i64,
    pub per_page: i64,
}
