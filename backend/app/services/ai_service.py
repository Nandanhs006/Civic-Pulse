import random
import base64
import os
import mimetypes
import logging
import httpx
from typing import Dict, Any
from app.core.config import settings

logger = logging.getLogger("app")


class AIService:
    CATEGORIES = [
        "Water",
        "Roads",
        "Education",
        "Health",
        "Sanitation",
        "Public Spaces",
        "Electricity",
        "Safety",
    ]
    SENTIMENTS = ["Positive", "Neutral", "Negative"]

    @classmethod
    def transcribe_audio(cls, file_path: str) -> Dict[str, Any]:
        """
        Whisper translation and transcription service.
        Detects language, transcribes, and translates it.
        """
        # Mock transcripts for fallback or mock mode
        mock_transcripts = [
            {
                "raw_text": "हाम्रो गाउँमा खानेपानीको ठूलो समस्या छ। तीन दिनदेखि पानी आएको छैन।",
                "language_code": "ne",
                "english_translation": "There is a big drinking water problem in our village. Water has not come for three days.",
                "category": "Water",
                "sentiment": "Negative",
                "priority_score": 85,
            },
            {
                "raw_text": "The main road near the high school has deep potholes and is very dangerous for children.",
                "language_code": "en",
                "english_translation": "The main road near the high school has deep potholes and is very dangerous for children.",
                "category": "Roads",
                "sentiment": "Negative",
                "priority_score": 78,
            },
            {
                "raw_text": "We need a local library or community learning center in our ward for youth education.",
                "language_code": "en",
                "english_translation": "We need a local library or community learning center in our ward for youth education.",
                "category": "Education",
                "sentiment": "Neutral",
                "priority_score": 60,
            },
            {
                "raw_text": "स्वास्थ्य चौकीमा डाक्टर नै भेटिदैन। औषधि पनि सकिएको छ भन्छन्।",
                "language_code": "ne",
                "english_translation": "A doctor is not found at the health post. They say medicine is also out of stock.",
                "category": "Health",
                "sentiment": "Negative",
                "priority_score": 90,
            },
        ]

        # Check if we should use the mock pipeline
        if settings.MOCK_AI_PIPELINE or not settings.GEMINI_API_KEY:
            logger.info("Using mock AI transcription pipeline.")
            return random.choice(mock_transcripts)

        # Resolve relative URL path to physical local file path
        local_path = file_path
        if file_path.startswith("/static/"):
            relative_part = file_path.replace("/static/", "", 1)
            local_path = os.path.join(settings.UPLOAD_DIR, relative_part)

        if not os.path.exists(local_path):
            logger.warning(f"File not found at resolved local path: {local_path}. Falling back to mock transcription.")
            return random.choice(mock_transcripts)

        # Determine Mime Type
        mime_type, _ = mimetypes.guess_type(local_path)
        if not mime_type:
            mime_type = "audio/wav"

        # Read binary file and encode to base64
        try:
            with open(local_path, "rb") as f:
                audio_data = base64.b64encode(f.read()).decode("utf-8")
        except Exception as e:
            logger.error(f"Error reading file {local_path}: {e}. Falling back to mock transcription.")
            return random.choice(mock_transcripts)

        # Construct prompt and payload for Gemini API
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
        
        prompt = (
            "You are an AI data ingestion agent for Civic Pulse, an application that tracks citizen requests.\n"
            "Analyze the provided audio recording and perform the following tasks:\n"
            "1. Transcribe the audio precisely in its original language (e.g. English, Nepali, Hindi, etc.).\n"
            "2. Detect the language code of the audio (e.g. 'en', 'ne', 'hi').\n"
            "3. Translate the transcription into English (if it was already in English, it should match the transcription exactly).\n"
            "4. Categorize the issue described into exactly one of the following categories: Water, Roads, Education, Health, Sanitation, Public Spaces, Electricity, Safety, General.\n"
            "5. Determine the sentiment of the speaker/text: Positive, Neutral, Negative.\n"
            "6. Compute a priority score (integer from 10 to 100) representing the urgency/severity of the issue described. For example, open sewage, broken pipes flooding a street, or dangerous road conditions near schools should have high scores (80-100). General requests or constructive feedback should have lower scores (30-60).\n\n"
            "You must return a JSON object with the fields specified in the schema."
        )

        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "inlineData": {
                                "mimeType": mime_type,
                                "data": audio_data
                            }
                        },
                        {
                            "text": prompt
                        }
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": {
                    "type": "OBJECT",
                    "properties": {
                        "raw_text": {"type": "STRING"},
                        "language_code": {"type": "STRING"},
                        "english_translation": {"type": "STRING"},
                        "category": {"type": "STRING", "enum": cls.CATEGORIES + ["General"]},
                        "sentiment": {"type": "STRING", "enum": cls.SENTIMENTS},
                        "priority_score": {"type": "INTEGER"}
                    },
                    "required": ["raw_text", "language_code", "english_translation", "category", "sentiment", "priority_score"]
                }
            }
        }

        try:
            logger.info("Calling Gemini API for audio transcription...")
            with httpx.Client(timeout=30.0) as client:
                response = client.post(url, json=payload)
                response.raise_for_status()
                result_json = response.json()
                
                candidates = result_json.get("candidates", [])
                if not candidates:
                    raise ValueError("No candidates returned from Gemini API")
                
                content_text = candidates[0]["content"]["parts"][0]["text"]
                import json
                parsed_result = json.loads(content_text)
                
                logger.info(f"Gemini API transcription/classification result: {parsed_result}")
                
                priority_score = parsed_result.get("priority_score", 50)
                parsed_result["priority_score"] = min(max(int(priority_score), 10), 100)
                
                return parsed_result
                
        except Exception as e:
            logger.error(f"Error calling Gemini API for audio transcription: {e}. Falling back to mock transcription.")
            return random.choice(mock_transcripts)

    @classmethod
    def analyze_text(cls, text: str, language_code: str = "en") -> Dict[str, Any]:
        """
        NLP service that translates text, classifies it into category/sentiment, and scores it.
        """
        lower_text = text.lower()
        
        # Define fallback heuristics
        def run_heuristics():
            category = "General"
            if any(w in lower_text for w in ["water", "drinking", "pipeline", "tap", "drain", "पानी", "ढल"]):
                category = "Water"
            elif any(w in lower_text for w in ["road", "highway", "pothole", "street", "bridge", "बाटो", "सडक", "पुल"]):
                category = "Roads"
            elif any(w in lower_text for w in ["school", "college", "education", "teacher", "library", "विद्यालय", "शिक्षा"]):
                category = "Education"
            elif any(w in lower_text for w in ["health", "doctor", "clinic", "hospital", "medicine", "अस्पताल", "डाक्टर"]):
                category = "Health"
            elif any(w in lower_text for w in ["toilet", "waste", "garbage", "trash", "sanitation", "फोहोर", "शौचालय"]):
                category = "Sanitation"
            elif any(w in lower_text for w in ["light", "electricity", "power", "grid", "बिजुली", "बत्ती"]):
                category = "Electricity"
            elif any(w in lower_text for w in ["park", "garden", "playground", "community", "पार्क", "खेलमैदान"]):
                category = "Public Spaces"
            elif any(w in lower_text for w in ["safety", "police", "crime", "thief", "security", "सुरक्षा"]):
                category = "Safety"
            else:
                category = random.choice(cls.CATEGORIES)

            sentiment = "Neutral"
            if any(w in lower_text for w in ["bad", "poor", "broken", "danger", "terrible", "worst", "problem", "गार्हो", "समस्या"]):
                sentiment = "Negative"
            elif any(w in lower_text for w in ["good", "great", "excellent", "thanks", "happy", "राम्रो", "धन्यवाद"]):
                sentiment = "Positive"

            priority = 50
            if sentiment == "Negative":
                priority += 20
            if any(w in lower_text for w in ["urgent", "danger", "emergency", "immediately", "accident", "तुरन्त", "खतरा"]):
                priority += 25

            priority = min(max(priority + random.randint(-10, 10), 10), 100)

            return {
                "english_translation": (
                    f"[Translation Model Mock] {text}" if language_code != "en" else text
                ),
                "category": category,
                "sentiment": sentiment,
                "priority_score": priority,
            }

        # Check if we should use mock/heuristics pipeline
        if settings.MOCK_AI_PIPELINE or not settings.GEMINI_API_KEY:
            logger.info("Using mock/heuristic AI text analysis pipeline.")
            return run_heuristics()

        # Construct prompt and payload for Gemini API
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
        
        prompt = (
            "You are an AI data ingestion agent for Civic Pulse, an application that tracks citizen requests.\n"
            f"Analyze the following text input (original language code: '{language_code}'):\n"
            f"\"\"\"\n{text}\n\"\"\"\n\n"
            "Perform the following tasks:\n"
            "1. Copy the raw text precisely as raw_text.\n"
            "2. Detect the language code of the text (e.g. 'en', 'ne', 'hi').\n"
            "3. Translate the text into English (if it was already in English, it should match the input text exactly).\n"
            "4. Categorize the issue described into exactly one of the following categories: Water, Roads, Education, Health, Sanitation, Public Spaces, Electricity, Safety, General.\n"
            "5. Determine the sentiment of the text: Positive, Neutral, Negative.\n"
            "6. Compute a priority score (integer from 10 to 100) representing the urgency/severity of the issue described. For example, open sewage, broken pipes flooding a street, or dangerous road conditions near schools should have high scores (80-100). General requests or constructive feedback should have lower scores (30-60).\n\n"
            "You must return a JSON object with the fields specified in the schema."
        )

        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt
                        }
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": {
                    "type": "OBJECT",
                    "properties": {
                        "raw_text": {"type": "STRING"},
                        "language_code": {"type": "STRING"},
                        "english_translation": {"type": "STRING"},
                        "category": {"type": "STRING", "enum": cls.CATEGORIES + ["General"]},
                        "sentiment": {"type": "STRING", "enum": cls.SENTIMENTS},
                        "priority_score": {"type": "INTEGER"}
                    },
                    "required": ["raw_text", "language_code", "english_translation", "category", "sentiment", "priority_score"]
                }
            }
        }

        try:
            logger.info("Calling Gemini API for text analysis...")
            with httpx.Client(timeout=30.0) as client:
                response = client.post(url, json=payload)
                response.raise_for_status()
                result_json = response.json()
                
                candidates = result_json.get("candidates", [])
                if not candidates:
                    raise ValueError("No candidates returned from Gemini API")
                
                content_text = candidates[0]["content"]["parts"][0]["text"]
                import json
                parsed_result = json.loads(content_text)
                
                logger.info(f"Gemini API text analysis result: {parsed_result}")
                
                priority_score = parsed_result.get("priority_score", 50)
                parsed_result["priority_score"] = min(max(int(priority_score), 10), 100)
                
                return parsed_result
                
        except Exception as e:
            logger.error(f"Error calling Gemini API for text analysis: {e}. Falling back to heuristics.")
            return run_heuristics()


ai_service = AIService()
