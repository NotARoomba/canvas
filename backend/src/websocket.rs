use std::sync::Arc;
use socketioxide::extract::SocketRef;
use tracing::info;

use crate::utils::Collections;

pub fn on_connect(socket: SocketRef, collections: Arc<Collections>) {
    info!("Client connected");
}
