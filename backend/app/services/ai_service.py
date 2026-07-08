import os
import sys

# Force fallback to pure Python protobuf to prevent Python 3.14 C-extension crashes
sys.modules["google._upb"] = None  # type: ignore
sys.modules["google._upb._message"] = None  # type: ignore
os.environ["PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION"] = "python"

import random
import json
import logging
from typing import Dict, Any
import google.generativeai as genai
from app.core.config import settings

logger = logging.getLogger(__name__)


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

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
        self.use_gemini = False
        if self.api_key and not settings.MOCK_AI_PIPELINE:
            try:
                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel("gemini-2.5-flash")
                self.use_gemini = True
                logger.info("[AI] Gemini Generative Model configured successfully.")
            except Exception as e:
                logger.warning(
                    f"[AI] Failed to configure Gemini client: {e}. Falling back to mock NLP."
                )
        else:
            if settings.MOCK_AI_PIPELINE:
                logger.info(
                    "[AI] Running with local mock NLP (MOCK_AI_PIPELINE is True)."
                )
            else:
                logger.info(
                    "[AI] GEMINI_API_KEY not found. Running with local mock NLP."
                )

    def transcribe_audio(self, file_path: str) -> Dict[str, Any]:
        """
        Whisper-like transcription and translation service using Gemini if available.
        Otherwise falls back to mock transcripts.
        """
        if self.use_gemini:
            try:
                # Resolve actual filesystem path
                actual_path = file_path
                if file_path.startswith("/static/"):
                    actual_path = os.path.join(
                        settings.UPLOAD_DIR, file_path[len("/static/") :]
                    )

                # Verify that file exists on disk
                if os.path.exists(actual_path):
                    logger.info(
                        f"[AI] Transcribing audio file using Gemini inline data: {actual_path}"
                    )

                    mime_type = "audio/wav"
                    if actual_path.endswith(".mp3"):
                        mime_type = "audio/mp3"
                    elif actual_path.endswith(".ogg"):
                        mime_type = "audio/ogg"
                    elif actual_path.endswith(".m4a"):
                        mime_type = "audio/m4a"

                    with open(actual_path, "rb") as f:
                        audio_bytes = f.read()

                    prompt = (
                        "Analyze the attached audio file containing a citizen complaint. Perform the following:\n"
                        "1. Transcribe the audio exactly in its original language (as 'raw_text').\n"
                        "2. Detect the language code (e.g. 'en', 'ne', 'hi', etc. as 'language_code').\n"
                        "3. Provide an English translation of the transcription (as 'english_translation'). If already in English, copy raw_text.\n"
                        "4. Classify the complaint into exactly one category: Water, Roads, Education, Health, Sanitation, Public Spaces, Electricity, Safety, or General (as 'category').\n"
                        "5. Track sentiment: Positive, Neutral, or Negative (as 'sentiment').\n"
                        "6. Rate urgency priority score: 1-100 (as 'priority_score').\n\n"
                        "Output strictly a JSON block with keys: 'raw_text', 'language_code', 'english_translation', 'category', 'sentiment', 'priority_score'."
                    )

                    response = self.model.generate_content(
                        [{"mime_type": mime_type, "data": audio_bytes}, prompt]
                    )

                    cleaned_text = response.text.strip()
                    if cleaned_text.startswith("```json"):
                        cleaned_text = cleaned_text[7:]
                    if cleaned_text.endswith("```"):
                        cleaned_text = cleaned_text[:-3]
                    cleaned_text = cleaned_text.strip()
                    data = json.loads(cleaned_text)

                    return {
                        "raw_text": data.get("raw_text", ""),
                        "language_code": data.get("language_code", "en"),
                        "english_translation": data.get("english_translation", ""),
                        "category": data.get("category", "General"),
                        "sentiment": data.get("sentiment", "Neutral"),
                        "priority_score": int(data.get("priority_score", 50)),
                    }
                else:
                    logger.warning(f"[AI] Audio file not found at: {actual_path}")
            except Exception as e:
                logger.error(
                    f"[AI] Gemini audio transcription failed: {e}. Falling back to mock transcription."
                )

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

        # Pick one randomly or construct a basic fallback
        return random.choice(mock_transcripts)

    def analyze_text(self, text: str, language_code: str = "en") -> Dict[str, Any]:
        """
        NLP service that translates text, classifies it into category/sentiment, and scores it.
        Uses Gemini 2.5 Flash if api key is present, otherwise falls back to local regex heuristics.
        """
        if self.use_gemini:
            try:
                prompt = (
                    f"You are a civic prioritization agent. Analyze this citizen complaint: '{text}'. "
                    f"Perform the following: "
                    f"1. English translation (leave as is if already in English) "
                    f"2. Category classification (must be exactly one of: Water, Roads, Education, Health, Sanitation, Public Spaces, Electricity, Safety, General) "
                    f"3. Sentiment tracking (Positive, Neutral, Negative) "
                    f"4. Urgency priority score (1-100 based on danger, public impact, safety risks). "
                    f"Output strictly a JSON block with keys: 'english_translation', 'category', 'sentiment', 'priority_score'."
                )
                response = self.model.generate_content(prompt)
                cleaned_text = response.text.strip()
                if cleaned_text.startswith("```json"):
                    cleaned_text = cleaned_text[7:]
                if cleaned_text.endswith("```"):
                    cleaned_text = cleaned_text[:-3]
                cleaned_text = cleaned_text.strip()
                data = json.loads(cleaned_text)
                return {
                    "english_translation": data.get("english_translation", text),
                    "category": data.get("category", "General"),
                    "sentiment": data.get("sentiment", "Neutral"),
                    "priority_score": int(data.get("priority_score", 50)),
                }
            except Exception as e:
                logger.error(
                    f"[AI] Gemini API processing failed: {e}. Falling back to local heuristics."
                )

        # Local heuristic fallback
        lower_text = text.lower()
        category = "General"

        if any(
            w in lower_text
            for w in ["water", "drinking", "pipeline", "tap", "drain", "पानी", "ढल"]
        ):
            category = "Water"
        elif any(
            w in lower_text
            for w in [
                "road",
                "highway",
                "pothole",
                "street",
                "bridge",
                "बाटो",
                "सडक",
                "पुल",
            ]
        ):
            category = "Roads"
        elif any(
            w in lower_text
            for w in [
                "school",
                "college",
                "education",
                "teacher",
                "library",
                "विद्यालय",
                "शिक्षा",
            ]
        ):
            category = "Education"
        elif any(
            w in lower_text
            for w in [
                "health",
                "doctor",
                "clinic",
                "hospital",
                "medicine",
                "अस्पताल",
                "डाक्टर",
            ]
        ):
            category = "Health"
        elif any(
            w in lower_text
            for w in [
                "toilet",
                "waste",
                "garbage",
                "trash",
                "sanitation",
                "फोहोर",
                "शौचालय",
            ]
        ):
            category = "Sanitation"
        elif any(
            w in lower_text
            for w in ["light", "electricity", "power", "grid", "बिजुली", "बत्ती"]
        ):
            category = "Electricity"
        elif any(
            w in lower_text
            for w in ["park", "garden", "playground", "community", "पार्क", "खेलमैदान"]
        ):
            category = "Public Spaces"
        elif any(
            w in lower_text
            for w in ["safety", "police", "crime", "thief", "security", "सुरक्षा"]
        ):
            category = "Safety"
        else:
            category = random.choice(self.CATEGORIES)

        sentiment = "Neutral"
        if any(
            w in lower_text
            for w in [
                "bad",
                "poor",
                "broken",
                "danger",
                "terrible",
                "worst",
                "problem",
                "गार्हो",
                "समस्या",
            ]
        ):
            sentiment = "Negative"
        elif any(
            w in lower_text
            for w in [
                "good",
                "great",
                "excellent",
                "thanks",
                "happy",
                "राम्रो",
                "धन्यवाद",
            ]
        ):
            sentiment = "Positive"

        priority = 50
        if sentiment == "Negative":
            priority += 20
        if any(
            w in lower_text
            for w in [
                "urgent",
                "danger",
                "emergency",
                "immediately",
                "accident",
                "तुरन्त",
                "खतरा",
            ]
        ):
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


ai_service = AIService()
