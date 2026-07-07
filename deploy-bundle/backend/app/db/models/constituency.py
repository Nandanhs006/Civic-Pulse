from sqlalchemy import Column, Integer, String, Numeric, DateTime
from sqlalchemy.sql import func
from app.db.base_class import Base


class Constituency(Base):
    """A parliamentary (Lok Sabha) constituency - the unit an MP represents."""

    __tablename__ = "constituencies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), unique=True, nullable=False, index=True)
    state = Column(String(100), nullable=False, index=True)
    ls_number = Column(Integer, nullable=True)  # Lok Sabha seat number, if known
    latitude = Column(Numeric(9, 6), nullable=True)  # centroid for map/GPS fallback
    longitude = Column(Numeric(9, 6), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
