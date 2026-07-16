"""Citizen "Near me" endpoints: area briefing + nearby civic amenities.

Aggregates, for a GPS point: the constituency + MP, nearby SOS activity, the
nearest police station, and nearby citizen-service / waste / help centres
(demo data), plus a short generated area summary. Powers the Near-me card.
"""

from typing import Any, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api import deps
from app.db.models.constituency import Constituency
from app.db.models.mp import MP
from app.db.models.safety_incident import SafetyIncident
from app.db.models.suggestion import Suggestion
from app.services.air_quality import nearest_station as nearest_aqi_station
from app.services.geo_service import (
    GeoService,
    _haversine_km,
    get_civic_centers,
    nearby_civic_centers,
    nearest_police_station,
)
# Reuse the safety module's best-effort reverse geocoder.
from app.api.v1.safety import _reverse_geocode

router = APIRouter()


def _summarize(
    area: Optional[str],
    constituency: Optional[str],
    mp: Optional[str],
    sos_count: int,
    top_categories: list,
    centers_count: int,
    police_name: Optional[str],
    aqi: Optional[dict] = None,
) -> str:
    where = area or constituency or "this area"
    bits = [f"You're in {where}"]
    if constituency:
        bits[0] += f", part of the {constituency} constituency"
    if mp:
        bits[0] += f" (MP: {mp})"
    bits[0] += "."
    if aqi:
        bits.append(
            f"🌫️ Air quality is {aqi['category']} (AQI {aqi['aqi']}, "
            f"{aqi['dominant_pollutant']}) at {aqi['station']}. {aqi['advice']}"
        )
    if sos_count:
        bits.append(
            f"⚠️ {sos_count} women-safety SOS ping(s) were raised nearby in the "
            f"last 24h — stay alert" + (f"; nearest police: {police_name}." if police_name else ".")
        )
    elif police_name:
        bits.append(f"Nearest police station is {police_name}.")
    if top_categories:
        cats = ", ".join(f"{c}" for c, _ in top_categories[:3])
        bits.append(f"Top civic concerns logged here: {cats}.")
    if centers_count:
        bits.append(
            f"{centers_count} citizen-service/help centres are within reach "
            f"(Bangalore One, Karnataka One, Aadhaar/CSC, waste & help desks)."
        )
    return " ".join(bits)


@router.get("/centers")
def civic_centers() -> Any:
    """All demo civic-amenity points (GeoJSON) for the map layer."""
    return get_civic_centers()


@router.get("/near-me")
def near_me(
    lat: float,
    lng: float,
    radius_km: float = Query(6.0, ge=0.5, le=25.0),
    db: Session = Depends(deps.get_db),
) -> Any:
    """Everything around a point: area, representative, safety, police, centres."""
    geo = GeoService(db)
    cid = geo.locate_constituency_id(lat, lng)
    constituency = state = mp_name = None
    top_categories: list = []
    if cid is not None:
        c = db.query(Constituency).filter(Constituency.id == cid).first()
        if c:
            constituency = c.name
            state = c.state
        mp = db.query(MP).filter(MP.constituency_id == cid).first()
        if mp:
            mp_name = str(mp.name)
        top_categories = [
            (cat, int(n))
            for cat, n in (
                db.query(Suggestion.category, func.count(Suggestion.id))
                .filter(Suggestion.constituency_id == cid)
                .group_by(Suggestion.category)
                .order_by(func.count(Suggestion.id).desc())
                .limit(3)
                .all()
            )
            if cat
        ]

    # Nearby SOS pings in the last 24h.
    from datetime import datetime, timedelta

    since = datetime.utcnow() - timedelta(hours=24)
    sos_rows = (
        db.query(SafetyIncident)
        .filter(SafetyIncident.created_at >= since)
        .filter(SafetyIncident.latitude.isnot(None))
        .all()
    )
    sos_count = sum(
        1
        for r in sos_rows
        if _haversine_km(lat, lng, float(r.latitude), float(r.longitude)) <= 3.0
    )

    police = nearest_police_station(lat, lng)
    centers = nearby_civic_centers(lat, lng, radius_km=radius_km, per_category=2)
    area = _reverse_geocode(lat, lng)
    aqi = nearest_aqi_station(lat, lng)

    return {
        "area": area,
        "constituency": constituency,
        "state": state,
        "mp": mp_name,
        "police": police,
        "air_quality": aqi,
        "safety": {"nearby_sos_24h": sos_count},
        "top_categories": [{"category": c, "count": n} for c, n in top_categories],
        "centers": centers,
        "summary": _summarize(
            area, constituency, mp_name, sos_count, top_categories,
            len(centers), police.get("name") if police else None, aqi,
        ),
    }
