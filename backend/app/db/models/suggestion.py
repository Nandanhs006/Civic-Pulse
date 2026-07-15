import uuid
from typing import Any
from sqlalchemy import Column, String, Numeric, ForeignKey, DateTime, Integer, Float, Boolean, Text
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
    status: Any = Column(
        String(20), default="Submitted"
    )  # "Submitted", "Processing", "Reviewed", "Approved", "Rejected"

    ward_id = Column(Integer, ForeignKey("wards.id"), nullable=True)
    constituency_id = Column(
        Integer, ForeignKey("constituencies.id"), nullable=True, index=True
    )
    assembly_constituency_id = Column(
        Integer, ForeignKey("assembly_constituencies.id"), nullable=True, index=True
    )

    # Ward dispatch assignments
    assigned_officer_id: Any = Column(
        Integer, ForeignKey("ward_officers.id"), nullable=True, index=True
    )
    dispatch_status: Any = Column(String(50), default="Unassigned")

    # ── AI Enhancement Fields (Module 1: Vertex AI + Module 3: Vision + Module 4: Embeddings) ──
    ai_confidence = Column(Float, nullable=True)          # Vertex AI classification confidence (0.0–1.0)
    ai_reasoning = Column(String(500), nullable=True)     # Structured reasoning from Vertex AI agent
    image_analysis = Column(Text, nullable=True)          # JSON: Gemini Vision output (issue, severity, description)
    is_duplicate = Column(Boolean, default=False)         # Duplicate detection flag
    duplicate_of_id = Column(                             # FK to original suggestion if duplicate
        String(36), ForeignKey("suggestions.id"), nullable=True
    )
    embedding_text = Column(Text, nullable=True)          # Serialized Gemini embedding vector (JSON)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
