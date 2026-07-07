from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.db.base_class import Base


class AssemblyConstituency(Base):
    """A state Assembly (Vidhan Sabha) constituency - the unit an MLA represents."""

    __tablename__ = "assembly_constituencies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, index=True)
    ac_no = Column(Integer, nullable=True)
    state = Column(String(100), nullable=False, index=True)
    pc_name = Column(String(150), nullable=True)  # parent parliamentary constituency name
    district = Column(String(120), nullable=True)  # used to detect urban civic bodies
    parliamentary_constituency_id = Column(
        Integer, ForeignKey("constituencies.id"), nullable=True, index=True
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
