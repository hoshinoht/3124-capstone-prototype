use actix_web::{HttpResponse, web};
use sqlx::SqlitePool;

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(web::scope("/dashboard").route("/data", web::get().to(get_dashboard_data)));
}

async fn get_dashboard_data(pool: web::Data<SqlitePool>) -> HttpResponse {
    // Get active projects count from the projects table
    let active_projects =
        sqlx::query_as::<_, (i64,)>("SELECT COUNT(*) FROM projects WHERE status = 'active'")
            .fetch_one(pool.get_ref())
            .await
            .map(|(count,)| count)
            .unwrap_or(0);

    // Get team members count
    let team_members =
        sqlx::query_as::<_, (i64,)>("SELECT COUNT(*) FROM users WHERE is_active = 1")
            .fetch_one(pool.get_ref())
            .await
            .map(|(count,)| count)
            .unwrap_or(0);

    // Get distinct departments count for display
    let departments_count = sqlx::query_as::<_, (i64,)>(
        "SELECT COUNT(DISTINCT department) FROM users WHERE is_active = 1",
    )
    .fetch_one(pool.get_ref())
    .await
    .map(|(count,)| count)
    .unwrap_or(0);

    // Get completed tasks count (this week)
    let completed_tasks = sqlx::query_as::<_, (i64,)>(
        "SELECT COUNT(*) FROM tasks WHERE (status = 'completed' OR is_completed = 1) 
         AND updated_at >= date('now', '-7 days')",
    )
    .fetch_one(pool.get_ref())
    .await
    .map(|(count,)| count)
    .unwrap_or(0);

    // Get today's meetings count
    let today_meetings = sqlx::query_as::<_, (i64,)>(
        "SELECT COUNT(*) FROM events WHERE event_type = 'meeting' AND event_date = date('now')",
    )
    .fetch_one(pool.get_ref())
    .await
    .map(|(count,)| count)
    .unwrap_or(0);

    // Get recent meetings with host name
    let recent_meetings = sqlx::query_as::<
        _,
        (
            String,
            String,
            Option<String>,
            String,
            String,
            Option<String>,
            String,
            Option<String>,
            Option<String>,
        ),
    >(
        "SELECT e.id, e.title, e.description, e.event_date, e.start_time, e.end_time, e.created_by,
                u.first_name, u.last_name
         FROM events e 
         LEFT JOIN users u ON e.created_by = u.id
         WHERE e.event_type = 'meeting' 
         ORDER BY e.event_date DESC, e.start_time DESC 
         LIMIT 5",
    )
    .fetch_all(pool.get_ref())
    .await;

    let meetings_json = match recent_meetings {
        Ok(meetings) => meetings
            .iter()
            .map(
                |(id, title, description, date, start, end, _created_by, first_name, last_name)| {
                    let is_upcoming = date >= &chrono::Utc::now().format("%Y-%m-%d").to_string();
                    let host_name = match (first_name, last_name) {
                        (Some(first), Some(last)) => format!("{} {}", first, last),
                        (Some(first), None) => first.clone(),
                        (None, Some(last)) => last.clone(),
                        (None, None) => "Unknown".to_string(),
                    };
                    serde_json::json!({
                        "id": id,
                        "title": title,
                        "description": description,
                        "date": date,
                        "startTime": start,
                        "endTime": end,
                        "status": if is_upcoming { "upcoming" } else { "completed" },
                        "host": host_name
                    })
                },
            )
            .collect::<Vec<_>>(),
        Err(_) => vec![],
    };

    // Get quick links
    let quick_links =
        sqlx::query_as::<_, (String, String, String, Option<String>, Option<String>)>(
            "SELECT ql.id, ql.title, ql.url, ql.description, ql.meeting_datetime 
         FROM quick_links ql 
         WHERE ql.is_active = 1 
         ORDER BY ql.created_at DESC 
         LIMIT 5",
        )
        .fetch_all(pool.get_ref())
        .await;

    let links_json = match quick_links {
        Ok(links) => links
            .iter()
            .map(|(id, title, url, description, datetime)| {
                serde_json::json!({
                    "id": id,
                    "title": title,
                    "url": url,
                    "subtitle": description,
                    "schedule": datetime
                })
            })
            .collect::<Vec<_>>(),
        Err(_) => vec![],
    };

    // Get pending tasks count
    let pending_tasks =
        sqlx::query_as::<_, (i64,)>("SELECT COUNT(*) FROM tasks WHERE status = 'pending'")
            .fetch_one(pool.get_ref())
            .await
            .map(|(count,)| count)
            .unwrap_or(0);

    // Get urgent tasks count
    let urgent_tasks = sqlx::query_as::<_, (i64,)>(
        "SELECT COUNT(*) FROM tasks WHERE urgency = 'urgent' AND status != 'completed'",
    )
    .fetch_one(pool.get_ref())
    .await
    .map(|(count,)| count)
    .unwrap_or(0);

    HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": {
            "stats": {
                "activeProjects": active_projects,
                "teamMembers": team_members,
                "departmentsCount": departments_count,
                "completedTasks": completed_tasks,
                "meetingsToday": today_meetings,
                "pendingTasks": pending_tasks,
                "urgentTasks": urgent_tasks
            },
            "recentMeetings": meetings_json,
            "quickLinks": links_json
        }
    }))
}
