use actix_web::{web, HttpResponse, HttpRequest};
use sqlx::SqlitePool;
use crate::models::*;
use crate::auth::Claims;

// Create calendar event
pub async fn create_event(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    event_data: web::Json<CreateCalendarEventRequest>,
) -> Result<HttpResponse, actix_web::Error> {
    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("No token found"))?;

    let result = sqlx::query!(
        r#"
        INSERT INTO calendar_events (title, description, event_type, start_datetime, end_datetime, location, color_code, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        "#,
        event_data.title,
        event_data.description,
        event_data.event_type,
        event_data.start_datetime,
        event_data.end_datetime,
        event_data.location,
        event_data.color_code,
        claims.sub
    )
    .execute(pool.get_ref())
    .await
    .map_err(|e| {
        log::error!("Failed to create calendar event: {:?}", e);
        actix_web::error::ErrorInternalServerError("Failed to create calendar event")
    })?;

    let event_id = result.last_insert_rowid();

    // Add participants if provided
    if let Some(participant_ids) = &event_data.participant_ids {
        for user_id in participant_ids {
            let _ = sqlx::query!(
                "INSERT INTO event_participants (event_id, user_id, response) VALUES (?, ?, 'pending')",
                event_id,
                user_id
            )
            .execute(pool.get_ref())
            .await;
        }
    }

    let event = sqlx::query_as::<_, CalendarEvent>(
        "SELECT * FROM calendar_events WHERE id = ?"
    )
    .bind(event_id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to fetch created event"))?;

    Ok(HttpResponse::Created().json(ApiResponse::success(event)))
}

// Get all events
pub async fn get_events(
    pool: web::Data<SqlitePool>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> Result<HttpResponse, actix_web::Error> {
    let mut sql = "SELECT * FROM calendar_events WHERE 1=1".to_string();
    let mut conditions = Vec::new();

    // Filter by event type
    if let Some(event_type) = query.get("event_type") {
        sql.push_str(" AND event_type = ?");
        conditions.push(event_type.clone());
    }

    // Filter by date range
    if let Some(start_date) = query.get("start_date") {
        sql.push_str(" AND start_datetime >= ?");
        conditions.push(start_date.clone());
    }

    if let Some(end_date) = query.get("end_date") {
        sql.push_str(" AND end_datetime <= ?");
        conditions.push(end_date.clone());
    }

    sql.push_str(" ORDER BY start_datetime ASC");

    let mut query_builder = sqlx::query_as::<_, CalendarEvent>(&sql);
    for condition in conditions {
        query_builder = query_builder.bind(condition);
    }

    let events = query_builder
        .fetch_all(pool.get_ref())
        .await
        .map_err(|e| {
            log::error!("Failed to fetch events: {:?}", e);
            actix_web::error::ErrorInternalServerError("Failed to fetch events")
        })?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(events)))
}

// Get event by ID
pub async fn get_event_by_id(
    pool: web::Data<SqlitePool>,
    event_id: web::Path<i64>,
) -> Result<HttpResponse, actix_web::Error> {
    let event = sqlx::query_as::<_, CalendarEvent>(
        "SELECT * FROM calendar_events WHERE id = ?"
    )
    .bind(event_id.into_inner())
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Database error"))?;

    match event {
        Some(event) => Ok(HttpResponse::Ok().json(ApiResponse::success(event))),
        None => Ok(HttpResponse::NotFound().json(ApiResponse::<()>::error("Event not found".to_string()))),
    }
}

// Update event
pub async fn update_event(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    event_id: web::Path<i64>,
    update_data: web::Json<UpdateCalendarEventRequest>,
) -> Result<HttpResponse, actix_web::Error> {
    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("No token found"))?;

    let event_id = event_id.into_inner();

    // Check if event exists and user has permission
    let event = sqlx::query_as::<_, CalendarEvent>(
        "SELECT * FROM calendar_events WHERE id = ?"
    )
    .bind(event_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Database error"))?
    .ok_or_else(|| actix_web::error::ErrorNotFound("Event not found"))?;

    if event.created_by != claims.sub && claims.role != "admin" {
        return Ok(HttpResponse::Forbidden().json(ApiResponse::<()>::error(
            "You don't have permission to update this event".to_string()
        )));
    }

    // Build dynamic update query
    let mut updates = Vec::new();
    let mut values: Vec<String> = Vec::new();

    if let Some(title) = &update_data.title {
        updates.push("title = ?");
        values.push(title.clone());
    }
    if let Some(description) = &update_data.description {
        updates.push("description = ?");
        values.push(description.clone());
    }
    if let Some(event_type) = &update_data.event_type {
        updates.push("event_type = ?");
        values.push(event_type.clone());
    }
    if let Some(start_datetime) = &update_data.start_datetime {
        updates.push("start_datetime = ?");
        values.push(start_datetime.to_rfc3339());
    }
    if let Some(end_datetime) = &update_data.end_datetime {
        updates.push("end_datetime = ?");
        values.push(end_datetime.to_rfc3339());
    }
    if let Some(location) = &update_data.location {
        updates.push("location = ?");
        values.push(location.clone());
    }
    if let Some(color_code) = &update_data.color_code {
        updates.push("color_code = ?");
        values.push(color_code.clone());
    }

    if updates.is_empty() {
        return Ok(HttpResponse::BadRequest().json(ApiResponse::<()>::error(
            "No fields to update".to_string()
        )));
    }

    let sql = format!(
        "UPDATE calendar_events SET {} WHERE id = ?",
        updates.join(", ")
    );

    let mut query = sqlx::query(&sql);
    for value in values {
        query = query.bind(value);
    }
    query = query.bind(event_id);

    query.execute(pool.get_ref())
        .await
        .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to update event"))?;

    let updated_event = sqlx::query_as::<_, CalendarEvent>(
        "SELECT * FROM calendar_events WHERE id = ?"
    )
    .bind(event_id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to fetch updated event"))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(updated_event)))
}

// Delete event
pub async fn delete_event(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    event_id: web::Path<i64>,
) -> Result<HttpResponse, actix_web::Error> {
    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("No token found"))?;

    let event_id = event_id.into_inner();

    let event = sqlx::query_as::<_, CalendarEvent>(
        "SELECT * FROM calendar_events WHERE id = ?"
    )
    .bind(event_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Database error"))?
    .ok_or_else(|| actix_web::error::ErrorNotFound("Event not found"))?;

    if event.created_by != claims.sub && claims.role != "admin" {
        return Ok(HttpResponse::Forbidden().json(ApiResponse::<()>::error(
            "You don't have permission to delete this event".to_string()
        )));
    }

    sqlx::query("DELETE FROM calendar_events WHERE id = ?")
        .bind(event_id)
        .execute(pool.get_ref())
        .await
        .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to delete event"))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success("Event deleted successfully")))
}
