use std::{fmt::Binary, sync::Arc};

use axum::{
    extract::Path,
    response::IntoResponse,
    routing::get,
    Json,
    Router,
};
use mongodb::bson::{doc, oid::ObjectId};
use serde_json::json;
use crate::{types::StatusCodes, utils::Collections};

pub async fn get_tts(Path(id): Path<String>, collections: &Collections) -> impl IntoResponse + use<> {
    if id.len() == 0 {
        return Json(json!({"status": StatusCodes::InvalidID}));
    }
    let tts = collections.tts.find_one(doc! { "_id":  ObjectId::parse_str(id).unwrap() }).await.unwrap_or(None);
    match tts.clone() {
        //send the binary data
        Some(tts) => {
            Json(json!({"status": StatusCodes::Success, "tts": tts.data}))
        },
        None => Json(json!({"status": StatusCodes::LessonNotFound})),
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
