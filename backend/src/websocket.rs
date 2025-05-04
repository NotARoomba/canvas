use std::sync::Arc;
use mongodb::bson::{ doc, oid::ObjectId };
use socketioxide::extract::{ AckSender, Data, SocketRef };
use tracing::info;

use crate::{ types::WebSocketEvents, utils::Collections };

pub fn on_connect(socket: SocketRef, collections: Arc<Collections>) {
    info!("Client connected");
    socket.emit(WebSocketEvents::UpdateLessonData.as_ref(), &0).ok();
    socket.on(
        WebSocketEvents::RequestLessonData.as_ref(),
        move |socket: SocketRef, Data::<String>(id), ack: AckSender| async move {
            info!(id = id.as_str(), "Received lesson data");
            let socket_id = socket.id.to_string();
            info!("Socket {} joined lesson {}", socket_id, id);
            socket.join(id.clone());
            let lesson = collections.lessons
                .find_one(doc! { "_id": ObjectId::parse_str(id).unwrap() }).await
                .unwrap();
            if lesson.is_none() {
                ack.send("").ok();
                return;
            } else {
                ack.send(&lesson.unwrap()).ok();
            }
        }
    );
    socket.on_disconnect(move |socket: SocketRef| {
        info!("Client disconnected {}", socket.id.to_string());
        let socket_id = socket.id.to_string();
        info!("Socket {} left lesson", socket_id);
        socket.leave_all();
    });
}
