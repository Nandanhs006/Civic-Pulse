from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, DateTime, Text
from sqlalchemy.sql import func
from app.db.base_class import Base


class ProposedProject(Base):
    __tablename__ = "proposed_projects"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    category = Column(String(50), nullable=False)
    target_ward_id = Column(Integer, ForeignKey("wards.id"), nullable=False)
    estimated_cost = Column(Numeric(12, 2), nullable=False)
    priority_score = Column(Integer, nullable=False)
    supporting_suggestions_count = Column(Integer, default=0)
    ai_justification = Column(Text)
    status = Column(String(30), default="Proposed") # "Proposed", "Sanctioned", "Work In Progress", "Completed"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
