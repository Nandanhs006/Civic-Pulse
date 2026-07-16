from typing import Any
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    ForeignKey,
    DateTime,
    UniqueConstraint,
)
from sqlalchemy.sql import func
from app.db.base_class import Base


class SafetyAck(Base):
    """A nearby responder acknowledging an SOS ("I'm aware" / "I'm responding").

    Anonymous: ``responder_id`` is a random token the responder's browser keeps
    in localStorage — never a name/phone. One row per (incident, responder), so
    the aware/responding counts are de-duplicated.
    """

    __tablename__ = "safety_acks"
    __table_args__ = (
        UniqueConstraint("incident_id", "responder_id", name="uq_ack_incident_responder"),
    )

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(
        Integer, ForeignKey("safety_incidents.id"), nullable=False, index=True
    )
    responder_id = Column(String(64), nullable=False)
    responding: Any = Column(Boolean, default=False)  # True = "heading over"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
