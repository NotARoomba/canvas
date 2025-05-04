use std::sync::Arc;

use axum::{ extract::Path, response::{ IntoResponse, Response }, routing::get, Json, Router };
use mongodb::bson::{ doc, oid::ObjectId };
use serde_json::json;
use crate::{ types::StatusCodes, utils::Collections };

pub async fn get_tts(Path(id): Path<String>, collections: &Collections) -> Response {
    if id.len() == 0 {
        return Json(json!({"status": StatusCodes::InvalidID})).into_response();
    }
    let tts = collections.tts
        .find_one(doc! { "_id":  ObjectId::parse_str(id).unwrap() }).await
        .unwrap_or(None);
    match tts.clone() {
        //send the binary data
        Some(tts) => {
            // send raw mp3 with headers
            let data = tts.data;
            let response = axum::response::Response
                ::builder()
                .header("Content-Type", "audio/mpeg")
                .header("Content-Length", data.len())
                .body(axum::body::Body::from(data.to_vec()))
                .unwrap();
            return response;
        }
        None => Json(json!({"status": StatusCodes::AudioNotFound})).into_response(),
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
                move |params| async move { get_tts(params, &*collections).await }
            })
        )
}
