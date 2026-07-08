from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api import deps
from app.schemas import WardOfficerOut, WardDispatchInput, SuggestionOut
from app.db.models.ward_officer import WardOfficer
from app.db.models.suggestion import Suggestion
from app.db.models.ward import Ward

router = APIRouter()


@router.get("/officers", response_model=List[WardOfficerOut])
def get_ward_officers(db: Session = Depends(deps.get_db)):
    """
    Get all ward officers and compute their active workloads dynamically.
    """
    officers = db.query(WardOfficer).filter(WardOfficer.is_active.is_(True)).all()

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
            WardOfficerOut(
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
def dispatch_suggestion(payload: WardDispatchInput, db: Session = Depends(deps.get_db)):
    """
    Assign a suggestion to a Ward Officer and update status.
    """
    suggestion = (
        db.query(Suggestion).filter(Suggestion.id == payload.suggestion_id).first()
    )
    if not suggestion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Suggestion not found.",
        )

    officer = db.query(WardOfficer).filter(WardOfficer.id == payload.officer_id).first()
    if not officer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ward Officer not found.",
        )

    suggestion.assigned_officer_id = officer.id
    suggestion.dispatch_status = "Dispatched"
    suggestion.status = "Reviewed"  # Advance lifecycle status

    db.commit()
    db.refresh(suggestion)
    return suggestion


@router.get("/my-officer", response_model=Optional[WardOfficerOut])
def get_my_officer(
    latitude: float, longitude: float, db: Session = Depends(deps.get_db)
):
    """
    Determine the matching ward for the given coordinates and return its assigned Ward Officer.
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
        db.query(WardOfficer)
        .filter(
            WardOfficer.ward_id == target_ward.id,
            WardOfficer.is_active.is_(True),
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

    return WardOfficerOut(
        id=officer.id,
        name=officer.name,
        email=officer.email,
        phone=officer.phone,
        avatar_url=officer.avatar_url,
        is_active=officer.is_active,
        ward_id=officer.ward_id,
        active_cases=active_cases,
    )
