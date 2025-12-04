use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Notification {
    pub id: String,
    pub user_id: String,
    #[sqlx(rename = "type")]
    pub notification_type: String,
    pub title: String,
    pub message: String,
    pub related_entity_type: Option<String>,
    pub related_entity_id: Option<String>,
    pub is_read: bool,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationResponse {
    pub id: String,
    pub notification_type: String,
    pub title: String,
    pub message: String,
    pub related_entity_type: Option<String>,
    pub related_entity_id: Option<String>,
    pub is_read: bool,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct NotificationPreference {
    pub id: String,
    pub user_id: String,
    pub notification_type: String,
    pub email_enabled: bool,
    pub push_enabled: bool,
    pub in_app_enabled: bool,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationPreferenceResponse {
    pub notification_type: String,
    pub email_enabled: bool,
    pub push_enabled: bool,
    pub in_app_enabled: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationStats {
    pub total: i64,
    pub unread: i64,
    pub read: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetNotificationsQuery {
    pub unread_only: Option<bool>,
    pub notification_type: Option<String>,
    pub limit: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePreferencesRequest {
    pub preferences: Vec<PreferenceUpdate>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PreferenceUpdate {
    pub notification_type: String,
    pub email_enabled: bool,
    pub push_enabled: bool,
    pub in_app_enabled: bool,
}

impl Notification {
    pub fn new(
        user_id: String,
        notification_type: String,
        title: String,
        message: String,
        related_entity_type: Option<String>,
        related_entity_id: Option<String>,
    ) -> Self {
        Notification {
            id: Uuid::new_v4().to_string(),
            user_id,
            notification_type,
            title,
            message,
            related_entity_type,
            related_entity_id,
            is_read: false,
            created_at: None,
        }
    }
}
