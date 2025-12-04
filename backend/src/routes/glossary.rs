use actix_web::{HttpMessage, HttpRequest, HttpResponse, web};
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::models::glossary::{
    CreateTermRequest, GetTermsQuery, GlossaryCategory, GlossaryTerm, SearchQuery,
    UpdateTermRequest,
};

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/glossary")
            .route("/terms", web::get().to(get_terms))
            .route("/terms", web::post().to(create_term))
            .route("/terms/{term_id}", web::get().to(get_term))
            .route("/terms/{term_id}", web::put().to(update_term))
            .route("/terms/{term_id}", web::delete().to(delete_term))
            .route("/terms/{term_id}/approve", web::post().to(approve_term))
            .route("/categories", web::get().to(get_categories))
            .route("/search", web::get().to(search_terms)),
    );
}

async fn get_terms(pool: web::Data<SqlitePool>, query: web::Query<GetTermsQuery>) -> HttpResponse {
    let mut sql = String::from(
        "SELECT t.id, t.acronym, t.full_name, t.definition, t.category_id, c.name as category_name, t.is_approved, t.created_by, t.created_at, t.updated_at
         FROM glossary_terms t
         LEFT JOIN glossary_categories c ON t.category_id = c.id
         WHERE 1=1"
    );

    if let Some(ref category_id) = query.category_id {
        sql.push_str(&format!(" AND t.category_id = '{}'", category_id));
    }
    if query.approved_only.unwrap_or(false) {
        sql.push_str(" AND t.is_approved = 1");
    }

    sql.push_str(" ORDER BY t.acronym");

    let result = sqlx::query_as::<
        _,
        (
            String,
            String,
            String,
            Option<String>,
            Option<String>,
            Option<String>,
            bool,
            String,
            Option<String>,
            Option<String>,
        ),
    >(&sql)
    .fetch_all(pool.get_ref())
    .await;

    match result {
        Ok(terms) => {
            let terms_json: Vec<serde_json::Value> = terms
                .iter()
                .map(
                    |(
                        id,
                        acronym,
                        full_name,
                        definition,
                        category_id,
                        category_name,
                        is_approved,
                        created_by,
                        created_at,
                        updated_at,
                    )| {
                        serde_json::json!({
                            "id": id,
                            "acronym": acronym,
                            "fullName": full_name,
                            "definition": definition,
                            "categoryId": category_id,
                            "categoryName": category_name,
                            "isApproved": is_approved,
                            "createdBy": created_by,
                            "createdAt": created_at,
                            "updatedAt": updated_at
                        })
                    },
                )
                .collect();

            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": {
                    "terms": terms_json,
                    "total": terms_json.len()
                }
            }))
        }
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

async fn get_term(pool: web::Data<SqlitePool>, path: web::Path<String>) -> HttpResponse {
    let term_id = path.into_inner();

    let result = sqlx::query_as::<_, GlossaryTerm>(
        "SELECT id, term, definition, category_id, department, related_terms, examples, is_approved, created_by, created_at, updated_at FROM glossary_terms WHERE id = ?"
    )
    .bind(&term_id)
    .fetch_optional(pool.get_ref())
    .await;

    match result {
        Ok(Some(term)) => {
            // Get category name
            let category =
                sqlx::query_as::<_, (String,)>("SELECT name FROM glossary_categories WHERE id = ?")
                    .bind(&term.category_id)
                    .fetch_optional(pool.get_ref())
                    .await
                    .ok()
                    .flatten();

            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": {
                    "term": {
                        "id": term.id,
                        "term": term.term,
                        "definition": term.definition,
                        "categoryId": term.category_id,
                        "categoryName": category.map(|(n,)| n),
                        "department": term.department,
                        "relatedTerms": term.related_terms.as_ref().map(|rt| rt.split(',').collect::<Vec<_>>()).unwrap_or_default(),
                        "examples": term.examples.as_ref().map(|e| e.split("|||").collect::<Vec<_>>()).unwrap_or_default(),
                        "isApproved": term.is_approved,
                        "createdBy": term.created_by,
                        "createdAt": term.created_at,
                        "updatedAt": term.updated_at
                    }
                }
            }))
        }
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({
            "success": false,
            "error": {
                "code": "NOT_FOUND",
                "message": "Term not found"
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

async fn create_term(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    body: web::Json<CreateTermRequest>,
) -> HttpResponse {
    let user_id = match req.extensions().get::<String>() {
        Some(id) => id.clone(),
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "success": false,
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "Not authenticated"
                }
            }));
        }
    };

    let term_id = Uuid::new_v4().to_string();

    // category_id from frontend might be a name like "IT" or a UUID
    // If it's not a valid UUID format, set it to NULL
    let category_id: Option<String> = body.category_id.as_ref().and_then(|cid| {
        if Uuid::parse_str(cid).is_ok() {
            Some(cid.clone())
        } else {
            None // Invalid UUID format, store as NULL
        }
    });

    let result = sqlx::query(
        "INSERT INTO glossary_terms (id, acronym, full_name, definition, category_id, created_by, is_approved) VALUES (?, ?, ?, ?, ?, ?, 0)"
    )
    .bind(&term_id)
    .bind(&body.term)
    .bind(&body.term)
    .bind(&body.definition)
    .bind(&category_id)
    .bind(&user_id)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            // Log to glossary_history
            let _ = sqlx::query(
                "INSERT INTO glossary_history (id, term_id, user_id, action, new_value) VALUES (?, ?, ?, 'created', ?)"
            )
            .bind(Uuid::new_v4().to_string())
            .bind(&term_id)
            .bind(&user_id)
            .bind(format!("Term '{}' created", body.term))
            .execute(pool.get_ref())
            .await;

            HttpResponse::Created().json(serde_json::json!({
                "success": true,
                "data": {
                    "term": {
                        "id": term_id,
                        "acronym": body.term,
                        "fullName": body.term,
                        "definition": body.definition,
                        "categoryId": body.category_id,
                        "isApproved": false,
                        "createdBy": user_id
                    }
                }
            }))
        }
        Err(e) => {
            eprintln!("Database error: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Failed to create term"
                }
            }))
        }
    }
}

async fn update_term(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Json<UpdateTermRequest>,
) -> HttpResponse {
    let user_id = match req.extensions().get::<String>() {
        Some(id) => id.clone(),
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "success": false,
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "Not authenticated"
                }
            }));
        }
    };

    let term_id = path.into_inner();

    let mut updates = vec![];
    if let Some(ref term) = body.term {
        updates.push(format!("term = '{}'", term));
    }
    if let Some(ref definition) = body.definition {
        updates.push(format!("definition = '{}'", definition));
    }
    if let Some(ref category_id) = body.category_id {
        updates.push(format!("category_id = '{}'", category_id));
    }
    if let Some(ref department) = body.department {
        updates.push(format!("department = '{}'", department));
    }
    if let Some(ref related_terms) = body.related_terms {
        updates.push(format!("related_terms = '{}'", related_terms.join(",")));
    }
    if let Some(ref examples) = body.examples {
        updates.push(format!("examples = '{}'", examples.join("|||")));
    }

    if updates.is_empty() {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "success": false,
            "error": {
                "code": "BAD_REQUEST",
                "message": "No fields to update"
            }
        }));
    }

    updates.push("updated_at = datetime('now')".to_string());
    let sql = format!(
        "UPDATE glossary_terms SET {} WHERE id = ?",
        updates.join(", ")
    );

    let result = sqlx::query(&sql)
        .bind(&term_id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(rows) => {
            if rows.rows_affected() > 0 {
                // Log to glossary_history
                let _ = sqlx::query(
                    "INSERT INTO glossary_history (id, term_id, action, changed_by, changes) VALUES (?, ?, 'updated', ?, ?)"
                )
                .bind(Uuid::new_v4().to_string())
                .bind(&term_id)
                .bind(&user_id)
                .bind("Term updated")
                .execute(pool.get_ref())
                .await;

                // Fetch updated term
                let term = sqlx::query_as::<_, GlossaryTerm>(
                    "SELECT id, term, definition, category_id, department, related_terms, examples, is_approved, created_by, created_at, updated_at FROM glossary_terms WHERE id = ?"
                )
                .bind(&term_id)
                .fetch_optional(pool.get_ref())
                .await;

                match term {
                    Ok(Some(t)) => HttpResponse::Ok().json(serde_json::json!({
                        "success": true,
                        "data": {
                            "term": {
                                "id": t.id,
                                "term": t.term,
                                "definition": t.definition,
                                "categoryId": t.category_id,
                                "department": t.department,
                                "relatedTerms": t.related_terms.as_ref().map(|rt| rt.split(',').collect::<Vec<_>>()).unwrap_or_default(),
                                "examples": t.examples.as_ref().map(|e| e.split("|||").collect::<Vec<_>>()).unwrap_or_default(),
                                "isApproved": t.is_approved,
                                "createdBy": t.created_by,
                                "updatedAt": t.updated_at
                            }
                        }
                    })),
                    _ => HttpResponse::NotFound().json(serde_json::json!({
                        "success": false,
                        "error": {
                            "code": "NOT_FOUND",
                            "message": "Term not found"
                        }
                    }))
                }
            } else {
                HttpResponse::NotFound().json(serde_json::json!({
                    "success": false,
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Term not found"
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
                    "message": "Failed to update term"
                }
            }))
        }
    }
}

async fn delete_term(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<String>,
) -> HttpResponse {
    let user_id = match req.extensions().get::<String>() {
        Some(id) => id.clone(),
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "success": false,
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "Not authenticated"
                }
            }));
        }
    };

    let term_id = path.into_inner();

    // Log to glossary_history first
    let _ = sqlx::query(
        "INSERT INTO glossary_history (id, term_id, action, changed_by, changes) VALUES (?, ?, 'deleted', ?, 'Term deleted')"
    )
    .bind(Uuid::new_v4().to_string())
    .bind(&term_id)
    .bind(&user_id)
    .execute(pool.get_ref())
    .await;

    let result = sqlx::query("DELETE FROM glossary_terms WHERE id = ?")
        .bind(&term_id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(rows) => {
            if rows.rows_affected() > 0 {
                HttpResponse::Ok().json(serde_json::json!({
                    "success": true,
                    "message": "Term deleted successfully"
                }))
            } else {
                HttpResponse::NotFound().json(serde_json::json!({
                    "success": false,
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Term not found"
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
                    "message": "Failed to delete term"
                }
            }))
        }
    }
}

async fn approve_term(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<String>,
) -> HttpResponse {
    let user_id = match req.extensions().get::<String>() {
        Some(id) => id.clone(),
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "success": false,
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "Not authenticated"
                }
            }));
        }
    };

    let term_id = path.into_inner();

    let result = sqlx::query(
        "UPDATE glossary_terms SET is_approved = 1, updated_at = datetime('now') WHERE id = ?",
    )
    .bind(&term_id)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(rows) => {
            if rows.rows_affected() > 0 {
                // Log to glossary_history
                let _ = sqlx::query(
                    "INSERT INTO glossary_history (id, term_id, action, changed_by, changes) VALUES (?, ?, 'approved', ?, 'Term approved')"
                )
                .bind(Uuid::new_v4().to_string())
                .bind(&term_id)
                .bind(&user_id)
                .execute(pool.get_ref())
                .await;

                HttpResponse::Ok().json(serde_json::json!({
                    "success": true,
                    "message": "Term approved successfully",
                    "data": {
                        "term": {
                            "id": term_id,
                            "isApproved": true
                        }
                    }
                }))
            } else {
                HttpResponse::NotFound().json(serde_json::json!({
                    "success": false,
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Term not found"
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
                    "message": "Failed to approve term"
                }
            }))
        }
    }
}

async fn get_categories(pool: web::Data<SqlitePool>) -> HttpResponse {
    let result = sqlx::query_as::<_, (String, String, i32, Option<String>, Option<String>)>(
        "SELECT id, name, display_order, created_at, updated_at FROM glossary_categories ORDER BY display_order, name"
    )
    .fetch_all(pool.get_ref())
    .await;

    match result {
        Ok(categories) => {
            let categories_json: Vec<serde_json::Value> = categories
                .iter()
                .map(|(id, name, display_order, created_at, updated_at)| {
                    serde_json::json!({
                        "id": id,
                        "name": name,
                        "displayOrder": display_order,
                        "createdAt": created_at,
                        "updatedAt": updated_at
                    })
                })
                .collect();

            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": {
                    "categories": categories_json
                }
            }))
        }
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

async fn search_terms(pool: web::Data<SqlitePool>, query: web::Query<SearchQuery>) -> HttpResponse {
    let search = query.q.as_deref().unwrap_or("");

    if search.is_empty() {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "success": false,
            "error": {
                "code": "BAD_REQUEST",
                "message": "Search query is required"
            }
        }));
    }

    let mut sql = String::from(
        "SELECT t.id, t.term, t.definition, t.category_id, c.name as category_name, t.department
         FROM glossary_terms t
         LEFT JOIN glossary_categories c ON t.category_id = c.id
         WHERE (t.term LIKE ? OR t.definition LIKE ?)",
    );

    if let Some(ref department) = query.department {
        sql.push_str(&format!(
            " AND (t.department = '{}' OR t.department = 'Both')",
            department
        ));
    }

    sql.push_str(" ORDER BY CASE WHEN t.term LIKE ? THEN 0 ELSE 1 END, t.term");
    sql.push_str(&format!(" LIMIT {}", query.limit.unwrap_or(20)));

    let search_pattern = format!("%{}%", search);
    let starts_with = format!("{}%", search);

    let result = sqlx::query_as::<
        _,
        (
            String,
            String,
            String,
            Option<String>,
            Option<String>,
            String,
        ),
    >(&sql)
    .bind(&search_pattern)
    .bind(&search_pattern)
    .bind(&starts_with)
    .fetch_all(pool.get_ref())
    .await;

    match result {
        Ok(terms) => {
            let terms_json: Vec<serde_json::Value> = terms
                .iter()
                .map(
                    |(id, term, definition, category_id, category_name, department)| {
                        serde_json::json!({
                            "id": id,
                            "term": term,
                            "definition": definition,
                            "categoryId": category_id,
                            "categoryName": category_name,
                            "department": department
                        })
                    },
                )
                .collect();

            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "data": {
                    "results": terms_json,
                    "total": terms_json.len()
                }
            }))
        }
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
