from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.core.config import settings
from app.core.security import ALGORITHM
from app.db.models.user import User
from app.schemas import TokenData
from app.services.suggestion_service import SuggestionService
from app.services.project_service import ProjectService

reusable_oauth2 = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")
# Same scheme, but does not 401/403 when no token is supplied — for endpoints
# that work anonymously yet do something extra for an authenticated user.
optional_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False
)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(reusable_oauth2)
) -> User:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        token_data = TokenData(username=payload.get("sub"))
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    user = db.query(User).filter(User.email == token_data.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


def get_current_user_optional(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(optional_oauth2),
) -> Optional[User]:
    """Return the logged-in user if a valid token is present, else None.

    Never raises — used by endpoints (e.g. citizen issue submission) that are
    open to anonymous users but grant extra trust to authenticated ones.
    """
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
    except JWTError:
        return None
    if not sub:
        return None
    user = db.query(User).filter(User.email == sub).first()
    if user and user.is_active:
        return user
    return None


def get_pmo_user(current_user: User = Depends(get_current_user)) -> User:
    """Require a PMO super-admin (national oversight)."""
    if getattr(current_user, "role", None) != "pmo" and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="PMO (super-admin) access required",
        )
    return current_user


def resolve_scope(current_user: User, constituency_id: Optional[int]) -> Optional[int]:
    """Return the effective constituency filter for a request.

    - MP users are always locked to their own constituency.
    - PMO users may pass a specific constituency_id, or None to view all.
    """
    if getattr(current_user, "role", None) == "mp":
        cid = getattr(current_user, "constituency_id", None)
        return int(cid) if cid is not None else None
    return constituency_id


def get_suggestion_service(db: Session = Depends(get_db)) -> SuggestionService:
    return SuggestionService(db)


def get_project_service(db: Session = Depends(get_db)) -> ProjectService:
    return ProjectService(db)
