import pytest
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.base import Base
from app.api.deps import get_db
from app.db.models.ward import Ward
from app.db.models.grid_officer import GridOfficer

# Use an in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    # Seed mock data for tests
    db = TestingSessionLocal()
    try:
        # Seed Wards
        mock_wards = [
            Ward(
                id=1,
                name="Ward 1 - Central Business & Market District",
                population=15200,
                area_sq_km=2.45,
                demographics={"literacy_rate": 84.5, "income_tier": "Medium"},
                infrastructure_gaps={
                    "school_ratio_deficit": 0.15,
                    "water_supply_hrs": 14.5,
                    "pothole_index": 4.2,
                },
            ),
            Ward(
                id=2,
                name="Ward 2 - Industrial Zone & Labor Quarters",
                population=22400,
                area_sq_km=4.12,
                demographics={"literacy_rate": 62.0, "income_tier": "Low"},
                infrastructure_gaps={
                    "school_ratio_deficit": 0.45,
                    "water_supply_hrs": 4.0,
                    "pothole_index": 7.8,
                },
            ),
            Ward(
                id=3,
                name="Ward 3 - Riverside Settlement & Agro-Suburbs",
                population=12800,
                area_sq_km=6.80,
                demographics={"literacy_rate": 71.2, "income_tier": "Low-Medium"},
                infrastructure_gaps={
                    "school_ratio_deficit": 0.30,
                    "water_supply_hrs": 8.0,
                    "pothole_index": 5.5,
                },
            ),
            Ward(
                id=4,
                name="Ward 4 - Uptown Residential Estates",
                population=18500,
                area_sq_km=3.10,
                demographics={"literacy_rate": 92.1, "income_tier": "High"},
                infrastructure_gaps={
                    "school_ratio_deficit": 0.05,
                    "water_supply_hrs": 24.0,
                    "pothole_index": 2.1,
                },
            ),
        ]
        db.add_all(mock_wards)

        # Seed Grid Officers
        mock_officers = [
            GridOfficer(
                id=1,
                name="Arjun Mehta",
                email="arjun.mehta@civicpulse.gov",
                phone="+91-98765-43210",
                avatar_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
                is_active=True,
                ward_id=1,
            ),
            GridOfficer(
                id=2,
                name="Priya Sharma",
                email="priya.sharma@civicpulse.gov",
                phone="+91-98765-43211",
                avatar_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
                is_active=True,
                ward_id=2,
            ),
            GridOfficer(
                id=3,
                name="Rohan Das",
                email="rohan.das@civicpulse.gov",
                phone="+91-98765-43212",
                avatar_url="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
                is_active=True,
                ward_id=3,
            ),
            GridOfficer(
                id=4,
                name="Anjali Nair",
                email="anjali.nair@civicpulse.gov",
                phone="+91-98765-43213",
                avatar_url="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
                is_active=True,
                ward_id=4,
            ),
        ]
        db.add_all(mock_officers)
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()

    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db() -> Generator:
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db) -> Generator:
    # Override dependency to use transaction-wrapped test database
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
