mod middleware {
    pub mod auth;
    pub mod logging;
}
mod error;
mod models {
    pub mod equipment;
    pub mod events;
    pub mod glossary;
    pub mod locations;
    pub mod notifications;
    pub mod quick_links;
    pub mod sessions;
    pub mod tasks;
    pub mod users;
}

mod routes {
    pub mod auth;
    pub mod dashboard;
    pub mod equipment;
    pub mod events;
    pub mod glossary;
    pub mod locations;
    pub mod notifications;
    pub mod quick_links;
    pub mod search;
    pub mod tasks;
    pub mod users;
}

use actix_cors::Cors;
use actix_web::{App, HttpServer, web};
use log::info;
use middleware::{auth::Auth, logging::Logger};
use routes::{
    auth, dashboard, equipment, events, glossary, locations, notifications, quick_links, search,
    tasks, users,
};

use sqlx::SqlitePool;
use tokio::time::{Duration, interval};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init();
    info!("Starting the IT-Engineering Collaboration Dashboard server...");

    let db_pool = SqlitePool::connect("sqlite://database.db")
        .await
        .expect("Failed to connect to SQLite database");
    let db_pool = web::Data::new(db_pool);

    // Perform initial cleanup of expired sessions
    info!("Performing initial cleanup of expired sessions...");
    match middleware::auth::cleanup_expired_sessions(db_pool.get_ref()).await {
        Ok(cleaned_count) => {
            if cleaned_count > 0 {
                info!("Cleaned up {} expired sessions on startup", cleaned_count);
            } else {
                info!("No expired sessions found on startup");
            }
        }
        Err(e) => {
            eprintln!("Failed to cleanup expired sessions on startup: {}", e);
        }
    }

    // Start background task for periodic session cleanup
    let db_pool_for_cleanup = db_pool.clone();
    tokio::spawn(async move {
        let mut interval = interval(Duration::from_secs(3600)); // Run every hour
        loop {
            interval.tick().await;
            match middleware::auth::cleanup_expired_sessions(db_pool_for_cleanup.get_ref()).await {
                Ok(cleaned_count) => {
                    if cleaned_count > 0 {
                        info!(
                            "Periodic cleanup: removed {} expired sessions",
                            cleaned_count
                        );
                    }
                }
                Err(e) => {
                    eprintln!("Periodic session cleanup failed: {}", e);
                }
            }
        }
    });

    info!("Session cleanup background task started (runs every hour)");

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .supports_credentials();

        App::new()
            .app_data(db_pool.clone())
            .wrap(cors)
            .wrap(Logger)
            .wrap(Auth)
            .service(
                web::scope("/api")
                    .configure(auth::configure_routes)
                    .configure(dashboard::configure_routes)
                    .configure(users::configure_routes)
                    .configure(events::configure_routes)
                    .configure(tasks::configure_routes)
                    .configure(equipment::configure_routes)
                    .configure(locations::configure_routes)
                    .configure(quick_links::configure_routes)
                    .configure(glossary::configure_routes)
                    .configure(notifications::configure_routes)
                    .configure(search::configure_routes),
            )
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
