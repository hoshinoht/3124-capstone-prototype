use actix_web::{HttpMessage, HttpRequest, HttpResponse, web};
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::models::projects::{
    AddMemberRequest, CreateProjectRequest, GetProjectsQuery, Project, UpdateProjectRequest,
};

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/projects")
            .route("", web::get().to(get_projects))
            .route("", web::post().to(create_project))
            .route("/{project_id}", web::get().to(get_project))
            .route("/{project_id}", web::put().to(update_project))
            .route("/{project_id}", web::delete().to(delete_project))
            .route("/{project_id}/members", web::get().to(get_project_members))
            .route("/{project_id}/members", web::post().to(add_member))
            .route(
                "/{project_id}/members/{user_id}",
                web::delete().to(remove_member),
            )
            .route("/{project_id}/tasks", web::get().to(get_project_tasks)),
    );
}

async fn get_projects(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    query: web::Query<GetProjectsQuery>,
) -> HttpResponse {
    let user_id = match req.extensions().get::<String>() {
        Some(id) => id.clone(),
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "success": false,
                "error": { "code": "UNAUTHORIZED", "message": "Not authenticated" }
            }));
        }
    };

    // Get projects where user is a member
    let mut sql = String::from(
        "SELECT DISTINCT p.id, p.name, p.description, p.status, p.created_by, p.created_at, p.updated_at
         FROM projects p
         INNER JOIN project_members pm ON p.id = pm.project_id
         WHERE pm.user_id = ?"
    );

    if let Some(ref status) = query.status {
        sql.push_str(&format!(" AND p.status = '{}'", status));
    }
    if let Some(ref search) = query.search {
        sql.push_str(&format!(
            " AND (p.name LIKE '%{}%' OR p.description LIKE '%{}%')",
            search, search
        ));
    }

    sql.push_str(" ORDER BY p.updated_at DESC");

    let result = sqlx::query_as::<_, Project>(&sql)
        .bind(&user_id)
        .fetch_all(pool.get_ref())
        .await;

    match result {
        Ok(projects) => {
            let projects_json: Vec<serde_json::Value> = projects
                .iter()
                .map(|p| {
                    serde_json::json!({
                        "id": p.id,
                        "name": p.name,
                        "description": p.description,
                        "status": p.status,
                        "createdBy": p.created_by,
                        "createdAt": p.created_at,
                        "updatedAt": p.updated_at
                    })
                })
                .collect();

            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": {
                    "projects": projects_json,
                    "total": projects_json.len()
                }
            }))
        }
        Err(e) => {
            eprintln!("Database error: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": { "code": "INTERNAL_ERROR", "message": "Database error" }
            }))
        }
    }
}

async fn create_project(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    body: web::Json<CreateProjectRequest>,
) -> HttpResponse {
    let user_id = match req.extensions().get::<String>() {
        Some(id) => id.clone(),
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "success": false,
                "error": { "code": "UNAUTHORIZED", "message": "Not authenticated" }
            }));
        }
    };

    let project_id = Uuid::new_v4().to_string();
    let status = body.status.clone().unwrap_or_else(|| "active".to_string());

    // Create project
    let result = sqlx::query(
        "INSERT INTO projects (id, name, description, status, created_by, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
    )
    .bind(&project_id)
    .bind(&body.name)
    .bind(&body.description)
    .bind(&status)
    .bind(&user_id)
    .execute(pool.get_ref())
    .await;

    if result.is_err() {
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "success": false,
            "error": { "code": "INTERNAL_ERROR", "message": "Failed to create project" }
        }));
    }

    // Add creator as owner
    let member_id = Uuid::new_v4().to_string();
    let _ = sqlx::query(
        "INSERT INTO project_members (id, project_id, user_id, role, added_at) 
         VALUES (?, ?, ?, 'owner', datetime('now'))",
    )
    .bind(&member_id)
    .bind(&project_id)
    .bind(&user_id)
    .execute(pool.get_ref())
    .await;

    // Add additional members if provided
    if let Some(ref member_ids) = body.member_ids {
        for member_user_id in member_ids {
            if member_user_id != &user_id {
                let mid = Uuid::new_v4().to_string();
                let _ = sqlx::query(
                    "INSERT INTO project_members (id, project_id, user_id, role, added_at) 
                     VALUES (?, ?, ?, 'member', datetime('now'))",
                )
                .bind(&mid)
                .bind(&project_id)
                .bind(member_user_id)
                .execute(pool.get_ref())
                .await;
            }
        }
    }

    HttpResponse::Created().json(serde_json::json!({
        "success": true,
        "data": {
            "project": {
                "id": project_id,
                "name": body.name,
                "description": body.description,
                "status": status,
                "createdBy": user_id
            }
        }
    }))
}

async fn get_project(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<String>,
) -> HttpResponse {
    let user_id = match req.extensions().get::<String>() {
        Some(id) => id.clone(),
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "success": false,
                "error": { "code": "UNAUTHORIZED", "message": "Not authenticated" }
            }));
        }
    };

    let project_id = path.into_inner();

    // Check if user is a member
    let is_member = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM project_members WHERE project_id = ? AND user_id = ?",
    )
    .bind(&project_id)
    .bind(&user_id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);

    if is_member == 0 {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "success": false,
            "error": { "code": "FORBIDDEN", "message": "You are not a member of this project" }
        }));
    }

    let result = sqlx::query_as::<_, Project>(
        "SELECT id, name, description, status, created_by, created_at, updated_at 
         FROM projects WHERE id = ?",
    )
    .bind(&project_id)
    .fetch_optional(pool.get_ref())
    .await;

    match result {
        Ok(Some(project)) => {
            // Get member count
            let member_count = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM project_members WHERE project_id = ?",
            )
            .bind(&project_id)
            .fetch_one(pool.get_ref())
            .await
            .unwrap_or(0);

            // Get task count
            let task_count =
                sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM tasks WHERE project_id = ?")
                    .bind(&project_id)
                    .fetch_one(pool.get_ref())
                    .await
                    .unwrap_or(0);

            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": {
                    "project": {
                        "id": project.id,
                        "name": project.name,
                        "description": project.description,
                        "status": project.status,
                        "createdBy": project.created_by,
                        "createdAt": project.created_at,
                        "updatedAt": project.updated_at,
                        "memberCount": member_count,
                        "taskCount": task_count
                    }
                }
            }))
        }
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({
            "success": false,
            "error": { "code": "NOT_FOUND", "message": "Project not found" }
        })),
        Err(e) => {
            eprintln!("Database error: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": { "code": "INTERNAL_ERROR", "message": "Database error" }
            }))
        }
    }
}

async fn update_project(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Json<UpdateProjectRequest>,
) -> HttpResponse {
    let user_id = match req.extensions().get::<String>() {
        Some(id) => id.clone(),
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "success": false,
                "error": { "code": "UNAUTHORIZED", "message": "Not authenticated" }
            }));
        }
    };

    let project_id = path.into_inner();

    // Check if user is owner or admin
    let role = sqlx::query_scalar::<_, String>(
        "SELECT role FROM project_members WHERE project_id = ? AND user_id = ?",
    )
    .bind(&project_id)
    .bind(&user_id)
    .fetch_optional(pool.get_ref())
    .await;

    match role {
        Ok(Some(r)) if r == "owner" || r == "admin" => {}
        _ => {
            return HttpResponse::Forbidden().json(serde_json::json!({
                "success": false,
                "error": { "code": "FORBIDDEN", "message": "Only project owner or admin can update" }
            }));
        }
    }

    let mut updates = Vec::new();
    let mut params: Vec<String> = Vec::new();

    if let Some(ref name) = body.name {
        updates.push("name = ?");
        params.push(name.clone());
    }
    if let Some(ref description) = body.description {
        updates.push("description = ?");
        params.push(description.clone());
    }
    if let Some(ref status) = body.status {
        updates.push("status = ?");
        params.push(status.clone());
    }

    if updates.is_empty() {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "success": false,
            "error": { "code": "INVALID_REQUEST", "message": "No fields to update" }
        }));
    }

    updates.push("updated_at = datetime('now')");
    let query_str = format!("UPDATE projects SET {} WHERE id = ?", updates.join(", "));

    let mut query = sqlx::query(&query_str);
    for param in params {
        query = query.bind(param);
    }
    query = query.bind(&project_id);

    match query.execute(pool.get_ref()).await {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "success": true,
            "data": {
                "project": {
                    "id": project_id,
                    "name": body.name,
                    "description": body.description,
                    "status": body.status
                }
            }
        })),
        Err(e) => {
            eprintln!("Database error: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": { "code": "INTERNAL_ERROR", "message": "Failed to update project" }
            }))
        }
    }
}

async fn delete_project(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<String>,
) -> HttpResponse {
    let user_id = match req.extensions().get::<String>() {
        Some(id) => id.clone(),
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "success": false,
                "error": { "code": "UNAUTHORIZED", "message": "Not authenticated" }
            }));
        }
    };

    let project_id = path.into_inner();

    // Only owner can delete
    let role = sqlx::query_scalar::<_, String>(
        "SELECT role FROM project_members WHERE project_id = ? AND user_id = ?",
    )
    .bind(&project_id)
    .bind(&user_id)
    .fetch_optional(pool.get_ref())
    .await;

    match role {
        Ok(Some(r)) if r == "owner" => {}
        _ => {
            return HttpResponse::Forbidden().json(serde_json::json!({
                "success": false,
                "error": { "code": "FORBIDDEN", "message": "Only project owner can delete" }
            }));
        }
    }

    // Delete project members first
    let _ = sqlx::query("DELETE FROM project_members WHERE project_id = ?")
        .bind(&project_id)
        .execute(pool.get_ref())
        .await;

    // Unlink tasks from project (don't delete tasks, just remove project association)
    let _ = sqlx::query("UPDATE tasks SET project_id = NULL WHERE project_id = ?")
        .bind(&project_id)
        .execute(pool.get_ref())
        .await;

    // Delete project
    match sqlx::query("DELETE FROM projects WHERE id = ?")
        .bind(&project_id)
        .execute(pool.get_ref())
        .await
    {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "success": true,
            "message": "Project deleted successfully"
        })),
        Err(e) => {
            eprintln!("Database error: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": { "code": "INTERNAL_ERROR", "message": "Failed to delete project" }
            }))
        }
    }
}

async fn get_project_members(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<String>,
) -> HttpResponse {
    let user_id = match req.extensions().get::<String>() {
        Some(id) => id.clone(),
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "success": false,
                "error": { "code": "UNAUTHORIZED", "message": "Not authenticated" }
            }));
        }
    };

    let project_id = path.into_inner();

    // Check if user is a member
    let is_member = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM project_members WHERE project_id = ? AND user_id = ?",
    )
    .bind(&project_id)
    .bind(&user_id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);

    if is_member == 0 {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "success": false,
            "error": { "code": "FORBIDDEN", "message": "You are not a member of this project" }
        }));
    }

    let result = sqlx::query_as::<_, (String, String, String, String, String, String)>(
        "SELECT pm.id, pm.user_id, u.first_name, u.last_name, pm.role, pm.added_at
         FROM project_members pm
         JOIN users u ON pm.user_id = u.id
         WHERE pm.project_id = ?
         ORDER BY 
           CASE pm.role 
             WHEN 'owner' THEN 1 
             WHEN 'admin' THEN 2 
             ELSE 3 
           END",
    )
    .bind(&project_id)
    .fetch_all(pool.get_ref())
    .await;

    match result {
        Ok(members) => {
            let members_json: Vec<serde_json::Value> = members
                .iter()
                .map(|(id, uid, first_name, last_name, role, added_at)| {
                    serde_json::json!({
                        "id": id,
                        "userId": uid,
                        "name": format!("{} {}", first_name, last_name),
                        "role": role,
                        "addedAt": added_at
                    })
                })
                .collect();

            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": {
                    "members": members_json,
                    "total": members_json.len()
                }
            }))
        }
        Err(e) => {
            eprintln!("Database error: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": { "code": "INTERNAL_ERROR", "message": "Database error" }
            }))
        }
    }
}

async fn add_member(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Json<AddMemberRequest>,
) -> HttpResponse {
    let user_id = match req.extensions().get::<String>() {
        Some(id) => id.clone(),
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "success": false,
                "error": { "code": "UNAUTHORIZED", "message": "Not authenticated" }
            }));
        }
    };

    let project_id = path.into_inner();

    // Check if user is owner or admin
    let role = sqlx::query_scalar::<_, String>(
        "SELECT role FROM project_members WHERE project_id = ? AND user_id = ?",
    )
    .bind(&project_id)
    .bind(&user_id)
    .fetch_optional(pool.get_ref())
    .await;

    match role {
        Ok(Some(r)) if r == "owner" || r == "admin" => {}
        _ => {
            return HttpResponse::Forbidden().json(serde_json::json!({
                "success": false,
                "error": { "code": "FORBIDDEN", "message": "Only project owner or admin can add members" }
            }));
        }
    }

    // Check if user is already a member
    let existing = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM project_members WHERE project_id = ? AND user_id = ?",
    )
    .bind(&project_id)
    .bind(&body.user_id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);

    if existing > 0 {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "success": false,
            "error": { "code": "ALREADY_MEMBER", "message": "User is already a member" }
        }));
    }

    let member_id = Uuid::new_v4().to_string();
    let member_role = body.role.clone().unwrap_or_else(|| "member".to_string());

    match sqlx::query(
        "INSERT INTO project_members (id, project_id, user_id, role, added_at) 
         VALUES (?, ?, ?, ?, datetime('now'))",
    )
    .bind(&member_id)
    .bind(&project_id)
    .bind(&body.user_id)
    .bind(&member_role)
    .execute(pool.get_ref())
    .await
    {
        Ok(_) => HttpResponse::Created().json(serde_json::json!({
            "success": true,
            "data": {
                "member": {
                    "id": member_id,
                    "userId": body.user_id,
                    "role": member_role
                }
            }
        })),
        Err(e) => {
            eprintln!("Database error: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": { "code": "INTERNAL_ERROR", "message": "Failed to add member" }
            }))
        }
    }
}

async fn remove_member(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<(String, String)>,
) -> HttpResponse {
    let current_user_id = match req.extensions().get::<String>() {
        Some(id) => id.clone(),
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "success": false,
                "error": { "code": "UNAUTHORIZED", "message": "Not authenticated" }
            }));
        }
    };

    let (project_id, target_user_id) = path.into_inner();

    // Check if current user is owner or admin (or removing themselves)
    let role = sqlx::query_scalar::<_, String>(
        "SELECT role FROM project_members WHERE project_id = ? AND user_id = ?",
    )
    .bind(&project_id)
    .bind(&current_user_id)
    .fetch_optional(pool.get_ref())
    .await;

    let can_remove = match role {
        Ok(Some(r)) => r == "owner" || r == "admin" || current_user_id == target_user_id,
        _ => false,
    };

    if !can_remove {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "success": false,
            "error": { "code": "FORBIDDEN", "message": "Not authorized to remove this member" }
        }));
    }

    // Check if trying to remove the owner
    let target_role = sqlx::query_scalar::<_, String>(
        "SELECT role FROM project_members WHERE project_id = ? AND user_id = ?",
    )
    .bind(&project_id)
    .bind(&target_user_id)
    .fetch_optional(pool.get_ref())
    .await;

    if let Ok(Some(r)) = target_role {
        if r == "owner" {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "success": false,
                "error": { "code": "CANNOT_REMOVE_OWNER", "message": "Cannot remove the project owner" }
            }));
        }
    }

    match sqlx::query("DELETE FROM project_members WHERE project_id = ? AND user_id = ?")
        .bind(&project_id)
        .bind(&target_user_id)
        .execute(pool.get_ref())
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                HttpResponse::Ok().json(serde_json::json!({
                    "success": true,
                    "message": "Member removed successfully"
                }))
            } else {
                HttpResponse::NotFound().json(serde_json::json!({
                    "success": false,
                    "error": { "code": "NOT_FOUND", "message": "Member not found" }
                }))
            }
        }
        Err(e) => {
            eprintln!("Database error: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": { "code": "INTERNAL_ERROR", "message": "Failed to remove member" }
            }))
        }
    }
}

async fn get_project_tasks(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<String>,
) -> HttpResponse {
    let user_id = match req.extensions().get::<String>() {
        Some(id) => id.clone(),
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "success": false,
                "error": { "code": "UNAUTHORIZED", "message": "Not authenticated" }
            }));
        }
    };

    let project_id = path.into_inner();

    // Check if user is a member
    let is_member = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM project_members WHERE project_id = ? AND user_id = ?",
    )
    .bind(&project_id)
    .bind(&user_id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);

    if is_member == 0 {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "success": false,
            "error": { "code": "FORBIDDEN", "message": "You are not a member of this project" }
        }));
    }

    let result = sqlx::query_as::<_, (String, String, Option<String>, String, String, Option<String>, String, bool, String, String)>(
        "SELECT t.id, t.title, t.description, t.urgency, t.department, t.assignee_id, t.deadline, t.is_completed, t.created_at, t.updated_at
         FROM tasks t
         WHERE t.project_id = ?
         ORDER BY t.is_completed ASC, t.deadline ASC"
    )
    .bind(&project_id)
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
                        department,
                        assignee_id,
                        deadline,
                        is_completed,
                        created_at,
                        updated_at,
                    )| {
                        serde_json::json!({
                            "id": id,
                            "title": title,
                            "description": description,
                            "urgency": urgency,
                            "department": department,
                            "assigneeId": assignee_id,
                            "deadline": deadline,
                            "isCompleted": is_completed,
                            "createdAt": created_at,
                            "updatedAt": updated_at
                        })
                    },
                )
                .collect();

            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": {
                    "tasks": tasks_json,
                    "total": tasks_json.len()
                }
            }))
        }
        Err(e) => {
            eprintln!("Database error: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": { "code": "INTERNAL_ERROR", "message": "Database error" }
            }))
        }
    }
}
