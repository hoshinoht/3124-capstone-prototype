use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct UserTracking {
    pub id: String,
    pub tracker_user_id: String,
    pub tracked_user_id: String,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserTrackingResponse {
    pub id: String,
    pub tracked_user_id: String,
    pub tracked_user_name: String,
    pub tracked_user_email: String,
    pub tracked_user_department: String,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackerResponse {
    pub id: String,
    pub tracker_user_id: String,
    pub tracker_user_name: String,
    pub tracker_user_email: String,
    pub created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackUserRequest {
    pub user_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UntrackUserRequest {
    pub user_id: String,
}

impl UserTracking {
    pub fn new(tracker_user_id: String, tracked_user_id: String) -> Self {
        UserTracking {
            id: Uuid::new_v4().to_string(),
            tracker_user_id,
            tracked_user_id,
            created_at: None,
        }
    }
}
