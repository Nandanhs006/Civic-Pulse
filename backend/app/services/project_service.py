from typing import List, Dict, Optional, Any, cast
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.models.project import ProposedProject
from app.db.models.ward import Ward
from app.db.models.suggestion import Suggestion


class ProjectService:
    @staticmethod
    def get_projects(
        db: Session, category: Optional[str] = None
    ) -> List[ProposedProject]:
        query = db.query(ProposedProject)
        if category:
            query = query.filter(ProposedProject.category == category)
        return query.order_by(ProposedProject.priority_score.desc()).all()

    @staticmethod
    def generate_recommendations(db: Session) -> List[ProposedProject]:
        """
        AI-assisted recommendation algorithm to generate and prioritize public projects
        based on citizen request density, infrastructure gap database, and ward sizes.
        """
        # Step 1: Query all wards and current unresolved suggestions count
        wards = db.query(Ward).all()
        if not wards:
            return []

        # Count suggestions by ward and category
        suggestion_counts = (
            db.query(
                Suggestion.ward_id,
                Suggestion.category,
                func.count(Suggestion.id).label("total_count"),
            )
            .filter(Suggestion.status == "Submitted")
            .group_by(Suggestion.ward_id, Suggestion.category)
            .all()
        )

        # Structure counts into nested dictionaries: {ward_id: {category: count}}
        counts_map: Dict[int, Dict[str, int]] = {}
        for s_count in suggestion_counts:
            w_id, cat, total = s_count
            if w_id not in counts_map:
                counts_map[w_id] = {}
            counts_map[w_id][cat] = total

        recommendations = []
        categories = [
            "Water",
            "Roads",
            "Education",
            "Health",
            "Sanitation",
            "Public Spaces",
            "Electricity",
            "Safety",
        ]

        # Step 2: Run prioritization weights for each ward and category combo
        for ward in wards:
            ward_id = int(ward.id)
            ward_counts = counts_map.get(ward_id, {})
            infra_gaps: Dict[str, Any] = cast(Dict[str, Any], ward.infrastructure_gaps or {})

            for category in categories:
                # Calculate Suggestion Density
                sug_count = ward_counts.get(category, 0)
                if sug_count == 0:
                    continue  # Only recommend if there is demand

                area = float(ward.area_sq_km) if ward.area_sq_km else 1.0
                suggestion_density = (sug_count / area) * 10.0  # scale factor

                # Fetch category infrastructure gap index (scale 0 to 10)
                # e.g., "water_supply_hrs" or "school_deficit"
                infra_gap_index = 0.0
                if category == "Water":
                    # deficit if daily water supply hours is low
                    hrs = float(infra_gaps.get("water_supply_hrs", 12))
                    infra_gap_index = max(0.0, (24.0 - hrs) / 2.4)
                elif category == "Roads":
                    infra_gap_index = float(infra_gaps.get("pothole_index", 5))
                elif category == "Education":
                    infra_gap_index = (
                        float(infra_gaps.get("school_ratio_deficit", 0.5)) * 10.0
                    )
                else:
                    infra_gap_index = 5.0  # default gap

                # Population factor (larger population needs more projects)
                pop_score = min(float(ward.population) / 10000.0, 10.0)

                # Prioritization formula: P = w1 * suggestion_density + w2 * gap + w3 * pop
                # Weights: w1=0.4, w2=0.4, w3=0.2
                priority_score = int(
                    (0.4 * suggestion_density)
                    + (0.4 * infra_gap_index * 10)
                    + (0.2 * pop_score * 10)
                )
                priority_score = min(max(priority_score, 10), 100)

                # Generate a proposed project if score matches priority target
                title = f"{category} System Upgrade - {ward.name}"

                # Simple mock cost estimates based on ward size & type
                cost_estimate = 500000.00
                if category == "Roads":
                    cost_estimate = float(area) * 250000.00
                elif category == "Water":
                    cost_estimate = float(ward.population) * 15.00

                justification = (
                    f"Recommended upgrade for {category} due to a request volume of {sug_count} "
                    f"unresolved issues in {ward.name}. The ward has an infrastructure gap index of "
                    f"{infra_gap_index:.2f}/10 in this area, impacting a population of {ward.population}."
                )

                # Check if this recommendation already exists to avoid duplicates
                existing = (
                    db.query(ProposedProject)
                    .filter(
                        ProposedProject.title == title,
                        ProposedProject.status == "Proposed",
                    )
                    .first()
                )

                if not existing:
                    new_proj = ProposedProject(
                        title=title,
                        description=f"Automated suggestion based on constituency diagnostics: {justification}",
                        category=category,
                        target_ward_id=ward.id,
                        estimated_cost=cost_estimate,
                        priority_score=priority_score,
                        supporting_suggestions_count=sug_count,
                        ai_justification=justification,
                        status="Proposed",
                    )
                    db.add(new_proj)
                    recommendations.append(new_proj)

        if recommendations:
            db.commit()

        return recommendations


project_service = ProjectService()
