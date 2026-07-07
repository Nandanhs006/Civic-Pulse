import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from prometheus_fastapi_instrumentator import Instrumentator

from app.core.config import settings
from app.api.v1 import (
    auth,
    suggestions,
    projects,
    analytics,
    constituencies,
    mps,
    hierarchy,
)
from app.db.session import engine, SessionLocal
from app.db.base import Base
from app.db.models.ward import Ward
from app.db.models.user import User
from app.core.security import get_password_hash
from app.middleware.rate_limit import check_rate_limit

# Create database tables directly if running without Alembic
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-powered constituency mapping and citizen preference prioritization engine.",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin).strip("/") for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=settings.UPLOAD_DIR), name="static")

# Mount Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Auth"])
app.include_router(
    suggestions.router,
    prefix=f"{settings.API_V1_STR}/suggestions",
    tags=["Suggestions"],
    dependencies=[Depends(check_rate_limit)],
)
app.include_router(
    projects.router, prefix=f"{settings.API_V1_STR}/projects", tags=["Projects"]
)
app.include_router(
    analytics.router, prefix=f"{settings.API_V1_STR}/analytics", tags=["Analytics"]
)
app.include_router(
    constituencies.router,
    prefix=f"{settings.API_V1_STR}/constituencies",
    tags=["Constituencies"],
)
app.include_router(
    mps.router, prefix=f"{settings.API_V1_STR}/mps", tags=["MPs"]
)
app.include_router(
    hierarchy.router,
    prefix=f"{settings.API_V1_STR}/hierarchy",
    tags=["Hierarchy"],
)


# Prometheus Instrumentation
Instrumentator().instrument(app).expose(app)


@app.on_event("startup")
async def startup_event():

    # Seed Wards & Administrative User if database is empty
    db = SessionLocal()
    try:
        # 1. Seed admin user
        admin_email = "admin@civicpulse.gov"
        if not db.query(User).filter(User.email == admin_email).first():
            admin_user = User(
                email=admin_email,
                hashed_password=get_password_hash("admin123"),
                full_name="Constituency MP Administrator",
                is_active=True,
                is_admin=True,
            )
            db.add(admin_user)
            print(
                "[Seed] Created default administrator: admin@civicpulse.gov / admin123"
            )

        # 2. Seed Wards
        if db.query(Ward).count() == 0:
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
            db.commit()
            print("[Seed] Successfully populated default Wards dataset.")
    except Exception as e:
        print(f"[Seed] Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()


@app.get("/")
def read_root():
    return {"message": "Civic Pulse API is online and healthy", "docs": "/docs"}
