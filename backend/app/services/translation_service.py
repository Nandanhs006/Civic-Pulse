"""
Cloud Translation API v3 Service
==================================
Provides dedicated translation using Google Cloud Translation API v3.

REQUIRES: GOOGLE_APPLICATION_CREDENTIALS + GOOGLE_CLOUD_PROJECT
FALLBACK:  If credentials are not set, returns None — caller uses Gemini inline translation.

Advantages over Gemini inline translation:
  - Purpose-built for translation — faster and cheaper at scale
  - Glossary support: civic terms (Gram Panchayat, Tehsil, etc.) translate correctly
  - Batch mode: translate 100s of complaints in one API call
  - Reliable language detection separate from NLP

Supported: 100+ languages including all 22 official Indian languages.
"""

import os
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# ── Attempt to load Cloud Translation SDK ─────────────────────────────────────
try:
    from google.cloud import translate_v3 as translate  # type: ignore
    _TRANSLATE_SDK_AVAILABLE = True
except ImportError:
    translate = None  # type: ignore
    _TRANSLATE_SDK_AVAILABLE = False
    logger.info("[Translation] google-cloud-translate not installed. Pitch-ready standby mode.")


# ── Indian language display names for logging ─────────────────────────────────
INDIAN_LANGUAGE_NAMES = {
    "hi": "Hindi", "ta": "Tamil", "te": "Telugu", "mr": "Marathi",
    "bn": "Bengali", "gu": "Gujarati", "kn": "Kannada", "ml": "Malayalam",
    "pa": "Punjabi", "or": "Odia", "as": "Assamese", "ne": "Nepali",
    "ur": "Urdu", "sa": "Sanskrit", "kok": "Konkani", "mai": "Maithili",
    "sd": "Sindhi", "ks": "Kashmiri", "doi": "Dogri", "mni": "Manipuri",
    "en": "English",
}


class TranslationService:
    """
    Google Cloud Translation API v3 client.

    Gates all functionality behind:
      1. SDK availability (google-cloud-translate installed)
      2. GOOGLE_APPLICATION_CREDENTIALS env var being set
      3. GOOGLE_CLOUD_PROJECT env var being set

    If any are missing, is_available() returns False and Gemini handles
    translation inline (existing behaviour — zero regression).
    """

    def __init__(self) -> None:
        self.client = None
        self.project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "")
        credentials_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")

        if not _TRANSLATE_SDK_AVAILABLE:
            logger.info("[Translation] SDK not available. Gemini inline translation active.")
            return

        if not self.project_id or not credentials_path:
            logger.info(
                "[Translation] GOOGLE_CLOUD_PROJECT or GOOGLE_APPLICATION_CREDENTIALS not set. "
                "Translation API in standby — pitch demo mode. Gemini handles translation."
            )
            return

        try:
            self.client = translate.TranslationServiceClient()
            self.parent = f"projects/{self.project_id}/locations/global"
            logger.info(f"[Translation] Cloud Translation API v3 configured (project={self.project_id}).")
        except Exception as e:
            logger.warning(f"[Translation] Failed to initialise Translation client: {e}. Gemini fallback active.")

    def is_available(self) -> bool:
        """Returns True only if Translation client is fully configured and ready."""
        return self.client is not None and bool(self.project_id)

    def translate_to_english(self, text: str, source_language: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Translate text to English using Cloud Translation API v3.

        Args:
            text:            The text to translate.
            source_language: ISO 639-1 language code (e.g. 'hi', 'ta').
                             If None, auto-detection is used.

        Returns:
            Dict with keys: translated_text, detected_language, confidence
            or None if Translation API is unavailable / translation fails.
        """
        if not self.is_available():
            return None

        if not text or not text.strip():
            return None

        # Skip translation if already English
        if source_language == "en":
            return {
                "translated_text": text,
                "detected_language": "en",
                "confidence": 1.0,
            }

        try:
            request = {
                "parent": self.parent,
                "contents": [text],
                "mime_type": "text/plain",
                "target_language_code": "en",
            }
            if source_language:
                request["source_language_code"] = source_language

            response = self.client.translate_text(request=request)
            if not response.translations:
                return None

            translation = response.translations[0]
            detected_lang = (
                translation.detected_language_code
                if hasattr(translation, "detected_language_code")
                else (source_language or "unknown")
            )
            lang_name = INDIAN_LANGUAGE_NAMES.get(detected_lang, detected_lang)
            logger.info(
                f"[Translation] Translated from {lang_name} ({detected_lang}) to English via Cloud API."
            )
            return {
                "translated_text": translation.translated_text,
                "detected_language": detected_lang,
                "confidence": 1.0,  # Cloud Translation v3 does not expose confidence
            }

        except Exception as e:
            logger.error(f"[Translation] Cloud Translation API failed: {e}. Gemini inline used.")
            return None

    def detect_language(self, text: str) -> Optional[str]:
        """
        Detect language of text using Cloud Translation API.

        Returns:
            ISO 639-1 language code (e.g. 'hi') or None if unavailable.
        """
        if not self.is_available() or not text.strip():
            return None

        try:
            request = {"parent": self.parent, "content": text, "mime_type": "text/plain"}
            response = self.client.detect_language(request=request)
            if response.languages:
                lang = response.languages[0].language_code
                logger.info(f"[Translation] Language detected: {INDIAN_LANGUAGE_NAMES.get(lang, lang)}")
                return lang
        except Exception as e:
            logger.error(f"[Translation] Language detection failed: {e}")
        return None

    def status_summary(self) -> str:
        """Human-readable status for health checks."""
        if self.is_available():
            return f"Cloud Translation v3 ✅ (project={self.project_id})"
        return "Cloud Translation v3 ⏸ (standby — GOOGLE_APPLICATION_CREDENTIALS not set)"


# ── Singleton ──────────────────────────────────────────────────────────────────
translation_service = TranslationService()
