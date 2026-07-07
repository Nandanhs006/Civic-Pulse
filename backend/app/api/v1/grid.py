from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api import deps
from app.schemas import GridOfficerOut, GridDispatchInput, SuggestionOut
from app.db.models.grid_officer import GridOfficer
from app.db.models.suggestion import Suggestion
from app.db.models.ward import Ward

router = APIRouter()


@router.get("/officers", response_model=List[GridOfficerOut])
def get_grid_officers(db: Session = Depends(deps.get_db)):
    """
    Get all grid officers and compute their active workloads dynamically.
    """
    officers = db.query(GridOfficer).filter(GridOfficer.is_active.is_(True)).all()

    results = []
    for officer in officers:
        # Count unresolved suggestions assigned to this officer
        active_cases = (
            db.query(Suggestion)
            .filter(
                Suggestion.assigned_officer_id == officer.id,
                Suggestion.dispatch_status != "Resolved",
            )
            .count()
        )

        results.append(
            GridOfficerOut(
                id=officer.id,
                name=officer.name,
                email=officer.email,
                phone=officer.phone,
                avatar_url=officer.avatar_url,
                is_active=officer.is_active,
                ward_id=officer.ward_id,
                active_cases=active_cases,
            )
        )

    return results


@router.post("/dispatch", response_model=SuggestionOut)
def dispatch_suggestion(payload: GridDispatchInput, db: Session = Depends(deps.get_db)):
    """
    Assign a suggestion to a Grid Officer and update status.
    """
    suggestion = (
        db.query(Suggestion).filter(Suggestion.id == payload.suggestion_id).first()
    )
    if not suggestion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Suggestion not found.",
        )

    officer = db.query(GridOfficer).filter(GridOfficer.id == payload.officer_id).first()
    if not officer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grid Officer not found.",
        )

    suggestion.assigned_officer_id = officer.id
    suggestion.dispatch_status = "Dispatched"
    suggestion.status = "Reviewed"  # Advance lifecycle status

    db.commit()
    db.refresh(suggestion)
    return suggestion


@router.get("/my-officer", response_model=Optional[GridOfficerOut])
def get_my_officer(
    latitude: float, longitude: float, db: Session = Depends(deps.get_db)
):
    """
    Determine the matching ward for the given coordinates and return its assigned Grid Officer.
    """
    wards = db.query(Ward).all()
    if not wards:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No wards defined in database.",
        )

    # Use the same deterministic coordinate mapping to assign a ward
    ward_index = int((abs(latitude) + abs(longitude)) * 100) % len(wards)
    target_ward = wards[ward_index]

    # Find the officer assigned to this ward
    officer = (
        db.query(GridOfficer)
        .filter(
            GridOfficer.ward_id == target_ward.id,
            GridOfficer.is_active.is_(True),
        )
        .first()
    )
    if not officer:
        return None

    active_cases = (
        db.query(Suggestion)
        .filter(
            Suggestion.assigned_officer_id == officer.id,
            Suggestion.dispatch_status != "Resolved",
        )
        .count()
    )

    return GridOfficerOut(
        id=officer.id,
        name=officer.name,
        email=officer.email,
        phone=officer.phone,
        avatar_url=officer.avatar_url,
        is_active=officer.is_active,
        ward_id=officer.ward_id,
        active_cases=active_cases,
    )
