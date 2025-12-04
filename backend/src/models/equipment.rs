use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Equipment {
    pub id: String,
    pub name: String,
    pub category: String,
    pub location: String,
    pub status: String,
    pub serial_number: Option<String>,
    pub purchase_date: Option<String>,
    pub last_maintenance: Option<String>,
    pub notes: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EquipmentResponse {
    pub id: String,
    pub name: String,
    pub category: String,
    pub location: String,
    pub status: String,
    pub serial_number: Option<String>,
    pub purchase_date: Option<String>,
    pub last_maintenance: Option<String>,
    pub notes: Option<String>,
    pub current_bookings: Option<Vec<BookingResponse>>,
    pub upcoming_bookings: Option<Vec<BookingResponse>>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Booking {
    pub id: String,
    pub equipment_id: String,
    pub user_id: String,
    pub department: String,
    pub start_date: String,
    pub end_date: String,
    pub purpose: String,
    pub status: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub cancelled_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BookingResponse {
    pub id: String,
    pub equipment_id: Option<String>,
    pub equipment_name: Option<String>,
    pub user_id: Option<String>,
    pub booked_by: Option<String>,
    pub department: String,
    pub start_date: String,
    pub end_date: String,
    pub purpose: String,
    pub status: String,
    pub days_until_start: Option<i64>,
    pub created_at: Option<String>,
    pub cancelled_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateBookingRequest {
    pub start_date: String,
    pub end_date: String,
    pub purpose: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckAvailabilityRequest {
    pub start_date: String,
    pub end_date: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AvailabilityResponse {
    pub is_available: bool,
    pub conflicts: Vec<BookingConflict>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BookingConflict {
    pub booking_id: String,
    pub booked_by: String,
    pub department: String,
    pub start_date: String,
    pub end_date: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetEquipmentQuery {
    pub status: Option<String>,
    pub category: Option<String>,
    pub location: Option<String>,
    pub search: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetBookingsQuery {
    pub status: Option<String>,
    pub upcoming: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateEquipmentRequest {
    pub name: String,
    pub category: String,
    pub location: String,
    pub serial_number: Option<String>,
    pub notes: Option<String>,
}

impl Equipment {
    pub fn new(
        name: String,
        category: String,
        location: String,
        serial_number: Option<String>,
    ) -> Self {
        Equipment {
            id: Uuid::new_v4().to_string(),
            name,
            category,
            location,
            status: "available".to_string(),
            serial_number,
            purchase_date: None,
            last_maintenance: None,
            notes: None,
            created_at: None,
            updated_at: None,
        }
    }
}

impl Booking {
    pub fn new(
        equipment_id: String,
        user_id: String,
        department: String,
        start_date: String,
        end_date: String,
        purpose: String,
    ) -> Self {
        Booking {
            id: Uuid::new_v4().to_string(),
            equipment_id,
            user_id,
            department,
            start_date,
            end_date,
            purpose,
            status: "active".to_string(),
            created_at: None,
            updated_at: None,
            cancelled_at: None,
        }
    }
}
