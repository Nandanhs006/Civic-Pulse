from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.db.base_class import Base


class SuggestionEvent(Base):
    """One stage transition in an issue's tracking timeline (e-com style).

    The ordered history of these rows is the issue's timeline: Received ->
    Under Review -> Assigned -> Work in Progress -> Resolved.
    """

    __tablename__ = "suggestion_events"

    id = Column(Integer, primary_key=True, index=True)
    suggestion_id = Column(
        String(36), ForeignKey("suggestions.id"), nullable=False, index=True
    )
    stage = Column(String(30), nullable=False)          # canonical stage key
    note = Column(String(300), nullable=True)
    actor = Column(String(60), nullable=True)           # who moved it
    created_at = Column(DateTime(timezone=True), server_default=func.now())
