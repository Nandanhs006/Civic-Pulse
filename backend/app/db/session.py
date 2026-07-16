import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# SQLite fallback for easy local dev/tests — but NEVER when a real DB is given
# via DATABASE_URL (e.g. Supabase) or explicit Postgres credentials.
_has_explicit_db = bool(os.getenv("DATABASE_URL")) or (
    settings.POSTGRES_SERVER != "localhost" or bool(settings.POSTGRES_PASSWORD)
)
if os.getenv("USE_SQLITE", "false").lower() == "true" or not _has_explicit_db:
    SQLALCHEMY_DATABASE_URL = "sqlite:///./civic_pulse.db"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
