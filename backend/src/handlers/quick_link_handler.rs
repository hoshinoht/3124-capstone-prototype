use actix_web::{web, HttpResponse, HttpRequest};
use sqlx::SqlitePool;
use crate::models::*;
use crate::auth::Claims;

// Create quick link
pub async fn create_quick_link(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    link_data: web::Json<CreateQuickLinkRequest>,
) -> Result<HttpResponse, actix_web::Error> {
    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("No token found"))?;

    let is_pinned = link_data.is_pinned.unwrap_or(false);

    let result = sqlx::query!(
        r#"
        INSERT INTO quick_links (title, url, description, icon, category, is_pinned, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        "#,
        link_data.title,
        link_data.url,
        link_data.description,
        link_data.icon,
        link_data.category,
        is_pinned,
        claims.sub
    )
    .execute(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to create quick link"))?;

    let link = sqlx::query_as::<_, QuickLink>(
        "SELECT * FROM quick_links WHERE id = ?"
    )
    .bind(result.last_insert_rowid())
    .fetch_one(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to fetch created link"))?;

    Ok(HttpResponse::Created().json(ApiResponse::success(link)))
}

// Get all quick links
pub async fn get_all_quick_links(
    pool: web::Data<SqlitePool>,
) -> Result<HttpResponse, actix_web::Error> {
    let links = sqlx::query_as::<_, QuickLink>(
        "SELECT * FROM quick_links ORDER BY is_pinned DESC, display_order ASC, created_at DESC"
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to fetch quick links"))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(links)))
}

// Get pinned quick links
pub async fn get_pinned_quick_links(
    pool: web::Data<SqlitePool>,
) -> Result<HttpResponse, actix_web::Error> {
    let links = sqlx::query_as::<_, QuickLink>(
        "SELECT * FROM quick_links WHERE is_pinned = 1 ORDER BY display_order ASC"
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to fetch pinned links"))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(links)))
}

// Get quick link by ID
pub async fn get_quick_link_by_id(
    pool: web::Data<SqlitePool>,
    link_id: web::Path<i64>,
) -> Result<HttpResponse, actix_web::Error> {
    let link = sqlx::query_as::<_, QuickLink>(
        "SELECT * FROM quick_links WHERE id = ?"
    )
    .bind(link_id.into_inner())
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Database error"))?;

    match link {
        Some(link) => Ok(HttpResponse::Ok().json(ApiResponse::success(link))),
        None => Ok(HttpResponse::NotFound().json(ApiResponse::<()>::error("Quick link not found".to_string()))),
    }
}

// Update quick link
pub async fn update_quick_link(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    link_id: web::Path<i64>,
    update_data: web::Json<UpdateQuickLinkRequest>,
) -> Result<HttpResponse, actix_web::Error> {
    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("No token found"))?;

    let link_id = link_id.into_inner();

    let link = sqlx::query_as::<_, QuickLink>(
        "SELECT * FROM quick_links WHERE id = ?"
    )
    .bind(link_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Database error"))?
    .ok_or_else(|| actix_web::error::ErrorNotFound("Quick link not found"))?;

    if link.created_by != claims.sub && claims.role != "admin" {
        return Ok(HttpResponse::Forbidden().json(ApiResponse::<()>::error(
            "You don't have permission to update this link".to_string()
        )));
    }

    let mut updates = Vec::new();
    let mut values: Vec<String> = Vec::new();

    if let Some(title) = &update_data.title {
        updates.push("title = ?");
        values.push(title.clone());
    }
    if let Some(url) = &update_data.url {
        updates.push("url = ?");
        values.push(url.clone());
    }
    if let Some(description) = &update_data.description {
        updates.push("description = ?");
        values.push(description.clone());
    }
    if let Some(icon) = &update_data.icon {
        updates.push("icon = ?");
        values.push(icon.clone());
    }
    if let Some(category) = &update_data.category {
        updates.push("category = ?");
        values.push(category.clone());
    }
    if let Some(display_order) = &update_data.display_order {
        updates.push("display_order = ?");
        values.push(display_order.to_string());
    }
    if let Some(is_pinned) = &update_data.is_pinned {
        updates.push("is_pinned = ?");
        values.push(if *is_pinned { "1" } else { "0" }.to_string());
    }

    if updates.is_empty() {
        return Ok(HttpResponse::BadRequest().json(ApiResponse::<()>::error(
            "No fields to update".to_string()
        )));
    }

    let sql = format!(
        "UPDATE quick_links SET {} WHERE id = ?",
        updates.join(", ")
    );

    let mut query = sqlx::query(&sql);
    for value in values {
        query = query.bind(value);
    }
    query = query.bind(link_id);

    query.execute(pool.get_ref())
        .await
        .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to update quick link"))?;

    let updated_link = sqlx::query_as::<_, QuickLink>(
        "SELECT * FROM quick_links WHERE id = ?"
    )
    .bind(link_id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to fetch updated link"))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(updated_link)))
}

// Delete quick link
pub async fn delete_quick_link(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    link_id: web::Path<i64>,
) -> Result<HttpResponse, actix_web::Error> {
    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("No token found"))?;

    let link_id = link_id.into_inner();

    let link = sqlx::query_as::<_, QuickLink>(
        "SELECT * FROM quick_links WHERE id = ?"
    )
    .bind(link_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Database error"))?
    .ok_or_else(|| actix_web::error::ErrorNotFound("Quick link not found"))?;

    if link.created_by != claims.sub && claims.role != "admin" {
        return Ok(HttpResponse::Forbidden().json(ApiResponse::<()>::error(
            "You don't have permission to delete this link".to_string()
        )));
    }

    sqlx::query("DELETE FROM quick_links WHERE id = ?")
        .bind(link_id)
        .execute(pool.get_ref())
        .await
        .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to delete quick link"))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success("Quick link deleted successfully")))
}
