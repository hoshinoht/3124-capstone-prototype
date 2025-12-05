use actix_web::{HttpMessage, HttpRequest, HttpResponse, web};
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::models::tasks::{
    CreateTaskRequest, GetTasksQuery, UpdateTaskRequest, UpdateTaskStatusRequest,
};

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/tasks")
            .route("", web::get().to(get_tasks))
            .route("", web::post().to(create_task))
            .route("/urgent", web::get().to(get_urgent_tasks))
            .route("/my-today", web::get().to(get_my_tasks_today))
            .route("/{task_id}", web::put().to(update_task))
            .route("/{task_id}", web::delete().to(delete_task))
            .route("/{task_id}/status", web::patch().to(update_task_status))
            .route("/{task_id}/history", web::get().to(get_task_history))
            .route("/{task_id}/assignees", web::get().to(get_task_assignees))
            .route("/{task_id}/assignees", web::post().to(add_task_assignees))
            .route(
                "/{task_id}/assignees/{user_id}",
                web::delete().to(remove_task_assignee),
            ),
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
            let mut tasks_json: Vec<serde_json::Value> = Vec::new();

            for (
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
            ) in tasks
            {
                // Fetch assignees for this task
                let assignees_result = sqlx::query_as::<_, (String, String, String)>(
                    r#"
                    SELECT u.id, u.first_name, u.last_name
                    FROM task_assignees ta
                    JOIN users u ON ta.user_id = u.id
                    WHERE ta.task_id = ?
                    "#,
                )
                .bind(&id)
                .fetch_all(pool.get_ref())
                .await;

                let assignees: Vec<serde_json::Value> = match assignees_result {
                    Ok(a) => a
                        .iter()
                        .map(|(uid, first, last)| {
                            serde_json::json!({
                                "id": uid,
                                "firstName": first,
                                "lastName": last,
                                "name": format!("{} {}", first, last)
                            })
                        })
                        .collect(),
                    Err(_) => Vec::new(),
                };

                tasks_json.push(serde_json::json!({
                    "id": id,
                    "title": title,
                    "description": description,
                    "urgency": urgency,
                    "status": status,
                    "department": department,
                    "projectId": project_id,
                    "projectName": project_name,
                    "assigneeId": assignee_id,
                    "assignees": assignees,
                    "deadline": deadline,
                    "completedAt": completed_at,
                    "createdAt": created_at,
                    "updatedAt": updated_at,
                    "isCompleted": is_completed.unwrap_or(false)
                }));
            }

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

            // Handle assignees
            let mut assignee_user_ids: Vec<String> = Vec::new();

            // If specific assignee_ids are provided, use those
            if let Some(ref ids) = body.assignee_ids {
                assignee_user_ids.extend(ids.clone());
            }

            // If task is under a project and no specific assignees provided, assign all project members
            if assignee_user_ids.is_empty() {
                if let Some(ref project_id) = body.project_id {
                    let members = sqlx::query_as::<_, (String,)>(
                        "SELECT user_id FROM project_members WHERE project_id = ?",
                    )
                    .bind(project_id)
                    .fetch_all(pool.get_ref())
                    .await;

                    if let Ok(members) = members {
                        assignee_user_ids.extend(members.into_iter().map(|(id,)| id));
                    }
                }
            }

            // Insert assignees
            for assignee_uid in &assignee_user_ids {
                let assignee_id = Uuid::new_v4().to_string();
                let _ = sqlx::query(
                    "INSERT OR IGNORE INTO task_assignees (id, task_id, user_id, assigned_by) VALUES (?, ?, ?, ?)"
                )
                .bind(&assignee_id)
                .bind(&task_id)
                .bind(assignee_uid)
                .bind(&user_id)
                .execute(pool.get_ref())
                .await;
            }

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
                        "assigneeIds": assignee_user_ids,
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

// Get tasks assigned to the current user for today (based on deadline)
async fn get_my_tasks_today(pool: web::Data<SqlitePool>, req: HttpRequest) -> HttpResponse {
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

    // Get tasks where:
    // 1. User is directly assigned (legacy assignee_id), OR
    // 2. User is in task_assignees table, OR
    // 3. Task belongs to a project where the user is a member
    // AND the deadline is today
    let result = sqlx::query_as::<_, (String, String, Option<String>, String, String, String, Option<String>, Option<String>, String, Option<String>, Option<String>, Option<bool>)>(
        r#"
        SELECT DISTINCT 
            t.id, t.title, t.description, t.urgency, t.status, t.department,
            t.project_id, p.name as project_name, t.deadline, t.created_at, t.updated_at, t.is_completed
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN task_assignees ta ON t.id = ta.task_id
        LEFT JOIN project_members pm ON t.project_id = pm.project_id
        WHERE 
            date(t.deadline) = date('now')
            AND t.status != 'completed'
            AND (
                t.assignee_id = ?
                OR ta.user_id = ?
                OR pm.user_id = ?
            )
        ORDER BY 
            CASE t.urgency 
                WHEN 'urgent' THEN 1 
                WHEN 'high' THEN 2 
                WHEN 'medium' THEN 3 
                WHEN 'low' THEN 4 
            END,
            t.deadline ASC
        "#
    )
    .bind(&user_id)
    .bind(&user_id)
    .bind(&user_id)
    .fetch_all(pool.get_ref())
    .await;

    match result {
        Ok(tasks) => {
            let mut tasks_json: Vec<serde_json::Value> = Vec::new();

            for (
                id,
                title,
                description,
                urgency,
                status,
                department,
                project_id,
                project_name,
                deadline,
                created_at,
                updated_at,
                is_completed,
            ) in tasks
            {
                // Get assignees for this task
                let assignees_result = sqlx::query_as::<_, (String, String, String)>(
                    r#"
                    SELECT u.id, u.first_name, u.last_name
                    FROM task_assignees ta
                    JOIN users u ON ta.user_id = u.id
                    WHERE ta.task_id = ?
                    "#,
                )
                .bind(&id)
                .fetch_all(pool.get_ref())
                .await;

                let assignees: Vec<serde_json::Value> = match assignees_result {
                    Ok(a) => a
                        .iter()
                        .map(|(uid, first, last)| {
                            serde_json::json!({
                                "id": uid,
                                "firstName": first,
                                "lastName": last,
                                "name": format!("{} {}", first, last)
                            })
                        })
                        .collect(),
                    Err(_) => Vec::new(),
                };

                tasks_json.push(serde_json::json!({
                    "id": id,
                    "title": title,
                    "description": description,
                    "urgency": urgency,
                    "status": status,
                    "department": department,
                    "projectId": project_id,
                    "projectName": project_name,
                    "deadline": deadline,
                    "createdAt": created_at,
                    "updatedAt": updated_at,
                    "isCompleted": is_completed.unwrap_or(false),
                    "assignees": assignees
                }));
            }

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

// Get assignees for a task
async fn get_task_assignees(pool: web::Data<SqlitePool>, path: web::Path<String>) -> HttpResponse {
    let task_id = path.into_inner();

    let result = sqlx::query_as::<_, (String, String, String, String, Option<String>)>(
        r#"
        SELECT u.id, u.first_name, u.last_name, u.email, ta.assigned_at
        FROM task_assignees ta
        JOIN users u ON ta.user_id = u.id
        WHERE ta.task_id = ?
        ORDER BY ta.assigned_at
        "#,
    )
    .bind(&task_id)
    .fetch_all(pool.get_ref())
    .await;

    match result {
        Ok(assignees) => {
            let assignees_json: Vec<serde_json::Value> = assignees
                .iter()
                .map(|(id, first_name, last_name, email, assigned_at)| {
                    serde_json::json!({
                        "id": id,
                        "firstName": first_name,
                        "lastName": last_name,
                        "email": email,
                        "name": format!("{} {}", first_name, last_name),
                        "assignedAt": assigned_at
                    })
                })
                .collect();

            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": {
                    "assignees": assignees_json
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

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct AddAssigneesRequest {
    user_ids: Vec<String>,
}

// Add assignees to a task
async fn add_task_assignees(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Json<AddAssigneesRequest>,
) -> HttpResponse {
    let assigner_id = match req.extensions().get::<String>() {
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

    let task_id = path.into_inner();

    // Check if task exists
    let task_exists = sqlx::query_as::<_, (i32,)>("SELECT 1 FROM tasks WHERE id = ?")
        .bind(&task_id)
        .fetch_optional(pool.get_ref())
        .await;

    if let Ok(None) = task_exists {
        return HttpResponse::NotFound().json(serde_json::json!({
            "success": false,
            "error": {
                "code": "NOT_FOUND",
                "message": "Task not found"
            }
        }));
    }

    let mut added_count = 0;
    for user_id in &body.user_ids {
        let assignee_id = Uuid::new_v4().to_string();
        let result = sqlx::query(
            "INSERT OR IGNORE INTO task_assignees (id, task_id, user_id, assigned_by) VALUES (?, ?, ?, ?)"
        )
        .bind(&assignee_id)
        .bind(&task_id)
        .bind(user_id)
        .bind(&assigner_id)
        .execute(pool.get_ref())
        .await;

        if let Ok(r) = result {
            added_count += r.rows_affected();
        }
    }

    HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": {
            "addedCount": added_count
        }
    }))
}

// Remove an assignee from a task
async fn remove_task_assignee(
    pool: web::Data<SqlitePool>,
    path: web::Path<(String, String)>,
) -> HttpResponse {
    let (task_id, user_id) = path.into_inner();

    let result = sqlx::query("DELETE FROM task_assignees WHERE task_id = ? AND user_id = ?")
        .bind(&task_id)
        .bind(&user_id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(rows) => {
            if rows.rows_affected() > 0 {
                HttpResponse::Ok().json(serde_json::json!({
                    "success": true,
                    "message": "Assignee removed successfully"
                }))
            } else {
                HttpResponse::NotFound().json(serde_json::json!({
                    "success": false,
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Assignee not found"
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
                    "message": "Failed to remove assignee"
                }
            }))
        }
    }
}
