mod auth;
mod handlers;
mod models;

use actix_cors::Cors;
use actix_web::{middleware, web, App, HttpServer};
use actix_web_httpauth::middleware::HttpAuthentication;
use sqlx::sqlite::SqlitePoolOptions;
use std::env;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Load environment variables
    dotenv::dotenv().ok();
    env_logger::init();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let host = env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse::<u16>()
        .expect("PORT must be a valid number");

    // Create database pool
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to create pool");

    log::info!("Starting server at http://{}:{}", host, port);

    HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin(
                &env::var("CORS_ORIGIN").unwrap_or_else(|_| "http://localhost:3000".to_string()),
            )
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
            .allowed_headers(vec![
                actix_web::http::header::AUTHORIZATION,
                actix_web::http::header::ACCEPT,
                actix_web::http::header::CONTENT_TYPE,
            ])
            .max_age(3600);

        let bearer_middleware = HttpAuthentication::bearer(auth::validator);

        App::new()
            .app_data(web::Data::new(pool.clone()))
            .wrap(middleware::Logger::default())
            .wrap(cors)
            // Public routes (no authentication required)
            .service(
                web::scope("/api/auth")
                    .route("/register", web::post().to(handlers::auth_handler::register))
                    .route("/login", web::post().to(handlers::auth_handler::login)),
            )
            // Protected routes (authentication required)
            .service(
                web::scope("/api")
                    .wrap(bearer_middleware)
                    // User routes
                    .service(
                        web::scope("/users")
                            .route(
                                "/me",
                                web::get().to(handlers::auth_handler::get_current_user),
                            )
                            .route("", web::get().to(handlers::auth_handler::get_all_users))
                            .route(
                                "/department/{department}",
                                web::get().to(handlers::auth_handler::get_users_by_department),
                            ),
                    )
                    // Calendar routes
                    .service(
                        web::scope("/calendar")
                            .route("", web::post().to(handlers::calendar_handler::create_event))
                            .route("", web::get().to(handlers::calendar_handler::get_events))
                            .route(
                                "/{event_id}",
                                web::get().to(handlers::calendar_handler::get_event_by_id),
                            )
                            .route(
                                "/{event_id}",
                                web::put().to(handlers::calendar_handler::update_event),
                            )
                            .route(
                                "/{event_id}",
                                web::delete().to(handlers::calendar_handler::delete_event),
                            ),
                    )
                    // Equipment routes
                    .service(
                        web::scope("/equipment")
                            .route(
                                "",
                                web::post().to(handlers::equipment_handler::create_equipment),
                            )
                            .route(
                                "",
                                web::get().to(handlers::equipment_handler::get_all_equipment),
                            )
                            .route(
                                "/available",
                                web::get().to(handlers::equipment_handler::get_available_equipment),
                            ),
                    )
                    // Equipment booking routes
                    .service(
                        web::scope("/bookings")
                            .route(
                                "",
                                web::post().to(handlers::equipment_handler::create_booking),
                            )
                            .route(
                                "",
                                web::get().to(handlers::equipment_handler::get_all_bookings),
                            )
                            .route(
                                "/my",
                                web::get().to(handlers::equipment_handler::get_user_bookings),
                            )
                            .route(
                                "/{booking_id}/status",
                                web::put().to(handlers::equipment_handler::update_booking_status),
                            )
                            .route(
                                "/{booking_id}",
                                web::delete().to(handlers::equipment_handler::delete_booking),
                            ),
                    )
                    // Task routes
                    .service(
                        web::scope("/tasks")
                            .route("", web::post().to(handlers::task_handler::create_task))
                            .route("", web::get().to(handlers::task_handler::get_all_tasks))
                            .route(
                                "/urgent",
                                web::get().to(handlers::task_handler::get_urgent_tasks),
                            )
                            .route("/my", web::get().to(handlers::task_handler::get_user_tasks))
                            .route(
                                "/{task_id}",
                                web::get().to(handlers::task_handler::get_task_by_id),
                            )
                            .route(
                                "/{task_id}",
                                web::put().to(handlers::task_handler::update_task),
                            )
                            .route(
                                "/{task_id}",
                                web::delete().to(handlers::task_handler::delete_task),
                            ),
                    )
                    // Personnel status routes
                    .service(
                        web::scope("/personnel")
                            .route(
                                "/status",
                                web::post().to(handlers::personnel_handler::update_status),
                            )
                            .route(
                                "/status",
                                web::get().to(handlers::personnel_handler::get_all_statuses),
                            )
                            .route(
                                "/status/me",
                                web::get().to(handlers::personnel_handler::get_user_status),
                            )
                            .route(
                                "/status/history/{user_id}",
                                web::get().to(handlers::personnel_handler::get_status_history),
                            )
                            .route(
                                "/status/department/{department}",
                                web::get()
                                    .to(handlers::personnel_handler::get_statuses_by_department),
                            ),
                    )
                    // Quick links routes
                    .service(
                        web::scope("/quick-links")
                            .route(
                                "",
                                web::post().to(handlers::quick_link_handler::create_quick_link),
                            )
                            .route(
                                "",
                                web::get().to(handlers::quick_link_handler::get_all_quick_links),
                            )
                            .route(
                                "/pinned",
                                web::get().to(handlers::quick_link_handler::get_pinned_quick_links),
                            )
                            .route(
                                "/{link_id}",
                                web::get().to(handlers::quick_link_handler::get_quick_link_by_id),
                            )
                            .route(
                                "/{link_id}",
                                web::put().to(handlers::quick_link_handler::update_quick_link),
                            )
                            .route(
                                "/{link_id}",
                                web::delete().to(handlers::quick_link_handler::delete_quick_link),
                            ),
                    )
                    // Glossary routes
                    .service(
                        web::scope("/glossary")
                            .route(
                                "/categories",
                                web::get().to(handlers::glossary_handler::get_all_categories),
                            )
                            .route(
                                "/terms",
                                web::post().to(handlers::glossary_handler::create_term),
                            )
                            .route(
                                "/terms",
                                web::get().to(handlers::glossary_handler::get_all_terms),
                            )
                            .route(
                                "/terms/search",
                                web::post().to(handlers::glossary_handler::search_terms),
                            )
                            .route(
                                "/terms/{term_id}",
                                web::get().to(handlers::glossary_handler::get_term_by_id),
                            )
                            .route(
                                "/terms/{term_id}",
                                web::put().to(handlers::glossary_handler::update_term),
                            )
                            .route(
                                "/terms/{term_id}",
                                web::delete().to(handlers::glossary_handler::delete_term),
                            ),
                    ),
            )
            // Health check endpoint
            .route("/health", web::get().to(|| async { "OK" }))
    })
    .bind((host, port))?
    .run()
    .await
}
