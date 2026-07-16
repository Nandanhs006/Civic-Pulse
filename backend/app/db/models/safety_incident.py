from typing import Any
from sqlalchemy import Column, String, Numeric, ForeignKey, DateTime, Integer, Boolean
from sqlalchemy.sql import func
from app.db.base_class import Base


class SafetyIncident(Base):
    """An anonymized women-safety SOS ping.

    Design note: this is the "amplify + inform" model, NOT an emergency-dispatch
    record. The app deep-links the citizen to 112 and alerts their trusted
    contacts client-side; this row only captures an *anonymized* incident (no
    name/phone) tied to a constituency so MPs get an aggregate picture of where
    and when women feel unsafe. Never store personal identifiers here.
    """

    __tablename__ = "safety_incidents"

    id = Column(Integer, primary_key=True, index=True)
    latitude = Column(Numeric(9, 6), nullable=True)
    longitude = Column(Numeric(9, 6), nullable=True)

    constituency_id = Column(
        Integer, ForeignKey("constituencies.id"), nullable=True, index=True
    )
    assembly_constituency_id = Column(
        Integer, ForeignKey("assembly_constituencies.id"), nullable=True, index=True
    )

    # Optional free-text context (e.g. "poor lighting"), never personal info.
    note = Column(String(280), nullable=True)
    # "active" while help is needed -> "resolved" when the person marks safe.
    status: Any = Column(String(20), default="active", index=True)

    # Whether the person opted to share PRECISE location with responders who
    # acknowledge (default off — strangers only see the approximate area).
    share_precise: Any = Column(Boolean, default=False)
    # Secret returned only to the creator; required to mark safe / toggle share.
    resolve_token = Column(String(36), nullable=True)

    # Optional photo attached by the person (served from /static).
    photo_url = Column(String(512), nullable=True)

    # ADVISORY AI triage — never suppresses the alert, only adds context.
    # score 0-100, level "corroborated"/"some-signals"/"unverified", one-line note.
    credibility_score = Column(Integer, nullable=True)
    credibility_level = Column(String(20), nullable=True)
    credibility_note = Column(String(300), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
