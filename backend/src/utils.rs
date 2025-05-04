use mongodb::{ bson::{ doc, oid::ObjectId, Document }, Client, Collection };
use openrouter_api::{ api::ChatApi, utils, ChatCompletionRequest, Message, OpenRouterClient };
use reqwest::header;
use serde_json::json;
use socketioxide::SocketIo;
use tracing::info;
use std::env;
use crate::types::{ Difficulty, Image, TTS };
use mongodb::bson::Binary;
use mongodb::bson::spec::BinarySubtype;

#[derive(Debug, Clone)]
pub struct Collections {
    // pub users: Collection<User>,
    pub lessons: Collection<Document>,
    pub images: Collection<Image>,
    pub tts: Collection<TTS>,
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
    let tts = canva_db.collection(
        env::var("TTS_COLLECTION").expect("TTS_COLLECTION must be set").as_str()
    ) as Collection<TTS>;
    info!("Connected to MongoDB!");
    Ok(Collections { lessons, images, tts })
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
        - 'outline': array de objetos, cada uno con 'title' (título del paso), 'media_type' (media que va a generar, los opciones son ['text', 'image'], 'prompt' (instrucción para explicar el paso o generar el imagen), y 'speech' es para generar un texto que dura 10 segundos dando una explicacion sobr el imagen o texto. \
        Si vas a poner un imagen, el 'prompt' debe ser una pregunta o instrucción que se puede responder con una imagen y si incluye texto, debe estar claro en el prompt que texto debe poner o especificar que no va a haber texto. \
        La información debe adaptarse al nivel educativo: primaria con pasos simples, universitario con pasos detallados. Todos deben tener un balance entre imagenes y texto. \
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
                                    "prompt": {"type": "string"},
                                    "speech": {"type": "string"}
                                },
                                "required": ["title", "media_type", "prompt", "speech"],
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

    let wikipedia_url = get_wikipedia_reference(&prompt, &chat_api, &collections, &id).await;
    let wikipedia_images = get_wikipedia_images(&wikipedia_url).await;
    let client = reqwest::Client::new();

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
        let speech = step
            .get("speech")
            .and_then(|v| v.as_str())
            .unwrap_or_default();

        let (image, explanation) = if media_type == "image" {
            if let Some(images) = wikipedia_images.clone() {
                for image in images {
                    if is_relevant_image(image.clone(), step_title) {
                        if let Some(image_url) = get_image_url(&image).await {
                            let explanation = generate_image_explanation(
                                image_url.clone(),
                                api_key.clone()
                            ).await;
                            (Some(image_url), explanation);
                        }
                    }
                }
            }
            // Get OpenAI API key
            let openai_key = match std::env::var("OPENAI_API_KEY") {
                Ok(k) => k,
                Err(_) => {
                    info!("Missing OPENAI_API_KEY environment variable");
                    continue;
                }
            };

            // push a value to the steps array at the position i
            // collections.lessons
            //     .update_one(
            //         doc! { "_id": ObjectId::parse_str(id.clone()).unwrap() },
            //         doc! {
            //             "$push": {
            //                 "steps": {
            //                     "$each": [{
            //                         "title": step_title,
            //                         "explanation": step_prompt_content,
            //                         "image": Option::<String>::None,
            //                         "tts": Option::<String>::None,
            //                         "references": Array::new(),
            //                     }],
            //                     "$position": i as i32
            //                 }
            //             }
            //         }
            //     ).await
            //     .expect("Failed to update lesson with new step");

            // Create HTTP client

            let image_response = match
                client
                    .post("https://api.openai.com/v1/images/generations")
                    .header(header::AUTHORIZATION, format!("Bearer {}", openai_key))
                    .json(
                        &json!({
                    "model": "gpt-image-1",
                    "prompt": format!("Dada la siguiente explicación, genera una imagen que represente visualmente el contenido de forma clara y coherente. Asegúrate de que la imagen esté relacionada directamente con el tema descrito. Explicación: {}", step_prompt_content),
                    "n": 1,
                    "size": "1024x1024",
                    "quality": "low",
                })
                    )
                    .send().await
            {
                Ok(r) => r,
                Err(e) => {
                    info!("File generation failed: {}", e);
                    continue;
                }
            };

            // Parse image response
            // info!("File response: {:?}", image_response);
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

            // let explanation = generate_image_explanation(image_b64.clone(), api_key.clone()).await;
            let explanation = step_prompt_content.to_string();

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

            (Some(image_id), explanation)
        } else {
            // Text-based step
            let text_request = ChatCompletionRequest {
                model: "google/gemini-2.5-flash-preview".to_string(),
                messages: vec![Message {
                    role: "user".to_string(),
                    content: format!(
                        "Explica siguiente paso y da el titulo y hazlo de acuerdo con el prompt y title: '{}' y '{}'. Evita ser redundante. Devuelve el texto en español. Agrega markdown simple como listas/bulleted points o negritas. Devuélvelo como un objeto JSON con un campo de 'explanation' que contenga el explicacion. No incluyas ningún otro texto ni explicaciones. No usas newlines y haz el texto corto y conciso.",
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

        // update step with image and explanation in mongoDB

        info!(
            "Updating lesson with step {}: image: {:?}, explanation: {}",
            i + 1,
            image,
            explanation
        );

        // let result = collections.lessons.update_one(
        //     doc! { "_id": ObjectId::parse_str(id.clone()).unwrap() },
        //     doc! {
        //             "$set": {
        //                 format!("steps.{}.image", i): image.clone(),
        //                 format!("steps.{}.explanation", i): explanation.clone(),
        //             }
        //         }
        // ).await;
        // if result.is_err() {
        //     info!("Failed to update lesson with new step: {}", result.err().unwrap());
        //     continue;
        // }

        let references = gather_references(
            media_type,
            &explanation,
            &wikipedia_url,
            image.as_ref(),
            &client,
            &chat_api
        ).await;
        let tts_api_key = match std::env::var("ELEVENLABS_API_KEY") {
            Ok(k) => k,
            Err(e) => {
                info!("Failed to load ELEVEN LABS API key: {}", e);
                return;
            }
        };
        let tts_id = {
            // Generate TTS audio for text steps
            let tts_response = reqwest::Client
                ::new()
                .post(format!("https://api.elevenlabs.io/v1/text-to-speech/86V9x9hrQds83qf7zaGn"))
                .query(
                    &[
                        ("optimize_streaming_latsency", "0"),
                        ("output_format", "mp3_22050_32"),
                    ]
                )
                .header("xi-api-key", &tts_api_key)
                .json(
                    &json!({
            "text": speech,
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
                "style": 0
            },
            "model_id": "eleven_flash_v2_5"
        })
                )
                .send().await;

            match tts_response {
                Ok(response) => {
                    if response.status().is_success() {
                        let audio_data = response.bytes().await.unwrap_or_default();

                        match
                            collections.tts.insert_one(TTS {
                                data: (Binary {
                                    subtype: BinarySubtype::Generic,
                                    bytes: audio_data.to_vec(),
                                }).bytes,
                            }).await
                        {
                            Ok(result) =>
                                Some(result.inserted_id.as_object_id().unwrap().to_string()),
                            Err(e) => {
                                info!("Failed to insert TTS audio: {}", e);
                                None
                            }
                        }
                    } else {
                        info!("TTS API request failed with status: {}", response.status());
                        None
                    }
                }
                Err(e) => {
                    info!("TTS request failed: {}", e);
                    None
                }
            }
        };

        // Update lesson with tts_id and references
        // collections.lessons
        //     .update_one(
        //         doc! { "_id": ObjectId::parse_str(id.clone()).unwrap() },
        //         doc! {
        //             "$set": {
        //                 format!("steps.{}.tts", i): tts_id.clone(),
        //                 format!("steps.{}.references", i): references.clone(),
        //             }
        //         }
        //     ).await
        //     .expect("Failed to update lesson with new step");
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
                                "explanation": explanation,
                                "speech": speech.to_string(),
                                "tts": tts_id,
                                "references": references,
                            }]
                        }
                    }
                }
            ).await
            .expect("Failed to update lesson with new step");
    }
}

async fn get_wikipedia_reference(
    prompt: &str,
    client: &ChatApi,
    collections: &Collections,
    lesson_id: &str
) -> Option<String> {
    let wiki_prompt =
        format!("Dado el tema '{}', proporciona la URL más relevante de la página de Wikipedia en español. Devuelve un objeto JSON con un campo 'wikipedia_url'. Solo devuelve el objeto JSON.
", prompt);

    let request = ChatCompletionRequest {
        model: "google/gemini-2.0-flash-lite-001".to_string(),
        messages: vec![Message {
            role: "user".to_string(),
            content: wiki_prompt,
            name: None,
            tool_calls: None,
        }],
        response_format: serde_json
            ::from_value(
                json!({
            "type": "json_schema",
            "json_schema": {
                "name": "wikipedia_ref",
                "strict": true,
                "schema": {
                    "type": "object",
                    "properties": {
                        "wikipedia_url": {"type": "string"}
                    },
                    "required": ["wikipedia_url"],
                    "additionalProperties": false
                }
            }
        })
            )
            .ok(),
        stream: Some(false),
        tools: None,
        provider: None,
        models: None,
        transforms: None,
    };

    let response = match client.chat_completion(request).await {
        Ok(r) => r,
        Err(_) => {
            return None;
        }
    };

    let raw_content = response.choices[0].message.content.replace("```json", "").replace("```", "");

    let parsed: serde_json::Value = match serde_json::from_str(&raw_content) {
        Ok(v) => v,
        Err(_) => {
            return None;
        }
    };

    let url = parsed["wikipedia_url"].as_str()?.to_string();

    // Update lesson with Wikipedia URL
    collections.lessons
        .update_one(
            doc! { "_id": ObjectId::parse_str(lesson_id).unwrap() },
            doc! { "$set": { "wikipedia_url": &url } }
        ).await
        .ok()?;

    Some(url)
}

async fn get_wikipedia_images(url: &Option<String>) -> Option<Vec<String>> {
    let page_title = url.as_ref()?.split('/').last()?;
    let api_url =
        format!("https://es.wikipedia.org/w/api.php?action=query&titles={}&prop=images&format=json", page_title);

    let response: serde_json::Value = reqwest::Client
        ::new()
        .get(&api_url)
        .send().await
        .ok()?
        .json().await
        .ok()?;

    response["query"]["pages"]
        .as_object()?
        .values()
        .next()?
        ["images"].as_array()?
        .iter()
        .filter_map(|v| v["title"].as_str())
        .map(|s| s.trim_start_matches("File:").to_string())
        .collect::<Vec<_>>()
        .into()
}

fn is_relevant_image(image_name: String, step_title: &str) -> bool {
    let binding = step_title.to_lowercase();
    let binding = binding.split_whitespace().collect::<Vec<_>>();

    image_name
        .to_lowercase()
        .split(&['_', '-'][..])
        .any(|part| binding.iter().any(|term| part.contains(term)))
        .into()
}

async fn get_image_url(image_name: &str) -> Option<String> {
    let encoded = urlencoding::encode(image_name);
    let api_url =
        format!("https://es.wikipedia.org/w/api.php?action=query&titles=File:{}&prop=imageinfo&iiprop=url&format=json", encoded);

    let response: serde_json::Value = reqwest::Client
        ::new()
        .get(&api_url)
        .send().await
        .ok()?
        .json().await
        .ok()?;

    response["query"]["pages"]
        .as_object()?
        .values()
        .next()?
        ["imageinfo"].as_array()?
        .first()?
        ["url"].as_str()
        .map(|s| s.to_string())
}

async fn generate_image_explanation(image_url: String, api_key: String) -> String {
    let request_body =
        json!({
    "model": "google/gemini-2.5-flash-preview",
    "messages": [{
        "role": "user",
        "content": [
            {
                "type": "text",
                "text": "Explica el siguiente imagen sin titulo. Evita ser redundante. Devuelve el texto en español. No agregas estilos al texto como bold. Devuélvelo como un objeto JSON con un campo de 'explanation' que contenga el explicacion. No incluyas ningún otro texto ni explicaciones. No usas newlines y haz el texto en un solo párrafo."
            },
            {
                "type": "image_url",
                "image_url": {
                    "url": image_url
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

    let client = reqwest::Client::new();

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
            return "".to_string();
        }
    };
    let response_json: serde_json::Value = match response.json().await {
        Ok(j) => j,
        Err(e) => {
            info!("Failed to parse explanation response: {}", e);
            return "".to_string();
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
            return "".to_string();
        }
    };
    explanation_json["explanation"].as_str().unwrap_or("No explanation generated").to_string()
}
async fn gather_references(
    media_type: &str,
    explanation: &str,
    wikipedia_url: &Option<String>,
    image_url: Option<&String>,
    http_client: &reqwest::Client,
    chat_api: &ChatApi
) -> Vec<String> {
    let mut references = Vec::new();

    match media_type {
        "image" => {
            if let Some(url) = image_url {
                if url.starts_with("http") {
                    references.push(url.to_string());
                }
            }
        }
        "text" => {
            if let Some(url) = wikipedia_url {
                if let Some(page_content) = fetch_wikipedia_content(url, http_client).await {
                    let ai_references = analyze_content_with_ai(
                        explanation.into(),
                        page_content,
                        chat_api
                    ).await;
                    references.extend(ai_references);
                }
            }
        }
        _ => {}
    }

    references
}

async fn fetch_wikipedia_content(url: &str, client: &reqwest::Client) -> Option<String> {
    let page_title = url.split('/').last()?;
    let api_url = format!("https://es.wikipedia.org/w/rest.php/v1/page/{}", page_title);

    match client.get(&api_url).header("Accept", "application/json").send().await {
        Ok(response) => {
            let page_data: serde_json::Value = response.json().await.ok()?;
            page_data["source"].as_str().map(|s| s.to_string())
        }
        Err(e) => {
            info!("Wikipedia API failed: {}", e);
            None
        }
    }
}

async fn analyze_content_with_ai(
    explanation: String,
    content: String,
    client: &ChatApi
) -> Vec<String> {
    // Truncate content to fit model context window
    let truncated = truncate_content(content, 10000);

    let prompt = format!(
        "Analiza este contenido de Wikipedia e identifica las referencias relevantes para la explicación. \
Devuelve un objeto JSON con un arreglo 'references' que contenga URLs. Máximo 3 enlaces. Intenta no usar Wikipedia y enfoca en otros fuentes confiables. Sé preciso y evita duplicados. Explicación: {}, Contenido: {}",
        explanation,
        truncated
    );

    let request = ChatCompletionRequest {
        model: "google/gemini-2.0-flash-lite-001".to_string(),
        messages: vec![Message {
            role: "user".to_string(),
            content: prompt,
            name: None,
            tool_calls: None,
        }],
        response_format: serde_json
            ::from_value(
                json!({
            "type": "json_schema",
            "json_schema": {
                "name": "references",
                "strict": true,
                "schema": {
                    "type": "object",
                    "properties": {
                        "references": {
                            "type": "array",
                            "items": {"type": "string"}
                        }
                    },
                    "required": ["references"],
                    "additionalProperties": false
                }
            }
        })
            )
            .ok(),
        stream: Some(false),
        tools: None,
        provider: None,
        models: None,
        transforms: None,
    };

    match client.chat_completion(request).await {
        Ok(response) => {
            let raw = response.choices[0].message.content.replace("```json", "").replace("```", "");

            serde_json
                ::from_str::<serde_json::Value>(&raw)
                .ok()
                .and_then(|v|
                    v["references"].as_array().map(|arr|
                        arr
                            .iter()
                            .filter_map(|v| v.as_str().map(String::from))
                            .collect()
                    )
                )
                .unwrap_or_default()
        }
        Err(e) => {
            info!("AI reference analysis failed: {}", e);
            Vec::new()
        }
    }
}

fn truncate_content(content: String, max_chars: usize) -> String {
    let len = content
        .char_indices()
        .rev()
        .nth(max_chars - 1)
        .map_or(0, |(idx, _ch)| idx);
    let trunicated = content
        .clone()
        .drain(0..len)
        .for_each(|_| {});
    return format!("{:?}", trunicated);
}
