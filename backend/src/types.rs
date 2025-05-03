use std::default;

use mongodb::bson::doc;
use serde::{ Deserialize, Deserializer, Serialize };

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Default)]
pub enum Difficulty {
    Elementary = 0,
    #[default]
    HighSchool = 1,
    University = 2,
}

impl Into<String> for Difficulty {
    fn into(self) -> String {
        match self {
            Difficulty::Elementary => "Elementary".to_string(),
            Difficulty::HighSchool => "High School".to_string(),
            Difficulty::University => "University".to_string(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Default)]
pub struct Lesson {
    pub prompt: String,
    #[serde(deserialize_with = "deserialize_difficulty")]
    pub difficulty: Difficulty,
    #[serde(skip)]
    pub title: String,
    #[serde(skip)]
    pub description: String,
    #[serde(skip)]
    pub outline: Vec<String>,
    #[serde(skip)]
    pub steps: Vec<String>,
}

fn deserialize_difficulty<'de, D>(deserializer: D) -> Result<Difficulty, D::Error>
    where D: Deserializer<'de>
{
    let value: i32 = Deserialize::deserialize(deserializer)?;
    match value {
        0 => Ok(Difficulty::Elementary),
        1 => Ok(Difficulty::HighSchool),
        2 => Ok(Difficulty::University),
        _ => Err(serde::de::Error::custom("Invalid difficulty value")),
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct User {
    pub email: String,
    pub password: String,
    pub name: String,
}

#[derive(Debug, Deserialize, Clone, Copy)]
pub enum StatusCodes {
    Success = 0,
    GenericError = 1,
    InvalidData = 2,
    InvalidNumber = 3,
    InvalidID = 4,
    UserNotFound = 5,
    LessonNotFound = 6,
}

impl Serialize for StatusCodes {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error> where S: serde::Serializer {
        serializer.serialize_u8(*self as u8)
    }
}
