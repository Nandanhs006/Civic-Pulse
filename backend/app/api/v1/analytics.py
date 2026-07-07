from typing import Any, List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.api import deps
from app.schemas import AnalyticsSummary, WardOut
from app.db.models.suggestion import Suggestion
from app.db.models.project import ProposedProject
from app.db.models.ward import Ward
from app.db.models.user import User

router = APIRouter()


@router.get("/summary", response_model=AnalyticsSummary)
def get_analytics_summary(
    constituency_id: Optional[int] = None,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get aggregated indicators for the dashboards. MPs are auto-scoped to their own
    constituency; the PMO may pass constituency_id or see the national picture.
    """
    scoped = deps.resolve_scope(current_user, constituency_id)

    def scope_s(q):
        return q.filter(Suggestion.constituency_id == scoped) if scoped else q

    def scope_p(q):
        return q.filter(ProposedProject.constituency_id == scoped) if scoped else q

    total_suggestions = scope_s(db.query(Suggestion)).count()
    total_projects = scope_p(db.query(ProposedProject)).count()

    # Category breakdown
    category_data = (
        scope_s(db.query(Suggestion.category, func.count(Suggestion.id)))
        .group_by(Suggestion.category)
        .all()
    )
    category_counts = {cat: count for cat, count in category_data if cat is not None}

    # Sentiment distribution
    sentiment_data = (
        scope_s(db.query(Suggestion.sentiment, func.count(Suggestion.id)))
        .group_by(Suggestion.sentiment)
        .all()
    )
    sentiment_distribution = {
        sent: count for sent, count in sentiment_data if sent is not None
    }

    # Unresolved percentage
    unresolved_count = scope_s(
        db.query(Suggestion).filter(Suggestion.status == "Submitted")
    ).count()
    unresolved_percentage = (
        (unresolved_count / total_suggestions * 100.0) if total_suggestions > 0 else 0.0
    )

    return {
        "total_suggestions": total_suggestions,
        "total_projects": total_projects,
        "category_counts": category_counts,
        "sentiment_distribution": sentiment_distribution,
        "unresolved_percentage": unresolved_percentage,
    }


@router.get("/wards", response_model=List[WardOut])
def get_wards_list(db: Session = Depends(deps.get_db)) -> Any:
    """
    Retrieve all wards with demographic context and infrastructure indicators.
    """
    return db.query(Ward).all()
