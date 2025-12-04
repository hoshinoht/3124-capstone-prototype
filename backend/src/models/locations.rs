use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use super::users::UserSummary;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct CheckInRecord {
    pub id: String,
    pub user_id: String,
    pub location: String,
    pub check_in_time: String,
    pub check_out_time: Option<String>,
    pub notes: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct UserLocation {
    pub user_id: String,
    pub current_location: Option<String>,
    pub check_in_time: Option<String>,
    pub is_checked_in: bool,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckInResponse {
    pub id: String,
    pub user_id: String,
    pub location: String,
    pub check_in_time: String,
    pub check_out_time: Option<String>,
    pub notes: Option<String>,
    pub duration: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActiveCheckInResponse {
    pub user: UserSummary,
    pub location: String,
    pub check_in_time: String,
    pub duration: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocationSearchResult {
    pub user: UserSummary,
    pub current_location: Option<String>,
    pub check_in_time: Option<String>,
    pub is_checked_in: bool,
}

#[derive(Debug, Deserialize)]
pub struct CheckInRequest {
    pub location: String,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CheckOutRequest {
    pub location: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetLocationsQuery {
    pub department: Option<String>,
    pub location: Option<String>,
    pub search: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocationHistoryQuery {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub location: Option<String>,
    pub limit: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetLocationHistoryQuery {
    pub user_id: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub limit: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct GetCurrentLocationsQuery {
    pub department: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SearchLocationsQuery {
    pub query: String,
    pub date: Option<String>,
}

impl CheckInRecord {
    pub fn new(user_id: String, location: String, notes: Option<String>) -> Self {
        CheckInRecord {
            id: Uuid::new_v4().to_string(),
            user_id,
            location,
            check_in_time: chrono::Utc::now().to_rfc3339(),
            check_out_time: None,
            notes,
            created_at: None,
            updated_at: None,
        }
    }
}
