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
    ward,
    safety,
    civic,
    airquality,
    mplads,
    dialogflow,
)
from app.db.session import engine, SessionLocal
from app.db.base import Base
from app.db.models.ward import Ward
from app.db.models.user import User
from app.db.models.suggestion import Suggestion
from app.db.models.project import ProposedProject
from app.db.models.ward_officer import WardOfficer
from app.core.security import get_password_hash
from app.middleware.rate_limit import check_rate_limit
from app.middleware.timeout import TimeoutMiddleware

# Create database tables directly if running without Alembic
Base.metadata.create_all(bind=engine)


def _run_lightweight_migrations() -> None:
    """Add columns that post-date the original tables.

    ``create_all`` only CREATES missing tables — it never ALTERs an existing
    one. On a persistent DB (e.g. Render Postgres) a table created by an older
    deploy is missing newer columns, so every ``SELECT *`` over that model 500s.
    These idempotent ALTERs make each boot self-healing. Postgres supports
    ``ADD COLUMN IF NOT EXISTS``; on SQLite it raises and is safely skipped
    (fresh SQLite already has the column via create_all).
    """
    from sqlalchemy import text

    alters = [
        "ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS department VARCHAR(80)",
        # Defensive: columns added after the original suggestions table. Harmless
        # if already present (IF NOT EXISTS) — keeps SELECT * over the model working
        # on any age of persisted DB.
        "ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS ai_confidence DOUBLE PRECISION",
        "ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS ai_reasoning VARCHAR(500)",
        "ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS image_analysis TEXT",
        "ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT FALSE",
        "ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS duplicate_of_id VARCHAR(36)",
        "ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS embedding_text TEXT",
    ]
    for sql in alters:
        try:
            with engine.begin() as conn:
                conn.execute(text(sql))
        except Exception as exc:  # noqa: BLE001 — never block boot on a migration
            print(f"[migrate] skipped: {exc.__class__.__name__}")


_run_lightweight_migrations()

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

# Timeout middleware (5s connection, 30s read limit)
app.add_middleware(TimeoutMiddleware, timeout_seconds=30.0)

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
app.include_router(mps.router, prefix=f"{settings.API_V1_STR}/mps", tags=["MPs"])
app.include_router(
    hierarchy.router,
    prefix=f"{settings.API_V1_STR}/hierarchy",
    tags=["Hierarchy"],
)
app.include_router(
    ward.router,
    prefix=f"{settings.API_V1_STR}/ward",
    tags=["Ward"],
)
app.include_router(
    safety.router,
    prefix=f"{settings.API_V1_STR}/safety",
    tags=["Safety"],
    dependencies=[Depends(check_rate_limit)],
)
app.include_router(
    civic.router,
    prefix=f"{settings.API_V1_STR}/civic",
    tags=["Civic"],
)
app.include_router(
    airquality.router,
    prefix=f"{settings.API_V1_STR}/airquality",
    tags=["AirQuality"],
)
app.include_router(
    mplads.router,
    prefix=f"{settings.API_V1_STR}/mplads",
    tags=["MPLADS"],
)
# Dialogflow CX Webhook (conversational AI intake — pitch-ready, always active)
app.include_router(
    dialogflow.router,
    prefix=f"{settings.API_V1_STR}/dialogflow",
    tags=["Dialogflow"],
)

import asyncio
import threading


def _run_full_seed() -> None:
    """Run the full seed pipeline in a background thread so startup is non-blocking."""
    try:
        from app.scripts import seed_all
        seed_all.main()
    except Exception as exc:
        print(f"[Seed] Background seed failed: {exc}")


@app.get(f"{settings.API_V1_STR}/test-timeout", tags=["Debug"])
async def debug_test_timeout(seconds: float = 35.0):
    await asyncio.sleep(seconds)
    return {"status": "success"}


# Prometheus Instrumentation
Instrumentator().instrument(app).expose(app)


def _warm_caches() -> None:
    """Pre-warm slow external-data caches so the first user request is instant."""
    try:
        from app.services.air_quality import get_stations
        get_stations()  # CPCB AQI (live -> fallback), cached for the TTL
    except Exception as exc:  # noqa: BLE001
        print(f"[Warmup] air-quality cache warm failed: {exc}")


threading.Thread(target=_warm_caches, daemon=True).start()


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

        # Seed Ward Officers
        if db.query(WardOfficer).count() == 0:
            mock_officers = [
                WardOfficer(
                    id=1,
                    name="Arjun Mehta",
                    email="arjun.mehta@civicpulse.gov",
                    phone="+91-98765-43210",
                    avatar_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
                    is_active=True,
                    ward_id=1,
                ),
                WardOfficer(
                    id=2,
                    name="Priya Sharma",
                    email="priya.sharma@civicpulse.gov",
                    phone="+91-98765-43211",
                    avatar_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
                    is_active=True,
                    ward_id=2,
                ),
                WardOfficer(
                    id=3,
                    name="Rohan Das",
                    email="rohan.das@civicpulse.gov",
                    phone="+91-98765-43212",
                    avatar_url="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
                    is_active=True,
                    ward_id=3,
                ),
                WardOfficer(
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
            print("[Seed] Successfully populated default Ward Officers dataset.")

        # 3. Seed Suggestions
        if db.query(Suggestion).count() == 0:
            mock_suggestions = [
                Suggestion(
                    citizen_phone="+123456789",
                    content="Severe road cracks and deep potholes on the main avenue near the market.",
                    english_translation="Severe road cracks and deep potholes on the main avenue near the market.",
                    language_code="en",
                    latitude=12.9716,
                    longitude=77.5946,
                    category="Roads",
                    sentiment="Negative",
                    priority_score=75,
                    status="Submitted",
                    ward_id=1,
                ),
                Suggestion(
                    citizen_phone="+123456780",
                    content="Water is dirty and only running for 3 hours in the morning. Please fix.",
                    english_translation="Water is dirty and only running for 3 hours in the morning. Please fix.",
                    language_code="en",
                    latitude=12.9820,
                    longitude=77.6010,
                    category="Water",
                    sentiment="Negative",
                    priority_score=85,
                    status="Submitted",
                    ward_id=2,
                ),
                Suggestion(
                    citizen_phone="+123456781",
                    content="Primary school building needs maintenance, structural safety check, and new desks.",
                    english_translation="Primary school building needs maintenance, structural safety check, and new desks.",
                    language_code="en",
                    latitude=12.9550,
                    longitude=77.6100,
                    category="Education",
                    sentiment="Neutral",
                    priority_score=60,
                    status="Submitted",
                    ward_id=3,
                ),
                Suggestion(
                    citizen_phone="+123456782",
                    content="Dark alleys near the public park have no streetlights, making it unsafe after sunset.",
                    english_translation="Dark alleys near the public park have no streetlights, making it unsafe after sunset.",
                    language_code="en",
                    latitude=12.9730,
                    longitude=77.5960,
                    category="Safety",
                    sentiment="Negative",
                    priority_score=72,
                    status="Submitted",
                    ward_id=1,
                ),
            ]
            db.add_all(mock_suggestions)
            db.commit()
            print("[Seed] Successfully populated default Suggestions dataset.")

        # 4. Seed Proposed Projects
        if db.query(ProposedProject).count() == 0:
            mock_projects = [
                ProposedProject(
                    title="Water Treatment and Pipe Extension - Ward 2",
                    description="Automated proposal: Recommended upgrade for Water due to high request volumes and a low infrastructure water supply rating.",
                    category="Water",
                    target_ward_id=2,
                    estimated_cost=350000.00,
                    priority_score=88,
                    supporting_suggestions_count=1,
                    ai_justification="The water supply runs only 4 hours daily in Ward 2. High concentrations of citizen grievances emphasize immediate contamination risks.",
                    status="Proposed",
                ),
                ProposedProject(
                    title="Main Market Road Restoration - Ward 1",
                    description="Automated proposal: Pavement upgrade and potholes patching to improve market transit speeds and safety.",
                    category="Roads",
                    target_ward_id=1,
                    estimated_cost=120000.00,
                    priority_score=72,
                    supporting_suggestions_count=2,
                    ai_justification="Heavy commercial zone reports significant pothole indexes (4.2/10) with major commercial vehicle transit blocks.",
                    status="Proposed",
                ),
            ]
            db.add_all(mock_projects)
            db.commit()
            print("[Seed] Successfully populated default Proposed Projects dataset.")
    except Exception as e:
        print(f"[Seed] Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

    # Kick off full data pipeline (MPs, MLAs, demo issues) in background so
    # the server is healthy immediately and seeding runs concurrently.
    threading.Thread(target=_run_full_seed, daemon=True).start()


@app.get("/health", tags=["Debug"])
def health_check():
    return {"status": "healthy"}


# Serve the built frontend (single-service deploys, e.g. Render/Cloud Run) when a
# compiled bundle is present. Dev/CI have no bundle, so the JSON root is kept.
_FRONTEND_DIST = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "frontend_dist"
)

if os.path.isdir(_FRONTEND_DIST):
    from fastapi.responses import FileResponse

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        # Resolve within the dist dir; fall back to index.html for client routes.
        candidate = os.path.normpath(os.path.join(_FRONTEND_DIST, full_path))
        if candidate.startswith(_FRONTEND_DIST) and os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(_FRONTEND_DIST, "index.html"))

else:

    @app.get("/")
    def read_root():
        return {"message": "Civic Pulse API is online and healthy", "docs": "/docs"}
