use actix_web::{HttpMessage, HttpRequest, HttpResponse, web};
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::models::tracking::TrackUserRequest;

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/tracking")
            .route("", web::get().to(get_tracked_users))
            .route("/trackers", web::get().to(get_my_trackers))
            .route("/track", web::post().to(track_user))
            .route("/untrack/{user_id}", web::delete().to(untrack_user))
            .route("/check/{user_id}", web::get().to(check_if_tracking)),
    );
}

/// Get list of users that the current user is tracking
async fn get_tracked_users(pool: web::Data<SqlitePool>, req: HttpRequest) -> HttpResponse {
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

    let result = sqlx::query_as::<_, (String, String, String, String, String, Option<String>)>(
        r#"
        SELECT 
            ut.id,
            ut.tracked_user_id,
            u.first_name || ' ' || u.last_name as tracked_user_name,
            u.email as tracked_user_email,
            u.department as tracked_user_department,
            ut.created_at
        FROM user_tracking ut
        JOIN users u ON ut.tracked_user_id = u.id
        WHERE ut.tracker_user_id = ?
        ORDER BY ut.created_at DESC
        "#,
    )
    .bind(&user_id)
    .fetch_all(pool.get_ref())
    .await;

    match result {
        Ok(tracked_users) => {
            let users_json: Vec<serde_json::Value> = tracked_users
                .iter()
                .map(
                    |(id, tracked_user_id, name, email, department, created_at)| {
                        serde_json::json!({
                            "id": id,
                            "trackedUserId": tracked_user_id,
                            "trackedUserName": name,
                            "trackedUserEmail": email,
                            "trackedUserDepartment": department,
                            "createdAt": created_at
                        })
                    },
                )
                .collect();

            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": {
                    "trackedUsers": users_json,
                    "total": users_json.len()
                }
            }))
        }
        Err(e) => {
            eprintln!("Database error: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Failed to fetch tracked users"
                }
            }))
        }
    }
}

/// Get list of users who are tracking the current user
async fn get_my_trackers(pool: web::Data<SqlitePool>, req: HttpRequest) -> HttpResponse {
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

    let result = sqlx::query_as::<_, (String, String, String, String, Option<String>)>(
        r#"
        SELECT 
            ut.id,
            ut.tracker_user_id,
            u.first_name || ' ' || u.last_name as tracker_user_name,
            u.email as tracker_user_email,
            ut.created_at
        FROM user_tracking ut
        JOIN users u ON ut.tracker_user_id = u.id
        WHERE ut.tracked_user_id = ?
        ORDER BY ut.created_at DESC
        "#,
    )
    .bind(&user_id)
    .fetch_all(pool.get_ref())
    .await;

    match result {
        Ok(trackers) => {
            let trackers_json: Vec<serde_json::Value> = trackers
                .iter()
                .map(|(id, tracker_user_id, name, email, created_at)| {
                    serde_json::json!({
                        "id": id,
                        "trackerUserId": tracker_user_id,
                        "trackerUserName": name,
                        "trackerUserEmail": email,
                        "createdAt": created_at
                    })
                })
                .collect();

            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": {
                    "trackers": trackers_json,
                    "total": trackers_json.len()
                }
            }))
        }
        Err(e) => {
            eprintln!("Database error: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Failed to fetch trackers"
                }
            }))
        }
    }
}

/// Start tracking a user
async fn track_user(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    body: web::Json<TrackUserRequest>,
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

    // Can't track yourself
    if user_id == body.user_id {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "success": false,
            "error": {
                "code": "INVALID_REQUEST",
                "message": "You cannot track yourself"
            }
        }));
    }

    // Check if user exists
    let user_exists = sqlx::query_as::<_, (String,)>("SELECT id FROM users WHERE id = ?")
        .bind(&body.user_id)
        .fetch_optional(pool.get_ref())
        .await;

    match user_exists {
        Ok(Some(_)) => {}
        Ok(None) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "success": false,
                "error": {
                    "code": "NOT_FOUND",
                    "message": "User not found"
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
    }

    // Check if already tracking
    let already_tracking = sqlx::query_as::<_, (String,)>(
        "SELECT id FROM user_tracking WHERE tracker_user_id = ? AND tracked_user_id = ?",
    )
    .bind(&user_id)
    .bind(&body.user_id)
    .fetch_optional(pool.get_ref())
    .await;

    match already_tracking {
        Ok(Some(_)) => {
            return HttpResponse::Conflict().json(serde_json::json!({
                "success": false,
                "error": {
                    "code": "ALREADY_TRACKING",
                    "message": "You are already tracking this user"
                }
            }));
        }
        Ok(None) => {}
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
    }

    let tracking_id = Uuid::new_v4().to_string();

    let result = sqlx::query(
        "INSERT INTO user_tracking (id, tracker_user_id, tracked_user_id) VALUES (?, ?, ?)",
    )
    .bind(&tracking_id)
    .bind(&user_id)
    .bind(&body.user_id)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            // Get tracked user info
            let tracked_user = sqlx::query_as::<_, (String, String, String)>(
                "SELECT first_name, last_name, email FROM users WHERE id = ?",
            )
            .bind(&body.user_id)
            .fetch_optional(pool.get_ref())
            .await;

            let (first_name, last_name, email) = tracked_user.ok().flatten().unwrap_or((
                "Unknown".to_string(),
                "User".to_string(),
                "".to_string(),
            ));

            HttpResponse::Created().json(serde_json::json!({
                "success": true,
                "message": "Now tracking user",
                "data": {
                    "tracking": {
                        "id": tracking_id,
                        "trackedUserId": body.user_id,
                        "trackedUserName": format!("{} {}", first_name, last_name),
                        "trackedUserEmail": email
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
                    "message": "Failed to track user"
                }
            }))
        }
    }
}

/// Stop tracking a user
async fn untrack_user(
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

    let tracked_user_id = path.into_inner();

    let result =
        sqlx::query("DELETE FROM user_tracking WHERE tracker_user_id = ? AND tracked_user_id = ?")
            .bind(&user_id)
            .bind(&tracked_user_id)
            .execute(pool.get_ref())
            .await;

    match result {
        Ok(rows) => {
            if rows.rows_affected() > 0 {
                HttpResponse::Ok().json(serde_json::json!({
                    "success": true,
                    "message": "Stopped tracking user"
                }))
            } else {
                HttpResponse::NotFound().json(serde_json::json!({
                    "success": false,
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "You were not tracking this user"
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
                    "message": "Failed to untrack user"
                }
            }))
        }
    }
}

/// Check if currently tracking a specific user
async fn check_if_tracking(
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

    let tracked_user_id = path.into_inner();

    let result = sqlx::query_as::<_, (String,)>(
        "SELECT id FROM user_tracking WHERE tracker_user_id = ? AND tracked_user_id = ?",
    )
    .bind(&user_id)
    .bind(&tracked_user_id)
    .fetch_optional(pool.get_ref())
    .await;

    match result {
        Ok(Some(_)) => HttpResponse::Ok().json(serde_json::json!({
            "success": true,
            "data": {
                "isTracking": true
            }
        })),
        Ok(None) => HttpResponse::Ok().json(serde_json::json!({
            "success": true,
            "data": {
                "isTracking": false
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

/// Helper function to get all users tracking a specific user (used by check-in logic)
pub async fn get_trackers_for_user(
    pool: &SqlitePool,
    tracked_user_id: &str,
) -> Result<Vec<String>, sqlx::Error> {
    let result = sqlx::query_as::<_, (String,)>(
        "SELECT tracker_user_id FROM user_tracking WHERE tracked_user_id = ?",
    )
    .bind(tracked_user_id)
    .fetch_all(pool)
    .await?;

    Ok(result.into_iter().map(|(id,)| id).collect())
}
