use actix_web::{HttpMessage, HttpRequest, HttpResponse, web};
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::models::tasks::{
    CreateTaskRequest, GetTasksQuery, Task, UpdateTaskRequest, UpdateTaskStatusRequest,
};

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/tasks")
            .route("", web::get().to(get_tasks))
            .route("", web::post().to(create_task))
            .route("/urgent", web::get().to(get_urgent_tasks))
            .route("/{task_id}", web::put().to(update_task))
            .route("/{task_id}", web::delete().to(delete_task))
            .route("/{task_id}/status", web::patch().to(update_task_status))
            .route("/{task_id}/history", web::get().to(get_task_history)),
    );
}

async fn get_tasks(pool: web::Data<SqlitePool>, query: web::Query<GetTasksQuery>) -> HttpResponse {
    let mut base_where = String::from("WHERE 1=1");

    if let Some(ref status) = query.status {
        base_where.push_str(&format!(" AND t.status = '{}'", status));
    }
    if let Some(ref urgency) = query.urgency {
        base_where.push_str(&format!(" AND t.urgency = '{}'", urgency));
    }
    if let Some(ref department) = query.department {
        base_where.push_str(&format!(" AND t.department = '{}'", department));
    }
    if let Some(ref project_id) = query.project_id {
        base_where.push_str(&format!(" AND t.project_id = '{}'", project_id));
    }
    if let Some(ref assignee_id) = query.assignee_id {
        base_where.push_str(&format!(" AND t.assignee_id = '{}'", assignee_id));
    }
    if let Some(is_completed) = query.is_completed {
        base_where.push_str(&format!(
            " AND t.is_completed = {}",
            if is_completed { 1 } else { 0 }
        ));
    }

    // Count query for total
    let count_sql = format!("SELECT COUNT(*) as count FROM tasks t {}", base_where);

    let total: i32 = match sqlx::query_as::<_, (i32,)>(&count_sql)
        .fetch_one(pool.get_ref())
        .await
    {
        Ok((count,)) => count,
        Err(_) => 0,
    };

    let mut sql = format!(
        "SELECT t.id, t.title, t.description, t.urgency, t.status, t.department, t.project_id, t.assignee_id, t.created_by, t.deadline, t.completed_at, t.created_at, t.updated_at, t.is_completed, p.name as project_name FROM tasks t LEFT JOIN projects p ON t.project_id = p.id {}",
        base_where
    );

    sql.push_str(" ORDER BY t.deadline ASC");

    let limit = query.limit.unwrap_or(50);
    let offset = query.offset.unwrap_or(0);
    sql.push_str(&format!(" LIMIT {} OFFSET {}", limit, offset));

    let result = sqlx::query_as::<
        _,
        (
            String,
            String,
            Option<String>,
            String,
            String,
            String,
            Option<String>,
            Option<String>,
            String,
            String,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<bool>,
            Option<String>,
        ),
    >(&sql)
    .fetch_all(pool.get_ref())
    .await;

    match result {
        Ok(tasks) => {
            let tasks_json: Vec<serde_json::Value> = tasks
                .iter()
                .map(
                    |(
                        id,
                        title,
                        description,
                        urgency,
                        status,
                        department,
                        project_id,
                        assignee_id,
                        _created_by,
                        deadline,
                        completed_at,
                        created_at,
                        updated_at,
                        is_completed,
                        project_name,
                    )| {
                        serde_json::json!({
                            "id": id,
                            "title": title,
                            "description": description,
                            "urgency": urgency,
                            "status": status,
                            "department": department,
                            "projectId": project_id,
                            "projectName": project_name,
                            "assigneeId": assignee_id,
                            "deadline": deadline,
                            "completedAt": completed_at,
                            "createdAt": created_at,
                            "updatedAt": updated_at,
                            "isCompleted": is_completed.unwrap_or(false)
                        })
                    },
                )
                .collect();

            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": {
                    "tasks": tasks_json,
                    "pagination": {
                        "total": total,
                        "limit": limit,
                        "offset": offset
                    }
                }
            }))
        }
        Err(e) => {
            eprintln!("Database error: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Database error"
                }
            }))
        }
    }
}

async fn get_urgent_tasks(pool: web::Data<SqlitePool>) -> HttpResponse {
    let result = sqlx::query_as::<_, (String, String, Option<String>, String, String, String, Option<String>, Option<String>, String, String, Option<String>, Option<String>, Option<String>, Option<bool>)>(
        "SELECT id, title, description, urgency, status, department, project_id, assignee_id, created_by, deadline, completed_at, created_at, updated_at, is_completed FROM tasks WHERE urgency = 'urgent' AND status != 'completed' ORDER BY deadline ASC"
    )
    .fetch_all(pool.get_ref())
    .await;

    match result {
        Ok(tasks) => {
            let tasks_json: Vec<serde_json::Value> = tasks
                .iter()
                .map(
                    |(
                        id,
                        title,
                        _description,
                        urgency,
                        status,
                        _department,
                        project_id,
                        _assignee_id,
                        _created_by,
                        deadline,
                        _completed_at,
                        _created_at,
                        _updated_at,
                        is_completed,
                    )| {
                        serde_json::json!({
                            "id": id,
                            "title": title,
                            "urgency": urgency,
                            "status": status,
                            "projectId": project_id,
                            "deadline": deadline,
                            "isCompleted": is_completed.unwrap_or(false)
                        })
                    },
                )
                .collect();

            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": {
                    "tasks": tasks_json,
                    "count": tasks_json.len()
                }
            }))
        }
        Err(e) => {
            eprintln!("Database error: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Database error"
                }
            }))
        }
    }
}

async fn create_task(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    body: web::Json<CreateTaskRequest>,
) -> HttpResponse {
    let user_id = match req.extensions().get::<String>() {
        Some(id) => id.clone(),
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "success": false,
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "Not authenticated"
                }
            }));
        }
    };

    let task_id = Uuid::new_v4().to_string();

    let result = sqlx::query(
        "INSERT INTO tasks (id, title, description, urgency, department, project_id, assignee_id, created_by, deadline, is_completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&task_id)
    .bind(&body.title)
    .bind(&body.description)
    .bind(&body.urgency)
    .bind(&body.department)
    .bind(&body.project_id)
    .bind(&body.assignee_id)
    .bind(&user_id)
    .bind(&body.deadline)
    .bind(body.is_completed.unwrap_or(false))
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            // Add to task history
            let history_id = Uuid::new_v4().to_string();
            let _ = sqlx::query(
                "INSERT INTO task_history (id, task_id, user_id, action) VALUES (?, ?, ?, 'created')"
            )
            .bind(&history_id)
            .bind(&task_id)
            .bind(&user_id)
            .execute(pool.get_ref())
            .await;

            HttpResponse::Created().json(serde_json::json!({
                "success": true,
                "data": {
                    "task": {
                        "id": task_id,
                        "title": body.title,
                        "description": body.description,
                        "urgency": body.urgency,
                        "status": "pending",
                        "department": body.department,
                        "projectId": body.project_id,
                        "assigneeId": body.assignee_id,
                        "deadline": body.deadline,
                        "isCompleted": body.is_completed.unwrap_or(false)
                    }
                }
            }))
        }
        Err(e) => {
            eprintln!("Database error: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Failed to create task"
                }
            }))
        }
    }
}

async fn update_task(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Json<UpdateTaskRequest>,
) -> HttpResponse {
    let user_id = req
        .extensions()
        .get::<String>()
        .cloned()
        .unwrap_or_default();
    let task_id = path.into_inner();
    let mut updates = Vec::new();
    let mut params: Vec<String> = Vec::new();

    if let Some(ref title) = body.title {
        updates.push("title = ?");
        params.push(title.clone());
    }
    if let Some(ref description) = body.description {
        updates.push("description = ?");
        params.push(description.clone());
    }
    if let Some(ref urgency) = body.urgency {
        updates.push("urgency = ?");
        params.push(urgency.clone());
    }
    if let Some(ref department) = body.department {
        updates.push("department = ?");
        params.push(department.clone());
    }
    if body.project_id.is_some() {
        updates.push("project_id = ?");
        params.push(body.project_id.clone().unwrap_or_default());
    }
    if let Some(ref assignee_id) = body.assignee_id {
        updates.push("assignee_id = ?");
        params.push(assignee_id.clone());
    }
    if let Some(ref deadline) = body.deadline {
        updates.push("deadline = ?");
        params.push(deadline.clone());
    }
    if let Some(is_completed) = body.is_completed {
        updates.push("is_completed = ?");
        params.push(if is_completed {
            "1".to_string()
        } else {
            "0".to_string()
        });
    }

    if updates.is_empty() {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "success": false,
            "error": {
                "code": "INVALID_REQUEST",
                "message": "No fields to update"
            }
        }));
    }

    updates.push("updated_at = datetime('now')");
    let query = format!("UPDATE tasks SET {} WHERE id = ?", updates.join(", "));

    let mut query_builder = sqlx::query(&query);
    for param in params {
        query_builder = query_builder.bind(param);
    }
    query_builder = query_builder.bind(&task_id);

    match query_builder.execute(pool.get_ref()).await {
        Ok(result) => {
            if result.rows_affected() == 0 {
                return HttpResponse::NotFound().json(serde_json::json!({
                    "success": false,
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Task not found"
                    }
                }));
            }

            // Add to task history
            let history_id = Uuid::new_v4().to_string();
            let _ = sqlx::query(
                "INSERT INTO task_history (id, task_id, user_id, action) VALUES (?, ?, ?, 'updated')"
            )
            .bind(&history_id)
            .bind(&task_id)
            .bind(&user_id)
            .execute(pool.get_ref())
            .await;

            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": {
                    "task": {
                        "id": task_id,
                        "title": body.title,
                        "urgency": body.urgency,
                        "deadline": body.deadline
                    }
                }
            }))
        }
        Err(e) => {
            eprintln!("Database error: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Failed to update task"
                }
            }))
        }
    }
}

async fn update_task_status(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Json<UpdateTaskStatusRequest>,
) -> HttpResponse {
    let user_id = req
        .extensions()
        .get::<String>()
        .cloned()
        .unwrap_or_default();
    let task_id = path.into_inner();

    // Get current status for history
    let current = sqlx::query_as::<_, (String,)>("SELECT status FROM tasks WHERE id = ?")
        .bind(&task_id)
        .fetch_optional(pool.get_ref())
        .await;

    let old_status = match current {
        Ok(Some((status,))) => status,
        Ok(None) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "success": false,
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Task not found"
                }
            }));
        }
        Err(e) => {
            eprintln!("Database error: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Database error"
                }
            }));
        }
    };

    let completed_at = if body.status == "completed" {
        Some("datetime('now')")
    } else {
        None
    };

    let query = if completed_at.is_some() {
        "UPDATE tasks SET status = ?, completed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
    } else {
        "UPDATE tasks SET status = ?, completed_at = NULL, updated_at = datetime('now') WHERE id = ?"
    };

    let result = sqlx::query(query)
        .bind(&body.status)
        .bind(&task_id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(_) => {
            // Add to task history
            let history_id = Uuid::new_v4().to_string();
            let _ = sqlx::query(
                "INSERT INTO task_history (id, task_id, user_id, action, field_changed, old_value, new_value) VALUES (?, ?, ?, 'status_changed', 'status', ?, ?)"
            )
            .bind(&history_id)
            .bind(&task_id)
            .bind(&user_id)
            .bind(&old_status)
            .bind(&body.status)
            .execute(pool.get_ref())
            .await;

            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": {
                    "task": {
                        "id": task_id,
                        "status": body.status
                    }
                }
            }))
        }
        Err(e) => {
            eprintln!("Database error: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Failed to update task status"
                }
            }))
        }
    }
}

async fn delete_task(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<String>,
) -> HttpResponse {
    let user_id = req
        .extensions()
        .get::<String>()
        .cloned()
        .unwrap_or_default();
    let task_id = path.into_inner();

    // Add to task history before delete
    let history_id = Uuid::new_v4().to_string();
    let _ = sqlx::query(
        "INSERT INTO task_history (id, task_id, user_id, action) VALUES (?, ?, ?, 'deleted')",
    )
    .bind(&history_id)
    .bind(&task_id)
    .bind(&user_id)
    .execute(pool.get_ref())
    .await;

    let result = sqlx::query("DELETE FROM tasks WHERE id = ?")
        .bind(&task_id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(rows) => {
            if rows.rows_affected() > 0 {
                HttpResponse::Ok().json(serde_json::json!({
                    "success": true,
                    "message": "Task deleted successfully"
                }))
            } else {
                HttpResponse::NotFound().json(serde_json::json!({
                    "success": false,
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Task not found"
                    }
                }))
            }
        }
        Err(e) => {
            eprintln!("Database error: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Failed to delete task"
                }
            }))
        }
    }
}

async fn get_task_history(pool: web::Data<SqlitePool>, path: web::Path<String>) -> HttpResponse {
    let task_id = path.into_inner();

    let result = sqlx::query_as::<_, (String, String, Option<String>, Option<String>, Option<String>, String, Option<String>)>(
        "SELECT th.id, th.action, th.field_changed, th.old_value, th.new_value, th.user_id, th.created_at FROM task_history th WHERE th.task_id = ? ORDER BY th.created_at DESC"
    )
    .bind(&task_id)
    .fetch_all(pool.get_ref())
    .await;

    match result {
        Ok(history) => {
            let history_json: Vec<serde_json::Value> = history
                .iter()
                .map(
                    |(id, action, field_changed, old_value, new_value, user_id, created_at)| {
                        serde_json::json!({
                            "id": id,
                            "action": action,
                            "fieldChanged": field_changed,
                            "oldValue": old_value,
                            "newValue": new_value,
                            "changedBy": {
                                "id": user_id
                            },
                            "createdAt": created_at
                        })
                    },
                )
                .collect();

            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": {
                    "history": history_json
                }
            }))
        }
        Err(e) => {
            eprintln!("Database error: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Database error"
                }
            }))
        }
    }
}
