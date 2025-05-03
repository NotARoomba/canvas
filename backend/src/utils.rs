use mongodb::{ bson::{ doc, oid::ObjectId, Document }, Client, Collection };
use openrouter_api::{ utils, ChatCompletionRequest, OpenRouterClient, Message };
use serde_json::json;
use socketioxide::SocketIo;
use tracing::info;
use std::env;
use crate::types::Difficulty;

#[derive(Debug, Clone)]
pub struct Collections {
    // pub users: Collection<User>,
    pub lessons: Collection<Document>,
}

pub async fn init_database(_io: &SocketIo) -> Result<Collections, String> {
    let uri: String = env::var("MONGODB").expect("MONGODB must be set");
    let client = Client::with_uri_str(uri).await.expect("Failed to connect to MongoDB");
    let canva_db = client.database(
        env::var("CANVA_DATABASE").expect("CANVA_DATABASE must be set").as_str()
    );
    // let users = canva_db.collection(
    //     env::var("USER_COLLECTION").expect("USER_COLLECTION must be set").as_str()
    // ) as Collection<User>;
    let lessons = canva_db.collection(
        env::var("LESSON_COLLECTION").expect("LESSON_COLLECTION must be set").as_str()
    ) as Collection<Document>;
    info!("Connected to MongoDB!");
    Ok(Collections { lessons })
}

//functions for pipeline
pub async fn start_lesson_pipeline(
    prompt: String,
    difficulty: Difficulty,
    id: String,
    collections: Collections
) {
    info!("Starting lesson pipeline for id: {}", id);

    let api_key = match utils::load_api_key_from_env() {
        Ok(key) => key,
        Err(e) => {
            info!("Failed to load API key: {}", e);
            return;
        }
    };

    let client = match
        OpenRouterClient::new()
            .with_base_url("https://openrouter.ai/api/v1/")
            .and_then(|c| c.with_api_key(api_key))
    {
        Ok(c) => c,
        Err(e) => {
            info!("Failed to initialize client: {}", e);
            return;
        }
    };

    let outline_prompt: String = format!(
        "Dado el tema '{}', crea un esquema para explicarlo a un nivel {}. \
        Devuelve un objeto JSON con: \
        - 'title': título general de la lección \
        - 'description': descripción breve de la lección \
        - 'outline': array de objetos, cada uno con 'title' (título del paso) y 'prompt' (instrucción para explicar el paso). \
        La información debe adaptarse al nivel educativo: primaria con pasos simples, universitario con pasos detallados. \
        Evita redundancias. Texto en español sin formato. Solo JSON sin otros textos.",
        prompt,
        Into::<String>::into(difficulty)
    );

    let request = ChatCompletionRequest {
        model: "google/gemini-2.0-flash-lite-001".to_string(),
        messages: vec![Message {
            role: "user".to_string(),
            content: outline_prompt,
            name: None,
            tool_calls: None,
        }],
        stream: None,
        response_format: serde_json
            ::from_value(
                json!({
            "type": "json_schema",
            "json_schema": {
                "name": "outline",
                "strict": true,
                "schema": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "description": {"type": "string"},
                        "outline": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "title": {"type": "string"},
                                    "prompt": {"type": "string"}
                                },
                                "required": ["title", "prompt"],
                                "additionalProperties": false
                            }
                        }
                    },
                    "required": ["title", "description", "outline"],
                    "additionalProperties": false
                }
            }
        })
            )
            .ok(),
        tools: None,
        provider: None,
        models: None,
        transforms: None,
    };

    let chat_api = match client.chat() {
        Ok(api) => api,
        Err(e) => {
            info!("Failed to create chat API: {}", e);
            return;
        }
    };

    let response = match chat_api.chat_completion(request).await {
        Ok(r) => r,
        Err(e) => {
            info!("Outline request failed: {}", e);
            return;
        }
    };

    let raw_content = &response.choices[0].message.content
        .replace("```json", "")
        .replace("```", "");
    info!("Raw outline response: {}", raw_content);

    let parsed_json: serde_json::Value = match serde_json::from_str(raw_content) {
        Ok(v) => v,
        Err(e) => {
            info!("Failed to parse JSON outline: {}", e);
            return;
        }
    };

    // Extract fields from parsed JSON
    let title = parsed_json["title"].as_str().unwrap_or("").to_string();
    let description = parsed_json["description"].as_str().unwrap_or("").to_string();
    let default_outline = Vec::new();
    let outline_array = parsed_json["outline"].as_array().unwrap_or(&default_outline);

    // Convert outline to BSON documents
    let outline_bson: Vec<_> = outline_array
        .iter()
        .filter_map(|step| {
            Some(
                doc! {
            "title": step.get("title")?.as_str()?,
            "prompt": step.get("prompt")?.as_str()?
        }
            )
        })
        .collect();

    // Update lesson with metadata and outline
    collections.lessons
        .update_one(
            doc! { "_id": ObjectId::parse_str(id.clone()).unwrap() },
            doc! {
                "$set": {
                    "title": title,
                    "description": description,
                    "outline": outline_bson
                }
            }
        ).await
        .expect("Failed to update lesson with outline");

    // Process each outline step
    for (i, step) in outline_array.iter().enumerate() {
        let step_prompt = match (step.get("prompt"), step.get("title")) {
            (Some(prompt), Some(title)) => {
                format!(
                    "Explica el paso '{}' según el prompt: '{}'. \
                    Devuelve JSON con 'title' y 'explanation'. \
                    Texto en español sin formato.",
                    title.as_str().unwrap_or(""),
                    prompt.as_str().unwrap_or("")
                )
            }
            _ => {
                info!("Invalid step format at index {}", i);
                continue;
            }
        };

        let detail_request = ChatCompletionRequest {
            model: "google/gemini-2.0-flash-lite-001".to_string(),
            messages: vec![Message {
                role: "user".to_string(),
                content: step_prompt,
                name: None,
                tool_calls: None,
            }],
            stream: None,
            response_format: serde_json
                ::from_value(
                    json!({
                "type": "json_schema",
                "json_schema": {
                    "name": "step",
                    "strict": true,
                    "schema": {
                        "type": "object",
                        "properties": {
                            "title": { "type": "string" },
                            "explanation": { "type": "string" }
                        },
                        "required": ["title", "explanation"],
                        "additionalProperties": false
                    }
                }
            })
                )
                .ok(),
            tools: None,
            provider: None,
            models: None,
            transforms: None,
        };

        let detail_response = match chat_api.chat_completion(detail_request).await {
            Ok(r) => r,
            Err(e) => {
                info!("Detail request for step {} failed: {}", i + 1, e);
                continue;
            }
        };

        let detail_content = &detail_response.choices[0].message.content
            .replace("```json", "")
            .replace("```", "");

        let detail_json: serde_json::Value = match serde_json::from_str(detail_content) {
            Ok(v) => v,
            Err(e) => {
                info!("Failed to parse explanation JSON: {}", e);
                continue;
            }
        };

        // Update lesson with new step
        collections.lessons
            .update_one(
                doc! { "_id": ObjectId::parse_str(id.clone()).unwrap() },
                doc! {
                    "$push": {
                        "steps": {
                            "$each": [{
                                "title": detail_json["title"].as_str().unwrap_or("<Invalid Title>"),
                                "explanation": detail_json["explanation"].as_str().unwrap_or("<Invalid Explanation>")
                            }]
                        }
                    }
                }
            ).await
            .expect("Failed to update lesson with new step");
    }
}
