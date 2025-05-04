use std::sync::Arc;

use axum::{
    extract::Path,
    response::IntoResponse,
    routing::get,
    Json,
    Router,
};
use futures::StreamExt;
use mongodb::bson::doc;
use serde_json::json;

use crate::{types::StatusCodes, utils::Collections};

pub async fn get_gallery(Path(count): Path<String>, collections: &Collections) -> impl IntoResponse + use<> {
    let count = count.parse::<i64>().unwrap_or(0);
    if count <= 0 {
        return Json(json!({"status": StatusCodes::InvalidData}));
    }
    // get n gallery items from the database whre n = count, us the limit
    let gallery = collections.lessons
        .find(doc! {}).limit(count).await.unwrap();
   let gallery = gallery
        .collect::<Vec<_>>().await
        .into_iter()
        .map(|s| s.unwrap())
        .collect::<Vec<_>>();
    Json(json!({"status": StatusCodes::Success, "gallery": gallery}))
}

pub fn get_routes(collections: Arc<Collections>) -> Router {
    Router::new()
        .route(
            "/gallery/{count}",
            get({
                let collections = Arc::clone(&collections);
                move |params| async move { get_gallery(params, &*collections).await }
            })
        )
}
