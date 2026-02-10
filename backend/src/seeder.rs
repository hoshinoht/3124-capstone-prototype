//! Database Seeder Module
//!
//! This module provides database seeding functionality that can be called
//! from the main application on startup.

use bcrypt::{DEFAULT_COST, hash};
use chrono::{Duration, NaiveDate, NaiveDateTime, NaiveTime, Utc};
use csv::ReaderBuilder;
use rand::prelude::*;
use serde::Deserialize;
use sqlx::sqlite::SqlitePool;
use std::collections::HashMap;
use std::env;
use std::error::Error;
use uuid::Uuid;

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

const DAYS_BEFORE_TODAY: i64 = 150;
const DAYS_AFTER_TODAY: i64 = 150;
const DEVICE_TYPES: &[&str] = &["desktop", "mobile"];

// ============================================================================
// CSV DATA STRUCTURES
// ============================================================================

#[derive(Debug, Deserialize)]
struct UserCsv {
    email: String,
    password: String,
    first_name: String,
    last_name: String,
    department: String,
    role: String,
    is_active: u8,
}

#[derive(Debug, Deserialize)]
struct EquipmentCsv {
    name: String,
    category: String,
    status: String,
    serial_number: String,
    notes: String,
}

#[derive(Debug, Deserialize)]
struct ProjectCsv {
    name: String,
    description: String,
    status: String,
    created_by_email: String,
}

#[derive(Debug, Deserialize)]
struct EventCsv {
    title: String,
    description: String,
    event_type: String,
    start_time: String,
    end_time: String,
    location: String,
    department: String,
}

#[derive(Debug, Deserialize)]
struct NotificationCsv {
    #[serde(rename = "type")]
    notification_type: String,
    title: String,
    message: String,
    is_read: u8,
}

#[derive(Debug, Deserialize)]
struct QuickLinkCsv {
    title: String,
    url: String,
    description: String,
    department: String,
    is_active: u8,
}

#[derive(Debug, Deserialize)]
struct TaskCsv {
    title: String,
    description: String,
    urgency: String,
    status: String,
    is_completed: u8,
    department: String,
    #[allow(dead_code)]
    deadline: String,
}

#[derive(Debug, Deserialize)]
struct GlossaryTermCsv {
    #[serde(rename = "Term")]
    term: String,
    #[serde(rename = "Definition")]
    definition: String,
    #[serde(rename = "Category")]
    category: String,
}

#[derive(Debug, Deserialize, Clone)]
struct LocationCsv {
    #[serde(rename = "Location Name")]
    name: String,
    #[serde(rename = "Category")]
    category: String,
    #[serde(rename = "Region")]
    region: String,
    #[serde(rename = "Key Industries & Notes")]
    notes: String,
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

fn generate_uuid() -> String {
    Uuid::new_v4().to_string()
}

fn now_str() -> String {
    Utc::now().format("%Y-%m-%d %H:%M:%S").to_string()
}

fn hash_password(password: &str) -> Result<String, bcrypt::BcryptError> {
    hash(password, DEFAULT_COST)
}

fn normalize_category_name(value: &str) -> String {
    let normalized = value.trim().to_lowercase();
    if normalized == "it" || normalized == "information technology" {
        return "IT".to_string();
    }
    if normalized == "engineering" || normalized == "eng" {
        return "Engineering".to_string();
    }
    if normalized == "general" {
        return "General".to_string();
    }

    "General".to_string()
}

fn calculate_date_range() -> (NaiveDate, NaiveDate, NaiveDate) {
    let today = Utc::now().date_naive();
    let start = today - Duration::days(DAYS_BEFORE_TODAY);
    let end = today + Duration::days(DAYS_AFTER_TODAY);
    (start, end, today)
}

fn generate_date_range(start: NaiveDate, end: NaiveDate) -> Vec<NaiveDate> {
    let mut dates = Vec::new();
    let mut current = start;
    while current <= end {
        dates.push(current);
        current += Duration::days(1);
    }
    dates
}

fn determine_task_status(deadline: NaiveDate, current_date: NaiveDate) -> (&'static str, bool) {
    let days_diff = (deadline - current_date).num_days();

    if days_diff < -2 {
        ("completed", true)
    } else if days_diff < 0 {
        ("in-progress", false)
    } else if days_diff == 0 {
        ("in-progress", false)
    } else {
        ("pending", false)
    }
}

fn load_locations(csv_path: &str) -> Result<Vec<String>, Box<dyn Error>> {
    let mut rdr = ReaderBuilder::new().has_headers(true).from_path(csv_path)?;

    let locations: Vec<String> = rdr
        .deserialize()
        .filter_map(|r: Result<LocationCsv, _>| r.ok())
        .map(|loc| loc.name)
        .collect();

    Ok(locations)
}

async fn check_if_seeded(pool: &SqlitePool) -> Result<bool, Box<dyn Error>> {
    // Check if there are any users besides the admin
    let count: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM users WHERE email != 'admin@company.com'")
            .fetch_one(pool)
            .await?;

    Ok(count.0 > 0)
}

// Include all the seeding functions from seed_database.rs
// (seed_users, seed_equipment, seed_projects, seed_events, etc.)
// These are the same functions, just made available as a module

async fn seed_users(
    pool: &SqlitePool,
    csv_path: &str,
) -> Result<HashMap<String, String>, Box<dyn Error>> {
    log::info!("📦 Seeding users from {}...", csv_path);

    let mut email_to_id: HashMap<String, String> = HashMap::new();

    let admin_id = "550e8400-e29b-41d4-a716-446655440000".to_string();
    let admin_hash = hash_password("admin123")?;

    sqlx::query(
        r#"
        INSERT OR REPLACE INTO users (id, email, password_hash, first_name, last_name, department, role, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(&admin_id)
    .bind("admin@company.com")
    .bind(&admin_hash)
    .bind("Admin")
    .bind("User")
    .bind("Both")
    .bind("Admin")
    .bind(true)
    .bind(now_str())
    .bind(now_str())
    .execute(pool)
    .await?;

    email_to_id.insert("admin@company.com".to_string(), admin_id);
    log::info!("  ✓ Added admin user");

    let mut rdr = ReaderBuilder::new().has_headers(true).from_path(csv_path)?;

    let mut count = 0;
    for result in rdr.deserialize() {
        let user: UserCsv = result?;
        let id = generate_uuid();
        let password_hash = hash_password(&user.password)?;

        sqlx::query(
            r#"
            INSERT OR REPLACE INTO users (id, email, password_hash, first_name, last_name, department, role, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&id)
        .bind(&user.email)
        .bind(&password_hash)
        .bind(&user.first_name)
        .bind(&user.last_name)
        .bind(&user.department)
        .bind(&user.role)
        .bind(user.is_active == 1)
        .bind(now_str())
        .bind(now_str())
        .execute(pool)
        .await?;

        email_to_id.insert(user.email.clone(), id);
        count += 1;
    }

    log::info!("  ✓ Seeded {} users", count);
    Ok(email_to_id)
}

async fn seed_equipment(pool: &SqlitePool, csv_path: &str) -> Result<Vec<String>, Box<dyn Error>> {
    log::info!("📦 Seeding equipment from {}...", csv_path);

    let mut equipment_ids = Vec::new();
    let mut rdr = ReaderBuilder::new().has_headers(true).from_path(csv_path)?;

    let mut count = 0;
    for result in rdr.deserialize() {
        let equipment: EquipmentCsv = result?;
        let id = generate_uuid();

        sqlx::query(
            r#"
            INSERT OR REPLACE INTO equipment (id, name, category, status, serial_number, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&id)
        .bind(&equipment.name)
        .bind(&equipment.category)
        .bind(&equipment.status)
        .bind(&equipment.serial_number)
        .bind(&equipment.notes)
        .bind(now_str())
        .bind(now_str())
        .execute(pool)
        .await?;

        equipment_ids.push(id);
        count += 1;
    }

    log::info!("  ✓ Seeded {} equipment items", count);
    Ok(equipment_ids)
}

async fn seed_projects(
    pool: &SqlitePool,
    csv_path: &str,
    email_to_id: &HashMap<String, String>,
    user_ids: &[String],
) -> Result<Vec<(String, Vec<String>)>, Box<dyn Error>> {
    log::info!("📦 Seeding projects from {}...", csv_path);

    let mut rng = thread_rng();
    let mut projects_with_members: Vec<(String, Vec<String>)> = Vec::new();

    let mut rdr = ReaderBuilder::new().has_headers(true).from_path(csv_path)?;

    let admin_id = email_to_id
        .get("admin@company.com")
        .cloned()
        .unwrap_or_else(|| user_ids.first().cloned().unwrap_or_else(generate_uuid));

    let mut count = 0;
    for result in rdr.deserialize() {
        let project: ProjectCsv = result?;
        let project_id = generate_uuid();

        let created_by = email_to_id
            .get(&project.created_by_email)
            .cloned()
            .unwrap_or_else(|| admin_id.clone());

        sqlx::query(
            r#"
            INSERT INTO projects (id, name, description, status, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&project_id)
        .bind(&project.name)
        .bind(&project.description)
        .bind(&project.status)
        .bind(&created_by)
        .bind(now_str())
        .bind(now_str())
        .execute(pool)
        .await?;

        let owner_member_id = generate_uuid();
        sqlx::query(
            r#"
            INSERT INTO project_members (id, project_id, user_id, role, added_at)
            VALUES (?, ?, ?, ?, ?)
            "#,
        )
        .bind(&owner_member_id)
        .bind(&project_id)
        .bind(&created_by)
        .bind("owner")
        .bind(now_str())
        .execute(pool)
        .await?;

        let mut project_member_ids = vec![created_by.clone()];

        let num_members = rng.gen_range(2..=4);
        let available_users: Vec<_> = user_ids.iter().filter(|id| *id != &created_by).collect();

        let selected_members: Vec<_> = available_users
            .choose_multiple(&mut rng, num_members.min(available_users.len()))
            .collect();

        for (i, user_id) in selected_members.iter().enumerate() {
            let member_id = generate_uuid();
            let role = if i == 0 { "admin" } else { "member" };

            sqlx::query(
                r#"
                INSERT OR IGNORE INTO project_members (id, project_id, user_id, role, added_at)
                VALUES (?, ?, ?, ?, ?)
                "#,
            )
            .bind(&member_id)
            .bind(&project_id)
            .bind(*user_id)
            .bind(role)
            .bind(now_str())
            .execute(pool)
            .await?;

            project_member_ids.push((*user_id).to_string());
        }

        if count < 2 {
            if let Some(javier_id) = email_to_id.get("javier21choo@gmail.com") {
                if !project_member_ids.contains(javier_id) {
                    let member_id = generate_uuid();
                    let role = if count == 0 { "owner" } else { "member" };

                    sqlx::query(
                        r#"
                        INSERT OR IGNORE INTO project_members (id, project_id, user_id, role, added_at)
                        VALUES (?, ?, ?, ?, ?)
                        "#,
                    )
                    .bind(&member_id)
                    .bind(&project_id)
                    .bind(javier_id)
                    .bind(role)
                    .bind(now_str())
                    .execute(pool)
                    .await?;

                    project_member_ids.push(javier_id.clone());
                    log::info!("    ✓ Added Javier Choo to project as {}", role);
                }
            }
        }

        projects_with_members.push((project_id, project_member_ids));
        count += 1;
    }

    log::info!("  ✓ Seeded {} projects with members", count);
    Ok(projects_with_members)
}

async fn seed_events(
    pool: &SqlitePool,
    csv_path: &str,
    user_ids: &[String],
    email_to_id: &HashMap<String, String>,
) -> Result<(), Box<dyn Error>> {
    log::info!("📦 Seeding events from {}...", csv_path);

    let mut rng = thread_rng();
    let (start_date, end_date, _today) = calculate_date_range();
    let dates = generate_date_range(start_date, end_date);

    let mut rdr = ReaderBuilder::new().has_headers(true).from_path(csv_path)?;

    let events: Vec<EventCsv> = rdr.deserialize().filter_map(|r| r.ok()).collect();

    let mut count = 0;
    for date in dates.iter().step_by(2) {
        for event_csv in &events {
            let event_id = generate_uuid();
            let created_by = user_ids.choose(&mut rng).unwrap();

            sqlx::query(
                r#"
                INSERT INTO events (id, title, description, event_type, event_date, start_time, end_time, location, created_by, department, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                "#
            )
            .bind(&event_id)
            .bind(&event_csv.title)
            .bind(&event_csv.description)
            .bind(&event_csv.event_type)
            .bind(date.format("%Y-%m-%d").to_string())
            .bind(&event_csv.start_time)
            .bind(if event_csv.end_time.is_empty() { None } else { Some(&event_csv.end_time) })
            .bind(if event_csv.location.is_empty() { None } else { Some(&event_csv.location) })
            .bind(created_by)
            .bind(&event_csv.department)
            .bind(now_str())
            .bind(now_str())
            .execute(pool)
            .await?;

            let num_attendees = rng.gen_range(1..=3);
            let attendees: Vec<_> = user_ids.choose_multiple(&mut rng, num_attendees).collect();

            for attendee_id in attendees {
                let ea_id = generate_uuid();
                let status = ["pending", "accepted", "declined"]
                    .choose(&mut rng)
                    .unwrap();

                sqlx::query(
                    r#"
                    INSERT OR IGNORE INTO event_attendees (id, event_id, user_id, status, added_at)
                    VALUES (?, ?, ?, ?, ?)
                    "#,
                )
                .bind(&ea_id)
                .bind(&event_id)
                .bind(attendee_id)
                .bind(status)
                .bind(now_str())
                .execute(pool)
                .await?;
            }

            count += 1;
        }
    }

    if let Some(javier_id) = email_to_id.get("javier21choo@gmail.com") {
        log::info!("  📌 Creating daily events for Javier Choo...");

        let event_templates = [
            (
                "Team sync meeting",
                "Engineering",
                "meeting",
                "09:00",
                "10:00",
            ),
            (
                "Project review session",
                "Engineering",
                "meeting",
                "14:00",
                "15:00",
            ),
            (
                "Technical planning discussion",
                "Both",
                "meeting",
                "11:00",
                "12:00",
            ),
            (
                "Client presentation",
                "Engineering",
                "meeting",
                "15:00",
                "16:00",
            ),
        ];

        let locations_templates = [
            "Conference Room A",
            "Virtual - Teams",
            "Conference Room B",
            "Virtual - Zoom",
        ];

        let mut javier_event_count = 0;

        for date in &dates {
            let date_str = date.format("%Y-%m-%d").to_string();

            for i in 0..4 {
                let (title, department, event_type, start_time, end_time) = event_templates[i];
                let location = locations_templates[i];
                let event_id = generate_uuid();

                sqlx::query(
                    r#"
                    INSERT INTO events (id, title, description, event_type, event_date, start_time, end_time, location, created_by, department, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    "#
                )
                .bind(&event_id)
                .bind(title)
                .bind(format!("Daily event #{} for Javier on {}", i + 1, &date_str))
                .bind(event_type)
                .bind(&date_str)
                .bind(start_time)
                .bind(end_time)
                .bind(location)
                .bind(javier_id)
                .bind(department)
                .bind(now_str())
                .bind(now_str())
                .execute(pool)
                .await?;

                let ea_id = generate_uuid();
                sqlx::query(
                    r#"
                    INSERT OR IGNORE INTO event_attendees (id, event_id, user_id, status, added_at)
                    VALUES (?, ?, ?, ?, ?)
                    "#,
                )
                .bind(&ea_id)
                .bind(&event_id)
                .bind(javier_id)
                .bind("accepted")
                .bind(now_str())
                .execute(pool)
                .await?;

                javier_event_count += 1;
            }
        }

        log::info!(
            "    ✓ Created {} events across {} days for Javier (4 per day)",
            javier_event_count,
            dates.len()
        );
        count += javier_event_count;
    }

    log::info!("  ✓ Seeded {} events", count);
    Ok(())
}

async fn seed_notifications(
    pool: &SqlitePool,
    csv_path: &str,
    user_ids: &[String],
) -> Result<(), Box<dyn Error>> {
    log::info!("📦 Seeding notifications from {}...", csv_path);

    let mut rng = thread_rng();

    let mut rdr = ReaderBuilder::new().has_headers(true).from_path(csv_path)?;

    let notification_templates: Vec<NotificationCsv> =
        rdr.deserialize().filter_map(|r| r.ok()).collect();

    let mut count = 0;
    for user_id in user_ids {
        let num_notifications = rng.gen_range(1..=3);
        let selected: Vec<_> = notification_templates
            .choose_multiple(&mut rng, num_notifications)
            .collect();

        for notification in selected {
            let notification_id = generate_uuid();

            sqlx::query(
                r#"
                INSERT INTO notifications (id, user_id, type, title, message, is_read, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                "#,
            )
            .bind(&notification_id)
            .bind(user_id)
            .bind(&notification.notification_type)
            .bind(&notification.title)
            .bind(&notification.message)
            .bind(notification.is_read == 1)
            .bind(now_str())
            .execute(pool)
            .await?;

            count += 1;
        }
    }

    log::info!("  ✓ Seeded {} notifications", count);
    Ok(())
}

async fn seed_quick_links(
    pool: &SqlitePool,
    csv_path: &str,
    admin_id: &str,
) -> Result<(), Box<dyn Error>> {
    log::info!("📦 Seeding quick links from {}...", csv_path);

    let mut rdr = ReaderBuilder::new().has_headers(true).from_path(csv_path)?;

    let mut count = 0;
    for result in rdr.deserialize() {
        let link: QuickLinkCsv = result?;
        let link_id = generate_uuid();

        sqlx::query(
            r#"
            INSERT INTO quick_links (id, title, url, description, department, is_active, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&link_id)
        .bind(&link.title)
        .bind(&link.url)
        .bind(&link.description)
        .bind(&link.department)
        .bind(link.is_active == 1)
        .bind(admin_id)
        .bind(now_str())
        .bind(now_str())
        .execute(pool)
        .await?;

        count += 1;
    }

    log::info!("  ✓ Seeded {} quick links", count);
    Ok(())
}

async fn seed_glossary(
    pool: &SqlitePool,
    csv_path: &str,
    admin_id: &str,
) -> Result<(), Box<dyn Error>> {
    log::info!("📦 Seeding glossary terms from {}...", csv_path);

    let categories = vec![
        ("IT", "Information Technology terms"),
        ("Engineering", "Engineering and building systems terms"),
        ("General", "General business terms"),
    ];

    let mut category_map: HashMap<String, String> = HashMap::new();

    for (i, (name, _desc)) in categories.iter().enumerate() {
        let cat_id = generate_uuid();

        sqlx::query(
            r#"
            INSERT OR REPLACE INTO glossary_categories (id, name, display_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            "#
        )
        .bind(&cat_id)
        .bind(name)
        .bind(i as i32)
        .bind(now_str())
        .bind(now_str())
        .execute(pool)
        .await?;

        category_map.insert(name.to_string(), cat_id);
        log::info!("  ✓ Created category: {}", name);
    }

    let mut rdr = ReaderBuilder::new().has_headers(true).from_path(csv_path)?;

    let mut count = 0;
    for result in rdr.deserialize() {
        let term: GlossaryTermCsv = result?;
        let term_id = generate_uuid();
        let category_key = normalize_category_name(&term.category);
        let category_id = category_map.get(&category_key);

        sqlx::query(
            r#"
            INSERT INTO glossary_terms (id, acronym, full_name, definition, category_id, is_approved, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&term_id)
        .bind(&term.term)
        .bind(&term.term)
        .bind(&term.definition)
        .bind(category_id)
        .bind(true)
        .bind(admin_id)
        .bind(now_str())
        .bind(now_str())
        .execute(pool)
        .await?;

        count += 1;
    }

    log::info!("  ✓ Seeded {} glossary terms", count);
    Ok(())
}

async fn seed_tasks(
    pool: &SqlitePool,
    csv_path: &str,
    user_ids: &[String],
    projects_with_members: &[(String, Vec<String>)],
    email_to_id: &HashMap<String, String>,
    mode: &str,
) -> Result<(), Box<dyn Error>> {
    log::info!("📦 Seeding tasks from {} (mode: {})...", csv_path, mode);

    let mut rng = thread_rng();
    let (start_date, end_date, today) = calculate_date_range();
    let dates = generate_date_range(start_date, end_date);

    let admin_id = user_ids.first().cloned().unwrap_or_else(generate_uuid);

    let mut rdr = ReaderBuilder::new().has_headers(true).from_path(csv_path)?;

    let task_templates: Vec<TaskCsv> = rdr.deserialize().filter_map(|r| r.ok()).collect();

    let it_tasks: Vec<_> = task_templates
        .iter()
        .filter(|t| t.department == "IT")
        .collect();
    let eng_tasks: Vec<_> = task_templates
        .iter()
        .filter(|t| t.department == "Engineering")
        .collect();
    let both_tasks: Vec<_> = task_templates
        .iter()
        .filter(|t| t.department == "Both")
        .collect();

    let mut count = 0;

    for date in &dates {
        let tasks_per_day = rng.gen_range(2..=4);

        for _ in 0..tasks_per_day {
            let (task_template, department) = match rng.gen_range(0..10) {
                0..=3 => {
                    if let Some(t) = it_tasks.choose(&mut rng) {
                        (*t, "IT")
                    } else {
                        continue;
                    }
                }
                4..=7 => {
                    if let Some(t) = eng_tasks.choose(&mut rng) {
                        (*t, "Engineering")
                    } else {
                        continue;
                    }
                }
                _ => {
                    if let Some(t) = both_tasks.choose(&mut rng) {
                        (*t, "Both")
                    } else if let Some(t) = it_tasks.choose(&mut rng) {
                        (*t, "IT")
                    } else {
                        continue;
                    }
                }
            };

            let task_id = generate_uuid();

            let (status, is_completed) = determine_task_status(*date, today);

            let urgency: &str = if rng.gen_bool(0.7) {
                &task_template.urgency
            } else {
                *["urgent", "high", "medium", "low"]
                    .choose(&mut rng)
                    .unwrap()
            };

            let (project_id, assignee_id, assignee_ids): (
                Option<String>,
                Option<String>,
                Vec<String>,
            ) = match mode {
                "project" => {
                    if let Some((proj_id, members)) = projects_with_members.choose(&mut rng) {
                        let primary_assignee = members.choose(&mut rng).cloned();
                        (Some(proj_id.clone()), primary_assignee, members.clone())
                    } else {
                        let assignee = user_ids.choose(&mut rng).cloned();
                        (None, assignee.clone(), assignee.into_iter().collect())
                    }
                }
                _ => {
                    if rng.gen_bool(0.3) {
                        if let Some((proj_id, members)) = projects_with_members.choose(&mut rng) {
                            let primary_assignee = members.choose(&mut rng).cloned();
                            (Some(proj_id.clone()), primary_assignee, members.clone())
                        } else {
                            let num_assignees = rng.gen_range(1..=3);
                            let selected: Vec<String> = user_ids
                                .choose_multiple(&mut rng, num_assignees)
                                .cloned()
                                .collect();
                            let primary = selected.first().cloned();
                            (None, primary, selected)
                        }
                    } else {
                        let num_assignees = rng.gen_range(1..=3);
                        let selected: Vec<String> = user_ids
                            .choose_multiple(&mut rng, num_assignees)
                            .cloned()
                            .collect();
                        let primary = selected.first().cloned();
                        (None, primary, selected)
                    }
                }
            };

            let completed_at = if is_completed {
                Some(
                    NaiveDateTime::new(
                        *date,
                        NaiveTime::from_hms_opt(rng.gen_range(9..18), rng.gen_range(0..60), 0)
                            .unwrap(),
                    )
                    .format("%Y-%m-%d %H:%M:%S")
                    .to_string(),
                )
            } else {
                None
            };

            let days_before = rng.gen_range(1..=3);
            let created_at = (*date - Duration::days(days_before))
                .format("%Y-%m-%d")
                .to_string()
                + " 09:00:00";

            sqlx::query(
                r#"
                INSERT INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, completed_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                "#
            )
            .bind(&task_id)
            .bind(&task_template.title)
            .bind(&task_template.description)
            .bind(urgency)
            .bind(status)
            .bind(is_completed)
            .bind(department)
            .bind(&project_id)
            .bind(&assignee_id)
            .bind(&admin_id)
            .bind(date.format("%Y-%m-%d").to_string())
            .bind(&completed_at)
            .bind(&created_at)
            .bind(now_str())
            .execute(pool)
            .await?;

            for user_id in &assignee_ids {
                let ta_id = generate_uuid();
                sqlx::query(
                    r#"
                    INSERT OR IGNORE INTO task_assignees (id, task_id, user_id, assigned_at, assigned_by)
                    VALUES (?, ?, ?, ?, ?)
                    "#
                )
                .bind(&ta_id)
                .bind(&task_id)
                .bind(user_id)
                .bind(&created_at)
                .bind(&admin_id)
                .execute(pool)
                .await?;
            }

            count += 1;
        }
    }

    if let Some(javier_id) = email_to_id.get("javier21choo@gmail.com") {
        log::info!("  📌 Creating daily tasks for Javier Choo...");

        let task_templates = [
            (
                "Review system architecture documentation",
                "Engineering",
                "high",
            ),
            ("Update project status report", "Engineering", "medium"),
            ("Attend daily standup meeting", "Both", "low"),
            (
                "Fix critical bug in authentication module",
                "Engineering",
                "urgent",
            ),
            ("Code review for team member's PR", "Engineering", "medium"),
            ("Update technical documentation", "Engineering", "medium"),
            ("Investigate performance issues", "IT", "high"),
            ("Deploy hotfix to production", "Both", "urgent"),
            ("Setup monitoring alerts", "IT", "medium"),
            ("Database optimization review", "IT", "high"),
        ];

        let mut javier_task_count = 0;

        for date in &dates {
            let date_str = date.format("%Y-%m-%d").to_string();
            let created_at =
                (*date - Duration::days(1)).format("%Y-%m-%d").to_string() + " 09:00:00";

            let (status, is_completed) = determine_task_status(*date, today);
            let completed_at = if is_completed {
                Some(
                    NaiveDateTime::new(
                        *date,
                        NaiveTime::from_hms_opt(rng.gen_range(9..18), rng.gen_range(0..60), 0)
                            .unwrap(),
                    )
                    .format("%Y-%m-%d %H:%M:%S")
                    .to_string(),
                )
            } else {
                None
            };

            for i in 0..4 {
                let (title, department, urgency) = task_templates[i % task_templates.len()];
                let task_id = generate_uuid();

                let project_id = if rng.gen_bool(0.5) {
                    projects_with_members
                        .choose(&mut rng)
                        .map(|(id, _)| id.clone())
                } else {
                    None
                };

                sqlx::query(
                    r#"
                    INSERT INTO tasks (id, title, description, urgency, status, is_completed, department, project_id, assignee_id, created_by, deadline, completed_at, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    "#
                )
                .bind(&task_id)
                .bind(title)
                .bind(format!("Daily task #{} for Javier on {}", i + 1, &date_str))
                .bind(urgency)
                .bind(status)
                .bind(is_completed)
                .bind(department)
                .bind(&project_id)
                .bind(javier_id)
                .bind(&admin_id)
                .bind(&date_str)
                .bind(&completed_at)
                .bind(&created_at)
                .bind(now_str())
                .execute(pool)
                .await?;

                let ta_id = generate_uuid();
                sqlx::query(
                    r#"
                    INSERT OR IGNORE INTO task_assignees (id, task_id, user_id, assigned_at, assigned_by)
                    VALUES (?, ?, ?, ?, ?)
                    "#
                )
                .bind(&ta_id)
                .bind(&task_id)
                .bind(javier_id)
                .bind(&created_at)
                .bind(&admin_id)
                .execute(pool)
                .await?;

                javier_task_count += 1;
            }
        }
        log::info!(
            "    ✓ Created {} tasks across {} days for Javier (4 per day)",
            javier_task_count,
            dates.len()
        );
        count += javier_task_count;
    }

    log::info!("  ✓ Seeded {} tasks across {} days", count, dates.len());
    Ok(())
}

async fn seed_check_in_records(
    pool: &SqlitePool,
    user_ids: &[String],
    locations: &[String],
) -> Result<(), Box<dyn Error>> {
    log::info!("📦 Generating check-in records...");

    let mut rng = thread_rng();
    let (start_date, _end_date, today) = calculate_date_range();
    let dates = generate_date_range(start_date, today);

    let mut count = 0;

    for user_id in user_ids {
        for date in &dates {
            if *date > today {
                continue;
            }

            if !rng.gen_bool(0.8) {
                continue;
            }

            let location = locations.choose(&mut rng).unwrap();
            let device_type = DEVICE_TYPES.choose(&mut rng).unwrap();

            let check_in_hour = rng.gen_range(7..10);
            let check_in_minute = rng.gen_range(0..60);
            let check_in_time = NaiveDateTime::new(
                *date,
                NaiveTime::from_hms_opt(check_in_hour, check_in_minute, 0).unwrap(),
            );

            let check_out_time = if *date < today {
                let hours_worked = rng.gen_range(8..=10);
                Some(check_in_time + Duration::hours(hours_worked))
            } else {
                None
            };

            let record_id = generate_uuid();
            let notes = if rng.gen_bool(0.2) {
                Some(
                    [
                        "Working on project",
                        "Remote meeting",
                        "On-site inspection",
                        "Routine work",
                    ]
                    .choose(&mut rng)
                    .unwrap()
                    .to_string(),
                )
            } else {
                None
            };

            sqlx::query(
                r#"
                INSERT INTO check_in_records (id, user_id, location, check_in_time, check_out_time, notes, device_type, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                "#
            )
            .bind(&record_id)
            .bind(user_id)
            .bind(location)
            .bind(check_in_time.format("%Y-%m-%d %H:%M:%S").to_string())
            .bind(check_out_time.map(|t| t.format("%Y-%m-%d %H:%M:%S").to_string()))
            .bind(&notes)
            .bind(device_type)
            .bind(now_str())
            .bind(now_str())
            .execute(pool)
            .await?;

            count += 1;
        }

        let is_today_checkin = rng.gen_bool(0.6);
        if is_today_checkin {
            let location = locations.choose(&mut rng).unwrap();
            let check_in_time = NaiveDateTime::new(
                today,
                NaiveTime::from_hms_opt(rng.gen_range(7..10), rng.gen_range(0..60), 0).unwrap(),
            );

            sqlx::query(
                r#"
                INSERT OR REPLACE INTO user_locations (user_id, location, last_check_in, is_checked_in, updated_at)
                VALUES (?, ?, ?, ?, ?)
                "#
            )
            .bind(user_id)
            .bind(location)
            .bind(check_in_time.format("%Y-%m-%d %H:%M:%S").to_string())
            .bind(true)
            .bind(now_str())
            .execute(pool)
            .await?;
        }
    }

    log::info!("  ✓ Generated {} check-in records", count);
    Ok(())
}

async fn seed_bookings(
    pool: &SqlitePool,
    equipment_ids: &[String],
    user_ids: &[String],
) -> Result<(), Box<dyn Error>> {
    log::info!("📦 Generating equipment bookings...");

    let mut rng = thread_rng();
    let (start_date, _end_date, today) = calculate_date_range();

    let purposes = [
        "Testing and calibration",
        "Project work",
        "Diagnostics",
        "Maintenance inspection",
        "Site survey",
        "Performance monitoring",
        "Installation support",
        "Training session",
    ];

    let departments = ["IT", "Engineering", "Both"];

    let mut count = 0;

    for equipment_id in equipment_ids.iter().take(8) {
        let num_bookings = rng.gen_range(1..=3);

        for i in 0..num_bookings {
            let user_id = user_ids.choose(&mut rng).unwrap();
            let purpose = purposes.choose(&mut rng).unwrap();
            let department = departments.choose(&mut rng).unwrap();

            let booking_start = start_date + Duration::days(rng.gen_range(0..15) + (i * 7) as i64);
            let booking_duration = rng.gen_range(1..=5);
            let booking_end = booking_start + Duration::days(booking_duration);

            let status = if booking_end < today {
                "completed"
            } else if booking_start <= today && booking_end >= today {
                "active"
            } else {
                "active"
            };

            let booking_id = generate_uuid();

            sqlx::query(
                r#"
                INSERT INTO bookings (id, equipment_id, user_id, department, start_date, end_date, purpose, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                "#
            )
            .bind(&booking_id)
            .bind(equipment_id)
            .bind(user_id)
            .bind(department)
            .bind(booking_start.format("%Y-%m-%d").to_string())
            .bind(booking_end.format("%Y-%m-%d").to_string())
            .bind(purpose)
            .bind(status)
            .bind(now_str())
            .bind(now_str())
            .execute(pool)
            .await?;

            count += 1;
        }
    }

    log::info!("  ✓ Generated {} equipment bookings", count);
    Ok(())
}

async fn initialize_schema(pool: &SqlitePool) -> Result<(), Box<dyn Error>> {
    log::info!("🔧 Initializing database schema...");

    // Determine base path for schema.sql
    let base_path = if std::path::Path::new("backend/schema.sql").exists() {
        "backend/schema.sql"
    } else if std::path::Path::new("schema.sql").exists() {
        "schema.sql"
    } else {
        return Err("Cannot find schema.sql file".into());
    };

    // Read schema file
    let schema = std::fs::read_to_string(base_path)?;

    // Parse and execute SQL statements
    let mut current_statement = String::new();

    for line in schema.lines() {
        let trimmed = line.trim();

        // Skip empty lines and comment-only lines
        if trimmed.is_empty() || trimmed.starts_with("--") {
            continue;
        }

        // Add line to current statement
        current_statement.push_str(line);
        current_statement.push('\n');

        // If line ends with semicolon, execute the statement
        if trimmed.ends_with(';') {
            let stmt = current_statement.trim();
            if !stmt.is_empty() {
                match sqlx::query(stmt).execute(pool).await {
                    Ok(_) => {}
                    Err(e) => {
                        log::warn!(
                            "Warning executing statement: {} - Error: {}",
                            &stmt[..stmt.len().min(100)],
                            e
                        );
                        // Continue anyway - some statements might fail if tables already exist
                    }
                }
            }
            current_statement.clear();
        }
    }

    log::info!("  ✓ Database schema initialized");
    Ok(())
}

async fn clear_data(pool: &SqlitePool) -> Result<(), Box<dyn Error>> {
    log::info!("🗑️  Clearing existing data...");

    let tables = [
        "notification_preferences",
        "notifications",
        "glossary_history",
        "glossary_terms",
        "glossary_categories",
        "user_quick_links",
        "quick_links",
        "user_locations",
        "check_in_records",
        "bookings",
        "equipment",
        "task_assignees",
        "task_history",
        "tasks",
        "project_members",
        "projects",
        "event_attendees",
        "events",
        "sessions",
    ];

    for table in tables {
        sqlx::query(&format!("DELETE FROM {}", table))
            .execute(pool)
            .await?;
    }

    sqlx::query("DELETE FROM users WHERE email != 'admin@company.com'")
        .execute(pool)
        .await?;

    log::info!("  ✓ Cleared all data");
    Ok(())
}

/// Main seeding function that can be called from the application
/// Extremely Destructive: This will DELETE existing data before seeding!
/// for prototyping and testing purposes only.
/// DO NOT USE IN PRODUCTION!
pub async fn run_seeder(pool: &SqlitePool) -> Result<(), Box<dyn Error>> {
    log::info!("🌱 Database Seeder");
    log::info!("==================");

    // Initialize schema first
    initialize_schema(pool).await?;

    // Always clear data on startup to ensure fresh seeding
    log::info!("🗑️  Clearing existing database data...");
    clear_data(pool).await?;

    log::info!("📝 Starting seeding process...");

    let (start_date, end_date, today) = calculate_date_range();
    log::info!(
        "Date range: {} to {} ({} days)",
        start_date.format("%Y-%m-%d"),
        end_date.format("%Y-%m-%d"),
        (end_date - start_date).num_days() + 1
    );
    log::info!("Today: {}", today.format("%Y-%m-%d"));

    let task_mode = env::var("SEED_TASK_MODE").unwrap_or_else(|_| "random".to_string());

    log::info!("Task assignment mode: {}", task_mode);

    // Determine base path - check if we're running from workspace root or backend dir
    let base_path = if std::path::Path::new("backend/src/data").exists() {
        "" // Running from workspace root
    } else if std::path::Path::new("src/data").exists() {
        "../" // Running from backend directory
    } else {
        return Err("Cannot find data directory. Please run from workspace root.".into());
    };

    let data_dir = format!("{}backend/src/data", base_path);
    let glossary_path = format!("{}frontend/public/glossary-terms.csv", base_path);

    log::info!("📂 Using data directory: {}", data_dir);

    let locations = load_locations(&format!("{}/locations.csv", data_dir))?;
    log::info!("📍 Loaded {} locations from CSV", locations.len());

    let email_to_id = seed_users(pool, &format!("{}/users.csv", data_dir)).await?;
    let user_ids: Vec<String> = email_to_id.values().cloned().collect();
    let admin_id = email_to_id
        .get("admin@company.com")
        .cloned()
        .unwrap_or_else(|| user_ids.first().cloned().unwrap());

    let equipment_ids = seed_equipment(pool, &format!("{}/equipment.csv", data_dir)).await?;

    let projects_with_members = seed_projects(
        pool,
        &format!("{}/projects.csv", data_dir),
        &email_to_id,
        &user_ids,
    )
    .await?;

    seed_events(
        pool,
        &format!("{}/events.csv", data_dir),
        &user_ids,
        &email_to_id,
    )
    .await?;

    seed_notifications(pool, &format!("{}/notifications.csv", data_dir), &user_ids).await?;

    seed_quick_links(pool, &format!("{}/quick_links.csv", data_dir), &admin_id).await?;

    seed_glossary(pool, &glossary_path, &admin_id).await?;

    seed_tasks(
        pool,
        &format!("{}/tasks.csv", data_dir),
        &user_ids,
        &projects_with_members,
        &email_to_id,
        &task_mode,
    )
    .await?;

    seed_check_in_records(pool, &user_ids, &locations).await?;

    seed_bookings(pool, &equipment_ids, &user_ids).await?;

    log::info!("");
    log::info!("✅ Database seeding completed successfully!");
    log::info!("");
    log::info!("Summary:");
    log::info!("  - Users: {}", user_ids.len());
    log::info!("  - Equipment: {}", equipment_ids.len());
    log::info!("  - Projects: {}", projects_with_members.len());
    log::info!("  - Locations: {}", locations.len());

    Ok(())
}
