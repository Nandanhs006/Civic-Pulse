"""Issue tracking timeline (e-commerce delivery style).

Every citizen issue moves through an ordered pipeline of stages. Each stage
transition is a SuggestionEvent row; the ordered list is the timeline shown to
the citizen (trackable by a short code) and to the MP / local body.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.db.models.suggestion import Suggestion
from app.db.models.suggestion_event import SuggestionEvent

# Ordered pipeline: (key, label, default note, who typically acts).
STAGES = [
    ("received", "Received", "Your report was received", "CivicPulse"),
    ("reviewing", "Under Review", "Reviewed by the MP office", "MP office"),
    ("assigned", "Assigned", "Assigned to the local body / ward", "MP office"),
    ("in_progress", "Work in Progress", "Work sanctioned and underway", "Local body"),
    ("resolved", "Resolved", "Issue resolved", "Local body"),
]
STAGE_KEYS = [s[0] for s in STAGES]
STAGE_META = {s[0]: {"label": s[1], "note": s[2], "actor": s[3]} for s in STAGES}

# Map the stored Suggestion.status to a pipeline stage.
STATUS_TO_STAGE = {
    "Submitted": "received",
    "Processing": "reviewing",
    "Reviewed": "reviewing",
    "Approved": "assigned",
    "Sanctioned": "in_progress",
    "Completed": "resolved",
    "Rejected": "rejected",
}
STAGE_TO_STATUS = {
    "received": "Submitted",
    "reviewing": "Reviewed",
    "assigned": "Approved",
    "in_progress": "Sanctioned",
    "resolved": "Completed",
}

# Government departments an MP can route an issue to, + a sensible default per
# category so the UI can pre-select.
DEPARTMENTS = [
    "BWSSB (Water Supply)",
    "PWD / BBMP Roads",
    "BESCOM (Electricity)",
    "BBMP Solid Waste (Sanitation)",
    "Health Department",
    "Education Department",
    "Horticulture / Parks Dept",
    "Police / Home Department",
    "BBMP General Administration",
]
DEPT_BY_CATEGORY = {
    "Water": "BWSSB (Water Supply)",
    "Roads": "PWD / BBMP Roads",
    "Electricity": "BESCOM (Electricity)",
    "Sanitation": "BBMP Solid Waste (Sanitation)",
    "Health": "Health Department",
    "Education": "Education Department",
    "Public Spaces": "Horticulture / Parks Dept",
    "Safety": "Police / Home Department",
}


def tracking_code(suggestion_id: str) -> str:
    return "CP-" + suggestion_id.replace("-", "")[:8].upper()


def _current_index(status: str) -> int:
    stage = STATUS_TO_STAGE.get(status, "received")
    if stage == "rejected":
        return -1
    return STAGE_KEYS.index(stage)


def _iso(dt) -> Optional[str]:
    return dt.isoformat() if dt else None


def _aware(dt):
    """Coerce a possibly-naive datetime (SQLite) to timezone-aware UTC."""
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _ensure_events(db: Session, s: Suggestion) -> list:
    """Return the issue's events, lazily back-filling a plausible history once.

    Seeded/legacy issues have no events; on first view we synthesise them from
    created_at -> updated_at across the stages already reached, and persist, so
    every issue shows a real timeline and future advances stay consistent.
    """
    events = (
        db.query(SuggestionEvent)
        .filter(SuggestionEvent.suggestion_id == s.id)
        .order_by(SuggestionEvent.created_at.asc())
        .all()
    )
    if events:
        return events

    ci = _current_index(str(s.status))
    start = _aware(s.created_at) or datetime.now(timezone.utc)
    end = _aware(s.updated_at) or datetime.now(timezone.utc)
    if end <= start:
        end = datetime.now(timezone.utc)
    span = (end - start)
    reached = ci if ci >= 0 else 0
    for i in range(reached + 1):
        frac = 0.0 if reached == 0 else i / reached
        ts = start + span * frac
        db.add(SuggestionEvent(
            suggestion_id=s.id, stage=STAGE_KEYS[i],
            note=STAGE_META[STAGE_KEYS[i]]["note"],
            actor=STAGE_META[STAGE_KEYS[i]]["actor"], created_at=ts,
        ))
    if STATUS_TO_STAGE.get(str(s.status)) == "rejected":
        db.add(SuggestionEvent(
            suggestion_id=s.id, stage="rejected",
            note="Closed — could not be actioned", actor="MP office", created_at=end,
        ))
    db.commit()
    return (
        db.query(SuggestionEvent)
        .filter(SuggestionEvent.suggestion_id == s.id)
        .order_by(SuggestionEvent.created_at.asc())
        .all()
    )


def build_timeline(db: Session, s: Suggestion) -> dict:
    events = _ensure_events(db, s)
    ev_at = {}
    for e in events:
        ev_at.setdefault(e.stage, e.created_at)
    ci = _current_index(str(s.status))
    rejected = STATUS_TO_STAGE.get(str(s.status)) == "rejected"

    stages = []
    for idx, key in enumerate(STAGE_KEYS):
        stages.append({
            "key": key,
            "label": STAGE_META[key]["label"],
            "done": (not rejected) and idx <= ci,
            "current": (not rejected) and idx == ci,
            "at": _iso(ev_at.get(key)),
            "actor": STAGE_META[key]["actor"],
        })

    return {
        "id": s.id,
        "tracking_code": tracking_code(s.id),
        "category": s.category,
        "content": s.english_translation or s.content,
        "status": s.status,
        "current_stage": "rejected" if rejected else STAGE_KEYS[max(0, ci)],
        "rejected": rejected,
        "created_at": _iso(s.created_at),
        "department": getattr(s, "department", None),
        "stages": stages,
    }


def advance(db: Session, s: Suggestion, actor: str, note: Optional[str] = None) -> dict:
    """Move the issue to the next stage (MP / local body action)."""
    _ensure_events(db, s)
    ci = _current_index(str(s.status))
    if ci < 0:
        return build_timeline(db, s)  # rejected — terminal
    nxt = ci + 1
    if nxt >= len(STAGE_KEYS):
        return build_timeline(db, s)  # already resolved
    key = STAGE_KEYS[nxt]
    s.status = STAGE_TO_STATUS[key]
    db.add(SuggestionEvent(
        suggestion_id=s.id, stage=key,
        note=note or STAGE_META[key]["note"], actor=actor,
    ))
    db.commit()
    db.refresh(s)
    return build_timeline(db, s)


def needs_review(s: Suggestion) -> bool:
    """Which issues need an MP's judgment (everything else AI handles).

    Critical issues (high priority) that haven't been routed yet, or issues the
    AI can't confidently map to a department, are flagged for the MP.
    """
    ci = _current_index(str(s.status))
    assigned_idx = STAGE_KEYS.index("assigned")
    if ci < 0 or ci >= assigned_idx:  # rejected, or already assigned+ -> handled
        return False
    if not getattr(s, "department", None):
        return True  # AI couldn't route it
    return (s.priority_score or 0) > 75  # critical -> wants MP sign-off


def auto_route(db: Session, s: Suggestion) -> dict:
    """AI routing: pick a department by category and auto-advance the routine,
    non-critical ones to 'Assigned'. Critical/ambiguous ones get a suggested
    department but stay in the MP's review queue."""
    _ensure_events(db, s)
    dept = DEPT_BY_CATEGORY.get(s.category or "")
    if dept and not getattr(s, "department", None):
        s.department = dept
    ci = _current_index(str(s.status))
    assigned_idx = STAGE_KEYS.index("assigned")
    critical = (s.priority_score or 0) > 75
    if dept and not critical and 0 <= ci < assigned_idx:
        s.status = STAGE_TO_STATUS["assigned"]
        db.add(SuggestionEvent(
            suggestion_id=s.id, stage="assigned",
            note=f"Auto-routed to {dept} by AI", actor="AI auto-routing",
        ))
    db.commit()
    db.refresh(s)
    return build_timeline(db, s)


def assign_department(db: Session, s: Suggestion, department: str, actor: str) -> dict:
    """MP routes an issue to a government department (moves it to 'Assigned')."""
    _ensure_events(db, s)
    s.department = department
    ci = _current_index(str(s.status))
    assigned_idx = STAGE_KEYS.index("assigned")
    if 0 <= ci < assigned_idx:
        s.status = STAGE_TO_STATUS["assigned"]
    db.add(SuggestionEvent(
        suggestion_id=s.id, stage="assigned",
        note=f"Assigned to {department}", actor=actor,
    ))
    db.commit()
    db.refresh(s)
    tl = build_timeline(db, s)
    tl["department"] = s.department
    return tl


def resolve_identifier(db: Session, ident: str) -> Optional[Suggestion]:
    """Look up an issue by full id OR its short tracking code (CP-XXXXXXXX)."""
    s = db.query(Suggestion).filter(Suggestion.id == ident).first()
    if s:
        return s
    code = ident.strip().upper()
    if code.startswith("CP-"):
        code = code[3:]
    if code:
        return (
            db.query(Suggestion)
            .filter(Suggestion.id.ilike(code.lower() + "%"))
            .first()
        )
    return None
