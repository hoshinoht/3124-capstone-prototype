use actix_web::{web, HttpResponse, HttpRequest};
use sqlx::SqlitePool;
use crate::models::*;
use crate::auth::Claims;

// Get all glossary categories
pub async fn get_all_categories(
    pool: web::Data<SqlitePool>,
) -> Result<HttpResponse, actix_web::Error> {
    let categories = sqlx::query_as::<_, GlossaryCategory>(
        "SELECT * FROM glossary_categories ORDER BY parent_category_id NULLS FIRST, display_order ASC"
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to fetch categories"))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(categories)))
}

// Create glossary term
pub async fn create_term(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    term_data: web::Json<CreateGlossaryTermRequest>,
) -> Result<HttpResponse, actix_web::Error> {
    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("No token found"))?;

    let examples_json = term_data.examples.as_ref()
        .map(|e| serde_json::to_string(e).unwrap_or_else(|_| "[]".to_string()));
    
    let related_terms_json = term_data.related_terms.as_ref()
        .map(|r| serde_json::to_string(r).unwrap_or_else(|_| "[]".to_string()));

    let result = sqlx::query!(
        r#"
        INSERT INTO glossary_terms (term, abbreviation, definition, category_id, examples, related_terms, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        "#,
        term_data.term,
        term_data.abbreviation,
        term_data.definition,
        term_data.category_id,
        examples_json,
        related_terms_json,
        claims.sub
    )
    .execute(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to create term"))?;

    let term = sqlx::query_as::<_, GlossaryTerm>(
        "SELECT * FROM glossary_terms WHERE id = ?"
    )
    .bind(result.last_insert_rowid())
    .fetch_one(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to fetch created term"))?;

    Ok(HttpResponse::Created().json(ApiResponse::success(term)))
}

// Get all glossary terms
pub async fn get_all_terms(
    pool: web::Data<SqlitePool>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> Result<HttpResponse, actix_web::Error> {
    let mut sql = r#"
        SELECT 
            gt.*,
            gc.name as category_name
        FROM glossary_terms gt
        LEFT JOIN glossary_categories gc ON gt.category_id = gc.id
        WHERE 1=1
    "#.to_string();

    let mut conditions = Vec::new();

    if let Some(category_id) = query.get("category_id") {
        sql.push_str(" AND gt.category_id = ?");
        conditions.push(category_id.clone());
    }

    sql.push_str(" ORDER BY gt.term ASC");

    let mut query_builder = sqlx::query_as::<_, GlossaryTermWithCategory>(&sql);
    for condition in conditions {
        query_builder = query_builder.bind(condition);
    }

    let terms = query_builder
        .fetch_all(pool.get_ref())
        .await
        .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to fetch terms"))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(terms)))
}

// Search glossary terms
pub async fn search_terms(
    pool: web::Data<SqlitePool>,
    search_data: web::Json<SearchGlossaryRequest>,
) -> Result<HttpResponse, actix_web::Error> {
    let search_pattern = format!("%{}%", search_data.query);

    let terms = sqlx::query_as::<_, GlossaryTermWithCategory>(
        r#"
        SELECT 
            gt.*,
            gc.name as category_name
        FROM glossary_terms gt
        LEFT JOIN glossary_categories gc ON gt.category_id = gc.id
        WHERE gt.term LIKE ? 
           OR gt.abbreviation LIKE ?
           OR gt.definition LIKE ?
        ORDER BY 
            CASE 
                WHEN gt.term LIKE ? THEN 1
                WHEN gt.abbreviation LIKE ? THEN 2
                ELSE 3
            END,
            gt.term ASC
        "#
    )
    .bind(&search_pattern)
    .bind(&search_pattern)
    .bind(&search_pattern)
    .bind(format!("{}%", search_data.query))  // Starts with query - highest priority
    .bind(format!("{}%", search_data.query))
    .fetch_all(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to search terms"))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(terms)))
}

// Get term by ID
pub async fn get_term_by_id(
    pool: web::Data<SqlitePool>,
    term_id: web::Path<i64>,
) -> Result<HttpResponse, actix_web::Error> {
    let term = sqlx::query_as::<_, GlossaryTermWithCategory>(
        r#"
        SELECT 
            gt.*,
            gc.name as category_name
        FROM glossary_terms gt
        LEFT JOIN glossary_categories gc ON gt.category_id = gc.id
        WHERE gt.id = ?
        "#
    )
    .bind(term_id.into_inner())
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Database error"))?;

    match term {
        Some(term) => Ok(HttpResponse::Ok().json(ApiResponse::success(term))),
        None => Ok(HttpResponse::NotFound().json(ApiResponse::<()>::error("Term not found".to_string()))),
    }
}

// Update glossary term
pub async fn update_term(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    term_id: web::Path<i64>,
    update_data: web::Json<UpdateGlossaryTermRequest>,
) -> Result<HttpResponse, actix_web::Error> {
    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("No token found"))?;

    let term_id = term_id.into_inner();

    let term = sqlx::query_as::<_, GlossaryTerm>(
        "SELECT * FROM glossary_terms WHERE id = ?"
    )
    .bind(term_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Database error"))?
    .ok_or_else(|| actix_web::error::ErrorNotFound("Term not found"))?;

    // Allow creator and admins to edit
    if term.created_by != claims.sub && claims.role != "admin" {
        return Ok(HttpResponse::Forbidden().json(ApiResponse::<()>::error(
            "You don't have permission to update this term".to_string()
        )));
    }

    let mut updates = Vec::new();
    let mut values: Vec<String> = Vec::new();

    if let Some(term_name) = &update_data.term {
        updates.push("term = ?");
        values.push(term_name.clone());
    }
    if let Some(abbreviation) = &update_data.abbreviation {
        updates.push("abbreviation = ?");
        values.push(abbreviation.clone());
    }
    if let Some(definition) = &update_data.definition {
        updates.push("definition = ?");
        values.push(definition.clone());
    }
    if let Some(category_id) = &update_data.category_id {
        updates.push("category_id = ?");
        values.push(category_id.to_string());
    }
    if let Some(examples) = &update_data.examples {
        updates.push("examples = ?");
        values.push(serde_json::to_string(examples).unwrap_or_else(|_| "[]".to_string()));
    }
    if let Some(related_terms) = &update_data.related_terms {
        updates.push("related_terms = ?");
        values.push(serde_json::to_string(related_terms).unwrap_or_else(|_| "[]".to_string()));
    }

    // Always update updated_by
    updates.push("updated_by = ?");
    values.push(claims.sub.to_string());

    if updates.is_empty() {
        return Ok(HttpResponse::BadRequest().json(ApiResponse::<()>::error(
            "No fields to update".to_string()
        )));
    }

    let sql = format!(
        "UPDATE glossary_terms SET {} WHERE id = ?",
        updates.join(", ")
    );

    let mut query = sqlx::query(&sql);
    for value in values {
        query = query.bind(value);
    }
    query = query.bind(term_id);

    query.execute(pool.get_ref())
        .await
        .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to update term"))?;

    let updated_term = sqlx::query_as::<_, GlossaryTermWithCategory>(
        r#"
        SELECT 
            gt.*,
            gc.name as category_name
        FROM glossary_terms gt
        LEFT JOIN glossary_categories gc ON gt.category_id = gc.id
        WHERE gt.id = ?
        "#
    )
    .bind(term_id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to fetch updated term"))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(updated_term)))
}

// Delete glossary term
pub async fn delete_term(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    term_id: web::Path<i64>,
) -> Result<HttpResponse, actix_web::Error> {
    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("No token found"))?;

    let term_id = term_id.into_inner();

    let term = sqlx::query_as::<_, GlossaryTerm>(
        "SELECT * FROM glossary_terms WHERE id = ?"
    )
    .bind(term_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|_| actix_web::error::ErrorInternalServerError("Database error"))?
    .ok_or_else(|| actix_web::error::ErrorNotFound("Term not found"))?;

    if term.created_by != claims.sub && claims.role != "admin" {
        return Ok(HttpResponse::Forbidden().json(ApiResponse::<()>::error(
            "You don't have permission to delete this term".to_string()
        )));
    }

    sqlx::query("DELETE FROM glossary_terms WHERE id = ?")
        .bind(term_id)
        .execute(pool.get_ref())
        .await
        .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to delete term"))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success("Term deleted successfully")))
}
