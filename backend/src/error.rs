use actix_web::{HttpResponse, ResponseError};
use derive_more::Display;
use sqlx::Error as SqlxError;

#[derive(Debug, Display)]
pub enum AppError {
    #[display(fmt = "Database Error: {}", _0)]
    Database(SqlxError),

    #[display(fmt = "Not Found: {}", _0)]
    NotFound(String),

    #[display(fmt = "Mutex Lock Error: {}", _0)]
    LockError(String),

    #[display(fmt = "{}", _0)]
    BadRequest(String),

    #[display(fmt = "Forbidden: {}", _0)]
    Forbidden(String),
}

impl std::error::Error for AppError {}
impl ResponseError for AppError {
    fn error_response(&self) -> HttpResponse {
        match self {
            AppError::Database(_) => HttpResponse::InternalServerError().body("Database Error"),
            AppError::NotFound(msg) => HttpResponse::NotFound().body(msg.clone()),
            AppError::LockError(_) => HttpResponse::InternalServerError().body("Mutex Lock Error"),
            AppError::BadRequest(msg) => HttpResponse::BadRequest().body(msg.clone()),
            AppError::Forbidden(msg) => HttpResponse::Forbidden().body(msg.clone()),
        }
    }
}

impl<T> From<std::sync::PoisonError<T>> for AppError {
    fn from(err: std::sync::PoisonError<T>) -> Self {
        AppError::LockError(err.to_string())
    }
}
