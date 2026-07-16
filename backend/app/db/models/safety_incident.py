from typing import Any
from sqlalchemy import Column, String, Numeric, ForeignKey, DateTime, Integer
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
    # "reported" -> (optionally) "acknowledged" / "actioned" by an MP later.
    status: Any = Column(String(20), default="reported", index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
