from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.db.base_class import Base


class SafetyMessage(Base):
    """A community response message on an SOS incident (the 'chat' thread).

    Anonymous: ``responder_id`` is the same localStorage token used for acks —
    never a name/phone. Both the person who raised the SOS and nearby responders
    post here to coordinate.
    """

    __tablename__ = "safety_messages"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(
        Integer, ForeignKey("safety_incidents.id"), nullable=False, index=True
    )
    responder_id = Column(String(64), nullable=False)
    is_owner = Column(String(1), default="0")  # "1" if posted by the SOS raiser
    text = Column(String(500), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
