use actix_web::{web, HttpResponse, HttpRequest};
use sqlx::SqlitePool;
use crate::models::*;
use crate::auth::Claims;

// Create task
pub async fn create_task(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    task_data: web::Json<CreateTaskRequest>,
) -> Result<HttpResponse, actix_web::Error> {
    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("No token found"))?;

    let tags_json = task_data.tags.as_ref()
        .map(|t| serde_json::to_string(t).unwrap_or_else(|_| "[]".to_string()));

    let result = sqlx::query!(
        r#"
        INSERT INTO tasks (title, description, urgency_level, deadline, assigned_to, assigned_by, project_name, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        "#,
        task_data.title,
        task_data.description,
        task_data.urgency_level,
        task_data.deadline,
        task_data.assigned_to,
        claims.sub,
        task_data.project_name,
        tags_json
    )
    .execute(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to create task"))?;

    let task = sqlx::query_as::<_, Task>(
        "SELECT * FROM tasks WHERE id = ?"
    )
    .bind(result.last_insert_rowid())
    .fetch_one(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to fetch created task"))?;

    Ok(HttpResponse::Created().json(ApiResponse::success(task)))
}

// Get all tasks with filters
pub async fn get_all_tasks(
    pool: web::Data<SqlitePool>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> Result<HttpResponse, actix_web::Error> {
    let mut sql = r#"
        SELECT 
            t.*,
            u1.full_name as assigned_to_name,
            u2.full_name as assigned_by_name
        FROM tasks t
        LEFT JOIN users u1 ON t.assigned_to = u1.id
        JOIN users u2 ON t.assigned_by = u2.id
        WHERE 1=1
    "#.to_string();

    let mut conditions = Vec::new();

    if let Some(urgency_level) = query.get("urgency_level") {
        sql.push_str(" AND t.urgency_level = ?");
        conditions.push(urgency_level.clone());
    }

    if let Some(status) = query.get("status") {
        sql.push_str(" AND t.status = ?");
        conditions.push(status.clone());
    }

    if let Some(assigned_to) = query.get("assigned_to") {
        sql.push_str(" AND t.assigned_to = ?");
        conditions.push(assigned_to.clone());
    }

    sql.push_str(" ORDER BY 
        CASE t.urgency_level 
            WHEN 'urgent' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            WHEN 'low' THEN 4 
        END,
        t.deadline ASC NULLS LAST,
        t.created_at DESC
    ");

    let mut query_builder = sqlx::query_as::<_, TaskWithDetails>(&sql);
    for condition in conditions {
        query_builder = query_builder.bind(condition);
    }

    let tasks = query_builder
        .fetch_all(pool.get_ref())
        .await
        .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to fetch tasks"))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(tasks)))
}

// Get urgent tasks
pub async fn get_urgent_tasks(
    pool: web::Data<SqlitePool>,
) -> Result<HttpResponse, actix_web::Error> {
    let tasks = sqlx::query_as::<_, TaskWithDetails>(
        r#"
        SELECT 
            t.*,
            u1.full_name as assigned_to_name,
            u2.full_name as assigned_by_name
        FROM tasks t
        LEFT JOIN users u1 ON t.assigned_to = u1.id
        JOIN users u2 ON t.assigned_by = u2.id
        WHERE t.urgency_level = 'urgent' AND t.status != 'completed' AND t.status != 'cancelled'
        ORDER BY t.deadline ASC NULLS LAST
        "#
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to fetch urgent tasks"))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(tasks)))
}

// Get user's tasks
pub async fn get_user_tasks(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
) -> Result<HttpResponse, actix_web::Error> {
    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("No token found"))?;

    let tasks = sqlx::query_as::<_, TaskWithDetails>(
        r#"
        SELECT 
            t.*,
            u1.full_name as assigned_to_name,
            u2.full_name as assigned_by_name
        FROM tasks t
        LEFT JOIN users u1 ON t.assigned_to = u1.id
        JOIN users u2 ON t.assigned_by = u2.id
        WHERE t.assigned_to = ?
        ORDER BY 
            CASE t.urgency_level 
                WHEN 'urgent' THEN 1 
                WHEN 'high' THEN 2 
                WHEN 'medium' THEN 3 
                WHEN 'low' THEN 4 
            END,
            t.deadline ASC NULLS LAST
        "#
    )
    .bind(claims.sub)
    .fetch_all(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to fetch tasks"))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(tasks)))
}

// Get task by ID
pub async fn get_task_by_id(
    pool: web::Data<SqlitePool>,
    task_id: web::Path<i64>,
) -> Result<HttpResponse, actix_web::Error> {
    let task = sqlx::query_as::<_, TaskWithDetails>(
        r#"
        SELECT 
            t.*,
            u1.full_name as assigned_to_name,
            u2.full_name as assigned_by_name
        FROM tasks t
        LEFT JOIN users u1 ON t.assigned_to = u1.id
        JOIN users u2 ON t.assigned_by = u2.id
        WHERE t.id = ?
        "#
    )
    .bind(task_id.into_inner())
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Database error"))?;

    match task {
        Some(task) => Ok(HttpResponse::Ok().json(ApiResponse::success(task))),
        None => Ok(HttpResponse::NotFound().json(ApiResponse::<()>::error("Task not found".to_string()))),
    }
}

// Update task
pub async fn update_task(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    task_id: web::Path<i64>,
    update_data: web::Json<UpdateTaskRequest>,
) -> Result<HttpResponse, actix_web::Error> {
    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("No token found"))?;

    let task_id = task_id.into_inner();

    let task = sqlx::query_as::<_, Task>(
        "SELECT * FROM tasks WHERE id = ?"
    )
    .bind(task_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Database error"))?
    .ok_or_else(|| actix_web::error::ErrorNotFound("Task not found"))?;

    // Check permissions
    if task.assigned_by != claims.sub && 
       task.assigned_to != Some(claims.sub) && 
       claims.role != "admin" {
        return Ok(HttpResponse::Forbidden().json(ApiResponse::<()>::error(
            "You don't have permission to update this task".to_string()
        )));
    }

    let mut updates = Vec::new();
    let mut values: Vec<String> = Vec::new();

    if let Some(title) = &update_data.title {
        updates.push("title = ?");
        values.push(title.clone());
    }
    if let Some(description) = &update_data.description {
        updates.push("description = ?");
        values.push(description.clone());
    }
    if let Some(urgency_level) = &update_data.urgency_level {
        updates.push("urgency_level = ?");
        values.push(urgency_level.clone());
    }
    if let Some(status) = &update_data.status {
        updates.push("status = ?");
        values.push(status.clone());
        
        // Set completion date if status is completed
        if status == "completed" {
            updates.push("completion_date = CURRENT_TIMESTAMP");
        }
    }
    if let Some(deadline) = &update_data.deadline {
        updates.push("deadline = ?");
        values.push(deadline.to_rfc3339());
    }
    if let Some(assigned_to) = &update_data.assigned_to {
        updates.push("assigned_to = ?");
        values.push(assigned_to.to_string());
    }
    if let Some(project_name) = &update_data.project_name {
        updates.push("project_name = ?");
        values.push(project_name.clone());
    }
    if let Some(tags) = &update_data.tags {
        updates.push("tags = ?");
        values.push(serde_json::to_string(tags).unwrap_or_else(|_| "[]".to_string()));
    }

    if updates.is_empty() {
        return Ok(HttpResponse::BadRequest().json(ApiResponse::<()>::error(
            "No fields to update".to_string()
        )));
    }

    let sql = format!(
        "UPDATE tasks SET {} WHERE id = ?",
        updates.join(", ")
    );

    let mut query = sqlx::query(&sql);
    for value in values {
        query = query.bind(value);
    }
    query = query.bind(task_id);

    query.execute(pool.get_ref())
        .await
        .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to update task"))?;

    let updated_task = sqlx::query_as::<_, TaskWithDetails>(
        r#"
        SELECT 
            t.*,
            u1.full_name as assigned_to_name,
            u2.full_name as assigned_by_name
        FROM tasks t
        LEFT JOIN users u1 ON t.assigned_to = u1.id
        JOIN users u2 ON t.assigned_by = u2.id
        WHERE t.id = ?
        "#
    )
    .bind(task_id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to fetch updated task"))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(updated_task)))
}

// Delete task
pub async fn delete_task(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    task_id: web::Path<i64>,
) -> Result<HttpResponse, actix_web::Error> {
    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("No token found"))?;

    let task_id = task_id.into_inner();

    let task = sqlx::query_as::<_, Task>(
        "SELECT * FROM tasks WHERE id = ?"
    )
    .bind(task_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Database error"))?
    .ok_or_else(|| actix_web::error::ErrorNotFound("Task not found"))?;

    if task.assigned_by != claims.sub && claims.role != "admin" {
        return Ok(HttpResponse::Forbidden().json(ApiResponse::<()>::error(
            "You don't have permission to delete this task".to_string()
        )));
    }

    sqlx::query("DELETE FROM tasks WHERE id = ?")
        .bind(task_id)
        .execute(pool.get_ref())
        .await
        .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to delete task"))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success("Task deleted successfully")))
}
