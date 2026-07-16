"""Air-quality endpoints (CPCB via data.gov.in) for the map layer + Near-me."""

from typing import Any, Optional

from fastapi import APIRouter

from app.services.air_quality import get_stations, nearest_station

router = APIRouter()


@router.get("/stations")
def stations() -> Any:
    """All Bengaluru AQI stations with computed AQI + category colour."""
    rows = get_stations()
    return {
        "source": rows[0].get("source") if rows else "none",
        "count": len(rows),
        "stations": rows,
    }


@router.get("/near")
def near(lat: float, lng: float) -> Optional[Any]:
    """Nearest AQI station to a point (for the Near-me card)."""
    return nearest_station(lat, lng)
