"""MPLADS funds-vs-demand endpoint (per constituency)."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.services.mplads import constituency_mplads

router = APIRouter()


@router.get("/{constituency_id}")
def mplads_for_constituency(
    constituency_id: int, db: Session = Depends(deps.get_db)
) -> Any:
    """MPLADS fund picture + unresolved citizen demand for a constituency."""
    data = constituency_mplads(db, constituency_id)
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Constituency not found"
        )
    return data
