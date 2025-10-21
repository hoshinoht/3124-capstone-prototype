use actix_web::{web, HttpResponse, HttpRequest};
use sqlx::SqlitePool;
use crate::models::*;
use crate::auth::{create_token, Claims};

// Register new user
pub async fn register(
    pool: web::Data<SqlitePool>,
    user_data: web::Json<CreateUserRequest>,
) -> Result<HttpResponse, actix_web::Error> {
    let password_hash = bcrypt::hash(&user_data.password, bcrypt::DEFAULT_COST)
        .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to hash password"))?;

    let role = user_data.role.clone().unwrap_or_else(|| "user".to_string());

    let result = sqlx::query!(
        r#"
        INSERT INTO users (username, email, password_hash, full_name, department, role)
        VALUES (?, ?, ?, ?, ?, ?)
        "#,
        user_data.username,
        user_data.email,
        password_hash,
        user_data.full_name,
        user_data.department,
        role
    )
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            let user = sqlx::query_as::<_, User>(
                "SELECT * FROM users WHERE username = ?"
            )
            .bind(&user_data.username)
            .fetch_one(pool.get_ref())
            .await
            .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to fetch user"))?;

            Ok(HttpResponse::Created().json(ApiResponse::success(UserResponse::from(user))))
        }
        Err(e) => {
            log::error!("Failed to create user: {:?}", e);
            Ok(HttpResponse::BadRequest().json(ApiResponse::<()>::error(
                "Failed to create user. Username or email may already exist.".to_string()
            )))
        }
    }
}

// Login
pub async fn login(
    pool: web::Data<SqlitePool>,
    credentials: web::Json<LoginRequest>,
) -> Result<HttpResponse, actix_web::Error> {
    let user = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE username = ? AND is_active = 1"
    )
    .bind(&credentials.username)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Database error"))?;

    match user {
        Some(user) => {
            let valid = bcrypt::verify(&credentials.password, &user.password_hash)
                .map_err(|_| actix_web::error::ErrorInternalServerError("Password verification failed"))?;

            if valid {
                let token = create_token(user.id, user.username.clone(), user.role.clone())
                    .map_err(|_| actix_web::error::ErrorInternalServerError("Token creation failed"))?;

                Ok(HttpResponse::Ok().json(ApiResponse::success(LoginResponse {
                    token,
                    user: UserResponse::from(user),
                })))
            } else {
                Ok(HttpResponse::Unauthorized().json(ApiResponse::<()>::error(
                    "Invalid credentials".to_string()
                )))
            }
        }
        None => Ok(HttpResponse::Unauthorized().json(ApiResponse::<()>::error(
            "Invalid credentials".to_string()
        ))),
    }
}

// Get current user info
pub async fn get_current_user(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
) -> Result<HttpResponse, actix_web::Error> {
    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("No token found"))?;

    let user = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE id = ?"
    )
    .bind(claims.sub)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorNotFound("User not found"))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(UserResponse::from(user))))
}

// Get all users (admin only)
pub async fn get_all_users(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
) -> Result<HttpResponse, actix_web::Error> {
    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("No token found"))?;

    crate::auth::check_admin(&claims)?;

    let users = sqlx::query_as::<_, User>(
        "SELECT * FROM users ORDER BY created_at DESC"
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to fetch users"))?;

    let user_responses: Vec<UserResponse> = users.into_iter().map(UserResponse::from).collect();

    Ok(HttpResponse::Ok().json(ApiResponse::success(user_responses)))
}

// Get users by department
pub async fn get_users_by_department(
    pool: web::Data<SqlitePool>,
    department: web::Path<String>,
) -> Result<HttpResponse, actix_web::Error> {
    let users = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE department = ? AND is_active = 1"
    )
    .bind(department.as_str())
    .fetch_all(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to fetch users"))?;

    let user_responses: Vec<UserResponse> = users.into_iter().map(UserResponse::from).collect();

    Ok(HttpResponse::Ok().json(ApiResponse::success(user_responses)))
}
