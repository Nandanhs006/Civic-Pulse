from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api import deps
from app.schemas import ProjectOut, ProjectUpdate
from app.services.project_service import ProjectService
from app.db.models.project import ProposedProject
from app.db.models.user import User

router = APIRouter()


@router.get("/", response_model=List[ProjectOut])
def get_projects_list(
    category: Optional[str] = None,
    service: ProjectService = Depends(deps.get_project_service),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get recommended and sanctioned development works (Admin access required).
    """
    return service.get_projects(category=category)


@router.post("/recommend", response_model=List[ProjectOut])
def run_project_recommendations(
    service: ProjectService = Depends(deps.get_project_service),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Trigger the AI prioritization model to scan unresolved suggestions, calculate scores,
    and generate project proposals (Admin access required).
    """
    return service.generate_recommendations()


@router.patch("/{id}", response_model=ProjectOut)
def update_project_status(
    id: int,
    project_in: ProjectUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Update project details, such as changing status (Proposed, Sanctioned, Completed) (Admin access required).
    """
    project = db.query(ProposedProject).filter(ProposedProject.id == id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposed project not found",
        )

    if project_in.status is not None:
        setattr(project, "status", project_in.status)
    if project_in.estimated_cost is not None:
        setattr(project, "estimated_cost", project_in.estimated_cost)

    db.commit()
    db.refresh(project)
    return project
