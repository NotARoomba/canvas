use std::sync::Arc;

use axum::{
    body::Body,
    extract::Path,
    response::{ IntoResponse, Response },
    routing::get,
    Json,
    Router,
};
use base64::{ engine::general_purpose, Engine };
use mongodb::bson::{ doc, oid::ObjectId };
use serde_json::json;
use tracing::info;
// use tracing::info;
use crate::{ types::StatusCodes, utils::Collections };

pub async fn get_image(Path(id): Path<String>, collections: &Collections) -> Response {
    if id.len() == 0 {
        return Json(json!({"status": StatusCodes::InvalidID})).into_response();
    }
    let image = collections.images
        .find_one(doc! { "_id":  ObjectId::parse_str(id).unwrap() }).await
        .unwrap_or(None);
    match image.clone() {
        Some(image) => {
            // send raw image with headers
            let base64_data = &image.data;
            if let Some((mime_part, base64_part)) = base64_data.split_once(",") {
                // Extract MIME type from "data:image/png;base64"
                let mime_type = mime_part
                    .strip_prefix("data:")
                    .and_then(|s| s.split_once(";"))
                    .map(|(mime, _)| mime)
                    .unwrap_or("application/octet-stream"); // fallback
                info!("MIME type: {}", mime_type);
                // Decode the base64 data
                let decoded_data = general_purpose::STANDARD
                    .decode(base64_part.as_bytes())
                    .unwrap();

                // Build the HTTP response with dynamic Content-Type
                let response = Response::builder()
                    .header("Content-Type", mime_type)
                    .header("Content-Disposition", "inline")
                    .header("Content-Length", decoded_data.len())
                    .body(axum::body::Body::from(decoded_data))
                    .unwrap();

                // Now `response` is ready to be returned
                return response;
            } else {
                // Handle invalid data URI case
                // e.g., return an error response
                return Json(json!({"status": StatusCodes::GenericError})).into_response();
            }
        }
        None => Json(json!({"status": StatusCodes::GenericError})).into_response(),
    }
}

pub fn get_routes(collections: Arc<Collections>) -> Router {
    Router::new()
        .route(
            "/",
            get(|| async { Json(json!({"status": StatusCodes::Success})) })
        )
        .route(
            "/{id}",
            get({
                let collections = Arc::clone(&collections);
                move |params| async move { get_image(params, &*collections).await }
            })
        )
}
