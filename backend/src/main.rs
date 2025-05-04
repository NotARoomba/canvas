use axum::{ extract::Request, routing::get, Router, ServiceExt };
use dotenv::dotenv;
use socketioxide::SocketIo;
use tower::Layer;
use tracing::info;
use std::{ env, sync::Arc };
use tokio::net::TcpListener;
use tracing_subscriber::FmtSubscriber;
use tower_http::{ normalize_path::NormalizePathLayer, cors::CorsLayer };

mod utils;
mod routes;
mod types;
mod websocket;

#[tokio::main]
async fn main() {
    dotenv().ok();

    let _ = tracing::subscriber::set_global_default(FmtSubscriber::default());

    let (layer, io) = SocketIo::new_layer();

    let collections = Arc::new(
        utils::init_database(&io).await.expect("Failed to initialize database")
    );

    io.ns("/", {
        let collections = Arc::clone(&collections);
        move |s| websocket::on_connect(s, collections)
    });

    let cors = CorsLayer::new()
        .allow_origin(tower_http::cors::Any)
        .allow_methods(tower_http::cors::Any)
        .allow_headers(tower_http::cors::Any);

    let app = Router::new()
        .route(
            "/",
            get(|| async { "You're not supposed to be here!" })
        )
        .nest("/lessons", routes::lessons::get_routes(Arc::clone(&collections)))
        .nest("/images", routes::images::get_routes(Arc::clone(&collections)))
        .nest("/tts", routes::tts::get_routes(Arc::clone(&collections)))
        .layer(layer)
        .layer(cors);

    let app = NormalizePathLayer::trim_trailing_slash().layer(app);

    let port = env::var("PORT").unwrap_or_else(|_| "3000".to_string());
    info!("Server running on port {}", port);

    let listener = TcpListener::bind(format!("0.0.0.0:{}", port)).await.expect(
        "Failed to bind to port"
    );
    axum::serve(listener, ServiceExt::<Request>::into_make_service(app)).await.expect(
        "Server error"
    );
}
