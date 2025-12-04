use actix_web::{HttpRequest, HttpResponse, web};
use bcrypt::{verify, hash, DEFAULT_COST};
use chrono::{Duration, Utc};
use jsonwebtoken::{EncodingKey, Header, encode};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::models::users::{LoginData, LoginRequest, LoginResponse, User, UserResponse};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub first_name: String,
    pub last_name: String,
    pub department: String,
}

const JWT_SECRET: &str = "your-secret-key-change-in-production";

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
    pub role: String,
}

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/auth")
            .route("/login", web::post().to(login))
            .route("/register", web::post().to(register))
            .route("/logout", web::post().to(logout))
            .route("/refresh", web::post().to(refresh_token)),
    );
}

pub fn create_token(user_id: &str, role: &str) -> String {
    let expiration = Utc::now()
        .checked_add_signed(Duration::hours(24))
        .expect("valid timestamp")
        .timestamp() as usize;

    let claims = Claims {
        sub: user_id.to_string(),
        exp: expiration,
        role: role.to_string(),
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(JWT_SECRET.as_ref()),
    )
    .unwrap()
}

async fn login(pool: web::Data<SqlitePool>, body: web::Json<LoginRequest>) -> HttpResponse {
    let result = sqlx::query_as::<_, User>(
        "SELECT id, email, password_hash, first_name, last_name, department, role, is_active, created_at, updated_at, last_login FROM users WHERE email = ?"
    )
    .bind(&body.email)
    .fetch_optional(pool.get_ref())
    .await;

    match result {
        Ok(Some(user)) => {
            if !user.is_active {
                return HttpResponse::Unauthorized().json(serde_json::json!({
                    "success": false,
                    "error": {
                        "code": "ACCOUNT_DISABLED",
                        "message": "Account is disabled"
                    }
                }));
            }

            let is_valid = verify(&body.password, &user.password_hash).unwrap_or(false);
            if !is_valid {
                return HttpResponse::Unauthorized().json(serde_json::json!({
                    "success": false,
                    "error": {
                        "code": "INVALID_CREDENTIALS",
                        "message": "Invalid email or password"
                    }
                }));
            }

            // Create session
            let session_id = Uuid::new_v4().to_string();
            let token = create_token(&user.id, &user.role);
            let expires_at = (Utc::now() + Duration::hours(24)).to_rfc3339();

            let insert_result = sqlx::query(
                "INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)",
            )
            .bind(&session_id)
            .bind(&user.id)
            .bind(&token)
            .bind(&expires_at)
            .execute(pool.get_ref())
            .await;

            if let Err(e) = insert_result {
                eprintln!("Failed to insert session: {:?}", e);
                return HttpResponse::InternalServerError().json(serde_json::json!({
                    "success": false,
                    "error": {
                        "code": "INTERNAL_ERROR",
                        "message": "Failed to create session"
                    }
                }));
            }

            // Update last login
            let _ = sqlx::query("UPDATE users SET last_login = datetime('now') WHERE id = ?")
                .bind(&user.id)
                .execute(pool.get_ref())
                .await;

            let cookie = actix_web::cookie::Cookie::build("session_token", token.clone())
                .path("/")
                .http_only(true)
                .finish();

            let response = LoginResponse {
                success: true,
                data: LoginData {
                    user: UserResponse::from(user),
                    token: token.clone(),
                    expires_at,
                },
            };

            HttpResponse::Ok().cookie(cookie).json(response)
        }
        Ok(None) => HttpResponse::Unauthorized().json(serde_json::json!({
            "success": false,
            "error": {
                "code": "INVALID_CREDENTIALS",
                "message": "Invalid email or password"
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

async fn register(pool: web::Data<SqlitePool>, body: web::Json<RegisterRequest>) -> HttpResponse {
    // Validate required fields
    if body.email.is_empty() || body.password.is_empty() || body.first_name.is_empty() || body.last_name.is_empty() {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "success": false,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "All fields are required"
            }
        }));
    }

    // Validate password length
    if body.password.len() < 6 {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "success": false,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Password must be at least 6 characters"
            }
        }));
    }

    // Check if email already exists
    let existing = sqlx::query_as::<_, (String,)>("SELECT id FROM users WHERE email = ?")
        .bind(&body.email)
        .fetch_optional(pool.get_ref())
        .await;

    if let Ok(Some(_)) = existing {
        return HttpResponse::Conflict().json(serde_json::json!({
            "success": false,
            "error": {
                "code": "CONFLICT",
                "message": "Email already exists"
            }
        }));
    }

    // Hash password
    let password_hash = match hash(&body.password, DEFAULT_COST) {
        Ok(h) => h,
        Err(e) => {
            eprintln!("Hashing error: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Failed to hash password"
                }
            }));
        }
    };

    let user_id = Uuid::new_v4().to_string();
    let department = if body.department.is_empty() { "IT".to_string() } else { body.department.clone() };

    // Insert new user with Member role
    let result = sqlx::query(
        "INSERT INTO users (id, email, password_hash, first_name, last_name, department, role, is_active) VALUES (?, ?, ?, ?, ?, ?, 'Member', 1)"
    )
    .bind(&user_id)
    .bind(&body.email)
    .bind(&password_hash)
    .bind(&body.first_name)
    .bind(&body.last_name)
    .bind(&department)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            // Create session for the new user
            let session_id = Uuid::new_v4().to_string();
            let token = create_token(&user_id, "Member");
            let expires_at = (Utc::now() + Duration::hours(24)).to_rfc3339();

            let _ = sqlx::query(
                "INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)",
            )
            .bind(&session_id)
            .bind(&user_id)
            .bind(&token)
            .bind(&expires_at)
            .execute(pool.get_ref())
            .await;

            let cookie = actix_web::cookie::Cookie::build("session_token", token.clone())
                .path("/")
                .http_only(true)
                .finish();

            HttpResponse::Created().cookie(cookie).json(serde_json::json!({
                "success": true,
                "data": {
                    "user": {
                        "id": user_id,
                        "email": body.email,
                        "firstName": body.first_name,
                        "lastName": body.last_name,
                        "department": department,
                        "role": "Member",
                        "isActive": true
                    },
                    "token": token,
                    "expiresAt": expires_at
                }
            }))
        }
        Err(e) => {
            eprintln!("Database error: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Failed to create user"
                }
            }))
        }
    }
}

async fn logout(pool: web::Data<SqlitePool>, req: HttpRequest) -> HttpResponse {
    let token = extract_token(&req);

    let token = match token {
        Some(t) => t,
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "success": false,
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "No session token provided"
                }
            }));
        }
    };

    let result = sqlx::query("DELETE FROM sessions WHERE token = ?")
        .bind(&token)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(rows) => {
            if rows.rows_affected() > 0 {
                let clear_cookie = actix_web::cookie::Cookie::build("session_token", "")
                    .path("/")
                    .max_age(actix_web::cookie::time::Duration::seconds(0))
                    .finish();

                HttpResponse::Ok()
                    .cookie(clear_cookie)
                    .json(serde_json::json!({
                        "success": true,
                        "message": "Successfully logged out"
                    }))
            } else {
                HttpResponse::NotFound().json(serde_json::json!({
                    "success": false,
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Session not found"
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
                    "message": "Failed to logout"
                }
            }))
        }
    }
}

async fn refresh_token(pool: web::Data<SqlitePool>, req: HttpRequest) -> HttpResponse {
    let token = extract_token(&req);

    let token = match token {
        Some(t) => t,
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "success": false,
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "No session token provided"
                }
            }));
        }
    };

    // Find the session and associated user
    let result = sqlx::query_as::<_, (String, String)>(
        "SELECT s.user_id, u.role FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime('now')"
    )
    .bind(&token)
    .fetch_optional(pool.get_ref())
    .await;

    match result {
        Ok(Some((user_id, role))) => {
            // Create new token
            let new_token = create_token(&user_id, &role);
            let new_expires_at = (Utc::now() + Duration::hours(24)).to_rfc3339();

            // Update session with new token
            let update_result =
                sqlx::query("UPDATE sessions SET token = ?, expires_at = ? WHERE token = ?")
                    .bind(&new_token)
                    .bind(&new_expires_at)
                    .bind(&token)
                    .execute(pool.get_ref())
                    .await;

            if let Err(e) = update_result {
                eprintln!("Failed to update session: {:?}", e);
                return HttpResponse::InternalServerError().json(serde_json::json!({
                    "success": false,
                    "error": {
                        "code": "INTERNAL_ERROR",
                        "message": "Failed to refresh token"
                    }
                }));
            }

            let cookie = actix_web::cookie::Cookie::build("session_token", new_token.clone())
                .path("/")
                .http_only(true)
                .finish();

            HttpResponse::Ok().cookie(cookie).json(serde_json::json!({
                "success": true,
                "data": {
                    "token": new_token,
                    "expiresAt": new_expires_at
                }
            }))
        }
        Ok(None) => HttpResponse::Unauthorized().json(serde_json::json!({
            "success": false,
            "error": {
                "code": "UNAUTHORIZED",
                "message": "Invalid or expired session"
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

fn extract_token(req: &HttpRequest) -> Option<String> {
    // Try Authorization header first
    if let Some(auth_header) = req.headers().get("authorization") {
        if let Ok(header_value) = auth_header.to_str() {
            if header_value.starts_with("Bearer ") {
                return Some(header_value.strip_prefix("Bearer ").unwrap().to_string());
            }
        }
    }

    // Try cookie
    if let Some(cookie) = req.cookie("session_token") {
        return Some(cookie.value().to_string());
    }

    None
}
