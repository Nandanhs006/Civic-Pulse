from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, File, Form, UploadFile, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.api import deps
from app.schemas import SuggestionOut, MapIssueOut, SuggestionSyncIn, SuggestionSyncOut
from app.services.suggestion_service import SuggestionService
from app.services import issue_timeline
from app.services.spam_filter import spam_check
from app.db.models.suggestion import Suggestion
from app.db.models.user import User
from pydantic import BaseModel

router = APIRouter()


class AdvanceRequest(BaseModel):
    note: Optional[str] = None


class AssignRequest(BaseModel):
    department: str


@router.post("/", status_code=status.HTTP_201_CREATED)
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

    # AI spam filter: drop obvious test / gibberish entries before they are
    # persisted, so they never count toward any dashboard, map or routing.
    is_spam, reason = spam_check(content)
    if is_spam:
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "is_spam": True,
                "message": (
                    "This looks like a test or non-issue and was not submitted "
                    f"({reason}). If this is a real problem, please add more detail."
                ),
            },
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
    # AI routing: auto-assign a department + advance routine issues; critical /
    # ambiguous ones stay in the MP's review queue.
    try:
        issue_timeline.auto_route(service.db, db_suggestion)
    except Exception as exc:  # noqa: BLE001 — never fail the submission over routing
        print(f"[route] auto-route failed: {exc}")
    return SuggestionOut.model_validate(db_suggestion)


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
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    Public: all geolocated citizen issues for the live map.
    Excludes personal fields (no citizen phone).
    """
    from app.db.models.suggestion import Suggestion
    from app.db.models.constituency import Constituency
    from app.db.models.mp import MP

    results = (
        db.query(
            Suggestion,
            Constituency.state,
            Constituency.name.label("constituency_name"),
            MP.name.label("mp_name"),
        )
        .outerjoin(Constituency, Suggestion.constituency_id == Constituency.id)
        .outerjoin(MP, Constituency.id == MP.constituency_id)
        .filter(Suggestion.latitude.isnot(None), Suggestion.longitude.isnot(None))
        .order_by(Suggestion.created_at.desc())
        .limit(limit)
        .all()
    )

    output = []
    for sug, state, city, mp in results:
        output.append({
            "id": sug.id,
            "latitude": float(sug.latitude) if sug.latitude is not None else None,
            "longitude": float(sug.longitude) if sug.longitude is not None else None,
            "category": sug.category,
            "priority_score": sug.priority_score,
            "status": sug.status,
            "sentiment": sug.sentiment,
            "content": sug.content,
            "english_translation": sug.english_translation,
            "image_url": sug.image_url,
            "constituency_id": sug.constituency_id,
            "created_at": sug.created_at,
            "state": state or "Unknown State",
            "city": city or "Unknown Constituency",
            "mp": mp or "No Representative"
        })
    return output


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


@router.get("/{ident}/timeline")
def get_timeline(ident: str, db: Session = Depends(deps.get_db)) -> Any:
    """Public issue tracking: e-com-style stage timeline by id OR tracking code."""
    s = issue_timeline.resolve_identifier(db, ident)
    if not s:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No issue found for that code"
        )
    return issue_timeline.build_timeline(db, s)


@router.get("/meta/departments")
def list_departments() -> Any:
    """Departments an MP can route issues to, + the default per category."""
    return {"departments": issue_timeline.DEPARTMENTS, "by_category": issue_timeline.DEPT_BY_CATEGORY}


@router.post("/{sid}/assign")
def assign_department(
    sid: str,
    payload: AssignRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """MP / PMO assigns an issue to a government department (moves it to Assigned)."""
    s = db.query(Suggestion).filter(Suggestion.id == sid).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")
    role = getattr(current_user, "role", None)
    actor = "PMO" if role == "pmo" else "MP office"
    return issue_timeline.assign_department(db, s, payload.department, actor=actor)


@router.post("/{sid}/advance")
def advance_stage(
    sid: str,
    payload: AdvanceRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """MP / local body advances an issue to its next stage."""
    s = db.query(Suggestion).filter(Suggestion.id == sid).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")
    role = getattr(current_user, "role", None)
    actor = "PMO" if role == "pmo" else ("MP office" if role == "mp" else "MP office")
    return issue_timeline.advance(db, s, actor=actor, note=payload.note)


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


@router.post("/transcribe")
def transcribe_audio_endpoint(
    audio: UploadFile = File(...),
    service: SuggestionService = Depends(deps.get_suggestion_service),
) -> Any:
    """
    Transcribe raw audio on-the-fly and return the transcription preview + detected language.
    Useful for displaying live translation previews before submission.
    """
    return service.transcribe_audio_preview(audio)


@router.post("/sync", response_model=List[SuggestionSyncOut])
def sync_suggestions_endpoint(
    payload: List[SuggestionSyncIn],
    service: SuggestionService = Depends(deps.get_suggestion_service),
) -> Any:
    """
    Bulk import offline suggestion entries from mobile app cache queue.
    Idempotent logic prevents duplicate logs on connection retries.
    """
    payload_dicts = [item.model_dump() for item in payload]
    return service.sync_suggestions(payload_dicts)


@router.post("/sms/intake")
def sms_intake_webhook(
    From: str = Form(...),
    Body: str = Form(...),
    service: SuggestionService = Depends(deps.get_suggestion_service),
) -> Any:
    """
    Intake SMS reports from telecom gateways.
    Parses format: REPORT [Category] [Description] or raw text content.
    Returns lightweight confirmation text back to the gateway.
    """
    import logging
    logger = logging.getLogger(__name__)

    text = Body.strip()
    category = "General"
    content = text

    # Parse potential keyword prefix: 'REPORT <category> <description>'
    if text.upper().startswith("REPORT"):
        parts = text.split(None, 2)
        if len(parts) >= 3:
            # e.g. REPORT Water Pipe broken -> parts = ['REPORT', 'Water', 'Pipe broken']
            category_candidate = parts[1].strip()
            known_categories = {"Water", "Roads", "Education", "Health", "Sanitation", "Public Spaces", "Electricity", "Safety"}
            matching_cat = next((c for c in known_categories if c.lower() == category_candidate.lower()), None)
            if matching_cat:
                category = matching_cat
                content = parts[2].strip()
            else:
                content = text[7:].strip()
        elif len(parts) == 2:
            content = parts[1].strip()

    try:
        suggestion = service.create_suggestion(
            content=content,
            citizen_phone=From,
            language_code="en",
        )
        short_id = suggestion.id[:8].upper()
        return f"Civic Pulse: Thank you! Report registered. ID: {short_id}. Category: {suggestion.category}."
    except Exception as e:
        logger.error(f"[SMS Webhook] Failed to register suggestion: {e}")
        return "Civic Pulse: Error registering complaint. Please try again later."



