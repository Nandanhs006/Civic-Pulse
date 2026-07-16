import os
from typing import List, Union
from pydantic import BeforeValidator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing_extensions import Annotated


def parse_cors(v: Union[str, List[str]]) -> List[str]:
    if isinstance(v, str) and not v.startswith("["):
        return [i.strip() for i in v.split(",")]
    elif isinstance(v, list):
        return v
    elif isinstance(v, str):
        import json

        parsed = json.loads(v)
        if isinstance(parsed, list):
            return [str(item) for item in parsed]
    raise ValueError(v)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_ignore_empty=False, extra="ignore"
    )

    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Civic Pulse - People's Priorities"

    # CORS Origins configuration. Same-origin deploys (Render single service) don't
    # need these, but a split Firebase-Hosting-frontend + Render-backend setup does:
    # the SPA calls the backend cross-origin, so the Hosting domains must be allowed.
    # Override via the BACKEND_CORS_ORIGINS env var (comma-separated) for other hosts.
    BACKEND_CORS_ORIGINS: Annotated[List[str], BeforeValidator(parse_cors)] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://civic-pulse-7af0f.web.app",
        "https://civic-pulse-7af0f.firebaseapp.com",
    ]

    # Security configuration
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY", "super-secret-token-key-for-civic-pulse-123456"
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days

    # Postgres config. Either set DATABASE_URL to a full connection string (e.g.
    # Supabase / Neon — persistent, unlike Render's 90-day free DB) OR set the
    # individual POSTGRES_* vars. DATABASE_URL takes precedence when present.
    DATABASE_URL_OVERRIDE: str | None = os.getenv("DATABASE_URL")
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "civic_pulse")

    @property
    def DATABASE_URL(self) -> str:
        if self.DATABASE_URL_OVERRIDE:
            # SQLAlchemy needs the postgresql:// scheme (Supabase copies as this).
            url = self.DATABASE_URL_OVERRIDE
            if url.startswith("postgres://"):
                url = "postgresql://" + url[len("postgres://"):]
            return url
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}/{self.POSTGRES_DB}"

    # data.gov.in open-data API (CPCB air quality, etc.). Defaults to the public
    # sample key (rate-limited/shared) — set DATA_GOV_API_KEY to your own key.
    DATA_GOV_API_KEY: str = os.getenv(
        "DATA_GOV_API_KEY",
        "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b",
    )

    # Redis config
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))

    # Rate limiting (per client IP). Override via env vars.
    RATE_LIMIT_SUBMISSION_MAX: int = int(os.getenv("RATE_LIMIT_SUBMISSION_MAX", "60"))
    RATE_LIMIT_SUBMISSION_WINDOW: int = int(
        os.getenv("RATE_LIMIT_SUBMISSION_WINDOW", "3600")
    )
    RATE_LIMIT_API_MAX: int = int(os.getenv("RATE_LIMIT_API_MAX", "300"))
    RATE_LIMIT_API_WINDOW: int = int(os.getenv("RATE_LIMIT_API_WINDOW", "60"))

    # AI Mock Config
    MOCK_AI_PIPELINE: bool = True
    # Legacy single key (a comma-separated list is also accepted here).
    GEMINI_API_KEY: str | None = None
    # ── Gemini key pool + model fallback (beats free-tier rate limits) ────────
    # Add as MANY keys as you like (comma or newline separated). Requests
    # round-robin across them and a key that hits 429/quota is skipped for a
    # cooldown, so calls keep succeeding. Merged with GEMINI_API_KEY above.
    GEMINI_API_KEYS: str | None = os.getenv("GEMINI_API_KEYS")
    # Ordered model fallback: if every key is exhausted on one model, the next
    # model is tried (separate quota). Override to taste.
    GEMINI_MODELS: str = os.getenv(
        "GEMINI_MODELS",
        "gemini-flash-latest,gemini-2.0-flash,gemini-2.0-flash-lite,gemini-1.5-flash",
    )
    UPLOAD_DIR: str = "uploads"

    # ── GCP / Vertex AI (Module 1: Vertex Agent) ─────────────────────────────
    # Set these when a GCP service account is available.
    # Without these, Vertex AI agent stays in standby — Gemini handles classification.
    GOOGLE_APPLICATION_CREDENTIALS: str | None = None   # Path to service account JSON
    VERTEX_PROJECT_ID: str | None = None                # GCP project ID
    VERTEX_LOCATION: str = "us-central1"                # Vertex AI region

    # ── Cloud Speech-to-Text v2 (Module 2: STT) ───────────────────────────────
    # Requires GOOGLE_APPLICATION_CREDENTIALS + GOOGLE_CLOUD_PROJECT.
    # Without these, Gemini inline audio transcription is used instead.
    GOOGLE_CLOUD_PROJECT: str | None = None             # GCP project for Cloud STT

    # ── Duplicate Detection (Module 4: Embeddings) ────────────────────────────
    # Uses GEMINI_API_KEY (already above) — no extra credentials needed.
    DUPLICATE_SIMILARITY_THRESHOLD: float = 0.92        # Cosine similarity threshold
    DUPLICATE_LOOKBACK_LIMIT: int = 500                 # Max candidates to compare

    # ── Firebase Phone-OTP auth (citizen verification) ────────────────────────
    # The web client sends & confirms the SMS OTP via Firebase; the backend only
    # VERIFIES the resulting Firebase ID token (Firebase Admin SDK) and reads the
    # phone number. Provide a service account to enable real verification; without
    # it the backend runs in MOCK mode (accepts "mock:<phone>" dev tokens) so the
    # whole flow is demoable with no keys.
    FIREBASE_PROJECT_ID: str | None = os.getenv("FIREBASE_PROJECT_ID")
    # Either an absolute path to the service-account JSON, or the JSON itself.
    FIREBASE_SERVICE_ACCOUNT: str | None = os.getenv("FIREBASE_SERVICE_ACCOUNT")

    @property
    def firebase_enabled(self) -> bool:
        """True when a real Firebase service account is configured."""
        return bool(self.FIREBASE_SERVICE_ACCOUNT)


settings = Settings()
