from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, File, Form, UploadFile, status
from sqlalchemy.orm import Session
from app.api import deps
from app.schemas import SuggestionOut
from app.services.suggestion_service import suggestion_service
from app.db.models.suggestion import Suggestion
from app.db.models.user import User

router = APIRouter()


@router.post("/", response_model=SuggestionOut, status_code=status.HTTP_201_CREATED)
def submit_suggestion(
    content: Optional[str] = Form(None),
    citizen_phone: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    language_code: str = Form("en"),
    audio: Optional[UploadFile] = File(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    Submit a citizen developmental suggestion.
    Accepts text, location coordinates, voice recording files, and photo attachments.
    """
    if not content and not audio:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either text content or audio voice recording must be provided.",
        )

    db_suggestion = suggestion_service.create_suggestion(
        db=db,
        content=content,
        citizen_phone=citizen_phone,
        language_code=language_code,
        latitude=latitude,
        longitude=longitude,
        audio_file=audio,
        image_file=image,
    )
    return db_suggestion


@router.get("/", response_model=List[SuggestionOut])
def get_suggestions_list(
    category: Optional[str] = None,
    status: Optional[str] = None,
    ward_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve list of citizen suggestions (Admin access required).
    """
    return suggestion_service.get_suggestions(
        db=db, category=category, status=status, ward_id=ward_id, skip=skip, limit=limit
    )


@router.get("/{id}", response_model=SuggestionOut)
def read_suggestion(
    id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get suggestion details by ID (Admin access required).
    """
    suggestion = db.query(Suggestion).filter(Suggestion.id == id).first()
    if not suggestion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Suggestion not found"
        )
    return suggestion
