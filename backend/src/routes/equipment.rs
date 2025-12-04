use actix_web::{HttpMessage, HttpRequest, HttpResponse, web};
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::models::equipment::{
    Booking, CheckAvailabilityRequest, CreateBookingRequest, CreateEquipmentRequest, Equipment,
    GetBookingsQuery, GetEquipmentQuery,
};

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/equipment")
            .route("", web::get().to(get_equipment))
            .route("", web::post().to(create_equipment))
            .route("/bookings", web::get().to(get_all_bookings))
            .route("/bookings/me", web::get().to(get_my_bookings))
            .route("/{equipment_id}", web::get().to(get_equipment_details))
            .route("/{equipment_id}/bookings", web::post().to(create_booking))
            .route(
                "/{equipment_id}/check-availability",
                web::post().to(check_availability),
            )
            .route("/bookings/{booking_id}", web::delete().to(cancel_booking)),
    );
}

async fn get_equipment(
    pool: web::Data<SqlitePool>,
    query: web::Query<GetEquipmentQuery>,
) -> HttpResponse {
    let mut sql = String::from(
        "SELECT id, name, category, location, status, serial_number, purchase_date, last_maintenance, notes, created_at, updated_at FROM equipment WHERE 1=1",
    );

    if let Some(ref status) = query.status {
        sql.push_str(&format!(" AND status = '{}'", status));
    }
    if let Some(ref category) = query.category {
        sql.push_str(&format!(" AND category = '{}'", category));
    }
    if let Some(ref location) = query.location {
        sql.push_str(&format!(" AND location = '{}'", location));
    }
    if let Some(ref search) = query.search {
        sql.push_str(&format!(
            " AND (name LIKE '%{}%' OR category LIKE '%{}%' OR location LIKE '%{}%')",
            search, search, search
        ));
    }

    sql.push_str(" ORDER BY name");

    let result = sqlx::query_as::<_, Equipment>(&sql)
        .fetch_all(pool.get_ref())
        .await;

    match result {
        Ok(equipment) => {
            let equipment_json: Vec<serde_json::Value> = equipment
                .iter()
                .map(|e| {
                    serde_json::json!({
                        "id": e.id,
                        "name": e.name,
                        "category": e.category,
                        "location": e.location,
                        "status": e.status,
                        "serialNumber": e.serial_number,
                        "createdAt": e.created_at,
                        "updatedAt": e.updated_at
                    })
                })
                .collect();

            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": {
                    "equipment": equipment_json,
                    "pagination": {
                        "total": equipment_json.len(),
                        "count": equipment_json.len()
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

async fn create_equipment(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    body: web::Json<CreateEquipmentRequest>,
) -> HttpResponse {
    // Check if user is authenticated
    let _user_id = match req.extensions().get::<String>() {
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

    let equipment_id = Uuid::new_v4().to_string();

    let result = sqlx::query(
        "INSERT INTO equipment (id, name, category, location, status, serial_number, notes, created_at, updated_at) VALUES (?, ?, ?, ?, 'available', ?, ?, datetime('now'), datetime('now'))"
    )
    .bind(&equipment_id)
    .bind(&body.name)
    .bind(&body.category)
    .bind(&body.location)
    .bind(&body.serial_number)
    .bind(&body.notes)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => HttpResponse::Created().json(serde_json::json!({
            "success": true,
            "data": {
                "equipment": {
                    "id": equipment_id,
                    "name": body.name,
                    "category": body.category,
                    "location": body.location,
                    "status": "available",
                    "serialNumber": body.serial_number,
                    "notes": body.notes
                }
            }
        })),
        Err(e) => {
            eprintln!("Database error: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Failed to create equipment"
                }
            }))
        }
    }
}

async fn get_all_bookings(pool: web::Data<SqlitePool>, req: HttpRequest) -> HttpResponse {
    // Check if user is authenticated
    let _user_id = match req.extensions().get::<String>() {
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

    let result = sqlx::query_as::<
        _,
        (
            String,
            String,
            String,
            String,
            String,
            String,
            String,
            String,
            Option<String>,
            Option<String>,
            Option<String>,
        ),
    >(
        "SELECT b.id, b.equipment_id, b.user_id, b.department, b.start_date, b.end_date, b.purpose, b.status, b.created_at, b.updated_at, e.name as equipment_name 
         FROM bookings b 
         LEFT JOIN equipment e ON b.equipment_id = e.id 
         WHERE b.status = 'active' 
         ORDER BY b.start_date",
    )
    .fetch_all(pool.get_ref())
    .await;

    match result {
        Ok(bookings) => {
            // Get user names for each booking
            let mut bookings_json: Vec<serde_json::Value> = Vec::new();

            for (
                id,
                equipment_id,
                user_id,
                department,
                start_date,
                end_date,
                purpose,
                status,
                created_at,
                _updated_at,
                equipment_name,
            ) in bookings
            {
                // Get user name
                let user_name = sqlx::query_as::<_, (String, String)>(
                    "SELECT first_name, last_name FROM users WHERE id = ?",
                )
                .bind(&user_id)
                .fetch_optional(pool.get_ref())
                .await
                .ok()
                .flatten()
                .map(|(f, l)| format!("{} {}", f, l))
                .unwrap_or_else(|| "Unknown".to_string());

                bookings_json.push(serde_json::json!({
                    "id": id,
                    "equipmentId": equipment_id,
                    "equipmentName": equipment_name.unwrap_or_else(|| "Unknown".to_string()),
                    "userId": user_id,
                    "bookedBy": user_name,
                    "department": department,
                    "startDate": start_date,
                    "endDate": end_date,
                    "purpose": purpose,
                    "status": status,
                    "createdAt": created_at
                }));
            }

            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": {
                    "bookings": bookings_json
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

async fn get_equipment_details(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> HttpResponse {
    let equipment_id = path.into_inner();

    let result = sqlx::query_as::<_, Equipment>(
        "SELECT id, name, category, location, status, serial_number, purchase_date, last_maintenance, notes, created_at, updated_at FROM equipment WHERE id = ?"
    )
    .bind(&equipment_id)
    .fetch_optional(pool.get_ref())
    .await;

    match result {
        Ok(Some(equipment)) => {
            // Get upcoming bookings
            let bookings = sqlx::query_as::<_, Booking>(
                "SELECT id, equipment_id, user_id, department, start_date, end_date, purpose, status, created_at, updated_at, cancelled_at FROM bookings WHERE equipment_id = ? AND status = 'active' AND start_date >= date('now') ORDER BY start_date"
            )
            .bind(&equipment_id)
            .fetch_all(pool.get_ref())
            .await
            .unwrap_or_default();

            let bookings_json: Vec<serde_json::Value> = bookings
                .iter()
                .map(|b| {
                    serde_json::json!({
                        "id": b.id,
                        "startDate": b.start_date,
                        "endDate": b.end_date,
                        "status": b.status
                    })
                })
                .collect();

            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": {
                    "equipment": {
                        "id": equipment.id,
                        "name": equipment.name,
                        "category": equipment.category,
                        "location": equipment.location,
                        "status": equipment.status,
                        "serialNumber": equipment.serial_number,
                        "purchaseDate": equipment.purchase_date,
                        "lastMaintenance": equipment.last_maintenance,
                        "notes": equipment.notes,
                        "upcomingBookings": bookings_json
                    }
                }
            }))
        }
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({
            "success": false,
            "error": {
                "code": "NOT_FOUND",
                "message": "Equipment not found"
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

async fn create_booking(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Json<CreateBookingRequest>,
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

    let equipment_id = path.into_inner();

    // Check for conflicts
    let conflicts = sqlx::query_as::<_, Booking>(
        "SELECT id, equipment_id, user_id, department, start_date, end_date, purpose, status, created_at, updated_at, cancelled_at FROM bookings WHERE equipment_id = ? AND status = 'active' AND ((start_date <= ? AND end_date >= ?) OR (start_date <= ? AND end_date >= ?) OR (start_date >= ? AND end_date <= ?))"
    )
    .bind(&equipment_id)
    .bind(&body.end_date)
    .bind(&body.start_date)
    .bind(&body.start_date)
    .bind(&body.start_date)
    .bind(&body.start_date)
    .bind(&body.end_date)
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();

    if !conflicts.is_empty() {
        return HttpResponse::Conflict().json(serde_json::json!({
            "success": false,
            "error": {
                "code": "BOOKING_CONFLICT",
                "message": "Equipment is already booked for this period",
                "details": {
                    "conflictingBooking": {
                        "id": conflicts[0].id,
                        "startDate": conflicts[0].start_date,
                        "endDate": conflicts[0].end_date
                    }
                }
            }
        }));
    }

    // Get user's department
    let user = sqlx::query_as::<_, (String, String, String)>(
        "SELECT first_name, last_name, department FROM users WHERE id = ?",
    )
    .bind(&user_id)
    .fetch_optional(pool.get_ref())
    .await;

    let (first_name, last_name, department) = match user {
        Ok(Some(u)) => u,
        _ => ("Unknown".to_string(), "User".to_string(), "IT".to_string()),
    };

    let booking_id = Uuid::new_v4().to_string();

    let result = sqlx::query(
        "INSERT INTO bookings (id, equipment_id, user_id, department, start_date, end_date, purpose) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&booking_id)
    .bind(&equipment_id)
    .bind(&user_id)
    .bind(&department)
    .bind(&body.start_date)
    .bind(&body.end_date)
    .bind(&body.purpose)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            // Get equipment name
            let equipment =
                sqlx::query_as::<_, (String,)>("SELECT name FROM equipment WHERE id = ?")
                    .bind(&equipment_id)
                    .fetch_optional(pool.get_ref())
                    .await;

            let equipment_name = equipment.ok().flatten().map(|(n,)| n).unwrap_or_default();

            HttpResponse::Created().json(serde_json::json!({
                "success": true,
                "data": {
                    "booking": {
                        "id": booking_id,
                        "equipmentId": equipment_id,
                        "equipmentName": equipment_name,
                        "userId": user_id,
                        "bookedBy": format!("{} {}", first_name, last_name),
                        "department": department,
                        "startDate": body.start_date,
                        "endDate": body.end_date,
                        "purpose": body.purpose,
                        "status": "active"
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
                    "message": "Failed to create booking"
                }
            }))
        }
    }
}

async fn check_availability(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    body: web::Json<CheckAvailabilityRequest>,
) -> HttpResponse {
    let equipment_id = path.into_inner();

    let conflicts = sqlx::query_as::<_, Booking>(
        "SELECT id, equipment_id, user_id, department, start_date, end_date, purpose, status, created_at, updated_at, cancelled_at FROM bookings WHERE equipment_id = ? AND status = 'active' AND ((start_date <= ? AND end_date >= ?) OR (start_date <= ? AND end_date >= ?) OR (start_date >= ? AND end_date <= ?))"
    )
    .bind(&equipment_id)
    .bind(&body.end_date)
    .bind(&body.start_date)
    .bind(&body.start_date)
    .bind(&body.start_date)
    .bind(&body.start_date)
    .bind(&body.end_date)
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();

    if conflicts.is_empty() {
        HttpResponse::Ok().json(serde_json::json!({
            "success": true,
            "data": {
                "isAvailable": true,
                "conflicts": []
            }
        }))
    } else {
        let conflicts_json: Vec<serde_json::Value> = conflicts
            .iter()
            .map(|c| {
                serde_json::json!({
                    "bookingId": c.id,
                    "department": c.department,
                    "startDate": c.start_date,
                    "endDate": c.end_date
                })
            })
            .collect();

        HttpResponse::Ok().json(serde_json::json!({
            "success": true,
            "data": {
                "isAvailable": false,
                "conflicts": conflicts_json
            }
        }))
    }
}

async fn get_my_bookings(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    query: web::Query<GetBookingsQuery>,
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

    // Get user info
    let user = sqlx::query_as::<_, (String, String, String)>(
        "SELECT first_name, last_name, department FROM users WHERE id = ?",
    )
    .bind(&user_id)
    .fetch_optional(pool.get_ref())
    .await;

    let (first_name, last_name, user_department) = user.ok().flatten().unwrap_or((
        "Unknown".to_string(),
        "User".to_string(),
        "IT".to_string(),
    ));

    let mut sql = String::from(
        "SELECT b.id, b.equipment_id, b.user_id, b.department, b.start_date, b.end_date, b.purpose, b.status, b.created_at, b.updated_at, b.cancelled_at, e.name as equipment_name FROM bookings b LEFT JOIN equipment e ON b.equipment_id = e.id WHERE b.user_id = ?",
    );

    if let Some(ref status) = query.status {
        sql.push_str(&format!(" AND b.status = '{}'", status));
    }

    if query.upcoming.unwrap_or(false) {
        sql.push_str(" AND b.start_date >= date('now')");
    }

    sql.push_str(" ORDER BY b.start_date");

    let result = sqlx::query_as::<
        _,
        (
            String,
            String,
            String,
            String,
            String,
            String,
            String,
            String,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<String>,
        ),
    >(&sql)
    .bind(&user_id)
    .fetch_all(pool.get_ref())
    .await;

    match result {
        Ok(bookings) => {
            let bookings_json: Vec<serde_json::Value> = bookings
                .iter()
                .map(|(id, equipment_id, _user_id, department, start_date, end_date, purpose, status, created_at, _updated_at, _cancelled_at, equipment_name)| {
                    serde_json::json!({
                        "id": id,
                        "equipmentId": equipment_id,
                        "equipmentName": equipment_name.clone().unwrap_or_else(|| "Unknown".to_string()),
                        "bookedBy": format!("{} {}", first_name, last_name),
                        "department": department,
                        "startDate": start_date,
                        "endDate": end_date,
                        "purpose": purpose,
                        "status": status,
                        "createdAt": created_at
                    })
                })
                .collect();

            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": {
                    "bookings": bookings_json
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

async fn cancel_booking(pool: web::Data<SqlitePool>, path: web::Path<String>) -> HttpResponse {
    let booking_id = path.into_inner();

    let result = sqlx::query(
        "UPDATE bookings SET status = 'cancelled', cancelled_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
    )
    .bind(&booking_id)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(rows) => {
            if rows.rows_affected() > 0 {
                HttpResponse::Ok().json(serde_json::json!({
                    "success": true,
                    "message": "Booking cancelled successfully",
                    "data": {
                        "booking": {
                            "id": booking_id,
                            "status": "cancelled"
                        }
                    }
                }))
            } else {
                HttpResponse::NotFound().json(serde_json::json!({
                    "success": false,
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Booking not found"
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
                    "message": "Failed to cancel booking"
                }
            }))
        }
    }
}
