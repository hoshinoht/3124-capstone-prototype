use actix_web::{
    Error, HttpMessage,
    dev::{Service, ServiceRequest, ServiceResponse, Transform, forward_ready},
    web,
};
use std::{
    future::{Future, Ready, ready},
    pin::Pin,
    rc::Rc,
};

type LocalBoxFuture<T> = Pin<Box<dyn Future<Output = T> + 'static>>;

/// Utility function to clean up expired sessions
pub async fn cleanup_expired_sessions(pool: &sqlx::SqlitePool) -> Result<u64, sqlx::Error> {
    let query = "DELETE FROM sessions WHERE expires_at <= datetime('now')";
    let result = sqlx::query(query).execute(pool).await?;

    Ok(result.rows_affected())
}

#[derive(Clone)]
pub struct Auth;

impl<S, B> Transform<S, ServiceRequest> for Auth
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = AuthMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(AuthMiddleware {
            service: Rc::new(service),
        }))
    }
}

pub struct AuthMiddleware<S> {
    service: Rc<S>,
}

const WHITELISTED_PATHS: [&str; 4] = [
    "/",
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/refresh",
];

impl<S, B> Service<ServiceRequest> for AuthMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<Result<Self::Response, Self::Error>>;

    forward_ready!(service);
    fn call(&self, req: ServiceRequest) -> Self::Future {
        let service = self.service.clone();
        Box::pin(async move {
            println!("Request: {}", req.path());

            // Skip authentication for OPTIONS preflight requests (CORS)
            if req.method() == actix_web::http::Method::OPTIONS {
                println!("Skipping auth for OPTIONS preflight request");
                let res = service.call(req).await?;
                return Ok(res);
            }

            // Skip authentication for login, register, and root paths
            let path = req.path();
            if WHITELISTED_PATHS.contains(&path) {
                println!("Skipping auth for path: {}", path);
                let res = service.call(req).await?;
                return Ok(res);
            }

            // Get session token from Authorization header (Bearer format) or cookies
            // Priority: Authorization header > session_token cookie
            // This supports both API clients (Bearer token) and web browsers (cookies)
            let session_token = match req.headers().get("authorization") {
                Some(auth_header) => match auth_header.to_str() {
                    Ok(header_value) => {
                        if header_value.starts_with("Bearer ") {
                            let token = header_value.strip_prefix("Bearer ").unwrap();
                            println!("Authorization header found: Bearer {}", token);
                            Some(token.to_string())
                        } else {
                            println!("Invalid Authorization header format (missing Bearer prefix)");
                            None
                        }
                    }
                    Err(_) => {
                        println!("Invalid Authorization header format");
                        None
                    }
                },
                None => {
                    // If no Authorization header, check for session token in cookies
                    match req.headers().get("cookie") {
                        Some(cookie_header) => {
                            if let Ok(cookie_str) = cookie_header.to_str() {
                                // Parse cookies to find session_token
                                let token = cookie_str
                                    .split(';')
                                    .map(|cookie| cookie.trim())
                                    .find(|cookie| cookie.starts_with("session_token="))
                                    .and_then(|cookie: &str| cookie.strip_prefix("session_token="))
                                    .map(|token| token.to_string());

                                if let Some(ref token) = token {
                                    println!("Session token found in cookie: {}", token);
                                } else {
                                    println!("No session_token cookie found");
                                }
                                token
                            } else {
                                println!("Invalid cookie header format");
                                None
                            }
                        }
                        None => {
                            println!("No Authorization header or cookies found!");
                            None
                        }
                    }
                }
            };

            let session_token = match session_token {
                Some(token) => token,
                None => {
                    println!(
                        "Session token missing from both Authorization header and cookies. Please log in."
                    );
                    return Err(Error::from(actix_web::error::ErrorUnauthorized(
                        "Session token missing! Please log in with Authorization header or cookie.",
                    )));
                }
            };

            println!("Session token: {}", session_token);

            // Get database pool
            let pool = req.app_data::<web::Data<sqlx::SqlitePool>>().unwrap();

            // First, clean up any expired sessions (optional cleanup)
            let cleanup_query = "DELETE FROM sessions WHERE expires_at <= datetime('now')";
            let cleanup_result = sqlx::query(cleanup_query).execute(pool.get_ref()).await;

            if let Ok(cleanup_rows) = cleanup_result {
                if cleanup_rows.rows_affected() > 0 {
                    println!(
                        "Cleaned up {} expired sessions",
                        cleanup_rows.rows_affected()
                    );
                }
            }

            // Check if session is valid and not expired
            let query = "SELECT s.token, s.user_id, s.expires_at, u.role 
                         FROM sessions s 
                         JOIN users u ON s.user_id = u.id
                         WHERE s.token = ? AND s.expires_at > datetime('now') AND u.is_active = 1";

            let res = sqlx::query_as::<_, (String, String, String, String)>(query)
                .bind(&session_token)
                .fetch_optional(pool.get_ref())
                .await;

            match res {
                Ok(Some((_, user_id, expires_at, role))) => {
                    let is_admin = role == "Admin";
                    println!(
                        "Authorized! User ID: {}, Role: {}, Session expires: {}",
                        user_id, role, expires_at
                    );

                    // Add user info to request extensions for use in handlers
                    req.extensions_mut().insert(user_id);
                    req.extensions_mut().insert(is_admin);

                    let res = service.call(req).await?;
                    Ok(res)
                }
                Ok(None) => {
                    // Check if the session exists but is expired (for better error messaging)
                    let expired_check_query = "SELECT expires_at FROM sessions WHERE token = ?";
                    let expired_check = sqlx::query_as::<_, (String,)>(expired_check_query)
                        .bind(&session_token)
                        .fetch_optional(pool.get_ref())
                        .await;

                    match expired_check {
                        Ok(Some((expires_at,))) => {
                            println!("Session found but expired at: {}", expires_at);
                            return Err(Error::from(actix_web::error::ErrorUnauthorized(
                                "Session expired! Please log in again.",
                            )));
                        }
                        _ => {
                            println!("Unauthorized! Invalid session token.");
                            return Err(Error::from(actix_web::error::ErrorUnauthorized(
                                "Invalid session! Please log in again.",
                            )));
                        }
                    }
                }
                Err(e) => {
                    println!("Database Error: {}", e);
                    return Err(Error::from(actix_web::error::ErrorInternalServerError(
                        "Database Error",
                    )));
                }
            }
        })
    }
}
