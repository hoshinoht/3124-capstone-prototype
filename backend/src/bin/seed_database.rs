//! Database Seeder Script
//!
//! This script seeds the database with data from CSV files and generates
//! random tasks and check-in records.
//!
//! Usage:
//!   cargo run --bin seed_database
//!
//! Options (via environment variables):
//!   SEED_TASK_MODE=random    - Assign random members to tasks (default)
//!   SEED_TASK_MODE=project   - Assign all project members to tasks
//!   SEED_CLEAR_DATA=true     - Clear existing data before seeding

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

/// Number of days before today to start generating tasks
const DAYS_BEFORE_TODAY: i64 = 20;
/// Number of days after today to end generating tasks
const DAYS_AFTER_TODAY: i64 = 20;

/// Device types for check-in records
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
    deadline: String, // We'll ignore this and generate our own dates
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

/// Calculate date range dynamically based on current date
/// Returns (start_date, end_date, today) where:
/// - start_date = today - DAYS_BEFORE_TODAY
/// - end_date = today + DAYS_AFTER_TODAY  
/// - today = current date
fn calculate_date_range() -> (NaiveDate, NaiveDate, NaiveDate) {
    let today = Utc::now().date_naive();
    let start = today - Duration::days(DAYS_BEFORE_TODAY);
    let end = today + Duration::days(DAYS_AFTER_TODAY);
    (start, end, today)
}

/// Generate all dates between start and end (inclusive)
fn generate_date_range(start: NaiveDate, end: NaiveDate) -> Vec<NaiveDate> {
    let mut dates = Vec::new();
    let mut current = start;
    while current <= end {
        dates.push(current);
        current += Duration::days(1);
    }
    dates
}

/// Determine task status based on deadline and current date
fn determine_task_status(deadline: NaiveDate, current_date: NaiveDate) -> (&'static str, bool) {
    let days_diff = (deadline - current_date).num_days();

    if days_diff < -2 {
        // Past deadline by more than 2 days - completed
        ("completed", true)
    } else if days_diff < 0 {
        // Just past deadline - in-progress (catching up)
        ("in-progress", false)
    } else if days_diff == 0 {
        // Due today - in-progress
        ("in-progress", false)
    } else {
        // Future - pending
        ("pending", false)
    }
}

/// Load locations from CSV file
fn load_locations(csv_path: &str) -> Result<Vec<String>, Box<dyn Error>> {
    let mut rdr = ReaderBuilder::new().has_headers(true).from_path(csv_path)?;

    let locations: Vec<String> = rdr
        .deserialize()
        .filter_map(|r: Result<LocationCsv, _>| r.ok())
        .map(|loc| loc.name)
        .collect();

    Ok(locations)
}

// ============================================================================
// SEEDER FUNCTIONS
// ============================================================================

async fn seed_users(
    pool: &SqlitePool,
    csv_path: &str,
) -> Result<HashMap<String, String>, Box<dyn Error>> {
    println!("📦 Seeding users from {}...", csv_path);

    let mut email_to_id: HashMap<String, String> = HashMap::new();

    // First, add the default admin user
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
    println!("  ✓ Added admin user");

    // Read and insert users from CSV
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

    println!("  ✓ Seeded {} users", count);
    Ok(email_to_id)
}

async fn seed_equipment(pool: &SqlitePool, csv_path: &str) -> Result<Vec<String>, Box<dyn Error>> {
    println!("📦 Seeding equipment from {}...", csv_path);

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

    println!("  ✓ Seeded {} equipment items", count);
    Ok(equipment_ids)
}

async fn seed_projects(
    pool: &SqlitePool,
    csv_path: &str,
    email_to_id: &HashMap<String, String>,
    user_ids: &[String],
) -> Result<Vec<(String, Vec<String>)>, Box<dyn Error>> {
    println!("📦 Seeding projects from {}...", csv_path);

    let mut rng = thread_rng();
    let mut projects_with_members: Vec<(String, Vec<String>)> = Vec::new();

    let mut rdr = ReaderBuilder::new().has_headers(true).from_path(csv_path)?;

    // Get admin user as fallback
    let admin_id = email_to_id
        .get("admin@company.com")
        .cloned()
        .unwrap_or_else(|| user_ids.first().cloned().unwrap_or_else(generate_uuid));

    let mut count = 0;
    for result in rdr.deserialize() {
        let project: ProjectCsv = result?;
        let project_id = generate_uuid();

        // Try to find the creator by email, fallback to admin
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

        // Add project owner
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

        // Add 2-4 random members to each project
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

        // Explicitly add Javier to the first 2 projects
        // First project: Javier is an owner, Second project: Javier is a member
        if count < 2 {
            if let Some(javier_id) = email_to_id.get("javier21choo@gmail.com") {
                // Only add if Javier is not already a member
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
                    println!("    ✓ Added Javier Choo to project as {}", role);
                }
            }
        }

        projects_with_members.push((project_id, project_member_ids));
        count += 1;
    }

    println!("  ✓ Seeded {} projects with members", count);
    Ok(projects_with_members)
}

async fn seed_events(
    pool: &SqlitePool,
    csv_path: &str,
    user_ids: &[String],
) -> Result<(), Box<dyn Error>> {
    println!("📦 Seeding events from {}...", csv_path);

    let mut rng = thread_rng();
    let (start_date, end_date, _today) = calculate_date_range();
    let dates = generate_date_range(start_date, end_date);

    let mut rdr = ReaderBuilder::new().has_headers(true).from_path(csv_path)?;

    let events: Vec<EventCsv> = rdr.deserialize().filter_map(|r| r.ok()).collect();

    let mut count = 0;
    // Create events for multiple days
    for date in dates.iter().step_by(2) {
        // Every other day
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

            // Add 1-3 random attendees
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

    println!("  ✓ Seeded {} events", count);
    Ok(())
}

async fn seed_notifications(
    pool: &SqlitePool,
    csv_path: &str,
    user_ids: &[String],
) -> Result<(), Box<dyn Error>> {
    println!("📦 Seeding notifications from {}...", csv_path);

    let mut rng = thread_rng();

    let mut rdr = ReaderBuilder::new().has_headers(true).from_path(csv_path)?;

    let notification_templates: Vec<NotificationCsv> =
        rdr.deserialize().filter_map(|r| r.ok()).collect();

    let mut count = 0;
    // Create notifications for each user
    for user_id in user_ids {
        // Each user gets 1-3 random notifications from templates
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

    println!("  ✓ Seeded {} notifications", count);
    Ok(())
}

async fn seed_quick_links(
    pool: &SqlitePool,
    csv_path: &str,
    admin_id: &str,
) -> Result<(), Box<dyn Error>> {
    println!("📦 Seeding quick links from {}...", csv_path);

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

    println!("  ✓ Seeded {} quick links", count);
    Ok(())
}

async fn seed_glossary(
    pool: &SqlitePool,
    csv_path: &str,
    admin_id: &str,
) -> Result<(), Box<dyn Error>> {
    println!("📦 Seeding glossary terms from {}...", csv_path);

    // First create categories
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
        println!("  ✓ Created category: {}", name);
    }

    // Read and insert glossary terms
    let mut rdr = ReaderBuilder::new().has_headers(true).from_path(csv_path)?;

    let mut count = 0;
    for result in rdr.deserialize() {
        let term: GlossaryTermCsv = result?;
        let term_id = generate_uuid();
        let category_id = category_map.get(&term.category);

        // Based on actual schema: glossary_terms has acronym, full_name, definition, category_id, created_by, is_approved
        // The CSV term field is used for both acronym and full_name (as the server does)
        sqlx::query(
            r#"
            INSERT INTO glossary_terms (id, acronym, full_name, definition, category_id, is_approved, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&term_id)
        .bind(&term.term)  // acronym
        .bind(&term.term)  // full_name (same as acronym, following server pattern)
        .bind(&term.definition)
        .bind(category_id)
        .bind(true)  // is_approved
        .bind(admin_id)
        .bind(now_str())
        .bind(now_str())
        .execute(pool)
        .await?;

        count += 1;
    }

    println!("  ✓ Seeded {} glossary terms", count);
    Ok(())
}

/// Seed tasks with two modes:
/// 1. "random" - Assign random members to each task
/// 2. "project" - Assign a random project and all its members to the task
async fn seed_tasks(
    pool: &SqlitePool,
    csv_path: &str,
    user_ids: &[String],
    projects_with_members: &[(String, Vec<String>)],
    email_to_id: &HashMap<String, String>,
    mode: &str,
) -> Result<(), Box<dyn Error>> {
    println!("📦 Seeding tasks from {} (mode: {})...", csv_path, mode);

    let mut rng = thread_rng();
    let (start_date, end_date, today) = calculate_date_range();
    let dates = generate_date_range(start_date, end_date);

    // Get admin user for created_by
    let admin_id = user_ids.first().cloned().unwrap_or_else(generate_uuid);

    // Read task templates from CSV
    let mut rdr = ReaderBuilder::new().has_headers(true).from_path(csv_path)?;

    let task_templates: Vec<TaskCsv> = rdr.deserialize().filter_map(|r| r.ok()).collect();

    // Filter tasks by department
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

    // Distribute tasks across dates
    for date in &dates {
        // 2-4 tasks per day
        let tasks_per_day = rng.gen_range(2..=4);

        for _ in 0..tasks_per_day {
            // Randomly select department and corresponding task
            let (task_template, department) = match rng.gen_range(0..10) {
                0..=3 => {
                    // IT task (40%)
                    if let Some(t) = it_tasks.choose(&mut rng) {
                        (*t, "IT")
                    } else {
                        continue;
                    }
                }
                4..=7 => {
                    // Engineering task (40%)
                    if let Some(t) = eng_tasks.choose(&mut rng) {
                        (*t, "Engineering")
                    } else {
                        continue;
                    }
                }
                _ => {
                    // Both department task (20%)
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

            // Determine status based on date relative to today
            let (status, is_completed) = determine_task_status(*date, today);

            // Randomly select urgency (or use from template)
            let urgency: &str = if rng.gen_bool(0.7) {
                &task_template.urgency
            } else {
                *["urgent", "high", "medium", "low"]
                    .choose(&mut rng)
                    .unwrap()
            };

            // Determine project and assignees based on mode
            let (project_id, assignee_id, assignee_ids): (
                Option<String>,
                Option<String>,
                Vec<String>,
            ) = match mode {
                "project" => {
                    // Mode: Assign to a project and use all project members
                    if let Some((proj_id, members)) = projects_with_members.choose(&mut rng) {
                        let primary_assignee = members.choose(&mut rng).cloned();
                        (Some(proj_id.clone()), primary_assignee, members.clone())
                    } else {
                        let assignee = user_ids.choose(&mut rng).cloned();
                        (None, assignee.clone(), assignee.into_iter().collect())
                    }
                }
                _ => {
                    // Mode: Random - 30% chance to assign to a project
                    if rng.gen_bool(0.3) {
                        // When assigning to a project, use ALL project members
                        if let Some((proj_id, members)) = projects_with_members.choose(&mut rng) {
                            let primary_assignee = members.choose(&mut rng).cloned();
                            (Some(proj_id.clone()), primary_assignee, members.clone())
                        } else {
                            // No projects available, assign 1-3 random members
                            let num_assignees = rng.gen_range(1..=3);
                            let selected: Vec<String> = user_ids
                                .choose_multiple(&mut rng, num_assignees)
                                .cloned()
                                .collect();
                            let primary = selected.first().cloned();
                            (None, primary, selected)
                        }
                    } else {
                        // No project - assign 1-3 random members
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

            // Calculate completed_at for completed tasks
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

            // Calculate created_at (1-3 days before deadline)
            let days_before = rng.gen_range(1..=3);
            let created_at = (*date - Duration::days(days_before))
                .format("%Y-%m-%d")
                .to_string()
                + " 09:00:00";

            // Insert task
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

            // Insert task assignees
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

    // === Create explicit "today" tasks for Javier Choo ===
    // These tasks use the current date so they show up in "Today's Tasks"
    if let Some(javier_id) = email_to_id.get("javier21choo@gmail.com") {
        println!("  📌 Creating today's tasks for Javier Choo...");

        // Use today from calculate_date_range (which is the real current date)
        let today_str = today.format("%Y-%m-%d").to_string();

        let today_tasks = [
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
        ];

        let created_at = now_str(); // Use current timestamp

        for (title, department, urgency) in today_tasks {
            let task_id = generate_uuid();

            // Randomly assign to a project (50% chance)
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
            .bind(format!("Task assigned to Javier for today ({})", &today_str))
            .bind(urgency)
            .bind("pending")  // Not completed
            .bind(false)       // is_completed = false
            .bind(department)
            .bind(&project_id)
            .bind(javier_id)
            .bind(&admin_id)
            .bind(&today_str)  // Deadline is today's date
            .bind::<Option<String>>(None)  // No completed_at
            .bind(&created_at)
            .bind(now_str())
            .execute(pool)
            .await?;

            // Add Javier as task assignee
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

            count += 1;
        }
        println!(
            "    ✓ Created {} tasks for {} assigned to Javier",
            today_tasks.len(),
            today_str
        );
    }

    println!("  ✓ Seeded {} tasks across {} days", count, dates.len());
    Ok(())
}

async fn seed_check_in_records(
    pool: &SqlitePool,
    user_ids: &[String],
    locations: &[String],
) -> Result<(), Box<dyn Error>> {
    println!("📦 Generating check-in records...");

    let mut rng = thread_rng();
    let (start_date, _end_date, today) = calculate_date_range();
    let dates = generate_date_range(start_date, today);

    let mut count = 0;

    for user_id in user_ids {
        // Generate check-ins for past dates (skip weekends roughly)
        for date in &dates {
            // Skip if date is in the future
            if *date > today {
                continue;
            }

            // 80% chance to have a check-in on any given day
            if !rng.gen_bool(0.8) {
                continue;
            }

            let location = locations.choose(&mut rng).unwrap();
            let device_type = DEVICE_TYPES.choose(&mut rng).unwrap();

            // Random check-in time between 7:00 and 10:00
            let check_in_hour = rng.gen_range(7..10);
            let check_in_minute = rng.gen_range(0..60);
            let check_in_time = NaiveDateTime::new(
                *date,
                NaiveTime::from_hms_opt(check_in_hour, check_in_minute, 0).unwrap(),
            );

            // Check-out time (if not today) - 8-10 hours later
            let check_out_time = if *date < today {
                let hours_worked = rng.gen_range(8..=10);
                Some(check_in_time + Duration::hours(hours_worked))
            } else {
                None // Today - might still be checked in
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

        // Update user_locations for current status
        let is_today_checkin = rng.gen_bool(0.6); // 60% chance user is checked in today
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

    println!("  ✓ Generated {} check-in records", count);
    Ok(())
}

async fn seed_bookings(
    pool: &SqlitePool,
    equipment_ids: &[String],
    user_ids: &[String],
) -> Result<(), Box<dyn Error>> {
    println!("📦 Generating equipment bookings...");

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

    // Generate bookings for a subset of equipment
    for equipment_id in equipment_ids.iter().take(8) {
        // 1-3 bookings per equipment
        let num_bookings = rng.gen_range(1..=3);

        for i in 0..num_bookings {
            let user_id = user_ids.choose(&mut rng).unwrap();
            let purpose = purposes.choose(&mut rng).unwrap();
            let department = departments.choose(&mut rng).unwrap();

            // Calculate booking dates
            let booking_start = start_date + Duration::days(rng.gen_range(0..15) + (i * 7) as i64);
            let booking_duration = rng.gen_range(1..=5);
            let booking_end = booking_start + Duration::days(booking_duration);

            // Determine status based on dates
            let status = if booking_end < today {
                "completed"
            } else if booking_start <= today && booking_end >= today {
                "active"
            } else {
                "active" // Future bookings are active
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

    println!("  ✓ Generated {} equipment bookings", count);
    Ok(())
}

async fn clear_data(pool: &SqlitePool) -> Result<(), Box<dyn Error>> {
    println!("🗑️  Clearing existing data...");

    // Delete in order respecting foreign keys
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
        // Don't delete users to preserve admin
    ];

    for table in tables {
        sqlx::query(&format!("DELETE FROM {}", table))
            .execute(pool)
            .await?;
    }

    // Delete non-admin users
    sqlx::query("DELETE FROM users WHERE email != 'admin@company.com'")
        .execute(pool)
        .await?;

    println!("  ✓ Cleared all data");
    Ok(())
}

// ============================================================================
// MAIN
// ============================================================================

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // Load environment variables
    dotenvy::dotenv().ok();

    println!("🌱 Database Seeder");
    println!("==================");

    // Calculate dynamic date range
    let (start_date, end_date, today) = calculate_date_range();
    println!(
        "Date range: {} to {} ({} days)",
        start_date.format("%Y-%m-%d"),
        end_date.format("%Y-%m-%d"),
        (end_date - start_date).num_days() + 1
    );
    println!("Today: {}", today.format("%Y-%m-%d"));

    // Get configuration from environment
    let task_mode = env::var("SEED_TASK_MODE").unwrap_or_else(|_| "random".to_string());
    let clear_data_flag =
        env::var("SEED_CLEAR_DATA").unwrap_or_else(|_| "true".to_string()) == "true";

    println!("Task assignment mode: {}", task_mode);
    println!("Clear existing data: {}", clear_data_flag);
    println!();

    // Connect to database
    let database_url =
        env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite:./database.db".to_string());

    println!("Connecting to database: {}", database_url);
    let pool = SqlitePool::connect(&database_url).await?;
    println!("✓ Connected to database\n");

    // Clear existing data if requested
    if clear_data_flag {
        clear_data(&pool).await?;
        println!();
    }

    // Define paths to CSV files
    let data_dir = "src/data";
    let glossary_path = "../frontend/public/glossary-terms.csv";

    // Load locations from CSV
    let locations = load_locations(&format!("{}/locations.csv", data_dir))?;
    println!("📍 Loaded {} locations from CSV", locations.len());

    // Seed users first (needed for foreign keys)
    let email_to_id = seed_users(&pool, &format!("{}/users.csv", data_dir)).await?;
    let user_ids: Vec<String> = email_to_id.values().cloned().collect();
    let admin_id = email_to_id
        .get("admin@company.com")
        .cloned()
        .unwrap_or_else(|| user_ids.first().cloned().unwrap());

    // Seed equipment
    let equipment_ids = seed_equipment(&pool, &format!("{}/equipment.csv", data_dir)).await?;

    // Seed projects with members
    let projects_with_members = seed_projects(
        &pool,
        &format!("{}/projects.csv", data_dir),
        &email_to_id,
        &user_ids,
    )
    .await?;

    // Seed events
    seed_events(&pool, &format!("{}/events.csv", data_dir), &user_ids).await?;

    // Seed notifications
    seed_notifications(&pool, &format!("{}/notifications.csv", data_dir), &user_ids).await?;

    // Seed quick links
    seed_quick_links(&pool, &format!("{}/quick_links.csv", data_dir), &admin_id).await?;

    // Seed glossary terms
    seed_glossary(&pool, glossary_path, &admin_id).await?;

    // Seed tasks with specified mode
    seed_tasks(
        &pool,
        &format!("{}/tasks.csv", data_dir),
        &user_ids,
        &projects_with_members,
        &email_to_id,
        &task_mode,
    )
    .await?;

    // Generate check-in records
    seed_check_in_records(&pool, &user_ids, &locations).await?;

    // Generate equipment bookings
    seed_bookings(&pool, &equipment_ids, &user_ids).await?;

    println!();
    println!("✅ Database seeding completed successfully!");
    println!();
    println!("Summary:");
    println!("  - Users: {}", user_ids.len());
    println!("  - Equipment: {}", equipment_ids.len());
    println!("  - Projects: {}", projects_with_members.len());
    println!("  - Locations: {}", locations.len());
    println!();
    println!("To run the seeder again with different options:");
    println!("  SEED_TASK_MODE=project cargo run --bin seed_database");
    println!("  SEED_CLEAR_DATA=false cargo run --bin seed_database");

    Ok(())
}
