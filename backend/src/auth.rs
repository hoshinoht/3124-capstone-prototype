use actix_web::{dev::ServiceRequest, Error, HttpMessage};
use actix_web_httpauth::extractors::bearer::BearerAuth;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::env;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: i64,       // user id
    pub username: String,
    pub role: String,
    pub exp: usize,     // expiration timestamp
    pub iat: usize,     // issued at timestamp
}

impl Claims {
    pub fn new(user_id: i64, username: String, role: String) -> Self {
        let now = chrono::Utc::now().timestamp() as usize;
        let expiration = env::var("JWT_EXPIRATION")
            .unwrap_or_else(|_| "86400".to_string())
            .parse::<usize>()
            .unwrap_or(86400);

        Claims {
            sub: user_id,
            username,
            role,
            iat: now,
            exp: now + expiration,
        }
    }
}

pub fn create_token(user_id: i64, username: String, role: String) -> Result<String, jsonwebtoken::errors::Error> {
    let claims = Claims::new(user_id, username, role);
    let secret = env::var("JWT_SECRET").expect("JWT_SECRET must be set");
    
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
}

pub fn verify_token(token: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
    let secret = env::var("JWT_SECRET").expect("JWT_SECRET must be set");
    
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )?;
    
    Ok(token_data.claims)
}

pub async fn validator(
    req: ServiceRequest,
    credentials: BearerAuth,
) -> Result<ServiceRequest, (Error, ServiceRequest)> {
    match verify_token(credentials.token()) {
        Ok(claims) => {
            req.extensions_mut().insert(claims);
            Ok(req)
        }
        Err(_) => Err((actix_web::error::ErrorUnauthorized("Invalid token"), req)),
    }
}

// Middleware for checking admin role
pub fn check_admin(claims: &Claims) -> Result<(), actix_web::Error> {
    if claims.role != "admin" {
        return Err(actix_web::error::ErrorForbidden("Admin access required"));
    }
    Ok(())
}
