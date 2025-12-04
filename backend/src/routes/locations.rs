use actix_web::{HttpMessage, HttpRequest, HttpResponse, web};
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::models::locations::{
    CheckInRecord, CheckInRequest, CheckOutRequest, GetLocationsQuery, LocationHistoryQuery,
};

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/locations")
            .route("/check-in", web::post().to(check_in))
            .route("/check-out", web::post().to(check_out))
            .route("/current", web::get().to(get_current_locations))
            .route("/history/me", web::get().to(get_my_history))
            .route("/search", web::get().to(search_locations)),
    );
}

async fn check_in(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    body: web::Json<CheckInRequest>,
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

    // Check out from any current location first
    let _ = sqlx::query(
        "UPDATE check_in_records SET check_out_time = datetime('now'), updated_at = datetime('now') WHERE user_id = ? AND check_out_time IS NULL"
    )
    .bind(&user_id)
    .execute(pool.get_ref())
    .await;

    let record_id = Uuid::new_v4().to_string();

    let result = sqlx::query(
        "INSERT INTO check_in_records (id, user_id, location, check_in_time, notes) VALUES (?, ?, ?, datetime('now'), ?)"
    )
    .bind(&record_id)
    .bind(&user_id)
    .bind(&body.location)
    .bind(&body.notes)
    .execute(pool.get_ref())
    .await;

    if result.is_err() {
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "success": false,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "Failed to check in"
            }
        }));
    }

    // Update user_locations table
    let _ = sqlx::query(
        "INSERT OR REPLACE INTO user_locations (user_id, location, last_check_in, updated_at) VALUES (?, ?, datetime('now'), datetime('now'))"
    )
    .bind(&user_id)
    .bind(&body.location)
    .execute(pool.get_ref())
    .await;

    // Get user info
    let user = sqlx::query_as::<_, (String, String, String)>(
        "SELECT first_name, last_name, department FROM users WHERE id = ?",
    )
    .bind(&user_id)
    .fetch_optional(pool.get_ref())
    .await;

    let (first_name, last_name, department) = user.ok().flatten().unwrap_or((
        "Unknown".to_string(),
        "User".to_string(),
        "IT".to_string(),
    ));

    HttpResponse::Created().json(serde_json::json!({
        "success": true,
        "data": {
            "checkIn": {
                "id": record_id,
                "userId": user_id,
                "userName": format!("{} {}", first_name, last_name),
                "department": department,
                "location": body.location,
                "checkInTime": chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string(),
                "notes": body.notes,
                "status": "active"
            }
        }
    }))
}

async fn check_out(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    body: web::Json<CheckOutRequest>,
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

    // Find active check-in
    let active_checkin = sqlx::query_as::<_, CheckInRecord>(
        "SELECT id, user_id, location, check_in_time, check_out_time, notes, created_at, updated_at FROM check_in_records WHERE user_id = ? AND check_out_time IS NULL"
    )
    .bind(&user_id)
    .fetch_optional(pool.get_ref())
    .await;

    match active_checkin {
        Ok(Some(record)) => {
            // Check if location matches
            if let Some(ref expected_location) = body.location {
                if record.location != *expected_location {
                    return HttpResponse::BadRequest().json(serde_json::json!({
                        "success": false,
                        "error": {
                            "code": "LOCATION_MISMATCH",
                            "message": "Location doesn't match your current check-in",
                            "details": {
                                "currentLocation": record.location,
                                "expectedLocation": expected_location
                            }
                        }
                    }));
                }
            }

            let result = sqlx::query(
                "UPDATE check_in_records SET check_out_time = datetime('now'), updated_at = datetime('now') WHERE id = ?"
            )
            .bind(&record.id)
            .execute(pool.get_ref())
            .await;

            // Update user_locations
            let _ = sqlx::query("DELETE FROM user_locations WHERE user_id = ?")
                .bind(&user_id)
                .execute(pool.get_ref())
                .await;

            match result {
                Ok(_) => HttpResponse::Ok().json(serde_json::json!({
                    "success": true,
                    "message": "Checked out successfully",
                    "data": {
                        "checkIn": {
                            "id": record.id,
                            "location": record.location,
                            "checkInTime": record.check_in_time,
                            "checkOutTime": chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string(),
                            "status": "completed"
                        }
                    }
                })),
                Err(e) => {
                    eprintln!("Database error: {:?}", e);
                    HttpResponse::InternalServerError().json(serde_json::json!({
                        "success": false,
                        "error": {
                            "code": "INTERNAL_ERROR",
                            "message": "Failed to check out"
                        }
                    }))
                }
            }
        }
        Ok(None) => HttpResponse::BadRequest().json(serde_json::json!({
            "success": false,
            "error": {
                "code": "NOT_CHECKED_IN",
                "message": "No active check-in found"
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

async fn get_current_locations(
    pool: web::Data<SqlitePool>,
    query: web::Query<GetLocationsQuery>,
) -> HttpResponse {
    let mut sql = String::from(
        "SELECT ul.user_id, u.first_name, u.last_name, u.department, ul.location, ul.last_check_in
         FROM user_locations ul
         JOIN users u ON ul.user_id = u.id
         WHERE 1=1",
    );

    if let Some(ref location) = query.location {
        sql.push_str(&format!(" AND ul.location = '{}'", location));
    }
    if let Some(ref department) = query.department {
        sql.push_str(&format!(" AND u.department = '{}'", department));
    }

    sql.push_str(" ORDER BY ul.last_check_in DESC");

    let result = sqlx::query_as::<_, (String, String, String, String, String, String)>(&sql)
        .fetch_all(pool.get_ref())
        .await;

    match result {
        Ok(locations) => {
            let locations_json: Vec<serde_json::Value> = locations
                .iter()
                .map(
                    |(user_id, first_name, last_name, department, location, last_check_in)| {
                        serde_json::json!({
                            "userId": user_id,
                            "userName": format!("{} {}", first_name, last_name),
                            "department": department,
                            "location": location,
                            "checkInTime": last_check_in,
                            "status": "active"
                        })
                    },
                )
                .collect();

            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": {
                    "activeCheckIns": locations_json,
                    "total": locations_json.len()
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

async fn get_my_history(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    query: web::Query<LocationHistoryQuery>,
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
        "SELECT id, user_id, location, check_in_time, check_out_time, notes, created_at, updated_at FROM check_in_records WHERE user_id = ?",
    );

    if let Some(ref start_date) = query.start_date {
        sql.push_str(&format!(" AND date(check_in_time) >= '{}'", start_date));
    }
    if let Some(ref end_date) = query.end_date {
        sql.push_str(&format!(" AND date(check_in_time) <= '{}'", end_date));
    }
    if let Some(ref location) = query.location {
        sql.push_str(&format!(" AND location = '{}'", location));
    }

    sql.push_str(" ORDER BY check_in_time DESC");

    let limit = query.limit.unwrap_or(50);
    sql.push_str(&format!(" LIMIT {}", limit));

    let result = sqlx::query_as::<_, CheckInRecord>(&sql)
        .bind(&user_id)
        .fetch_all(pool.get_ref())
        .await;

    match result {
        Ok(records) => {
            let records_json: Vec<serde_json::Value> = records
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.id,
                        "location": r.location,
                        "checkInTime": r.check_in_time,
                        "checkOutTime": r.check_out_time,
                        "notes": r.notes,
                        "status": if r.check_out_time.is_some() { "completed" } else { "active" }
                    })
                })
                .collect();

            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": {
                    "history": records_json,
                    "total": records_json.len()
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

async fn search_locations(
    pool: web::Data<SqlitePool>,
    query: web::Query<GetLocationsQuery>,
) -> HttpResponse {
    let search = query.search.as_deref().unwrap_or("");

    let result = sqlx::query_as::<_, (String, i64)>(
        "SELECT location, COUNT(*) as count FROM check_in_records WHERE location LIKE ? GROUP BY location ORDER BY count DESC LIMIT 20"
    )
    .bind(format!("%{}%", search))
    .fetch_all(pool.get_ref())
    .await;

    match result {
        Ok(locations) => {
            let locations_json: Vec<serde_json::Value> = locations
                .iter()
                .map(|(location, count)| {
                    serde_json::json!({
                        "location": location,
                        "usageCount": count
                    })
                })
                .collect();

            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": {
                    "locations": locations_json
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
