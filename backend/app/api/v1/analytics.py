from typing import Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.api import deps
from app.schemas import AnalyticsSummary, WardOut
from app.db.models.suggestion import Suggestion
from app.db.models.project import ProposedProject
from app.db.models.ward import Ward

router = APIRouter()


@router.get("/summary", response_model=AnalyticsSummary)
def get_analytics_summary(db: Session = Depends(deps.get_db)) -> Any:
    """
    Get aggregated indicators for the main MP Dashboard. (Public/Admin accessible)
    """
    total_suggestions = db.query(Suggestion).count()
    total_projects = db.query(ProposedProject).count()

    # Category breakdown
    category_data = (
        db.query(Suggestion.category, func.count(Suggestion.id))
        .group_by(Suggestion.category)
        .all()
    )
    category_counts = {cat: count for cat, count in category_data if cat is not None}

    # Sentiment distribution
    sentiment_data = (
        db.query(Suggestion.sentiment, func.count(Suggestion.id))
        .group_by(Suggestion.sentiment)
        .all()
    )
    sentiment_distribution = {sent: count for sent, count in sentiment_data if sent is not None}

    # Unresolved percentage
    unresolved_count = db.query(Suggestion).filter(Suggestion.status == "Submitted").count()
    unresolved_percentage = (
        (unresolved_count / total_suggestions * 100.0)
        if total_suggestions > 0
        else 0.0
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
