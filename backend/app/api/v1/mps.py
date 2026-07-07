from typing import Any, List, Optional, Dict, Tuple
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from app.api import deps
from app.schemas import MPOut
from app.db.models.mp import MP
from app.db.models.constituency import Constituency
from app.db.models.suggestion import Suggestion
from app.db.models.project import ProposedProject
from app.db.models.user import User

router = APIRouter()


def _metrics_maps(
    db: Session,
) -> Tuple[Dict[int, int], Dict[int, int], Dict[int, int]]:
    """Aggregate per-constituency progress metrics in a few grouped queries."""
    s_rows = (
        db.query(
            Suggestion.constituency_id,
            func.count(Suggestion.id),
            func.sum(case((Suggestion.status == "Submitted", 1), else_=0)),
        )
        .group_by(Suggestion.constituency_id)
        .all()
    )
    total_map: Dict[int, int] = {}
    unresolved_map: Dict[int, int] = {}
    for cid, total, unres in s_rows:
        if cid is None:
            continue
        total_map[cid] = int(total)
        unresolved_map[cid] = int(unres or 0)

    p_rows = (
        db.query(ProposedProject.constituency_id, func.count(ProposedProject.id))
        .filter(ProposedProject.status == "Sanctioned")
        .group_by(ProposedProject.constituency_id)
        .all()
    )
    sanctioned_map = {cid: int(c) for cid, c in p_rows if cid is not None}
    return total_map, unresolved_map, sanctioned_map


def _to_out(mp: MP, cname: Optional[str], maps) -> MPOut:
    total_map, unresolved_map, sanctioned_map = maps
    total = total_map.get(mp.constituency_id, 0)
    pending = unresolved_map.get(mp.constituency_id, 0)
    resolved = total - pending
    pct = (pending / total * 100.0) if total else 0.0
    return MPOut(
        id=int(mp.id),
        constituency_id=(
            int(mp.constituency_id) if mp.constituency_id is not None else None
        ),
        constituency_name=cname,
        name=str(mp.name),
        party=str(mp.party) if mp.party is not None else None,
        party_abbr=str(mp.party_abbr) if mp.party_abbr is not None else None,
        state=str(mp.state) if mp.state is not None else None,
        photo_url=str(mp.photo_url) if mp.photo_url is not None else None,
        email=str(mp.email) if mp.email is not None else None,
        wikipedia_url=str(mp.wikipedia_url) if mp.wikipedia_url is not None else None,
        total_suggestions=total,
        resolved_suggestions=resolved,
        pending_suggestions=pending,
        unresolved_percentage=round(pct, 1),
        sanctioned_projects=sanctioned_map.get(mp.constituency_id, 0),
    )


@router.get("/", response_model=List[MPOut])
def list_mps(
    state: Optional[str] = None,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_pmo_user),
) -> Any:
    """All MPs with progress metrics for the PMO command center (PMO only)."""
    maps = _metrics_maps(db)
    q = db.query(MP, Constituency.name).join(
        Constituency, MP.constituency_id == Constituency.id
    )
    if state:
        q = q.filter(MP.state == state)
    q = q.order_by(Constituency.name)
    return [_to_out(mp, cname, maps) for mp, cname in q.all()]


@router.get("/{constituency_id}", response_model=MPOut)
def get_mp(constituency_id: int, db: Session = Depends(deps.get_db)) -> Any:
    """Public: the concerned MP for a constituency (used by the citizen portal)."""
    mp = db.query(MP).filter(MP.constituency_id == constituency_id).first()
    if not mp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No MP found for this constituency",
        )
    c = db.query(Constituency).filter(Constituency.id == constituency_id).first()
    return _to_out(mp, c.name if c else None, _metrics_maps(db))  # type: ignore
