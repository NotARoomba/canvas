use std::sync::Arc;
use socketioxide::extract::SocketRef;
use tracing::info;

use crate::utils::Collections;

pub fn on_connect(_socket: SocketRef, _collections: Arc<Collections>) {
    info!("Client connected");
}
