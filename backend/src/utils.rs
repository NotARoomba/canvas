use mongodb::{ bson::{ doc, oid::ObjectId, Document }, Client, Collection };
use openrouter_api::{ utils, ChatCompletionRequest, OpenRouterClient, Message };
use reqwest::header;
use serde_json::json;
use socketioxide::SocketIo;
use tracing::info;
use std::env;
use crate::types::{ Difficulty, Image };

#[derive(Debug, Clone)]
pub struct Collections {
    // pub users: Collection<User>,
    pub lessons: Collection<Document>,
    pub images: Collection<Image>,
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
    let images = canva_db.collection(
        env::var("IMAGE_COLLECTION").expect("IMAGE_COLLECTION must be set").as_str()
    ) as Collection<Image>;
    info!("Connected to MongoDB!");
    Ok(Collections { lessons, images })
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
            .and_then(|c| c.with_api_key(api_key.clone()))
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
        - 'outline': array de objetos, cada uno con 'title' (título del paso), 'media_type' (media que va a generar, los opciones son ['text', 'image'], y 'prompt' (instrucción para explicar el paso o generar el imagen). \
        Si vas a poner un imagen, el 'prompt' debe ser una pregunta o instrucción que se puede responder con una imagen y si incluye texto, debe estar claro en el prompt que texto debe poner o especificar que no va a haber texto. \
        La información debe adaptarse al nivel educativo: primaria con pasos simples y mas imagenes, universitario con pasos detallados. \
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
                                    "media_type": {"type": "string"},
                                    "prompt": {"type": "string"}
                                },
                                "required": ["title", "media_type", "prompt"],
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
            "media_type": step.get("media_type")?.as_str()?,
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
        let step_title = step
            .get("title")
            .and_then(|v| v.as_str())
            .unwrap_or_default();
        let step_prompt_content = step
            .get("prompt")
            .and_then(|v| v.as_str())
            .unwrap_or_default();
        let media_type = step
            .get("media_type")
            .and_then(|v| v.as_str())
            .unwrap_or("text");

        let (image, explanation) = if media_type == "image" {
            // Get OpenAI API key
            let openai_key = match std::env::var("OPENAI_API_KEY") {
                Ok(k) => k,
                Err(_) => {
                    info!("Missing OPENAI_API_KEY environment variable");
                    continue;
                }
            };

            // Create HTTP client
            let client = reqwest::Client::new();

            // Generate image with DALL-E
            let image_response = match
                client
                    .post("https://api.openai.com/v1/images/generations")
                    .header(header::AUTHORIZATION, format!("Bearer {}", openai_key))
                    .json(
                        &json!({
                    "model": "gpt-image-1",
                    "prompt": step_prompt_content,
                    "n": 1,
                    "size": "1024x1024",
                    "quality": "low",
                })
                    )
                    .send().await
            {
                Ok(r) => r,
                Err(e) => {
                    info!("Image generation failed: {}", e);
                    continue;
                }
            };

            // Parse image response
            // info!("Image response: {:?}", image_response);
            let image_json: serde_json::Value = match image_response.json().await {
                Ok(j) => j,
                Err(e) => {
                    info!("Failed to parse image response: {}", e);
                    continue;
                }
            };

            let mut image_b64 = match image_json["data"][0]["b64_json"].as_str() {
                Some(b64) => b64.to_string(),
                None => {
                    info!("Missing base64 image data");
                    continue;
                }
            };

            image_b64 = "data:image/png;base64,".to_string() + &image_b64;
            // Generate explanation using original model
            let client = reqwest::Client::new();
            let request_body =
                json!({
    "model": "google/gemini-2.5-flash-preview",
    "messages": [{
        "role": "user",
        "content": [
            {
                "type": "text",
                "text": "Explica el siguiente imagen."
            },
            {
                "type": "image_url",
                "image_url": {
                    "url": image_b64
                }
            }
        ]
    }],
    "response_format": {
        "type": "json_schema",
        "json_schema": {
            "name": "explanation",
            "strict": true,
            "schema": {
                "type": "object",
                "properties": {
                    "explanation": {"type": "string"}
                },
                "required": ["explanation"],
                "additionalProperties": false
            }
        }
    }
});

            let response = match
                client
                    .post("https://openrouter.ai/api/v1/chat/completions")
                    .header(header::AUTHORIZATION, format!("Bearer {}", api_key))
                    .json(&request_body)
                    .send().await
            {
                Ok(r) => r,
                Err(e) => {
                    info!("Explanation request failed: {}", e);
                    continue;
                }
            };

            let response_json: serde_json::Value = match response.json().await {
                Ok(j) => j,
                Err(e) => {
                    info!("Failed to parse explanation response: {}", e);
                    continue;
                }
            };

            let explanation = response_json["choices"][0]["message"]["content"]
                .as_str()
                .unwrap_or_default()
                .to_string();

            let explanation_json: serde_json::Value = match
                serde_json::from_str(&explanation.replace("```json", "").replace("```", ""))
            {
                Ok(v) => v,
                Err(e) => {
                    info!("Failed to parse explanation JSON: {}", e);
                    continue;
                }
            };

            // upload image to MongoDB
            let image_doc = Image {
                data: image_b64.clone(),
            };
            let image_result = collections.images.insert_one(image_doc).await;
            if image_result.is_err() {
                info!("Failed to upload image to MongoDB: {}", image_result.err().unwrap());
                continue;
            }
            let image_id = image_result.unwrap().inserted_id.as_object_id().unwrap().to_string();

            (
                Some(image_id),
                explanation_json["explanation"]
                    .as_str()
                    .unwrap_or("No explanation generated")
                    .to_string(),
            )
        } else {
            // Text-based step
            let text_request = ChatCompletionRequest {
                model: "google/gemini-2.5-flash-preview".to_string(),
                messages: vec![Message {
                    role: "user".to_string(),
                    content: format!(
                        "Explica siguiente paso y da el titulo y hazlo de acuerdo con el prompt y title: '{}' y '{}'. Evita ser redundante. Devuelve el texto en español. No agregas estilos al texto como bold. Devuélvelo como un objeto JSON con un campo de 'explanation' que contenga el explicacion. No incluyas ningún otro texto ni explicaciones.",
                        step_title,
                        step_prompt_content
                    ),
                    name: None,
                    tool_calls: None,
                }],
                stream: None,
                response_format: serde_json
                    ::from_value(
                        json!({
                    "type": "json_schema",
                    "json_schema": {
                        "name": "explanation",
                        "strict": true,
                        "schema": {
                            "type": "object",
                            "properties": {
                                "explanation": {"type": "string"}
                            },
                            "required": ["explanation"],
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

            let text_response = match chat_api.chat_completion(text_request).await {
                Ok(r) => r,
                Err(e) => {
                    info!("Text explanation failed for step {}: {}", i + 1, e);
                    continue;
                }
            };

            let text_content = &text_response.choices[0].message.content
                .replace("```json", "")
                .replace("```", "");

            let text_json: serde_json::Value = match serde_json::from_str(text_content) {
                Ok(v) => v,
                Err(e) => {
                    info!("Failed to parse text JSON: {}", e);
                    continue;
                }
            };

            (None, text_json["explanation"].as_str().unwrap_or_default().to_string())
        };

        // Update lesson with new step
        collections.lessons
            .update_one(
                doc! { "_id": ObjectId::parse_str(id.clone()).unwrap() },
                doc! {
                    "$push": {
                        "steps": {
                            "$each": [{
                                "title": step_title,
                                "image": if media_type == "image" { 
                                    Some(image) 
                                } else { 
                                    None 
                                },
                                "explanation": explanation
                            }]
                        }
                    }
                }
            ).await
            .expect("Failed to update lesson with new step");
    }
}
