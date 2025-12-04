use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use super::users::UserSummary;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Event {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub event_type: String,
    pub event_date: String,
    pub start_time: String,
    pub end_time: Option<String>,
    pub location: Option<String>,
    pub meeting_url: Option<String>,
    pub created_by: String,
    pub department: Option<String>,
    pub is_recurring: bool,
    pub recurrence_rule: Option<String>,
    pub parent_event_id: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventResponse {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub event_type: String,
    pub event_date: String,
    pub start_time: String,
    pub end_time: Option<String>,
    pub location: Option<String>,
    pub meeting_url: Option<String>,
    pub department: Option<String>,
    pub created_by: Option<UserSummary>,
    pub attendees: Option<Vec<AttendeeResponse>>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct EventAttendee {
    pub id: String,
    pub event_id: String,
    pub user_id: String,
    pub status: String,
    pub added_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttendeeResponse {
    pub id: String,
    pub first_name: String,
    pub last_name: String,
    pub email: Option<String>,
    pub department: Option<String>,
    pub status: String,
    pub added_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateEventRequest {
    pub title: String,
    pub description: Option<String>,
    pub event_type: String,
    pub event_date: String,
    pub start_time: String,
    pub end_time: Option<String>,
    pub location: Option<String>,
    pub meeting_url: Option<String>,
    pub department: Option<String>,
    pub attendee_ids: Option<Vec<String>>,
    pub is_recurring: Option<bool>,
    pub recurrence_rule: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateEventRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub event_type: Option<String>,
    pub event_date: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub location: Option<String>,
    pub meeting_url: Option<String>,
    pub department: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetEventsQuery {
    pub start_date: String,
    pub end_date: String,
    pub r#type: Option<String>,
    pub department: Option<String>,
    pub user_id: Option<String>,
}

impl Event {
    pub fn new(
        title: String,
        description: Option<String>,
        event_type: String,
        event_date: String,
        start_time: String,
        end_time: Option<String>,
        location: Option<String>,
        meeting_url: Option<String>,
        created_by: String,
        department: Option<String>,
        is_recurring: bool,
        recurrence_rule: Option<String>,
    ) -> Self {
        Event {
            id: Uuid::new_v4().to_string(),
            title,
            description,
            event_type,
            event_date,
            start_time,
            end_time,
            location,
            meeting_url,
            created_by,
            department,
            is_recurring,
            recurrence_rule,
            parent_event_id: None,
            created_at: None,
            updated_at: None,
        }
    }
}
