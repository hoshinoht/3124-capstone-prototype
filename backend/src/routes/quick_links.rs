use actix_web::{HttpMessage, HttpRequest, HttpResponse, web};
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::models::quick_links::{
    CreateQuickLinkRequest, GetQuickLinksQuery, QuickLink, UpdateQuickLinkRequest,
};

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/quick-links")
            .route("", web::get().to(get_quick_links))
            .route("", web::post().to(create_quick_link))
            .route("/me", web::get().to(get_my_quick_links))
            .route("/{link_id}", web::put().to(update_quick_link))
            .route("/{link_id}", web::delete().to(delete_quick_link))
            .route("/{link_id}/pin", web::post().to(pin_quick_link))
            .route("/{link_id}/unpin", web::post().to(unpin_quick_link)),
    );
}

async fn get_quick_links(
    pool: web::Data<SqlitePool>,
    query: web::Query<GetQuickLinksQuery>,
) -> HttpResponse {
    let mut sql = String::from(
        "SELECT id, title, url, description, category, department, icon, display_order, created_by, created_at, updated_at FROM quick_links WHERE 1=1",
    );

    if let Some(ref category) = query.category {
        sql.push_str(&format!(" AND category = '{}'", category));
    }
    if let Some(ref department) = query.department {
        sql.push_str(&format!(
            " AND (department = '{}' OR department = 'Both')",
            department
        ));
    }
    if let Some(ref search) = query.search {
        sql.push_str(&format!(
            " AND (title LIKE '%{}%' OR description LIKE '%{}%' OR url LIKE '%{}%')",
            search, search, search
        ));
    }

    sql.push_str(" ORDER BY display_order, title");

    let result = sqlx::query_as::<_, QuickLink>(&sql)
        .fetch_all(pool.get_ref())
        .await;

    match result {
        Ok(links) => {
            let links_json: Vec<serde_json::Value> = links
                .iter()
                .map(|l| {
                    serde_json::json!({
                        "id": l.id,
                        "title": l.title,
                        "url": l.url,
                        "description": l.description,
                        "category": l.category,
                        "department": l.department,
                        "icon": l.icon,
                        "displayOrder": l.display_order
                    })
                })
                .collect();

            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": {
                    "links": links_json
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

async fn get_my_quick_links(pool: web::Data<SqlitePool>, req: HttpRequest) -> HttpResponse {
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

    let result = sqlx::query_as::<_, QuickLink>(
        "SELECT ql.id, ql.title, ql.url, ql.description, ql.category, ql.department, ql.icon, uql.display_order, ql.created_by, ql.created_at, ql.updated_at
         FROM quick_links ql
         JOIN user_quick_links uql ON ql.id = uql.link_id
         WHERE uql.user_id = ?
         ORDER BY uql.display_order, ql.title"
    )
    .bind(&user_id)
    .fetch_all(pool.get_ref())
    .await;

    match result {
        Ok(links) => {
            let links_json: Vec<serde_json::Value> = links
                .iter()
                .map(|l| {
                    serde_json::json!({
                        "id": l.id,
                        "title": l.title,
                        "url": l.url,
                        "description": l.description,
                        "category": l.category,
                        "department": l.department,
                        "icon": l.icon,
                        "displayOrder": l.display_order,
                        "isPinned": true
                    })
                })
                .collect();

            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": {
                    "pinnedLinks": links_json
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

async fn create_quick_link(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    body: web::Json<CreateQuickLinkRequest>,
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

    let link_id = Uuid::new_v4().to_string();
    let display_order = body.display_order.unwrap_or(0);

    let result = sqlx::query(
        "INSERT INTO quick_links (id, title, url, description, category, department, icon, display_order, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&link_id)
    .bind(&body.title)
    .bind(&body.url)
    .bind(&body.description)
    .bind(&body.category)
    .bind(body.department.as_deref().unwrap_or("Both"))
    .bind(&body.icon)
    .bind(display_order)
    .bind(&user_id)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => HttpResponse::Created().json(serde_json::json!({
            "success": true,
            "data": {
                "link": {
                    "id": link_id,
                    "title": body.title,
                    "url": body.url,
                    "description": body.description,
                    "category": body.category,
                    "department": body.department.as_deref().unwrap_or("Both"),
                    "icon": body.icon,
                    "displayOrder": display_order
                }
            }
        })),
        Err(e) => {
            eprintln!("Database error: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Failed to create quick link"
                }
            }))
        }
    }
}

async fn update_quick_link(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    body: web::Json<UpdateQuickLinkRequest>,
) -> HttpResponse {
    let link_id = path.into_inner();

    let mut updates = vec![];
    if let Some(ref title) = body.title {
        updates.push(format!("title = '{}'", title));
    }
    if let Some(ref url) = body.url {
        updates.push(format!("url = '{}'", url));
    }
    if let Some(ref description) = body.description {
        updates.push(format!("description = '{}'", description));
    }
    if let Some(ref category) = body.category {
        updates.push(format!("category = '{}'", category));
    }
    if let Some(ref department) = body.department {
        updates.push(format!("department = '{}'", department));
    }
    if let Some(ref icon) = body.icon {
        updates.push(format!("icon = '{}'", icon));
    }
    if let Some(order) = body.display_order {
        updates.push(format!("display_order = {}", order));
    }

    if updates.is_empty() {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "success": false,
            "error": {
                "code": "BAD_REQUEST",
                "message": "No fields to update"
            }
        }));
    }

    updates.push("updated_at = datetime('now')".to_string());
    let sql = format!("UPDATE quick_links SET {} WHERE id = ?", updates.join(", "));

    let result = sqlx::query(&sql)
        .bind(&link_id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(rows) => {
            if rows.rows_affected() > 0 {
                // Fetch updated link
                let link = sqlx::query_as::<_, QuickLink>(
                    "SELECT id, title, url, description, category, department, icon, display_order, created_by, created_at, updated_at FROM quick_links WHERE id = ?"
                )
                .bind(&link_id)
                .fetch_optional(pool.get_ref())
                .await;

                match link {
                    Ok(Some(l)) => HttpResponse::Ok().json(serde_json::json!({
                        "success": true,
                        "data": {
                            "link": {
                                "id": l.id,
                                "title": l.title,
                                "url": l.url,
                                "description": l.description,
                                "category": l.category,
                                "department": l.department,
                                "icon": l.icon,
                                "displayOrder": l.display_order
                            }
                        }
                    })),
                    _ => HttpResponse::NotFound().json(serde_json::json!({
                        "success": false,
                        "error": {
                            "code": "NOT_FOUND",
                            "message": "Quick link not found"
                        }
                    })),
                }
            } else {
                HttpResponse::NotFound().json(serde_json::json!({
                    "success": false,
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Quick link not found"
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
                    "message": "Failed to update quick link"
                }
            }))
        }
    }
}

async fn delete_quick_link(pool: web::Data<SqlitePool>, path: web::Path<String>) -> HttpResponse {
    let link_id = path.into_inner();

    // Delete from user_quick_links first
    let _ = sqlx::query("DELETE FROM user_quick_links WHERE link_id = ?")
        .bind(&link_id)
        .execute(pool.get_ref())
        .await;

    let result = sqlx::query("DELETE FROM quick_links WHERE id = ?")
        .bind(&link_id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(rows) => {
            if rows.rows_affected() > 0 {
                HttpResponse::Ok().json(serde_json::json!({
                    "success": true,
                    "message": "Quick link deleted successfully"
                }))
            } else {
                HttpResponse::NotFound().json(serde_json::json!({
                    "success": false,
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Quick link not found"
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
                    "message": "Failed to delete quick link"
                }
            }))
        }
    }
}

async fn pin_quick_link(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<String>,
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

    let link_id = path.into_inner();

    // Get max display order
    let max_order = sqlx::query_as::<_, (i32,)>(
        "SELECT COALESCE(MAX(display_order), 0) FROM user_quick_links WHERE user_id = ?",
    )
    .bind(&user_id)
    .fetch_optional(pool.get_ref())
    .await
    .ok()
    .flatten()
    .map(|(o,)| o)
    .unwrap_or(0);

    let result = sqlx::query(
        "INSERT OR REPLACE INTO user_quick_links (user_id, link_id, display_order) VALUES (?, ?, ?)"
    )
    .bind(&user_id)
    .bind(&link_id)
    .bind(max_order + 1)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "success": true,
            "message": "Quick link pinned successfully"
        })),
        Err(e) => {
            eprintln!("Database error: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Failed to pin quick link"
                }
            }))
        }
    }
}

async fn unpin_quick_link(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<String>,
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

    let link_id = path.into_inner();

    let result = sqlx::query("DELETE FROM user_quick_links WHERE user_id = ? AND link_id = ?")
        .bind(&user_id)
        .bind(&link_id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "success": true,
            "message": "Quick link unpinned successfully"
        })),
        Err(e) => {
            eprintln!("Database error: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Failed to unpin quick link"
                }
            }))
        }
    }
}
