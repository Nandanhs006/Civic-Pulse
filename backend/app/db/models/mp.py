from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.db.base_class import Base


class MP(Base):
    """A sitting Member of Parliament (18th Lok Sabha) for a constituency."""

    __tablename__ = "mps"

    id = Column(Integer, primary_key=True, index=True)
    constituency_id = Column(
        Integer,
        ForeignKey("constituencies.id"),
        unique=True,
        nullable=False,
        index=True,
    )
    name = Column(String(150), nullable=False, index=True)
    party = Column(String(150))
    party_abbr = Column(String(30))
    state = Column(String(100), index=True)
    photo_url = Column(String(1024), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(30), nullable=True)
    wikipedia_url = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
