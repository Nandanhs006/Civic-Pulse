"""
Cloud Speech-to-Text v2 Service
================================
Production-grade multilingual audio transcription using Google Cloud STT v2.

REQUIRES: GOOGLE_APPLICATION_CREDENTIALS env var pointing to a GCP service account JSON.
FALLBACK:  If credentials are not set, returns None so the caller can use Gemini inline audio.

Supports: 20+ Indian regional languages, automatic language detection, word-level confidence.
"""

import os
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# ── Attempt to load Cloud Speech SDK (requires: pip install google-cloud-speech) ──
try:
    from google.cloud import speech_v2 as speech  # type: ignore
    from google.api_core.exceptions import GoogleAPICallError  # type: ignore
    _STT_SDK_AVAILABLE = True
except ImportError:
    speech = None  # type: ignore
    _STT_SDK_AVAILABLE = False
    logger.info("[STT] google-cloud-speech not installed. STT module disabled.")


# ── Indian language codes supported by Cloud STT v2 ──
SUPPORTED_LANGUAGE_CODES = [
    "en-IN",   # English (India)
    "hi-IN",   # Hindi
    "ta-IN",   # Tamil
    "te-IN",   # Telugu
    "mr-IN",   # Marathi
    "bn-IN",   # Bengali
    "gu-IN",   # Gujarati
    "kn-IN",   # Kannada
    "ml-IN",   # Malayalam
    "pa-IN",   # Punjabi
    "or-IN",   # Odia
    "as-IN",   # Assamese
    "ne-NP",   # Nepali
    "ur-IN",   # Urdu
]


class SpeechToTextService:
    """
    Google Cloud Speech-to-Text v2 client.

    Gates all functionality behind:
      1. SDK availability (google-cloud-speech installed)
      2. GOOGLE_APPLICATION_CREDENTIALS env var being set
      3. GOOGLE_CLOUD_PROJECT env var being set

    If any of the above is missing, is_available() returns False and the
    caller falls back to Gemini inline audio processing.
    """

    def __init__(self) -> None:
        self.client = None
        self.project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "")
        credentials_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")

        if not _STT_SDK_AVAILABLE:
            logger.info("[STT] SDK not available. Using Gemini inline audio fallback.")
            return

        if not self.project_id or not credentials_path:
            logger.info(
                "[STT] GOOGLE_CLOUD_PROJECT or GOOGLE_APPLICATION_CREDENTIALS not set. "
                "STT module in standby — pitch demo mode. Using Gemini inline audio."
            )
            return

        try:
            self.client = speech.SpeechClient()
            logger.info(
                f"[STT] Cloud Speech-to-Text v2 configured for project: {self.project_id}"
            )
        except Exception as e:
            logger.warning(f"[STT] Failed to initialise STT client: {e}. Gemini fallback active.")

    def is_available(self) -> bool:
        """Returns True only if STT client is fully configured and ready."""
        return self.client is not None and bool(self.project_id)

    def transcribe(self, audio_bytes: bytes, mime_type: str = "audio/wav") -> Optional[Dict[str, Any]]:
        """
        Transcribe audio bytes using Cloud STT v2 with automatic language detection.

        Args:
            audio_bytes: Raw audio file bytes.
            mime_type:   MIME type of the audio file (audio/wav, audio/mp3, audio/ogg, audio/m4a).

        Returns:
            Dict with keys: transcript, language_code, confidence
            or None if STT is unavailable / transcription fails.
        """
        if not self.is_available():
            return None

        # Map MIME types to Cloud STT audio encodings
        encoding_map = {
            "audio/wav":  speech.ExplicitDecodingConfig.AudioEncoding.LINEAR16,
            "audio/mp3":  speech.ExplicitDecodingConfig.AudioEncoding.MP3,
            "audio/mpeg": speech.ExplicitDecodingConfig.AudioEncoding.MP3,
            "audio/ogg":  speech.ExplicitDecodingConfig.AudioEncoding.OGG_OPUS,
            "audio/m4a":  speech.ExplicitDecodingConfig.AudioEncoding.AAC,
        }
        encoding = encoding_map.get(mime_type, speech.ExplicitDecodingConfig.AudioEncoding.LINEAR16)

        try:
            recognizer_name = f"projects/{self.project_id}/locations/global/recognizers/_"

            config = speech.RecognitionConfig(
                auto_decoding_config=speech.AutoDetectDecodingConfig(),
                language_codes=SUPPORTED_LANGUAGE_CODES,
                model="latest_long",
                features=speech.RecognitionFeatures(
                    enable_automatic_punctuation=True,
                    enable_word_confidence=True,
                ),
            )

            request = speech.RecognizeRequest(
                recognizer=recognizer_name,
                config=config,
                content=audio_bytes,
            )

            response = self.client.recognize(request=request)

            if not response.results:
                logger.warning("[STT] No transcription results returned.")
                return None

            # Collect best transcript and detected language
            best_result = response.results[0]
            best_alt = best_result.alternatives[0]

            detected_language = (
                best_result.language_code if hasattr(best_result, "language_code") else "en-IN"
            )
            # Normalise to short code: "hi-IN" → "hi"
            short_lang = detected_language.split("-")[0] if "-" in detected_language else detected_language

            return {
                "transcript": best_alt.transcript,
                "language_code": short_lang,
                "confidence": round(best_alt.confidence, 3),
            }

        except Exception as e:
            logger.error(f"[STT] Cloud Speech-to-Text transcription failed: {e}")
            return None

    def status_summary(self) -> str:
        """Human-readable status string for logging / health checks."""
        if self.is_available():
            return f"Cloud STT v2 ✅ (project={self.project_id})"
        return "Cloud STT v2 ⏸ (standby — GOOGLE_APPLICATION_CREDENTIALS not set)"


# ── Singleton ──────────────────────────────────────────────────────────────────
stt_service = SpeechToTextService()
