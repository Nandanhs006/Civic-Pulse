from typing import Any
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class WardOfficer(Base):
    __tablename__ = "ward_officers"

    id: Any = Column(Integer, primary_key=True, index=True)
    name: Any = Column(String(100), nullable=False)
    email: Any = Column(String(100), unique=True, index=True, nullable=False)
    phone: Any = Column(String(20), nullable=False)
    avatar_url: Any = Column(String(255), nullable=True)
    is_active: Any = Column(Boolean(), default=True)

    ward_id: Any = Column(Integer, ForeignKey("wards.id"), nullable=False, index=True)
    ward = relationship("Ward")
