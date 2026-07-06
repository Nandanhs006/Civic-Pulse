# Passlib bcrypt compatibility monkeypatch for bcrypt >= 4.0.0
import sys
import types
import bcrypt

# Fake __about__ module
about = types.ModuleType("bcrypt.__about__")
about.__version__ = bcrypt.__version__
sys.modules["bcrypt.__about__"] = about
bcrypt.__about__ = about

# Patch hashpw to truncate passwords to 72 bytes
_original_hashpw = bcrypt.hashpw
def _patched_hashpw(password: bytes, salt: bytes) -> bytes:
    if len(password) > 72:
        password = password[:72]
    return _original_hashpw(password, salt)
bcrypt.hashpw = _patched_hashpw

from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from typing import Any, Union
from jose import jwt
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"


def create_access_token(
    subject: Union[str, Any], expires_delta: Union[timedelta, None] = None
) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)
