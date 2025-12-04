use actix_web::{HttpMessage, HttpRequest, HttpResponse, web};
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::models::notifications::{
    GetNotificationsQuery, Notification, NotificationPreference, UpdatePreferencesRequest,
};

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/notifications")
            .route("", web::get().to(get_notifications))
            .route("/{notification_id}/read", web::post().to(mark_as_read))
            .route("/read-all", web::post().to(mark_all_as_read))
            .route("/{notification_id}", web::delete().to(delete_notification))
            .route("/clear-all", web::delete().to(clear_all_notifications))
            .route("/stats", web::get().to(get_stats))
            .route("/preferences", web::get().to(get_preferences))
            .route("/preferences", web::put().to(update_preferences)),
    );
}

async fn get_notifications(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    query: web::Query<GetNotificationsQuery>,
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

    let mut sql = String::from(
        "SELECT id, user_id, type, title, message, related_entity_type, related_entity_id, is_read, created_at FROM notifications WHERE user_id = ?",
    );

    if query.unread_only.unwrap_or(false) {
        sql.push_str(" AND is_read = 0");
    }
    if let Some(ref notification_type) = query.notification_type {
        sql.push_str(&format!(" AND type = '{}'", notification_type));
    }

    sql.push_str(" ORDER BY created_at DESC");

    let limit = query.limit.unwrap_or(50);
    sql.push_str(&format!(" LIMIT {}", limit));

    let result = sqlx::query_as::<_, Notification>(&sql)
        .bind(&user_id)
        .fetch_all(pool.get_ref())
        .await;

    match result {
        Ok(notifications) => {
            let notifications_json: Vec<serde_json::Value> = notifications
                .iter()
                .map(|n| {
                    serde_json::json!({
                        "id": n.id,
                        "type": n.notification_type,
                        "title": n.title,
                        "message": n.message,
                        "relatedEntityType": n.related_entity_type,
                        "relatedEntityId": n.related_entity_id,
                        "isRead": n.is_read,
                        "createdAt": n.created_at
                    })
                })
                .collect();

            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": {
                    "notifications": notifications_json,
                    "total": notifications_json.len()
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

async fn mark_as_read(
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

    let notification_id = path.into_inner();

    let result = sqlx::query("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?")
        .bind(&notification_id)
        .bind(&user_id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(rows) => {
            if rows.rows_affected() > 0 {
                HttpResponse::Ok().json(serde_json::json!({
                    "success": true,
                    "message": "Notification marked as read"
                }))
            } else {
                HttpResponse::NotFound().json(serde_json::json!({
                    "success": false,
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Notification not found"
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
                    "message": "Failed to mark notification as read"
                }
            }))
        }
    }
}

async fn mark_all_as_read(pool: web::Data<SqlitePool>, req: HttpRequest) -> HttpResponse {
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

    let result =
        sqlx::query("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0")
            .bind(&user_id)
            .execute(pool.get_ref())
            .await;

    match result {
        Ok(rows) => HttpResponse::Ok().json(serde_json::json!({
            "success": true,
            "message": "All notifications marked as read",
            "data": {
                "markedCount": rows.rows_affected()
            }
        })),
        Err(e) => {
            eprintln!("Database error: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Failed to mark notifications as read"
                }
            }))
        }
    }
}

async fn delete_notification(
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

    let notification_id = path.into_inner();

    let result = sqlx::query("DELETE FROM notifications WHERE id = ? AND user_id = ?")
        .bind(&notification_id)
        .bind(&user_id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(rows) => {
            if rows.rows_affected() > 0 {
                HttpResponse::Ok().json(serde_json::json!({
                    "success": true,
                    "message": "Notification deleted successfully"
                }))
            } else {
                HttpResponse::NotFound().json(serde_json::json!({
                    "success": false,
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Notification not found"
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
                    "message": "Failed to delete notification"
                }
            }))
        }
    }
}

async fn clear_all_notifications(pool: web::Data<SqlitePool>, req: HttpRequest) -> HttpResponse {
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

    let result = sqlx::query("DELETE FROM notifications WHERE user_id = ?")
        .bind(&user_id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(rows) => HttpResponse::Ok().json(serde_json::json!({
            "success": true,
            "message": "All notifications cleared",
            "data": {
                "deletedCount": rows.rows_affected()
            }
        })),
        Err(e) => {
            eprintln!("Database error: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Failed to clear notifications"
                }
            }))
        }
    }
}

async fn get_stats(pool: web::Data<SqlitePool>, req: HttpRequest) -> HttpResponse {
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

    let total = sqlx::query_as::<_, (i64,)>("SELECT COUNT(*) FROM notifications WHERE user_id = ?")
        .bind(&user_id)
        .fetch_one(pool.get_ref())
        .await
        .map(|(c,)| c)
        .unwrap_or(0);

    let unread = sqlx::query_as::<_, (i64,)>(
        "SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0",
    )
    .bind(&user_id)
    .fetch_one(pool.get_ref())
    .await
    .map(|(c,)| c)
    .unwrap_or(0);

    // Count by type
    let by_type = sqlx::query_as::<_, (String, i64)>(
        "SELECT type, COUNT(*) FROM notifications WHERE user_id = ? GROUP BY type",
    )
    .bind(&user_id)
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();

    let by_type_json: serde_json::Value = serde_json::to_value(
        by_type
            .iter()
            .map(|(t, c)| (t.clone(), *c))
            .collect::<std::collections::HashMap<_, _>>(),
    )
    .unwrap_or(serde_json::json!({}));

    HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": {
            "stats": {
                "total": total,
                "unread": unread,
                "read": total - unread,
                "byType": by_type_json
            }
        }
    }))
}

async fn get_preferences(pool: web::Data<SqlitePool>, req: HttpRequest) -> HttpResponse {
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

    let result = sqlx::query_as::<_, NotificationPreference>(
        "SELECT id, user_id, notification_type, email_enabled, push_enabled, in_app_enabled, created_at, updated_at FROM notification_preferences WHERE user_id = ?"
    )
    .bind(&user_id)
    .fetch_all(pool.get_ref())
    .await;

    match result {
        Ok(preferences) => {
            if preferences.is_empty() {
                // Return default preferences
                HttpResponse::Ok().json(serde_json::json!({
                    "success": true,
                    "data": {
                        "preferences": {
                            "task_assigned": { "emailEnabled": true, "pushEnabled": true, "inAppEnabled": true },
                            "task_due": { "emailEnabled": true, "pushEnabled": true, "inAppEnabled": true },
                            "event_reminder": { "emailEnabled": true, "pushEnabled": true, "inAppEnabled": true },
                            "booking_confirmed": { "emailEnabled": true, "pushEnabled": false, "inAppEnabled": true },
                            "booking_cancelled": { "emailEnabled": true, "pushEnabled": false, "inAppEnabled": true }
                        }
                    }
                }))
            } else {
                let prefs_json: serde_json::Value = serde_json::to_value(
                    preferences
                        .iter()
                        .map(|p| {
                            (
                                p.notification_type.clone(),
                                serde_json::json!({
                                    "emailEnabled": p.email_enabled,
                                    "pushEnabled": p.push_enabled,
                                    "inAppEnabled": p.in_app_enabled
                                }),
                            )
                        })
                        .collect::<std::collections::HashMap<_, _>>(),
                )
                .unwrap_or(serde_json::json!({}));

                HttpResponse::Ok().json(serde_json::json!({
                    "success": true,
                    "data": {
                        "preferences": prefs_json
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
                    "message": "Database error"
                }
            }))
        }
    }
}

async fn update_preferences(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    body: web::Json<UpdatePreferencesRequest>,
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

    for pref in &body.preferences {
        let pref_id = Uuid::new_v4().to_string();
        let _ = sqlx::query(
            "INSERT OR REPLACE INTO notification_preferences (id, user_id, notification_type, email_enabled, push_enabled, in_app_enabled, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))"
        )
        .bind(&pref_id)
        .bind(&user_id)
        .bind(&pref.notification_type)
        .bind(pref.email_enabled)
        .bind(pref.push_enabled)
        .bind(pref.in_app_enabled)
        .execute(pool.get_ref())
        .await;
    }

    HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "Preferences updated successfully"
    }))
}

// Helper function to create a notification (can be called from other routes)
pub async fn create_notification(
    pool: &SqlitePool,
    user_id: &str,
    notification_type: &str,
    title: &str,
    message: &str,
    related_entity_type: Option<&str>,
    related_entity_id: Option<&str>,
) -> Result<String, sqlx::Error> {
    let notification_id = Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO notifications (id, user_id, type, title, message, related_entity_type, related_entity_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&notification_id)
    .bind(user_id)
    .bind(notification_type)
    .bind(title)
    .bind(message)
    .bind(related_entity_type)
    .bind(related_entity_id)
    .execute(pool)
    .await?;

    Ok(notification_id)
}
