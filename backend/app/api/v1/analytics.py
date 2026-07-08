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
from app.services.bigquery_service import bigquery_service

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


@router.get("/bigquery")
def get_bigquery_federated_analytics(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Execute analytics via Google BigQuery Federated Connection.
    """
    # Only administrative roles are allowed access
    if current_user.role != "pmo":
        return {"error": "Unauthorized Access"}
    return bigquery_service.execute_federated_analytics(db)


from app.db.models.constituency import Constituency
from app.db.models.mp import MP
from app.db.models.mla import MLA


@router.get("/performance")
def get_performance_index(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get governance and resolution performance index scores for all constituencies, MPs, and MLAs.
    """
    if current_user.role != "pmo":
        return {"error": "Unauthorized Access"}

    constituencies = db.query(Constituency).all()
    results = []

    for constituency in constituencies:
        # Find MP
        mp = db.query(MP).filter(MP.constituency_id == constituency.id).first()
        mp_name = mp.name if mp else "Vacant"
        mp_party = mp.party_abbr if mp else "N/A"

        # Find MLA associated with this constituency (or select one representing assembly units)
        mla = db.query(MLA).filter(MLA.state == constituency.state).first()
        mla_name = mla.name if mla else "Local Councillor"

        # Query metrics
        total = (
            db.query(Suggestion)
            .filter(Suggestion.constituency_id == constituency.id)
            .count()
        )
        resolved = (
            db.query(Suggestion)
            .filter(
                Suggestion.constituency_id == constituency.id,
                Suggestion.status == "Resolved",
            )
            .count()
        )

        # Calculate TAT and scores
        open_cases = total - resolved
        resolution_rate = (
            round((resolved / total * 100), 1) if total > 0 else 85.0
        )

        # Governance Score Calculation
        # Combines resolution rate, backlog penalty, and a baseline default
        base_score = 60 + (resolution_rate * 0.3)
        backlog_penalty = min(open_cases * 1.5, 15)
        governance_score = round(
            max(min(base_score - backlog_penalty, 98.0), 45.0), 1
        )

        # Average Turnaround Time (TAT) Mock
        avg_tat_days = round(7.2 - (resolution_rate * 0.03), 1)

        results.append(
            {
                "constituency_id": constituency.id,
                "constituency_name": constituency.name,
                "state": constituency.state,
                "mp_name": mp_name,
                "mp_party": mp_party,
                "mla_name": mla_name,
                "total_cases": total,
                "resolved_cases": resolved,
                "open_cases": open_cases,
                "resolution_rate": resolution_rate,
                "avg_tat_days": avg_tat_days,
                "governance_score": governance_score,
            }
        )

    # Sort results by governance_score descending (Rankings)
    results.sort(key=lambda x: x["governance_score"], reverse=True)
    return results
