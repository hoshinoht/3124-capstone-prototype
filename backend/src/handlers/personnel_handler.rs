use actix_web::{web, HttpResponse, HttpRequest};
use sqlx::SqlitePool;
use crate::models::*;
use crate::auth::Claims;

// Update personnel status
pub async fn update_status(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    status_data: web::Json<UpdatePersonnelStatusRequest>,
) -> Result<HttpResponse, actix_web::Error> {
    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("No token found"))?;

    let result = sqlx::query!(
        r#"
        INSERT INTO personnel_status (user_id, status, location, notes)
        VALUES (?, ?, ?, ?)
        "#,
        claims.sub,
        status_data.status,
        status_data.location,
        status_data.notes
    )
    .execute(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to update status"))?;

    let status = sqlx::query_as::<_, PersonnelStatus>(
        "SELECT * FROM personnel_status WHERE id = ?"
    )
    .bind(result.last_insert_rowid())
    .fetch_one(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to fetch status"))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(status)))
}

// Get all current personnel statuses
pub async fn get_all_statuses(
    pool: web::Data<SqlitePool>,
) -> Result<HttpResponse, actix_web::Error> {
    let statuses = sqlx::query_as::<_, CurrentPersonnelStatus>(
        r#"
        SELECT 
            ps.id,
            ps.user_id,
            u.username,
            u.full_name,
            u.department,
            ps.status,
            ps.location,
            ps.notes,
            ps.timestamp
        FROM current_personnel_status ps
        JOIN users u ON ps.user_id = u.id
        WHERE u.is_active = 1
        ORDER BY u.department, u.full_name
        "#
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to fetch personnel statuses"))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(statuses)))
}

// Get current user's status
pub async fn get_user_status(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
) -> Result<HttpResponse, actix_web::Error> {
    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("No token found"))?;

    let status = sqlx::query_as::<_, CurrentPersonnelStatus>(
        r#"
        SELECT 
            ps.id,
            ps.user_id,
            u.username,
            u.full_name,
            u.department,
            ps.status,
            ps.location,
            ps.notes,
            ps.timestamp
        FROM current_personnel_status ps
        JOIN users u ON ps.user_id = u.id
        WHERE ps.user_id = ?
        "#
    )
    .bind(claims.sub)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Database error"))?;

    match status {
        Some(status) => Ok(HttpResponse::Ok().json(ApiResponse::success(status))),
        None => Ok(HttpResponse::NotFound().json(ApiResponse::<()>::error("Status not found".to_string()))),
    }
}

// Get status history for a user
pub async fn get_status_history(
    pool: web::Data<SqlitePool>,
    user_id: web::Path<i64>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> Result<HttpResponse, actix_web::Error> {
    let limit = query.get("limit")
        .and_then(|l| l.parse::<i64>().ok())
        .unwrap_or(50);

    let statuses = sqlx::query_as::<_, PersonnelStatus>(
        "SELECT * FROM personnel_status WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?"
    )
    .bind(user_id.into_inner())
    .bind(limit)
    .fetch_all(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to fetch status history"))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(statuses)))
}

// Get statuses by department
pub async fn get_statuses_by_department(
    pool: web::Data<SqlitePool>,
    department: web::Path<String>,
) -> Result<HttpResponse, actix_web::Error> {
    let statuses = sqlx::query_as::<_, CurrentPersonnelStatus>(
        r#"
        SELECT 
            ps.id,
            ps.user_id,
            u.username,
            u.full_name,
            u.department,
            ps.status,
            ps.location,
            ps.notes,
            ps.timestamp
        FROM current_personnel_status ps
        JOIN users u ON ps.user_id = u.id
        WHERE u.department = ? AND u.is_active = 1
        ORDER BY u.full_name
        "#
    )
    .bind(department.as_str())
    .fetch_all(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to fetch statuses"))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(statuses)))
}
