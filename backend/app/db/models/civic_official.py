from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.db.base_class import Base


class CivicOfficial(Base):
    """Local civic-body accountability node under an assembly constituency.

    For Bengaluru this is the BBMP / Greater Bengaluru Authority engineer tier;
    elsewhere a generic local body. `name` is nullable and editable - real
    named engineers are not open data, so rows seed as role-based placeholders.
    """

    __tablename__ = "civic_officials"

    id = Column(Integer, primary_key=True, index=True)
    assembly_constituency_id = Column(
        Integer, ForeignKey("assembly_constituencies.id"), nullable=False, index=True
    )
    body = Column(
        String(150), nullable=False
    )  # e.g. "BBMP (Greater Bengaluru Authority)"
    zone = Column(String(120), nullable=True)
    role = Column(String(120), nullable=False)  # e.g. "Assistant Executive Engineer"
    name = Column(String(150), nullable=True)  # editable - fill real person later
    contact = Column(String(120), nullable=True)
    is_placeholder = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
