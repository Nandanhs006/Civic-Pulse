from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.db.base_class import Base


class MLA(Base):
    """A sitting Member of the Legislative Assembly for an assembly constituency."""

    __tablename__ = "mlas"

    id = Column(Integer, primary_key=True, index=True)
    assembly_constituency_id = Column(
        Integer,
        ForeignKey("assembly_constituencies.id"),
        unique=True,
        nullable=False,
        index=True,
    )
    name = Column(String(150), nullable=False, index=True)
    party = Column(String(150))
    party_abbr = Column(String(30))
    state = Column(String(100), index=True)
    photo_url = Column(String(1024), nullable=True)
    wikipedia_url = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
