from typing import Any, Dict
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.models.suggestion import Suggestion
from app.db.models.project import ProposedProject
from app.services.issue_timeline import STATUS_TO_STAGE, STAGE_KEYS, STAGE_META

# Statuses that count as "resolved" (the seed/app uses "Completed").
_RESOLVED = ("Completed", "Resolved")


class BigQueryService:

    def __init__(self) -> None:
        self.client = None

    def execute_federated_analytics(self, db: Session) -> Dict[str, Any]:
        """
        Simulate BigQuery Federated Query over Cloud SQL
        EXTERNAL_QUERY("connection-id", "SELECT * FROM suggestions")
        """
        total_suggestions = db.query(Suggestion).count()
        total_projects = db.query(ProposedProject).count()

        # Calculate Category Counts
        category_data = (
            db.query(Suggestion.category, func.count(Suggestion.id))
            .group_by(Suggestion.category)
            .all()
        )
        category_counts = {
            cat: count for cat, count in category_data if cat is not None
        }

        # Calculate Sentiment
        sentiment_data = (
            db.query(Suggestion.sentiment, func.count(Suggestion.id))
            .group_by(Suggestion.sentiment)
            .all()
        )
        sentiment_distribution = {
            sent: count for sent, count in sentiment_data if sent is not None
        }

        # Turnaround time (TAT) over resolved tickets.
        resolved_tickets = (
            db.query(Suggestion).filter(Suggestion.status.in_(_RESOLVED)).all()
        )
        total_days = 0.0
        resolved_count = len(resolved_tickets)
        for ticket in resolved_tickets:
            if ticket.updated_at and ticket.created_at:
                total_days += (ticket.updated_at - ticket.created_at).total_seconds() / 86400.0
        avg_tat_days = (
            round(total_days / resolved_count, 1) if resolved_count > 0 else 0.0
        )

        resolution_rate = (
            round(resolved_count / total_suggestions * 100, 1)
            if total_suggestions > 0 else 0.0
        )

        # Resolution pipeline: how many issues sit at each tracking stage
        # (Received -> Under Review -> Assigned -> In Progress -> Resolved).
        status_rows = (
            db.query(Suggestion.status, func.count(Suggestion.id))
            .group_by(Suggestion.status)
            .all()
        )
        stage_counts = {k: 0 for k in STAGE_KEYS}
        for status, cnt in status_rows:
            stage = STATUS_TO_STAGE.get(status or "", "received")
            if stage in stage_counts:
                stage_counts[stage] += int(cnt)
        pipeline = [
            {"key": k, "label": STAGE_META[k]["label"], "count": stage_counts[k]}
            for k in STAGE_KEYS
        ]

        return {
            "connection_status": "Dashboard Connection (Live Sync)",
            "total_suggestions": total_suggestions,
            "total_projects": total_projects,
            "category_counts": category_counts,
            "sentiment_distribution": sentiment_distribution,
            "avg_tat_days": avg_tat_days,
            "resolution_rate": resolution_rate,
            "pipeline": pipeline,
            "resolved_count": resolved_count,
        }


bigquery_service = BigQueryService()
