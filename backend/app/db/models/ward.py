from sqlalchemy import Column, Integer, String, Numeric, JSON, DateTime
from sqlalchemy.sql import func
from app.db.base_class import Base


class Ward(Base):
    __tablename__ = "wards"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    population = Column(Integer, default=0)
    area_sq_km = Column(Numeric(6, 2))
    demographics = Column(JSON)          # e.g., {"literacy_rate": 78.5, "income_tier": "Low"}
    infrastructure_gaps = Column(JSON)  # e.g., {"school_ratio_deficit": 0.35, "water_supply_hrs": 2}
    created_at = Column(DateTime(timezone=True), server_default=func.now())
