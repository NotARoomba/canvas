use std::sync::Arc;

use axum::{
    extract::{ self, Path },
    response::IntoResponse,
    routing::{ get, post },
    Json,
    Router,
};
use mongodb::bson::{doc, oid::ObjectId, Array};
use serde_json::json;
use tokio::task;
use crate::{ types::{ Difficulty, Lesson, StatusCodes }, utils::{start_lesson_pipeline, Collections} };

pub async fn start(
    extract::Json(body): extract::Json<Lesson>,
    collections: &Collections
) -> impl IntoResponse + use<> {
    let report: Lesson = body.into();
    if report.prompt.len() == 0 {
        return Json(json!({"status": StatusCodes::InvalidData}));
    } else if report.difficulty != Difficulty::Elementary && report.difficulty != Difficulty::HighSchool && report.difficulty != Difficulty::University {
        return Json(json!({"status": StatusCodes::InvalidData}));
    }
    let result = collections.lessons.insert_one(doc! {
        "prompt": report.prompt.clone(),
        "difficulty": report.difficulty.clone() as i32,
        "title": "",
        "description": "",
        "outline": Array::new(),
        "steps": Array::new(),
    }).await;
    if result.is_err() {
        return Json(json!({"status": StatusCodes::GenericError}));
    }
    let id = result.as_ref().unwrap().inserted_id.as_object_id().unwrap().to_string();
    task::spawn(start_lesson_pipeline(report.prompt, report.difficulty, id.clone(), collections.clone()));

    return Json(json!({"status": StatusCodes::Success, "id": id}));
}
pub async fn get_lesson(Path(id): Path<String>, collections: &Collections) -> impl IntoResponse + use<> {
    if id.len() == 0 {
        return Json(json!({"status": StatusCodes::InvalidID}));
    }
    let lesson = collections.lessons.find_one(doc! { "_id":  ObjectId::parse_str(id).unwrap() }).await.unwrap_or(None);
    match lesson.clone() {
        Some(lesson) => Json(json!({"status": StatusCodes::Success, "lesson": lesson})),
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
            "/start",
            post({
                let collections = Arc::clone(&collections);
                move |body| async move { start(body, &*collections).await }
            })
        )
        .route(
            "/{id}",
            get({
                let collections = Arc::clone(&collections);
                move |params| async move { get_lesson(params, &*collections).await }
            })
        )
}
