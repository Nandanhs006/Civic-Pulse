import uuid
from sqlalchemy import Column, String, Numeric, ForeignKey, DateTime, Integer
from sqlalchemy.sql import func
from app.db.base_class import Base


class Suggestion(Base):
    __tablename__ = "suggestions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    citizen_phone = Column(String(15))
    content = Column(String, nullable=False)
    english_translation = Column(String)
    language_code = Column(String(10), default="en")
    audio_url = Column(String(512))
    image_url = Column(String(512))
    latitude = Column(Numeric(9, 6))
    longitude = Column(Numeric(9, 6))
    category = Column(String(50))  # e.g., "Water", "Roads", "Education"
    sentiment = Column(String(10))  # e.g., "Positive", "Negative", "Neutral"
    priority_score = Column(Integer, default=0)  # AI priority score (1-100)
    status = Column(
        String(20), default="Submitted"
    )  # "Submitted", "Processing", "Reviewed", "Approved", "Rejected"

    ward_id = Column(Integer, ForeignKey("wards.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
