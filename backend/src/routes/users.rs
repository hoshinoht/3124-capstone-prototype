use actix_web::{HttpMessage, HttpRequest, HttpResponse, web};
use bcrypt::{DEFAULT_COST, hash};
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::models::users::{CreateUserRequest, UpdateUserRequest, User, UserResponse};

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/users")
            .route("/me", web::get().to(get_current_user))
            .route("/me", web::put().to(update_current_user))
            .route("", web::get().to(get_all_users))
            .route("", web::post().to(create_user))
            .route("/{user_id}", web::put().to(update_user))
            .route("/{user_id}", web::delete().to(delete_user)),
    );
}

async fn get_current_user(pool: web::Data<SqlitePool>, req: HttpRequest) -> HttpResponse {
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

    let result = sqlx::query_as::<_, User>(
        "SELECT id, email, password_hash, first_name, last_name, department, role, is_active, created_at, updated_at, last_login FROM users WHERE id = ?"
    )
    .bind(&user_id)
    .fetch_optional(pool.get_ref())
    .await;

    match result {
        Ok(Some(user)) => HttpResponse::Ok().json(serde_json::json!({
            "success": true,
            "data": {
                "user": UserResponse::from(user)
            }
        })),
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({
            "success": false,
            "error": {
                "code": "NOT_FOUND",
                "message": "User not found"
            }
        })),
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

async fn update_current_user(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    body: web::Json<UpdateUserRequest>,
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

    let mut updates = Vec::new();
    let mut params: Vec<String> = Vec::new();

    if let Some(ref first_name) = body.first_name {
        updates.push("first_name = ?");
        params.push(first_name.clone());
    }
    if let Some(ref last_name) = body.last_name {
        updates.push("last_name = ?");
        params.push(last_name.clone());
    }
    if let Some(ref department) = body.department {
        updates.push("department = ?");
        params.push(department.clone());
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
    let query = format!("UPDATE users SET {} WHERE id = ?", updates.join(", "));

    let mut query_builder = sqlx::query(&query);
    for param in params {
        query_builder = query_builder.bind(param);
    }
    query_builder = query_builder.bind(&user_id);

    match query_builder.execute(pool.get_ref()).await {
        Ok(_) => {
            // Fetch updated user
            let user = sqlx::query_as::<_, User>(
                "SELECT id, email, password_hash, first_name, last_name, department, role, is_active, created_at, updated_at, last_login FROM users WHERE id = ?"
            )
            .bind(&user_id)
            .fetch_one(pool.get_ref())
            .await;

            match user {
                Ok(u) => HttpResponse::Ok().json(serde_json::json!({
                    "success": true,
                    "data": {
                        "user": UserResponse::from(u)
                    }
                })),
                Err(e) => {
                    eprintln!("Database error: {:?}", e);
                    HttpResponse::InternalServerError().json(serde_json::json!({
                        "success": false,
                        "error": {
                            "code": "INTERNAL_ERROR",
                            "message": "Failed to fetch updated user"
                        }
                    }))
                }
            }
        }
        Err(e) => {
            eprintln!("Database error: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Failed to update user"
                }
            }))
        }
    }
}

async fn get_all_users(pool: web::Data<SqlitePool>, req: HttpRequest) -> HttpResponse {
    let is_admin = req.extensions().get::<bool>().cloned().unwrap_or(false);

    let query = if is_admin {
        "SELECT id, email, password_hash, first_name, last_name, department, role, is_active, created_at, updated_at, last_login FROM users ORDER BY first_name, last_name"
    } else {
        "SELECT id, email, password_hash, first_name, last_name, department, role, is_active, created_at, updated_at, last_login FROM users WHERE is_active = 1 ORDER BY first_name, last_name"
    };

    let result = sqlx::query_as::<_, User>(query)
        .fetch_all(pool.get_ref())
        .await;

    match result {
        Ok(users) => {
            let user_responses: Vec<UserResponse> =
                users.into_iter().map(UserResponse::from).collect();
            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": {
                    "users": user_responses,
                    "pagination": {
                        "total": user_responses.len(),
                        "count": user_responses.len()
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

async fn create_user(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    body: web::Json<CreateUserRequest>,
) -> HttpResponse {
    let is_admin = req.extensions().get::<bool>().cloned().unwrap_or(false);

    if !is_admin {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "success": false,
            "error": {
                "code": "FORBIDDEN",
                "message": "Only administrators can create users"
            }
        }));
    }

    let password_hash = match hash(&body.password, DEFAULT_COST) {
        Ok(h) => h,
        Err(e) => {
            eprintln!("Hashing error: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Failed to hash password"
                }
            }));
        }
    };

    let user_id = Uuid::new_v4().to_string();

    let result = sqlx::query(
        "INSERT INTO users (id, email, password_hash, first_name, last_name, department, role) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&user_id)
    .bind(&body.email)
    .bind(&password_hash)
    .bind(&body.first_name)
    .bind(&body.last_name)
    .bind(&body.department)
    .bind(&body.role)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            let user = sqlx::query_as::<_, User>(
                "SELECT id, email, password_hash, first_name, last_name, department, role, is_active, created_at, updated_at, last_login FROM users WHERE id = ?"
            )
            .bind(&user_id)
            .fetch_one(pool.get_ref())
            .await;

            match user {
                Ok(u) => HttpResponse::Created().json(serde_json::json!({
                    "success": true,
                    "data": {
                        "user": UserResponse::from(u)
                    }
                })),
                Err(e) => {
                    eprintln!("Database error: {:?}", e);
                    HttpResponse::InternalServerError().json(serde_json::json!({
                        "success": false,
                        "error": {
                            "code": "INTERNAL_ERROR",
                            "message": "User created but failed to fetch"
                        }
                    }))
                }
            }
        }
        Err(e) => {
            eprintln!("Database error: {:?}", e);
            if e.to_string().contains("UNIQUE constraint failed") {
                HttpResponse::Conflict().json(serde_json::json!({
                    "success": false,
                    "error": {
                        "code": "CONFLICT",
                        "message": "Email already exists"
                    }
                }))
            } else {
                HttpResponse::InternalServerError().json(serde_json::json!({
                    "success": false,
                    "error": {
                        "code": "INTERNAL_ERROR",
                        "message": "Failed to create user"
                    }
                }))
            }
        }
    }
}

async fn update_user(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Json<UpdateUserRequest>,
) -> HttpResponse {
    let is_admin = req.extensions().get::<bool>().cloned().unwrap_or(false);

    if !is_admin {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "success": false,
            "error": {
                "code": "FORBIDDEN",
                "message": "Only administrators can update users"
            }
        }));
    }

    let user_id = path.into_inner();
    let mut updates = Vec::new();
    let mut params: Vec<String> = Vec::new();

    if let Some(ref first_name) = body.first_name {
        updates.push("first_name = ?");
        params.push(first_name.clone());
    }
    if let Some(ref last_name) = body.last_name {
        updates.push("last_name = ?");
        params.push(last_name.clone());
    }
    if let Some(ref department) = body.department {
        updates.push("department = ?");
        params.push(department.clone());
    }
    if let Some(ref role) = body.role {
        updates.push("role = ?");
        params.push(role.clone());
    }
    if let Some(is_active) = body.is_active {
        updates.push("is_active = ?");
        params.push(if is_active {
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
    let query = format!("UPDATE users SET {} WHERE id = ?", updates.join(", "));

    let mut query_builder = sqlx::query(&query);
    for param in params {
        query_builder = query_builder.bind(param);
    }
    query_builder = query_builder.bind(&user_id);

    match query_builder.execute(pool.get_ref()).await {
        Ok(result) => {
            if result.rows_affected() == 0 {
                return HttpResponse::NotFound().json(serde_json::json!({
                    "success": false,
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "User not found"
                    }
                }));
            }

            let user = sqlx::query_as::<_, User>(
                "SELECT id, email, password_hash, first_name, last_name, department, role, is_active, created_at, updated_at, last_login FROM users WHERE id = ?"
            )
            .bind(&user_id)
            .fetch_one(pool.get_ref())
            .await;

            match user {
                Ok(u) => HttpResponse::Ok().json(serde_json::json!({
                    "success": true,
                    "data": {
                        "user": UserResponse::from(u)
                    }
                })),
                Err(e) => {
                    eprintln!("Database error: {:?}", e);
                    HttpResponse::InternalServerError().json(serde_json::json!({
                        "success": false,
                        "error": {
                            "code": "INTERNAL_ERROR",
                            "message": "Failed to fetch updated user"
                        }
                    }))
                }
            }
        }
        Err(e) => {
            eprintln!("Database error: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Failed to update user"
                }
            }))
        }
    }
}

async fn delete_user(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<String>,
) -> HttpResponse {
    let is_admin = req.extensions().get::<bool>().cloned().unwrap_or(false);

    if !is_admin {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "success": false,
            "error": {
                "code": "FORBIDDEN",
                "message": "Only administrators can delete users"
            }
        }));
    }

    let user_id = path.into_inner();

    // Soft delete - just set is_active to false
    let result =
        sqlx::query("UPDATE users SET is_active = 0, updated_at = datetime('now') WHERE id = ?")
            .bind(&user_id)
            .execute(pool.get_ref())
            .await;

    match result {
        Ok(rows) => {
            if rows.rows_affected() > 0 {
                HttpResponse::Ok().json(serde_json::json!({
                    "success": true,
                    "message": "User deactivated successfully"
                }))
            } else {
                HttpResponse::NotFound().json(serde_json::json!({
                    "success": false,
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "User not found"
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
                    "message": "Failed to delete user"
                }
            }))
        }
    }
}
