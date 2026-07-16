"""Women-safety SOS endpoints — the "amplify + inform" design.

This does NOT dispatch police. The client dials 112 (India ERSS) and alerts the
user's trusted contacts directly; the backend only records an *anonymized*
incident tied to a constituency so MPs can see where/when women feel unsafe and
act (lighting, patrols, CCTV via MPLADS). No personal data is stored.
"""

import os
import shutil
import uuid
from datetime import datetime, timedelta
from typing import Any, List, Optional

import httpx
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status as http_status,
)
from sqlalchemy.orm import Session

from app.api import deps
from app.core.config import settings
from app.db.models.constituency import Constituency
from app.db.models.mp import MP
from app.db.models.safety_incident import SafetyIncident
from app.db.models.safety_ack import SafetyAck
from app.db.models.safety_message import SafetyMessage
from app.schemas import (
    AckRequest,
    ConstituencyOut,
    IncidentStatus,
    MessageOut,
    MessageRequest,
    MPOut,
    ResolveRequest,
    SafetyIncidentPoint,
    SafetySummary,
    ShareRequest,
    SosRequest,
    SosResponse,
)
from app.services.safety_ai import assess as assess_credibility
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

    token = uuid.uuid4().hex
    # Advisory AI triage (never suppresses — see safety_ai docstring).
    cred = assess_credibility(
        db, payload.latitude, payload.longitude, payload.note, False,
        datetime.now().hour,
    )
    incident = SafetyIncident(
        latitude=payload.latitude,
        longitude=payload.longitude,
        constituency_id=cid,
        assembly_constituency_id=acid,
        note=(payload.note or None),
        share_precise=bool(payload.share_precise),
        resolve_token=token,
        status="active",
        credibility_score=cred["score"],
        credibility_level=cred["level"],
        credibility_note=cred["note"],
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
        resolve_token=token,
        share_precise=bool(payload.share_precise),
        credibility_score=cred["score"],
        credibility_level=cred["level"],
        credibility_note=cred["note"],
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
        .filter(SafetyIncident.status != "resolved")  # only active alerts
        .order_by(SafetyIncident.created_at.desc())
        .limit(500)
        .all()
    )
    names = {c.id: c.name for c in db.query(Constituency).all()}
    now = datetime.utcnow()
    out = []
    for r in rows:
        rlat, rlng = float(r.latitude), float(r.longitude)
        d = _haversine_km(lat, lng, rlat, rlng)
        if d > radius_km:
            continue
        created = r.created_at.replace(tzinfo=None) if r.created_at else now
        aware, responding = _ack_counts(db, int(r.id))
        precise = bool(r.share_precise)
        # Exact coords only if the person opted to share; else neighbourhood-level.
        out_lat = rlat if precise else round(rlat, 2)
        out_lng = rlng if precise else round(rlng, 2)
        out.append(
            {
                "id": int(r.id),
                "distance_km": round(d, 2),
                "minutes_ago": max(0, int((now - created).total_seconds() // 60)),
                "constituency": names.get(r.constituency_id),
                "latitude": out_lat,
                "longitude": out_lng,
                "precise": precise,
                "aware_count": aware,
                "responding_count": responding,
                "photo_url": r.photo_url,
                "note": r.note,
                "credibility_score": r.credibility_score,
                "credibility_level": r.credibility_level,
                "credibility_note": r.credibility_note,
                "message_count": db.query(SafetyMessage).filter(SafetyMessage.incident_id == r.id).count(),
            }
        )
    return out


def _ack_counts(db: Session, incident_id: int) -> tuple:
    acks = db.query(SafetyAck).filter(SafetyAck.incident_id == incident_id).all()
    return len(acks), sum(1 for a in acks if a.responding)


def _get_incident(db: Session, incident_id: int) -> SafetyIncident:
    inc = db.query(SafetyIncident).filter(SafetyIncident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Incident not found")
    return inc


@router.post("/incidents/{incident_id}/ack", response_model=IncidentStatus)
def acknowledge(incident_id: int, payload: AckRequest, db: Session = Depends(deps.get_db)) -> Any:
    """A nearby responder taps 'I'm aware' / 'I'm responding'. Idempotent."""
    inc = _get_incident(db, incident_id)
    ack = (
        db.query(SafetyAck)
        .filter(SafetyAck.incident_id == incident_id, SafetyAck.responder_id == payload.responder_id)
        .first()
    )
    if ack is None:
        ack = SafetyAck(incident_id=incident_id, responder_id=payload.responder_id, responding=payload.responding)
        db.add(ack)
    else:
        ack.responding = ack.responding or payload.responding  # never downgrade
    db.commit()
    aware, responding = _ack_counts(db, incident_id)
    return IncidentStatus(
        incident_id=incident_id, status=str(inc.status),
        aware_count=aware, responding_count=responding, share_precise=bool(inc.share_precise),
    )


@router.get("/incidents/{incident_id}/status", response_model=IncidentStatus)
def incident_status(incident_id: int, db: Session = Depends(deps.get_db)) -> Any:
    """Live status for the person who raised it: how many are aware / responding."""
    inc = _get_incident(db, incident_id)
    aware, responding = _ack_counts(db, incident_id)
    return IncidentStatus(
        incident_id=incident_id, status=str(inc.status),
        aware_count=aware, responding_count=responding, share_precise=bool(inc.share_precise),
    )


@router.post("/incidents/{incident_id}/resolve", response_model=IncidentStatus)
def resolve(incident_id: int, payload: ResolveRequest, db: Session = Depends(deps.get_db)) -> Any:
    """The person marks themselves safe (requires the creator's resolve_token)."""
    inc = _get_incident(db, incident_id)
    if not inc.resolve_token or payload.resolve_token != inc.resolve_token:
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Invalid resolve token")
    inc.status = "resolved"
    db.commit()
    aware, responding = _ack_counts(db, incident_id)
    return IncidentStatus(
        incident_id=incident_id, status="resolved",
        aware_count=aware, responding_count=responding, share_precise=bool(inc.share_precise),
    )


@router.post("/incidents/{incident_id}/share", response_model=IncidentStatus)
def toggle_share(incident_id: int, payload: ShareRequest, db: Session = Depends(deps.get_db)) -> Any:
    """The person toggles sharing precise location with responders."""
    inc = _get_incident(db, incident_id)
    if not inc.resolve_token or payload.resolve_token != inc.resolve_token:
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Invalid resolve token")
    inc.share_precise = bool(payload.share_precise)
    db.commit()
    aware, responding = _ack_counts(db, incident_id)
    return IncidentStatus(
        incident_id=incident_id, status=str(inc.status),
        aware_count=aware, responding_count=responding, share_precise=bool(inc.share_precise),
    )


@router.post("/incidents/{incident_id}/photo")
def upload_photo(
    incident_id: int,
    resolve_token: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(deps.get_db),
) -> Any:
    """The person attaches a photo to their SOS (requires their resolve_token)."""
    inc = _get_incident(db, incident_id)
    if not inc.resolve_token or resolve_token != inc.resolve_token:
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Invalid resolve token")
    ext = os.path.splitext(file.filename or "")[1].lower() or ".jpg"
    if ext not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        ext = ".jpg"
    dest_dir = os.path.join(settings.UPLOAD_DIR, "images", "sos")
    os.makedirs(dest_dir, exist_ok=True)
    fname = f"{uuid.uuid4().hex}{ext}"
    with open(os.path.join(dest_dir, fname), "wb") as out:
        shutil.copyfileobj(file.file, out)
    inc.photo_url = f"/static/images/sos/{fname}"
    # A photo strengthens credibility — recompute (advisory only).
    cred = assess_credibility(
        db, float(inc.latitude) if inc.latitude is not None else None,
        float(inc.longitude) if inc.longitude is not None else None,
        inc.note, True, datetime.now().hour,
    )
    inc.credibility_score = cred["score"]
    inc.credibility_level = cred["level"]
    inc.credibility_note = cred["note"]
    db.commit()
    return {"photo_url": inc.photo_url, **cred}


@router.post("/incidents/{incident_id}/messages", response_model=MessageOut)
def post_message(incident_id: int, payload: MessageRequest, db: Session = Depends(deps.get_db)) -> Any:
    """Add a community response message (the 'chat' thread)."""
    _get_incident(db, incident_id)
    text = (payload.text or "").strip()[:500]
    if not text:
        raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail="Empty message")
    msg = SafetyMessage(
        incident_id=incident_id, responder_id=payload.responder_id,
        is_owner=("1" if payload.is_owner else "0"), text=text,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return MessageOut(
        id=int(msg.id), responder_id=msg.responder_id,
        is_owner=(msg.is_owner == "1"), text=msg.text, created_at=msg.created_at,
    )


@router.get("/incidents/{incident_id}/messages", response_model=List[MessageOut])
def list_messages(incident_id: int, db: Session = Depends(deps.get_db)) -> Any:
    """The response thread for an incident, oldest first."""
    rows = (
        db.query(SafetyMessage)
        .filter(SafetyMessage.incident_id == incident_id)
        .order_by(SafetyMessage.created_at.asc())
        .all()
    )
    return [
        MessageOut(id=int(m.id), responder_id=m.responder_id, is_owner=(m.is_owner == "1"),
                   text=m.text, created_at=m.created_at)
        for m in rows
    ]


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
