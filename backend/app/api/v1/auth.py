import secrets
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.api import deps
from app.core import security
from app.db.models.user import User
from app.schemas import Token, UserOut, UserCreate, PhoneLoginRequest
from app.services.firebase_auth import verify_phone_token

router = APIRouter()


@router.post("/phone/login", response_model=Token)
def phone_login(payload: PhoneLoginRequest, db: Session = Depends(deps.get_db)) -> Any:
    """Log in / register a citizen via a verified Firebase phone OTP.

    The client confirms the SMS OTP with Firebase and sends us the resulting
    Firebase ID token; we verify it, then create-or-fetch a persistent citizen
    account keyed by the phone number and return our own JWT.
    """
    phone = verify_phone_token(payload.id_token)
    if not phone:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phone verification failed. Please retry the OTP.",
        )

    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        # Synthetic email keeps the JWT subject / lookup path identical to staff
        # accounts; citizens never password-login (unusable random hash).
        synthetic_email = f"{phone.lstrip('+')}@phone.civicpulse"
        user = db.query(User).filter(User.email == synthetic_email).first()
        if not user:
            user = User(
                email=synthetic_email,
                hashed_password=security.get_password_hash(secrets.token_urlsafe(24)),
                full_name=(payload.full_name or "").strip() or "Verified Citizen",
                is_active=True,
                is_admin=False,
                role="citizen",
                phone=phone,
                phone_verified=True,
            )
            db.add(user)
        else:
            user.phone = phone
    user.phone_verified = True
    if payload.full_name and (not user.full_name or user.full_name == "Verified Citizen"):
        user.full_name = payload.full_name.strip()
    db.commit()
    db.refresh(user)

    return {
        "access_token": security.create_access_token(subject=user.email),
        "token_type": "bearer",
    }


@router.post("/login", response_model=Token)
def login_access_token(
    db: Session = Depends(deps.get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, retrieve a JWT access token.
    """
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not security.verify_password(
        form_data.password, str(user.hashed_password)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password",
        )
    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user"
        )
    return {
        "access_token": security.create_access_token(subject=user.email),
        "token_type": "bearer",
    }


@router.post("/register", response_model=UserOut)
def register_user(user_in: UserCreate, db: Session = Depends(deps.get_db)) -> Any:
    """
    Register a new administrative/MP account.
    """
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists.",
        )
    hashed_password = security.get_password_hash(user_in.password)
    db_user = User(
        email=user_in.email,
        hashed_password=hashed_password,
        full_name=user_in.full_name,
        is_active=True,
        is_admin=user_in.is_admin,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.get("/me", response_model=UserOut)
def read_user_me(current_user: User = Depends(deps.get_current_user)) -> Any:
    """
    Retrieve current logged-in user profile details.
    """
    return current_user
