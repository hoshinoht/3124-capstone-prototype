use actix_web::{HttpMessage, HttpRequest, HttpResponse, web};
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::models::events::{CreateEventRequest, Event, GetEventsQuery, UpdateEventRequest};

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/calendar")
            .route("/events", web::get().to(get_events))
            .route("/events", web::post().to(create_event))
            .route("/events/{event_id}", web::put().to(update_event))
            .route("/events/{event_id}", web::delete().to(delete_event))
            .route(
                "/events/{event_id}/attendees",
                web::get().to(get_event_attendees),
            ),
    );
}

async fn get_events(
    pool: web::Data<SqlitePool>,
    query: web::Query<GetEventsQuery>,
) -> HttpResponse {
    let mut sql = String::from(
        "SELECT e.*, u.first_name, u.last_name FROM events e 
         LEFT JOIN users u ON e.created_by = u.id 
         WHERE e.event_date >= ? AND e.event_date <= ?",
    );

    let mut params: Vec<String> = vec![query.start_date.clone(), query.end_date.clone()];

    if let Some(ref event_type) = query.r#type {
        sql.push_str(" AND e.event_type = ?");
        params.push(event_type.clone());
    }

    if let Some(ref department) = query.department {
        sql.push_str(" AND (e.department = ? OR e.department = 'Both')");
        params.push(department.clone());
    }

    sql.push_str(" ORDER BY e.event_date, e.start_time");

    let result = sqlx::query_as::<_, Event>(&sql.replace("e.*, u.first_name, u.last_name", "e.id, e.title, e.description, e.event_type, e.event_date, e.start_time, e.end_time, e.location, e.meeting_url, e.created_by, e.department, e.is_recurring, e.recurrence_rule, e.parent_event_id, e.created_at, e.updated_at"))
        .bind(&params[0])
        .bind(&params[1])
        .fetch_all(pool.get_ref())
        .await;

    match result {
        Ok(events) => {
            let events_json: Vec<serde_json::Value> = events
                .iter()
                .map(|e| {
                    serde_json::json!({
                        "id": e.id,
                        "title": e.title,
                        "description": e.description,
                        "eventType": e.event_type,
                        "eventDate": e.event_date,
                        "startTime": e.start_time,
                        "endTime": e.end_time,
                        "location": e.location,
                        "meetingUrl": e.meeting_url,
                        "department": e.department,
                        "createdAt": e.created_at,
                        "updatedAt": e.updated_at
                    })
                })
                .collect();

            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": {
                    "events": events_json,
                    "pagination": {
                        "total": events_json.len(),
                        "count": events_json.len()
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

async fn create_event(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    body: web::Json<CreateEventRequest>,
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

    let event_id = Uuid::new_v4().to_string();
    let is_recurring = body.is_recurring.unwrap_or(false);

    let result = sqlx::query(
        "INSERT INTO events (id, title, description, event_type, event_date, start_time, end_time, location, meeting_url, created_by, department, is_recurring, recurrence_rule) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&event_id)
    .bind(&body.title)
    .bind(&body.description)
    .bind(&body.event_type)
    .bind(&body.event_date)
    .bind(&body.start_time)
    .bind(&body.end_time)
    .bind(&body.location)
    .bind(&body.meeting_url)
    .bind(&user_id)
    .bind(&body.department)
    .bind(is_recurring)
    .bind(&body.recurrence_rule)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            // Add attendees if provided
            if let Some(ref attendee_ids) = body.attendee_ids {
                for attendee_id in attendee_ids {
                    let attendee_record_id = Uuid::new_v4().to_string();
                    let _ = sqlx::query(
                        "INSERT INTO event_attendees (id, event_id, user_id) VALUES (?, ?, ?)",
                    )
                    .bind(&attendee_record_id)
                    .bind(&event_id)
                    .bind(attendee_id)
                    .execute(pool.get_ref())
                    .await;
                }
            }

            HttpResponse::Created().json(serde_json::json!({
                "success": true,
                "data": {
                    "event": {
                        "id": event_id,
                        "title": body.title,
                        "description": body.description,
                        "eventType": body.event_type,
                        "eventDate": body.event_date,
                        "startTime": body.start_time,
                        "endTime": body.end_time,
                        "location": body.location
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
                    "message": "Failed to create event"
                }
            }))
        }
    }
}

async fn update_event(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    body: web::Json<UpdateEventRequest>,
) -> HttpResponse {
    let event_id = path.into_inner();
    let mut updates = Vec::new();
    let mut params: Vec<String> = Vec::new();

    if let Some(ref title) = body.title {
        updates.push("title = ?");
        params.push(title.clone());
    }
    if let Some(ref description) = body.description {
        updates.push("description = ?");
        params.push(description.clone());
    }
    if let Some(ref event_type) = body.event_type {
        updates.push("event_type = ?");
        params.push(event_type.clone());
    }
    if let Some(ref event_date) = body.event_date {
        updates.push("event_date = ?");
        params.push(event_date.clone());
    }
    if let Some(ref start_time) = body.start_time {
        updates.push("start_time = ?");
        params.push(start_time.clone());
    }
    if let Some(ref end_time) = body.end_time {
        updates.push("end_time = ?");
        params.push(end_time.clone());
    }
    if let Some(ref location) = body.location {
        updates.push("location = ?");
        params.push(location.clone());
    }
    if let Some(ref meeting_url) = body.meeting_url {
        updates.push("meeting_url = ?");
        params.push(meeting_url.clone());
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
    let query = format!("UPDATE events SET {} WHERE id = ?", updates.join(", "));

    let mut query_builder = sqlx::query(&query);
    for param in params {
        query_builder = query_builder.bind(param);
    }
    query_builder = query_builder.bind(&event_id);

    match query_builder.execute(pool.get_ref()).await {
        Ok(result) => {
            if result.rows_affected() == 0 {
                return HttpResponse::NotFound().json(serde_json::json!({
                    "success": false,
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Event not found"
                    }
                }));
            }

            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": {
                    "event": {
                        "id": event_id,
                        "title": body.title,
                        "startTime": body.start_time
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
                    "message": "Failed to update event"
                }
            }))
        }
    }
}

async fn delete_event(pool: web::Data<SqlitePool>, path: web::Path<String>) -> HttpResponse {
    let event_id = path.into_inner();

    let result = sqlx::query("DELETE FROM events WHERE id = ?")
        .bind(&event_id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(rows) => {
            if rows.rows_affected() > 0 {
                HttpResponse::Ok().json(serde_json::json!({
                    "success": true,
                    "message": "Event deleted successfully"
                }))
            } else {
                HttpResponse::NotFound().json(serde_json::json!({
                    "success": false,
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Event not found"
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
                    "message": "Failed to delete event"
                }
            }))
        }
    }
}

async fn get_event_attendees(pool: web::Data<SqlitePool>, path: web::Path<String>) -> HttpResponse {
    let event_id = path.into_inner();

    let result = sqlx::query_as::<_, (String, String, String, String, String, Option<String>)>(
        "SELECT u.id, u.first_name, u.last_name, u.email, ea.status, ea.added_at 
         FROM event_attendees ea 
         JOIN users u ON ea.user_id = u.id 
         WHERE ea.event_id = ?",
    )
    .bind(&event_id)
    .fetch_all(pool.get_ref())
    .await;

    match result {
        Ok(attendees) => {
            let attendees_json: Vec<serde_json::Value> = attendees
                .iter()
                .map(|(id, first_name, last_name, email, status, added_at)| {
                    serde_json::json!({
                        "id": id,
                        "firstName": first_name,
                        "lastName": last_name,
                        "email": email,
                        "status": status,
                        "addedAt": added_at
                    })
                })
                .collect();

            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": {
                    "attendees": attendees_json
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
