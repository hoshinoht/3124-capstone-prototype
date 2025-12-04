use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Session {
    pub id: String,
    pub user_id: String,
    pub token: String,
    pub expires_at: String,
    pub created_at: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
}
