use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use super::users::UserSummary;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct GlossaryCategory {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub department: Option<String>,
    pub display_order: i32,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GlossaryCategoryResponse {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub department: Option<String>,
    pub display_order: i32,
    pub term_count: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct GlossaryTerm {
    pub id: String,
    pub term: String,
    pub definition: String,
    pub category_id: Option<String>,
    pub department: String,
    pub related_terms: Option<String>,
    pub examples: Option<String>,
    pub is_approved: bool,
    pub created_by: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GlossaryTermResponse {
    pub id: String,
    pub term: String,
    pub definition: String,
    pub category: Option<GlossaryCategorySimple>,
    pub department: String,
    pub related_terms: Option<Vec<String>>,
    pub examples: Option<Vec<String>>,
    pub is_approved: bool,
    pub created_by: Option<UserSummary>,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GlossaryCategorySimple {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GlossarySearchResult {
    pub id: String,
    pub term: String,
    pub definition: String,
    pub category_id: Option<String>,
    pub category_name: Option<String>,
    pub department: String,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct GlossaryHistory {
    pub id: String,
    pub term_id: String,
    pub action: String,
    pub changed_by: String,
    pub changes: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTermRequest {
    pub term: String,
    pub definition: String,
    pub category_id: Option<String>,
    pub department: Option<String>,
    pub related_terms: Option<Vec<String>>,
    pub examples: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTermRequest {
    pub term: Option<String>,
    pub definition: Option<String>,
    pub category_id: Option<String>,
    pub department: Option<String>,
    pub related_terms: Option<Vec<String>>,
    pub examples: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetTermsQuery {
    pub category_id: Option<String>,
    pub department: Option<String>,
    pub approved_only: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct SearchQuery {
    pub q: Option<String>,
    pub department: Option<String>,
    pub limit: Option<i32>,
}

impl GlossaryTerm {
    pub fn new(
        term: String,
        definition: String,
        category_id: Option<String>,
        department: String,
        created_by: String,
    ) -> Self {
        GlossaryTerm {
            id: Uuid::new_v4().to_string(),
            term,
            definition,
            category_id,
            department,
            related_terms: None,
            examples: None,
            is_approved: false,
            created_by,
            created_at: None,
            updated_at: None,
        }
    }
}
