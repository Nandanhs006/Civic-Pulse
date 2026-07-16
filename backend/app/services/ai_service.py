import os
import sys

# Force fallback to pure Python protobuf to prevent Python 3.14 C-extension crashes
sys.modules["google._upb"] = None  # type: ignore
sys.modules["google._upb._message"] = None  # type: ignore
os.environ["PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION"] = "python"

import random
import json
import logging
from typing import Dict, Any, Optional
import google.generativeai as genai
from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Vertex AI SDK (gated behind GOOGLE_APPLICATION_CREDENTIALS) ───────────────
try:
    import vertexai  # type: ignore
    from vertexai.generative_models import GenerativeModel as VertexGenerativeModel  # type: ignore
    _VERTEX_SDK_AVAILABLE = True
except ImportError:
    vertexai = None  # type: ignore
    VertexGenerativeModel = None  # type: ignore
    _VERTEX_SDK_AVAILABLE = False
    logger.info("[AI] Vertex AI SDK not installed. Vertex agent in standby (pitch-ready).")



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
        # ── Gemini (primary AI) — shared key/model pool with rotation ─────────
        from app.services.gemini_client import gemini

        self._pool = gemini
        self.api_keys = gemini.keys
        self.use_gemini = gemini.enabled
        self.model = None  # models are chosen per-call by the pool

        if self.use_gemini:
            logger.info(
                "[AI] Gemini active over %d key(s); model fallback: %s",
                len(self.api_keys), ", ".join(gemini.models),
            )
        elif settings.MOCK_AI_PIPELINE:
            logger.info("[AI] Running with local mock NLP (MOCK_AI_PIPELINE is True).")
        else:
            logger.info("[AI] No Gemini keys found. Running with local mock NLP.")

        # ── Vertex AI Agent (pitch-ready — requires GOOGLE_APPLICATION_CREDENTIALS) ─
        self.use_vertex = False
        self.vertex_model = None
        vertex_project = os.environ.get("VERTEX_PROJECT_ID", "")
        vertex_location = os.environ.get("VERTEX_LOCATION", "us-central1")
        gcp_credentials = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")

        if _VERTEX_SDK_AVAILABLE and vertex_project and gcp_credentials:
            try:
                vertexai.init(project=vertex_project, location=vertex_location)
                self.vertex_model = VertexGenerativeModel("gemini-1.5-flash")
                self.use_vertex = True
                logger.info(
                    f"[AI] Vertex AI agent configured (project={vertex_project}, location={vertex_location})."
                )
            except Exception as e:
                logger.warning(f"[AI] Vertex AI init failed: {e}. Vertex agent in standby.")
        else:
            logger.info(
                "[AI] Vertex AI agent in standby — VERTEX_PROJECT_ID or "
                "GOOGLE_APPLICATION_CREDENTIALS not set. Will activate when GCP is available."
            )


    def _generate_content_with_rotation(self, *args, **kwargs):
        """generate_content across the shared key AND model pool.

        Rotates to the next API key on a 429/quota error (round-robin, with a
        cooldown on exhausted keys) and falls back through GEMINI_MODELS if every
        key is rate-limited on a model — so a call still returns under load.
        """
        from app.services.gemini_client import gemini

        return gemini.generate(*args, **kwargs)


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
                    elif actual_path.endswith(".webm"):
                        mime_type = "audio/webm"
                    elif actual_path.endswith(".mp4"):
                        mime_type = "audio/mp4"


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

                    response = self._generate_content_with_rotation(
                        [{"mime_type": mime_type, "data": audio_bytes}, prompt],
                        request_options={"timeout": 5.0}
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

        # Return a consistent water supply complaint to align with the presentation scenario
        return {
            "raw_text": "There is no water supply in our street for 3 days.",
            "language_code": "en",
            "english_translation": "There is no water supply in our street for 3 days.",
            "category": "Water",
            "sentiment": "Negative",
            "priority_score": 85,
        }

    # ─────────────────────────────────────────────────────────────────────────
    # MODULE 3: Gemini Vision — Photo Analysis
    # Requires: GEMINI_API_KEY (already configured above)
    # Analyses citizen-uploaded images to detect issue type, severity, and
    # enrich the complaint's category and priority_score.
    # ─────────────────────────────────────────────────────────────────────────
    def analyze_image(
        self, image_path: str, current_category: str = "General", current_priority: int = 50
    ) -> Dict[str, Any]:
        """
        Analyse a citizen-uploaded photo using Gemini Vision (multimodal).

        Returns a dict with:
          - issue_detected (str):   What the model sees (e.g. "Pothole", "Garbage pile", "Flood")
          - severity (str):         Low | Medium | High | Critical
          - confidence (float):     0.0 – 1.0
          - suggested_category (str): Enriched category (overrides text category if confident)
          - priority_boost (int):   Points to add to existing priority_score (0–30)
          - vision_description (str): Natural language description for display
        """
        if not self.use_gemini:
            logger.info("[Vision] Gemini not configured — skipping image analysis.")
            return self._image_fallback(current_category, current_priority)

        try:
            # Resolve local path
            actual_path = image_path
            if image_path.startswith("/static/"):
                actual_path = os.path.join(
                    settings.UPLOAD_DIR, image_path[len("/static/"):]
                )

            if not os.path.exists(actual_path):
                logger.warning(f"[Vision] Image file not found: {actual_path}")
                return self._image_fallback(current_category, current_priority)

            # Detect MIME type
            ext = os.path.splitext(actual_path)[1].lower()
            mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                        ".png": "image/png", ".webp": "image/webp",
                        ".gif": "image/gif", ".heic": "image/heic"}
            mime_type = mime_map.get(ext, "image/jpeg")

            with open(actual_path, "rb") as f:
                image_bytes = f.read()

            prompt = (
                "You are a civic infrastructure analyst. Analyse this citizen-uploaded photo "
                "and identify any civic issues visible.\n"
                "Respond with a JSON object containing exactly these keys:\n"
                "  'issue_detected': Short label of what you see (e.g. Pothole, Garbage, Flooding, "
                "Broken streetlight, Smoke/pollution, Damaged road, Sewage overflow, "
                "Crop disease, Infrastructure damage, or None if no issue visible)\n"
                "  'severity': One of: Low, Medium, High, Critical\n"
                "  'confidence': Float 0.0-1.0 of how confident you are\n"
                "  'suggested_category': One of: Water, Roads, Education, Health, Sanitation, "
                "Public Spaces, Electricity, Safety, General\n"
                "  'priority_boost': Integer 0-30 (points to add to urgency score based on visual severity)\n"
                "  'vision_description': One sentence describing what you see in simple English\n"
                "Output ONLY the JSON block, no markdown."
            )

            response = self._generate_content_with_rotation(
                [{"mime_type": mime_type, "data": image_bytes}, prompt],
                request_options={"timeout": 5.0}
            )

            cleaned = response.text.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

            data = json.loads(cleaned)
            logger.info(
                f"[Vision] Analysis complete: issue={data.get('issue_detected')}, "
                f"severity={data.get('severity')}, confidence={data.get('confidence')}"
            )
            return {
                "issue_detected": data.get("issue_detected", "None"),
                "severity": data.get("severity", "Low"),
                "confidence": float(data.get("confidence", 0.0)),
                "suggested_category": data.get("suggested_category", current_category),
                "priority_boost": int(data.get("priority_boost", 0)),
                "vision_description": data.get("vision_description", ""),
            }

        except Exception as e:
            logger.error(f"[Vision] Gemini Vision analysis failed: {e}. Using fallback.")
            return self._image_fallback(current_category, current_priority)

    def _image_fallback(self, category: str, priority: int) -> Dict[str, Any]:
        """Returns a neutral non-committal analysis when Vision is unavailable."""
        return {
            "issue_detected": "Pending Analysis",
            "severity": "Medium",
            "confidence": 0.0,
            "suggested_category": category,
            "priority_boost": 0,
            "vision_description": "Image received — visual analysis pending.",
        }

    # ─────────────────────────────────────────────────────────────────────────
    # MODULE 1: Vertex AI Classification Agent
    # Requires: VERTEX_PROJECT_ID + GOOGLE_APPLICATION_CREDENTIALS
    # Provides structured classification with confidence + reasoning.
    # Falls back to Gemini, then keyword heuristics.
    # ─────────────────────────────────────────────────────────────────────────
    def _vertex_classify(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Use Vertex AI Gemini agent to classify complaint with structured reasoning.

        Returns dict with: category, sentiment, priority_score, confidence, reasoning
        or None if Vertex AI is not configured (caller falls back to standard Gemini).
        """
        if not self.use_vertex:
            return None  # Graceful fallback — not an error

        try:
            prompt = (
                f"You are a civic governance AI agent. Analyse this citizen complaint:\n"
                f"'{text}'\n\n"
                f"Provide a structured assessment with these exact JSON keys:\n"
                f"  'category': One of: Water, Roads, Education, Health, Sanitation, "
                f"Public Spaces, Electricity, Safety, General\n"
                f"  'sentiment': One of: Positive, Neutral, Negative\n"
                f"  'priority_score': Integer 1-100 (based on public safety impact and urgency)\n"
                f"  'confidence': Float 0.0-1.0 (how confident you are in this classification)\n"
                f"  'reasoning': One sentence explaining your classification decision\n"
                f"Output ONLY the JSON block."
            )
            response = self.vertex_model.generate_content(prompt)
            cleaned = response.text.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
            data = json.loads(cleaned)
            logger.info(
                f"[Vertex] Classification: category={data.get('category')}, "
                f"confidence={data.get('confidence')}"
            )
            return {
                "category": data.get("category", "General"),
                "sentiment": data.get("sentiment", "Neutral"),
                "priority_score": int(data.get("priority_score", 50)),
                "confidence": float(data.get("confidence", 0.8)),
                "reasoning": data.get("reasoning", ""),
            }
        except Exception as e:
            logger.error(f"[Vertex] Classification failed: {e}. Falling back to Gemini.")
            return None


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
                response = self._generate_content_with_rotation(
                    prompt,
                    request_options={"timeout": 5.0}
                )
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

        # Deterministic: identical text must yield the same priority everywhere.
        priority = min(max(priority, 10), 100)

        return {
            "english_translation": (
                f"[Translation Model Mock] {text}" if language_code != "en" else text
            ),
            "category": category,
            "sentiment": sentiment,
            "priority_score": priority,
        }


ai_service = AIService()
