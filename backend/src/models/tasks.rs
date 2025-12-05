use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use super::users::UserSummary;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub urgency: String,
    pub status: String,
    pub department: String,
    pub project_id: Option<String>,
    pub assignee_id: Option<String>,
    pub created_by: String,
    pub deadline: String,
    pub completed_at: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub is_completed: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct TaskAssignee {
    pub id: String,
    pub task_id: String,
    pub user_id: String,
    pub assigned_at: Option<String>,
    pub assigned_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskResponse {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub urgency: String,
    pub status: String,
    pub department: String,
    pub project_id: Option<String>,
    pub project_name: Option<String>,
    pub assignee: Option<UserSummary>,
    pub assignees: Option<Vec<UserSummary>>,
    pub created_by: Option<UserSummary>,
    pub deadline: String,
    pub days_until_deadline: Option<i64>,
    pub completed_at: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub is_completed: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct TaskHistory {
    pub id: String,
    pub task_id: String,
    pub user_id: String,
    pub action: String,
    pub field_changed: Option<String>,
    pub old_value: Option<String>,
    pub new_value: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskHistoryResponse {
    pub id: String,
    pub action: String,
    pub field_changed: Option<String>,
    pub old_value: Option<String>,
    pub new_value: Option<String>,
    pub changed_by: Option<UserSummary>,
    pub created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskRequest {
    pub title: String,
    pub description: Option<String>,
    pub urgency: String,
    pub department: String,
    pub project_id: Option<String>,
    pub assignee_id: Option<String>,
    pub assignee_ids: Option<Vec<String>>,
    pub deadline: String,
    pub is_completed: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTaskRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub urgency: Option<String>,
    pub department: Option<String>,
    pub project_id: Option<String>,
    pub assignee_id: Option<String>,
    pub assignee_ids: Option<Vec<String>>,
    pub deadline: Option<String>,
    pub is_completed: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTaskStatusRequest {
    pub status: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetTasksQuery {
    pub status: Option<String>,
    pub urgency: Option<String>,
    pub department: Option<String>,
    pub project_id: Option<String>,
    pub assignee_id: Option<String>,
    pub is_completed: Option<bool>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}

impl Task {
    pub fn new(
        title: String,
        description: Option<String>,
        urgency: String,
        department: String,
        project_id: Option<String>,
        assignee_id: Option<String>,
        created_by: String,
        deadline: String,
    ) -> Self {
        Task {
            id: Uuid::new_v4().to_string(),
            title,
            description,
            urgency,
            status: "pending".to_string(),
            department,
            project_id,
            assignee_id,
            created_by,
            deadline,
            completed_at: None,
            created_at: None,
            updated_at: None,
            is_completed: Some(false),
        }
    }
}
