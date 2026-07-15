from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, File, Form, UploadFile, status
from sqlalchemy.orm import Session
from app.api import deps
from app.schemas import SuggestionOut, MapIssueOut
from app.services.suggestion_service import SuggestionService
from app.db.models.suggestion import Suggestion
from app.db.models.user import User

router = APIRouter()


@router.post("/", response_model=SuggestionOut, status_code=status.HTTP_201_CREATED)
def submit_suggestion(
    content: Optional[str] = Form(None),
    citizen_phone: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    constituency_id: Optional[int] = Form(None),
    language_code: str = Form("en"),
    audio: Optional[UploadFile] = File(None),
    image: Optional[UploadFile] = File(None),
    service: SuggestionService = Depends(deps.get_suggestion_service),
) -> Any:
    """
    Submit a citizen developmental suggestion.
    Accepts text, location coordinates, the chosen constituency, voice recordings,
    and photo attachments. Routed to the concerned MP by constituency.
    """
    if not content and not audio:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either text content or audio voice recording must be provided.",
        )

    db_suggestion = service.create_suggestion(
        content=content,
        citizen_phone=citizen_phone,
        language_code=language_code,
        latitude=latitude,
        longitude=longitude,
        constituency_id=constituency_id,
        audio_file=audio,
        image_file=image,
    )
    return db_suggestion


@router.get("/", response_model=List[SuggestionOut])
def get_suggestions_list(
    category: Optional[str] = None,
    status: Optional[str] = None,
    ward_id: Optional[int] = None,
    constituency_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    service: SuggestionService = Depends(deps.get_suggestion_service),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve citizen suggestions.
    - MPs auto-scoped to own constituency; duplicates excluded (unique issues only).
    - PMO may pass constituency_id or see all; duplicates excluded by default.
    - Citizens see their own submissions including duplicates.
    """
    scoped = deps.resolve_scope(current_user, constituency_id)
    # MPs and PMO only see unique issues — duplicates filtered out
    exclude_duplicates = current_user.role in ("mp", "pmo", "mla")
    return service.get_suggestions(
        category=category,
        status=status,
        ward_id=ward_id,
        constituency_id=scoped,
        skip=skip,
        limit=limit,
        exclude_duplicates=exclude_duplicates,
    )



@router.get("/map", response_model=List[MapIssueOut])
def get_map_issues(
    limit: int = 5000,
    service: SuggestionService = Depends(deps.get_suggestion_service),
) -> Any:
    """
    Public: all geolocated citizen issues for the live map.
    Excludes personal fields (no citizen phone).
    """
    return service.get_map_issues(limit=limit)


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


@router.get("/duplicates/clusters")
def get_duplicate_clusters(
    constituency_id: Optional[int] = None,
    service: SuggestionService = Depends(deps.get_suggestion_service),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    PMO/MP: Return clusters of duplicate complaints grouped by original issue.
    Useful for understanding true complaint volume vs noise.
    """
    if current_user.role not in ("pmo", "mp", "mla"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to representatives.",
        )
    scoped = deps.resolve_scope(current_user, constituency_id)
    return service.get_duplicate_clusters(constituency_id=scoped)

