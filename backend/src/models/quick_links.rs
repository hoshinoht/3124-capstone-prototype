use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use super::users::UserSummary;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct QuickLink {
    pub id: String,
    pub title: String,
    pub url: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub department: Option<String>,
    pub icon: Option<String>,
    pub display_order: i32,
    pub created_by: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct UserQuickLink {
    pub user_id: String,
    pub link_id: String,
    pub display_order: i32,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickLinkResponse {
    pub id: String,
    pub title: String,
    pub url: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub department: Option<String>,
    pub icon: Option<String>,
    pub display_order: i32,
    pub created_by: Option<UserSummary>,
    pub is_pinned: Option<bool>,
    pub created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateQuickLinkRequest {
    pub title: String,
    pub url: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub department: Option<String>,
    pub icon: Option<String>,
    pub display_order: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateQuickLinkRequest {
    pub title: Option<String>,
    pub url: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub department: Option<String>,
    pub icon: Option<String>,
    pub display_order: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetQuickLinksQuery {
    pub category: Option<String>,
    pub department: Option<String>,
    pub search: Option<String>,
}

impl QuickLink {
    pub fn new(
        title: String,
        url: String,
        description: Option<String>,
        category: Option<String>,
        created_by: String,
        department: Option<String>,
    ) -> Self {
        QuickLink {
            id: Uuid::new_v4().to_string(),
            title,
            url,
            description,
            category,
            department,
            icon: None,
            display_order: 0,
            created_by,
            created_at: None,
            updated_at: None,
        }
    }
}
