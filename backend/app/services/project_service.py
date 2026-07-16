from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from app.db.models.project import ProposedProject
from app.db.models.constituency import Constituency
from app.db.models.suggestion import Suggestion


# Rough per-category cost multipliers (INR) for the mock estimator.
CATEGORY_COST = {
    "Water": 8_000_000,
    "Roads": 15_000_000,
    "Education": 12_000_000,
    "Health": 20_000_000,
    "Sanitation": 6_000_000,
    "Public Spaces": 5_000_000,
    "Electricity": 10_000_000,
    "Safety": 4_000_000,
    "General": 5_000_000,
}


class ProjectService:
    def __init__(self, db: Session):
        self.db = db

    def get_projects(
        self,
        category: Optional[str] = None,
        constituency_id: Optional[int] = None,
        assembly_constituency_id: Optional[int] = None,
        ward_id: Optional[int] = None,
        state: Optional[str] = None,
    ) -> List[ProposedProject]:
        query = self.db.query(ProposedProject)
        if category:
            query = query.filter(ProposedProject.category == category)
        if constituency_id:
            query = query.filter(ProposedProject.constituency_id == constituency_id)
        if assembly_constituency_id:
            query = query.filter(ProposedProject.assembly_constituency_id == assembly_constituency_id)
        if ward_id:
            query = query.filter(ProposedProject.target_ward_id == ward_id)
        if state:
            query = query.join(Constituency, ProposedProject.constituency_id == Constituency.id).filter(
                Constituency.state == state
            )
        return query.order_by(ProposedProject.priority_score.desc()).all()

    def generate_recommendations(
        self, constituency_id: Optional[int] = None
    ) -> List[ProposedProject]:
        """Generate prioritized project proposals per (constituency, category).

        Scored purely on citizen signal we actually have: request volume,
        average AI priority, and the share of negative-sentiment requests.
        """
        # Aggregate unresolved suggestions by constituency + category.
        q = (
            self.db.query(
                Suggestion.constituency_id,
                Suggestion.category,
                func.count(Suggestion.id).label("total"),
                func.avg(Suggestion.priority_score).label("avg_priority"),
                func.sum(case((Suggestion.sentiment == "Negative", 1), else_=0)).label(
                    "negatives"
                ),
            )
            .filter(Suggestion.status == "Submitted")
            .filter(Suggestion.constituency_id.isnot(None))
            .group_by(Suggestion.constituency_id, Suggestion.category)
        )
        if constituency_id:
            q = q.filter(Suggestion.constituency_id == constituency_id)
        rows = q.all()

        # Cache constituency names for titles.
        cnames = {
            c.id: c.name
            for c in self.db.query(Constituency.id, Constituency.name).all()
        }

        recommendations: List[ProposedProject] = []
        for c_id, category, total, avg_priority, negatives in rows:
            if not category or total == 0:
                continue
            avg_priority = float(avg_priority or 50)
            negatives = int(negatives or 0)
            negative_ratio = negatives / total if total else 0.0

            demand_factor = min(total * 8, 40)
            sentiment_factor = negative_ratio * 20
            priority_score = int(
                min(100, max(10, 0.5 * avg_priority + demand_factor + sentiment_factor))
            )

            cname = cnames.get(c_id, f"Constituency {c_id}")
            title = f"{category} Development Works - {cname}"

            cost = float(CATEGORY_COST.get(category, 5_000_000)) * (1 + 0.1 * total)
            justification = (
                f"{total} unresolved '{category}' request(s) in {cname} with an average "
                f"AI priority of {avg_priority:.0f}/100 and {negatives} negative-sentiment "
                f"report(s). Recommended for sanction under constituency development funds."
            )

            existing = (
                self.db.query(ProposedProject)
                .filter(
                    ProposedProject.title == title,
                    ProposedProject.status == "Proposed",
                )
                .first()
            )
            if existing:
                # Recompute so the score stays consistent with current demand
                # (previously the row was skipped and its score went stale).
                existing.priority_score = priority_score
                existing.supporting_suggestions_count = int(total)
                existing.estimated_cost = cost
                existing.ai_justification = justification
                recommendations.append(existing)
                continue

            new_proj = ProposedProject(
                title=title,
                description=f"Auto-generated from citizen demand analysis: {justification}",
                category=category,
                target_ward_id=None,
                constituency_id=c_id,
                estimated_cost=cost,
                priority_score=priority_score,
                supporting_suggestions_count=int(total),
                ai_justification=justification,
                status="Proposed",
            )
            self.db.add(new_proj)
            recommendations.append(new_proj)

        if recommendations:
            self.db.commit()
        return recommendations
