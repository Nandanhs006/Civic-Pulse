import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# In-memory SQLite option for easier local testing/fallback, or automatically during tests
if "pytest" in sys.modules or (settings.POSTGRES_SERVER == "localhost" and not settings.POSTGRES_PASSWORD):
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

