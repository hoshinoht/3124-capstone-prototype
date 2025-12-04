use actix_web::{HttpResponse, web};
use sqlx::SqlitePool;
use serde::Deserialize;

#[derive(Deserialize)]
pub struct SearchQuery {
    pub q: String,
    pub types: Option<String>,  // comma-separated: events,tasks,equipment,glossary,users
    pub department: Option<String>,
    pub limit: Option<i32>,
}

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/search")
            .route(web::get().to(global_search)),
    );
}

async fn global_search(
    pool: web::Data<SqlitePool>,
    query: web::Query<SearchQuery>,
) -> HttpResponse {
    let search = &query.q;
    if search.is_empty() {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "success": false,
            "error": {
                "code": "BAD_REQUEST",
                "message": "Search query is required"
            }
        }));
    }

    let search_pattern = format!("%{}%", search);
    let limit = query.limit.unwrap_or(10);

    let types: Vec<&str> = query
        .types
        .as_ref()
        .map(|t| t.split(',').collect())
        .unwrap_or_else(|| vec!["events", "tasks", "equipment", "glossary", "users"]);

    let mut results = serde_json::json!({});

    // Search events
    if types.contains(&"events") {
        let events = sqlx::query_as::<_, (String, String, Option<String>, String, String)>(
            "SELECT id, title, description, event_date, event_type FROM events WHERE title LIKE ? OR description LIKE ? LIMIT ?"
        )
        .bind(&search_pattern)
        .bind(&search_pattern)
        .bind(limit)
        .fetch_all(pool.get_ref())
        .await
        .unwrap_or_default();

        let events_json: Vec<serde_json::Value> = events
            .iter()
            .map(|(id, title, description, date, event_type)| {
                serde_json::json!({
                    "id": id,
                    "title": title,
                    "description": description,
                    "date": date,
                    "type": event_type,
                    "entityType": "event"
                })
            })
            .collect();

        results["events"] = serde_json::json!(events_json);
    }

    // Search tasks
    if types.contains(&"tasks") {
        let tasks = sqlx::query_as::<_, (String, String, Option<String>, String, String)>(
            "SELECT id, title, description, status, priority FROM tasks WHERE title LIKE ? OR description LIKE ? LIMIT ?"
        )
        .bind(&search_pattern)
        .bind(&search_pattern)
        .bind(limit)
        .fetch_all(pool.get_ref())
        .await
        .unwrap_or_default();

        let tasks_json: Vec<serde_json::Value> = tasks
            .iter()
            .map(|(id, title, description, status, priority)| {
                serde_json::json!({
                    "id": id,
                    "title": title,
                    "description": description,
                    "status": status,
                    "priority": priority,
                    "entityType": "task"
                })
            })
            .collect();

        results["tasks"] = serde_json::json!(tasks_json);
    }

    // Search equipment
    if types.contains(&"equipment") {
        let equipment = sqlx::query_as::<_, (String, String, String, String, String)>(
            "SELECT id, name, category, location, status FROM equipment WHERE name LIKE ? OR category LIKE ? OR location LIKE ? LIMIT ?"
        )
        .bind(&search_pattern)
        .bind(&search_pattern)
        .bind(&search_pattern)
        .bind(limit)
        .fetch_all(pool.get_ref())
        .await
        .unwrap_or_default();

        let equipment_json: Vec<serde_json::Value> = equipment
            .iter()
            .map(|(id, name, category, location, status)| {
                serde_json::json!({
                    "id": id,
                    "name": name,
                    "category": category,
                    "location": location,
                    "status": status,
                    "entityType": "equipment"
                })
            })
            .collect();

        results["equipment"] = serde_json::json!(equipment_json);
    }

    // Search glossary
    if types.contains(&"glossary") {
        let glossary = sqlx::query_as::<_, (String, String, String, String)>(
            "SELECT id, term, definition, department FROM glossary_terms WHERE term LIKE ? OR definition LIKE ? LIMIT ?"
        )
        .bind(&search_pattern)
        .bind(&search_pattern)
        .bind(limit)
        .fetch_all(pool.get_ref())
        .await
        .unwrap_or_default();

        let glossary_json: Vec<serde_json::Value> = glossary
            .iter()
            .map(|(id, term, definition, department)| {
                serde_json::json!({
                    "id": id,
                    "term": term,
                    "definition": definition,
                    "department": department,
                    "entityType": "glossary"
                })
            })
            .collect();

        results["glossary"] = serde_json::json!(glossary_json);
    }

    // Search users
    if types.contains(&"users") {
        let users = sqlx::query_as::<_, (String, String, String, String, String)>(
            "SELECT id, first_name, last_name, email, department FROM users WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? AND is_active = 1 LIMIT ?"
        )
        .bind(&search_pattern)
        .bind(&search_pattern)
        .bind(&search_pattern)
        .bind(limit)
        .fetch_all(pool.get_ref())
        .await
        .unwrap_or_default();

        let users_json: Vec<serde_json::Value> = users
            .iter()
            .map(|(id, first_name, last_name, email, department)| {
                serde_json::json!({
                    "id": id,
                    "name": format!("{} {}", first_name, last_name),
                    "email": email,
                    "department": department,
                    "entityType": "user"
                })
            })
            .collect();

        results["users"] = serde_json::json!(users_json);
    }

    HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": {
            "query": search,
            "results": results
        }
    }))
}
