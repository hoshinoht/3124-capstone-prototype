use actix_web::{web, HttpResponse, HttpRequest};
use sqlx::SqlitePool;
use crate::models::*;
use crate::auth::Claims;

// Create equipment
pub async fn create_equipment(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    equipment_data: web::Json<CreateEquipmentRequest>,
) -> Result<HttpResponse, actix_web::Error> {
    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("No token found"))?;

    crate::auth::check_admin(&claims)?;

    let result = sqlx::query!(
        r#"
        INSERT INTO equipment (name, equipment_type, model, serial_number, description)
        VALUES (?, ?, ?, ?, ?)
        "#,
        equipment_data.name,
        equipment_data.equipment_type,
        equipment_data.model,
        equipment_data.serial_number,
        equipment_data.description
    )
    .execute(pool.get_ref())
    .await
    .map_err(|e| {
        log::error!("Failed to create equipment: {:?}", e);
        actix_web::error::ErrorInternalServerError("Failed to create equipment")
    })?;

    let equipment = sqlx::query_as::<_, Equipment>(
        "SELECT * FROM equipment WHERE id = ?"
    )
    .bind(result.last_insert_rowid())
    .fetch_one(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to fetch created equipment"))?;

    Ok(HttpResponse::Created().json(ApiResponse::success(equipment)))
}

// Get all equipment
pub async fn get_all_equipment(
    pool: web::Data<SqlitePool>,
) -> Result<HttpResponse, actix_web::Error> {
    let equipment = sqlx::query_as::<_, Equipment>(
        "SELECT * FROM equipment ORDER BY name ASC"
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to fetch equipment"))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(equipment)))
}

// Get available equipment
pub async fn get_available_equipment(
    pool: web::Data<SqlitePool>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> Result<HttpResponse, actix_web::Error> {
    let start_date = query.get("start_datetime");
    let end_date = query.get("end_datetime");

    let equipment = if start_date.is_some() && end_date.is_some() {
        // Check for equipment that doesn't have conflicting bookings
        sqlx::query_as::<_, Equipment>(
            r#"
            SELECT e.* FROM equipment e
            WHERE e.is_available = 1
            AND e.id NOT IN (
                SELECT equipment_id FROM equipment_bookings
                WHERE status IN ('pending', 'approved')
                AND (
                    (start_datetime <= ? AND end_datetime >= ?)
                    OR (start_datetime <= ? AND end_datetime >= ?)
                    OR (start_datetime >= ? AND end_datetime <= ?)
                )
            )
            ORDER BY e.name ASC
            "#
        )
        .bind(start_date.unwrap())
        .bind(start_date.unwrap())
        .bind(end_date.unwrap())
        .bind(end_date.unwrap())
        .bind(start_date.unwrap())
        .bind(end_date.unwrap())
        .fetch_all(pool.get_ref())
        .await
    } else {
        sqlx::query_as::<_, Equipment>(
            "SELECT * FROM equipment WHERE is_available = 1 ORDER BY name ASC"
        )
        .fetch_all(pool.get_ref())
        .await
    };

    let equipment = equipment.map_err(|_| {
        actix_web::error::ErrorInternalServerError("Failed to fetch equipment")
    })?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(equipment)))
}

// Create equipment booking
pub async fn create_booking(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    booking_data: web::Json<CreateEquipmentBookingRequest>,
) -> Result<HttpResponse, actix_web::Error> {
    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("No token found"))?;

    // Check for conflicts
    let conflict = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*) FROM equipment_bookings
        WHERE equipment_id = ?
        AND status IN ('pending', 'approved')
        AND (
            (start_datetime <= ? AND end_datetime >= ?)
            OR (start_datetime <= ? AND end_datetime >= ?)
            OR (start_datetime >= ? AND end_datetime <= ?)
        )
        "#
    )
    .bind(booking_data.equipment_id)
    .bind(&booking_data.start_datetime)
    .bind(&booking_data.start_datetime)
    .bind(&booking_data.end_datetime)
    .bind(&booking_data.end_datetime)
    .bind(&booking_data.start_datetime)
    .bind(&booking_data.end_datetime)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Database error"))?;

    if conflict > 0 {
        return Ok(HttpResponse::Conflict().json(ApiResponse::<()>::error(
            "Equipment is already booked for this time period".to_string()
        )));
    }

    let result = sqlx::query!(
        r#"
        INSERT INTO equipment_bookings (equipment_id, user_id, project_name, start_datetime, end_datetime, purpose, status)
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
        "#,
        booking_data.equipment_id,
        claims.sub,
        booking_data.project_name,
        booking_data.start_datetime,
        booking_data.end_datetime,
        booking_data.purpose
    )
    .execute(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to create booking"))?;

    let booking = sqlx::query_as::<_, EquipmentBooking>(
        "SELECT * FROM equipment_bookings WHERE id = ?"
    )
    .bind(result.last_insert_rowid())
    .fetch_one(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to fetch created booking"))?;

    Ok(HttpResponse::Created().json(ApiResponse::success(booking)))
}

// Get all bookings
pub async fn get_all_bookings(
    pool: web::Data<SqlitePool>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> Result<HttpResponse, actix_web::Error> {
    let mut sql = r#"
        SELECT 
            eb.id, eb.equipment_id, e.name as equipment_name,
            eb.user_id, u.full_name as user_name,
            eb.project_name, eb.start_datetime, eb.end_datetime,
            eb.purpose, eb.status
        FROM equipment_bookings eb
        JOIN equipment e ON eb.equipment_id = e.id
        JOIN users u ON eb.user_id = u.id
        WHERE 1=1
    "#.to_string();

    let mut conditions = Vec::new();

    if let Some(equipment_id) = query.get("equipment_id") {
        sql.push_str(" AND eb.equipment_id = ?");
        conditions.push(equipment_id.clone());
    }

    if let Some(status) = query.get("status") {
        sql.push_str(" AND eb.status = ?");
        conditions.push(status.clone());
    }

    sql.push_str(" ORDER BY eb.start_datetime DESC");

    let mut query_builder = sqlx::query_as::<_, EquipmentBookingWithDetails>(&sql);
    for condition in conditions {
        query_builder = query_builder.bind(condition);
    }

    let bookings = query_builder
        .fetch_all(pool.get_ref())
        .await
        .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to fetch bookings"))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(bookings)))
}

// Get user's bookings
pub async fn get_user_bookings(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
) -> Result<HttpResponse, actix_web::Error> {
    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("No token found"))?;

    let bookings = sqlx::query_as::<_, EquipmentBookingWithDetails>(
        r#"
        SELECT 
            eb.id, eb.equipment_id, e.name as equipment_name,
            eb.user_id, u.full_name as user_name,
            eb.project_name, eb.start_datetime, eb.end_datetime,
            eb.purpose, eb.status
        FROM equipment_bookings eb
        JOIN equipment e ON eb.equipment_id = e.id
        JOIN users u ON eb.user_id = u.id
        WHERE eb.user_id = ?
        ORDER BY eb.start_datetime DESC
        "#
    )
    .bind(claims.sub)
    .fetch_all(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to fetch bookings"))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(bookings)))
}

// Update booking status
pub async fn update_booking_status(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    booking_id: web::Path<i64>,
    status_data: web::Json<UpdateBookingStatusRequest>,
) -> Result<HttpResponse, actix_web::Error> {
    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("No token found"))?;

    crate::auth::check_admin(&claims)?;

    sqlx::query(
        "UPDATE equipment_bookings SET status = ? WHERE id = ?"
    )
    .bind(&status_data.status)
    .bind(booking_id.into_inner())
    .execute(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to update booking status"))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success("Booking status updated")))
}

// Delete booking
pub async fn delete_booking(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    booking_id: web::Path<i64>,
) -> Result<HttpResponse, actix_web::Error> {
    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("No token found"))?;

    let booking_id = booking_id.into_inner();

    let booking = sqlx::query_as::<_, EquipmentBooking>(
        "SELECT * FROM equipment_bookings WHERE id = ?"
    )
    .bind(booking_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Database error"))?
    .ok_or_else(|| actix_web::error::ErrorNotFound("Booking not found"))?;

    if booking.user_id != claims.sub && claims.role != "admin" {
        return Ok(HttpResponse::Forbidden().json(ApiResponse::<()>::error(
            "You don't have permission to delete this booking".to_string()
        )));
    }

    sqlx::query("DELETE FROM equipment_bookings WHERE id = ?")
        .bind(booking_id)
        .execute(pool.get_ref())
        .await
        .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to delete booking"))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success("Booking deleted successfully")))
}
