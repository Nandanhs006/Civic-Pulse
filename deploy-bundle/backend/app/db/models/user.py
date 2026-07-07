from typing import Any
from sqlalchemy import Boolean, Column, Integer, String, ForeignKey
from app.db.base_class import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active: Any = Column(Boolean(), default=True)
    is_admin: Any = Column(Boolean(), default=True)
    # "pmo" = super-admin monitoring all constituencies; "mp" = scoped to one
    role = Column(String(20), default="pmo", index=True)
    constituency_id = Column(
        Integer, ForeignKey("constituencies.id"), nullable=True, index=True
    )
