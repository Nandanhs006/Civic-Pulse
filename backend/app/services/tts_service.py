"""
Cloud Text-to-Speech Service
==============================
Converts complaint confirmation text to audio using Google Cloud TTS API.
Critical for low-literacy rural citizens who need audio acknowledgement of their submissions.

REQUIRES: GOOGLE_APPLICATION_CREDENTIALS + GOOGLE_CLOUD_PROJECT
FALLBACK:  Returns None — caller skips audio confirmation gracefully.

Voice profiles per Indian language:
  - Hindi:    hi-IN-Wavenet-C (Male) / hi-IN-Wavenet-D (Female)
  - Tamil:    ta-IN-Wavenet-C
  - Telugu:   te-IN-Standard-A
  - Bengali:  bn-IN-Wavenet-A
  - English:  en-IN-Wavenet-C

Output: Saves MP3 to uploads/tts/ and returns a /static/tts/ URL.
"""

import os
import uuid
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ── Attempt to load Cloud TTS SDK ─────────────────────────────────────────────
try:
    from google.cloud import texttospeech  # type: ignore
    _TTS_SDK_AVAILABLE = True
except ImportError:
    texttospeech = None  # type: ignore
    _TTS_SDK_AVAILABLE = False
    logger.info("[TTS] google-cloud-texttospeech not installed. TTS in standby.")


# ── Language → WaveNet voice mapping ──────────────────────────────────────────
LANGUAGE_VOICE_MAP = {
    "hi":  ("hi-IN",  "hi-IN-Wavenet-C",   texttospeech.SsmlVoiceGender.MALE   if _TTS_SDK_AVAILABLE else None),
    "ta":  ("ta-IN",  "ta-IN-Wavenet-C",   texttospeech.SsmlVoiceGender.MALE   if _TTS_SDK_AVAILABLE else None),
    "te":  ("te-IN",  "te-IN-Standard-A",  texttospeech.SsmlVoiceGender.FEMALE if _TTS_SDK_AVAILABLE else None),
    "kn":  ("kn-IN",  "kn-IN-Wavenet-A",   texttospeech.SsmlVoiceGender.FEMALE if _TTS_SDK_AVAILABLE else None),
    "ml":  ("ml-IN",  "ml-IN-Wavenet-A",   texttospeech.SsmlVoiceGender.FEMALE if _TTS_SDK_AVAILABLE else None),
    "mr":  ("mr-IN",  "mr-IN-Wavenet-A",   texttospeech.SsmlVoiceGender.FEMALE if _TTS_SDK_AVAILABLE else None),
    "bn":  ("bn-IN",  "bn-IN-Wavenet-A",   texttospeech.SsmlVoiceGender.FEMALE if _TTS_SDK_AVAILABLE else None),
    "gu":  ("gu-IN",  "gu-IN-Wavenet-A",   texttospeech.SsmlVoiceGender.FEMALE if _TTS_SDK_AVAILABLE else None),
    "pa":  ("pa-IN",  "pa-IN-Wavenet-A",   texttospeech.SsmlVoiceGender.FEMALE if _TTS_SDK_AVAILABLE else None),
    "ne":  ("ne-NP",  "ne-NP-Standard-A",  texttospeech.SsmlVoiceGender.FEMALE if _TTS_SDK_AVAILABLE else None),
    "ur":  ("ur-IN",  "ur-IN-Wavenet-A",   texttospeech.SsmlVoiceGender.FEMALE if _TTS_SDK_AVAILABLE else None),
    "en":  ("en-IN",  "en-IN-Wavenet-C",   texttospeech.SsmlVoiceGender.MALE   if _TTS_SDK_AVAILABLE else None),
}

# Default: English (India)
DEFAULT_VOICE = ("en-IN", "en-IN-Wavenet-C")


class TextToSpeechService:
    """
    Google Cloud Text-to-Speech client.

    Generates MP3 audio confirmation messages for citizen complaint submissions.
    Returns a static file URL that the frontend can play back.

    All operations fail gracefully — if TTS is unavailable, the API response
    simply omits the audio_confirmation_url field (None).
    """

    def __init__(self) -> None:
        self.client = None
        credentials_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")

        if not _TTS_SDK_AVAILABLE:
            logger.info("[TTS] SDK not installed. Audio confirmation in standby.")
            return

        if not credentials_path:
            logger.info(
                "[TTS] GOOGLE_APPLICATION_CREDENTIALS not set. "
                "TTS in standby — pitch demo mode. No audio confirmation generated."
            )
            return

        try:
            self.client = texttospeech.TextToSpeechClient()
            logger.info("[TTS] Cloud Text-to-Speech configured. Audio confirmations active.")
        except Exception as e:
            logger.warning(f"[TTS] Failed to initialise TTS client: {e}. Audio confirmation disabled.")

    def is_available(self) -> bool:
        return self.client is not None

    def synthesize(
        self,
        text: str,
        language_code: str = "en",
        upload_dir: str = "uploads",
    ) -> Optional[str]:
        """
        Synthesize text to speech and save as MP3.

        Args:
            text:          The confirmation message to synthesize.
            language_code: Short language code (e.g. 'hi', 'ta', 'en').
            upload_dir:    Base uploads directory (from settings.UPLOAD_DIR).

        Returns:
            Static URL string like /static/tts/abc123.mp3
            or None if TTS is unavailable.
        """
        if not self.is_available():
            return None

        if not text or not text.strip():
            return None

        try:
            lang_config = LANGUAGE_VOICE_MAP.get(language_code, None)
            if lang_config:
                bcp47, voice_name, gender = lang_config
            else:
                bcp47, voice_name = DEFAULT_VOICE
                gender = texttospeech.SsmlVoiceGender.NEUTRAL

            synthesis_input = texttospeech.SynthesisInput(text=text)
            voice = texttospeech.VoiceSelectionParams(
                language_code=bcp47,
                name=voice_name,
                ssml_gender=gender,
            )
            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3,
                speaking_rate=0.9,   # Slightly slower for rural comprehension
                pitch=0.0,
            )

            response = self.client.synthesize_speech(
                input=synthesis_input, voice=voice, audio_config=audio_config
            )

            # Save MP3 to disk
            tts_dir = os.path.join(upload_dir, "tts")
            os.makedirs(tts_dir, exist_ok=True)
            filename = f"{uuid.uuid4()}.mp3"
            file_path = os.path.join(tts_dir, filename)

            with open(file_path, "wb") as f:
                f.write(response.audio_content)

            url = f"/static/tts/{filename}"
            logger.info(f"[TTS] Audio confirmation generated: {url} (lang={language_code})")
            return url

        except Exception as e:
            logger.error(f"[TTS] Speech synthesis failed: {e}. No audio confirmation.")
            return None

    def build_confirmation_message(
        self,
        suggestion_id: str,
        category: str,
        language_code: str = "en",
    ) -> str:
        """
        Build a citizen-friendly confirmation message in the target language.
        Falls back to English template for unsupported languages.
        """
        short_id = suggestion_id[:8].upper()

        templates = {
            "hi": f"आपकी शिकायत {short_id} दर्ज हो गई है। श्रेणी: {category}। हम जल्द ही कार्रवाई करेंगे।",
            "ta": f"உங்கள் புகார் {short_id} பதிவாகியுள்ளது. வகை: {category}. நாங்கள் விரைவில் நடவடிக்கை எடுப்போம்.",
            "te": f"మీ ఫిర్యాదు {short_id} నమోదైంది. వర్గం: {category}. మేము త్వరలో చర్య తీసుకుంటాం.",
            "mr": f"तुमची तक्रार {short_id} नोंदवली गेली आहे. श्रेणी: {category}. आम्ही लवकरच कारवाई करू.",
            "bn": f"আপনার অভিযোগ {short_id} নিবন্ধিত হয়েছে। বিভাগ: {category}। আমরা শীঘ্রই ব্যবস্থা নেব।",
            "gu": f"તમારી ફરિયાદ {short_id} નોંધાઈ ગઈ છે. શ્રેણી: {category}. અમે ટૂંક સમયમાં પગલાં લઈશું.",
            "kn": f"ನಿಮ್ಮ ದೂರು {short_id} ನೋಂದಾಯಿಸಲಾಗಿದೆ. ವರ್ಗ: {category}. ನಾವು ಶೀಘ್ರದಲ್ಲಿ ಕ್ರಮ ತೆಗೆದುಕೊಳ್ಳುತ್ತೇವೆ.",
            "ml": f"നിങ്ങളുടെ പരാതി {short_id} രജിസ്റ്റർ ചെയ്തു. വിഭാഗം: {category}. ഞങ്ങൾ ഉടൻ നടപടി സ്വീകരിക്കും.",
            "pa": f"ਤੁਹਾਡੀ ਸ਼ਿਕਾਇਤ {short_id} ਦਰਜ ਹੋ ਗਈ ਹੈ। ਸ਼੍ਰੇਣੀ: {category}। ਅਸੀਂ ਜਲਦੀ ਕਾਰਵਾਈ ਕਰਾਂਗੇ।",
            "ne": f"तपाईंको उजुरी {short_id} दर्ता भयो। वर्ग: {category}। हामी चाँडै कार्रवाई गर्नेछौं।",
            "en": f"Your complaint {short_id} has been registered. Category: {category}. We will take action shortly.",
        }
        return templates.get(language_code, templates["en"])

    def status_summary(self) -> str:
        if self.is_available():
            return "Cloud Text-to-Speech ✅ (WaveNet voices configured)"
        return "Cloud Text-to-Speech ⏸ (standby — GOOGLE_APPLICATION_CREDENTIALS not set)"


# ── Singleton ──────────────────────────────────────────────────────────────────
tts_service = TextToSpeechService()
