"""Women-safety SOS endpoints — the "amplify + inform" design.

This does NOT dispatch police. The client dials 112 (India ERSS) and alerts the
user's trusted contacts directly; the backend only records an *anonymized*
incident tied to a constituency so MPs can see where/when women feel unsafe and
act (lighting, patrols, CCTV via MPLADS). No personal data is stored.
"""

from datetime import datetime, timedelta
from typing import Any, List, Optional

import httpx
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api import deps
from app.db.models.constituency import Constituency
from app.db.models.mp import MP
from app.db.models.safety_incident import SafetyIncident
from app.schemas import (
    ConstituencyOut,
    MPOut,
    SafetyIncidentPoint,
    SafetySummary,
    SosRequest,
    SosResponse,
)
from app.services.geo_service import (
    GeoService,
    _haversine_km,
    is_in_bangalore,
    nearest_police_station,
)

router = APIRouter()

_UA = "CivicPulse-Safety/1.0 (educational hackathon project)"
_NOMINATIM = "https://nominatim.openstreetmap.org/reverse"


def _reverse_geocode(lat: float, lng: float) -> Optional[str]:
    """Human-readable area/locality name via OpenStreetMap Nominatim."""
    try:
        with httpx.Client(headers={"User-Agent": _UA}, timeout=8) as c:
            r = c.get(
                _NOMINATIM,
                params={"lat": lat, "lon": lng, "format": "jsonv2", "zoom": 16},
            )
            r.raise_for_status()
            a = r.json().get("address", {})
            parts = [
                a.get("suburb") or a.get("neighbourhood") or a.get("village")
                or a.get("town") or a.get("city_district"),
                a.get("city") or a.get("county"),
            ]
            return ", ".join([p for p in parts if p]) or r.json().get("display_name")
    except Exception:  # noqa: BLE001
        return None


def _nearest_police(lat: float, lng: float) -> Optional[dict]:
    """Nearest police station from the bundled Bengaluru dataset (offline)."""
    return nearest_police_station(lat, lng)


@router.post("/sos", response_model=SosResponse)
def raise_sos(payload: SosRequest, db: Session = Depends(deps.get_db)) -> Any:
    """Log an anonymized SOS ping and return the local MP + emergency guidance.

    Resolves the constituency by GPS point-in-polygon when coordinates are given.
    The client is responsible for dialling 112 and alerting trusted contacts.
    """
    have_coords = payload.latitude is not None and payload.longitude is not None
    # The community-SOS network is Bengaluru-focused: only log/broadcast pings
    # inside the city. 112 guidance is always returned regardless of location.
    in_service_area = have_coords and is_in_bangalore(
        payload.latitude, payload.longitude
    )

    if not in_service_area:
        return SosResponse(
            incident_id=None,
            logged=False,
            message=(
                "Call 112 now for immediate help. The community SOS network is "
                "currently available in Bengaluru only — your call to 112 still "
                "reaches emergency services anywhere in India."
            ),
        )

    geo = GeoService(db)
    cid = geo.locate_constituency_id(payload.latitude, payload.longitude)
    acid = geo.locate_assembly_constituency_id(
        payload.latitude, payload.longitude
    )

    incident = SafetyIncident(
        latitude=payload.latitude,
        longitude=payload.longitude,
        constituency_id=cid,
        assembly_constituency_id=acid,
        note=(payload.note or None),
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)

    constituency = None
    mp_out = None
    if cid is not None:
        c = db.query(Constituency).filter(Constituency.id == cid).first()
        if c:
            constituency = ConstituencyOut.model_validate(c)
        mp = db.query(MP).filter(MP.constituency_id == cid).first()
        if mp:
            mp_out = MPOut(
                id=int(mp.id),
                constituency_id=int(mp.constituency_id),
                constituency_name=c.name if c else None,
                name=str(mp.name),
                party=str(mp.party) if mp.party is not None else None,
                party_abbr=str(mp.party_abbr) if mp.party_abbr is not None else None,
                state=str(mp.state) if mp.state is not None else None,
                photo_url=str(mp.photo_url) if mp.photo_url is not None else None,
                email=str(mp.email) if mp.email is not None else None,
            )

    return SosResponse(
        incident_id=int(incident.id),
        constituency=constituency,
        mp=mp_out,
        message=(
            "Call 112 now for immediate help. Nearby CivicPulse users have been "
            "alerted to your location, and this area has been flagged "
            "(anonymously) for your MP to improve safety."
        ),
    )


@router.get("/nearby-alerts")
def nearby_alerts(
    lat: float,
    lng: float,
    radius_km: float = Query(3.0, ge=0.2, le=25.0),
    minutes: int = Query(30, ge=1, le=240),
    db: Session = Depends(deps.get_db),
) -> Any:
    """Active SOS pings near a location, for the community-broadcast watcher.

    Returns anonymized alerts (distance + minutes-ago + constituency) raised in
    the last ``minutes`` within ``radius_km`` — so nearby portal users who opted
    in can be notified that someone close by needs help.
    """
    since = datetime.utcnow() - timedelta(minutes=minutes)
    rows = (
        db.query(SafetyIncident)
        .filter(SafetyIncident.created_at >= since)
        .filter(SafetyIncident.latitude.isnot(None))
        .order_by(SafetyIncident.created_at.desc())
        .limit(500)
        .all()
    )
    names = {
        c.id: c.name
        for c in db.query(Constituency).all()
    }
    now = datetime.utcnow()
    out = []
    for r in rows:
        d = _haversine_km(lat, lng, float(r.latitude), float(r.longitude))
        if d > radius_km:
            continue
        created = r.created_at.replace(tzinfo=None) if r.created_at else now
        out.append(
            {
                "id": int(r.id),
                "distance_km": round(d, 2),
                "minutes_ago": max(0, int((now - created).total_seconds() // 60)),
                "constituency": names.get(r.constituency_id),
            }
        )
    return out


@router.get("/police-stations")
def police_stations() -> Any:
    """Bengaluru police station points (GeoJSON) for the map layer."""
    from app.services.geo_service import get_police_stations

    return get_police_stations()


@router.get("/incident-context")
def incident_context(
    lat: float, lng: float, db: Session = Depends(deps.get_db)
) -> Any:
    """For a tapped hotspot: which area/constituency it falls in + nearest police.

    Area name (OSM Nominatim) and nearest police station (OSM Overpass) are
    best-effort — they may be null if the external service is slow/unavailable.
    """
    geo = GeoService(db)
    cid = geo.locate_constituency_id(lat, lng)
    constituency = None
    state = None
    mp_name = None
    if cid is not None:
        c = db.query(Constituency).filter(Constituency.id == cid).first()
        if c:
            constituency = c.name
            state = c.state
        mp = db.query(MP).filter(MP.constituency_id == cid).first()
        if mp:
            mp_name = str(mp.name)
    return {
        "constituency": constituency,
        "constituency_id": cid,
        "state": state,
        "mp": mp_name,
        "area": _reverse_geocode(lat, lng),
        "police": _nearest_police(lat, lng),
    }


@router.get("/incidents", response_model=List[SafetyIncidentPoint])
def list_incidents(
    constituency_id: Optional[int] = None,
    days: int = Query(90, ge=1, le=365),
    db: Session = Depends(deps.get_db),
) -> Any:
    """Anonymized incident points for the safety heatmap (last ``days``)."""
    since = datetime.utcnow() - timedelta(days=days)
    q = db.query(SafetyIncident).filter(SafetyIncident.created_at >= since)
    if constituency_id is not None:
        q = q.filter(SafetyIncident.constituency_id == constituency_id)
    rows = q.order_by(SafetyIncident.created_at.desc()).limit(5000).all()
    return [
        SafetyIncidentPoint(
            id=int(r.id),
            latitude=float(r.latitude) if r.latitude is not None else None,
            longitude=float(r.longitude) if r.longitude is not None else None,
            constituency_id=r.constituency_id,
            hour=r.created_at.hour if r.created_at is not None else None,
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.get("/summary", response_model=SafetySummary)
def safety_summary(
    constituency_id: Optional[int] = None, db: Session = Depends(deps.get_db)
) -> Any:
    """Aggregate counts for the MP dashboard: total, last-30-days, by-hour."""
    q = db.query(SafetyIncident)
    if constituency_id is not None:
        q = q.filter(SafetyIncident.constituency_id == constituency_id)
    rows = q.all()

    since = datetime.utcnow() - timedelta(days=30)
    by_hour = [0] * 24
    last_30 = 0
    for r in rows:
        if r.created_at is not None:
            by_hour[r.created_at.hour] += 1
            # created_at may be tz-aware; compare naively on the hour bucket only.
            ca = r.created_at.replace(tzinfo=None)
            if ca >= since:
                last_30 += 1
    return SafetySummary(total=len(rows), last_30_days=last_30, by_hour=by_hour)
