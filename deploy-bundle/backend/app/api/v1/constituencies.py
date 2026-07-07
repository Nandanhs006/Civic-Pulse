from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api import deps
from app.schemas import ConstituencyOut
from app.db.models.constituency import Constituency
from app.services.geo_service import GeoService

router = APIRouter()


@router.get("/locate", response_model=ConstituencyOut)
def locate_constituency(
    lat: float, lng: float, db: Session = Depends(deps.get_db)
) -> Any:
    """Resolve GPS coordinates to the exact constituency (point-in-polygon)."""
    cid = GeoService(db).locate_constituency_id(lat, lng)
    if not cid:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No constituency found for these coordinates",
        )
    constituency = db.query(Constituency).filter(Constituency.id == cid).first()
    if not constituency:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return constituency


@router.get("/states", response_model=List[str])
def list_states(db: Session = Depends(deps.get_db)) -> Any:
    """List all states/UTs that have constituencies (powers the picker)."""
    rows = db.query(Constituency.state).distinct().order_by(Constituency.state).all()
    return [r[0] for r in rows]


@router.get("/", response_model=List[ConstituencyOut])
def list_constituencies(
    state: Optional[str] = None, db: Session = Depends(deps.get_db)
) -> Any:
    """List constituencies, optionally filtered by state."""
    q = db.query(Constituency)
    if state:
        q = q.filter(Constituency.state == state)
    return q.order_by(Constituency.name).all()


@router.get("/{constituency_id}/boundary")
def get_constituency_boundary(
    constituency_id: int, db: Session = Depends(deps.get_db)
) -> Any:
    """Return the constituency's boundary as a GeoJSON Feature (for map highlight)."""
    geom = GeoService(db).get_boundary(constituency_id)
    if not geom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No boundary available for this constituency",
        )
    return {
        "type": "Feature",
        "geometry": geom,
        "properties": {"constituency_id": constituency_id},
    }
