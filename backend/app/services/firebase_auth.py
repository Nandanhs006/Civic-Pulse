"""Firebase Phone-Auth verification.

The web client uses Firebase Phone Authentication to send and confirm the SMS
OTP; it then hands us the resulting **Firebase ID token**. Our only job here is
to VERIFY that token with the Firebase Admin SDK and read the phone number — so
Firebase is used *only* for auth and all data stays in our own DB.

Mock fallback: when no service account is configured (``settings.firebase_enabled``
is False), we accept dev tokens of the form ``mock:<phone>`` so the whole OTP
flow is demoable end-to-end with no keys. Set FIREBASE_SERVICE_ACCOUNT (path to,
or contents of, the service-account JSON) to switch to real verification.
"""

from __future__ import annotations

import json
import os
import re
import threading
from typing import Optional

from app.core.config import settings

_init_lock = threading.Lock()
_initialized = False
_MOCK_PREFIX = "mock:"
_E164 = re.compile(r"^\+?[1-9]\d{6,14}$")


def _normalize_phone(phone: Optional[str]) -> Optional[str]:
    if not phone:
        return None
    p = phone.strip().replace(" ", "").replace("-", "")
    if p and not p.startswith("+"):
        # Default to India (+91) for bare 10-digit numbers.
        digits = re.sub(r"\D", "", p)
        if len(digits) == 10:
            p = "+91" + digits
        elif len(digits) > 10:
            p = "+" + digits
    return p if _E164.match(p) else None


# Diagnostics (no secrets) surfaced via GET /auth/phone/status.
_init_error: Optional[str] = None
_verify_error: Optional[str] = None
_project_id: Optional[str] = None


def _load_service_account() -> dict:
    """Parse the service account from env: a file path, raw JSON, or base64 JSON.

    base64 support avoids the classic env-var pitfall where the private_key's
    newlines get mangled on paste — base64 the whole JSON and it survives intact.
    """
    raw = (settings.FIREBASE_SERVICE_ACCOUNT or "").strip()
    if os.path.isfile(raw):
        with open(raw, "r") as f:
            return json.load(f)
    try:
        return json.loads(raw)
    except Exception:
        import base64

        return json.loads(base64.b64decode(raw).decode("utf-8"))


def _ensure_app() -> bool:
    """Initialise the Firebase Admin app once. Returns True if usable."""
    global _initialized, _init_error, _project_id
    if not settings.firebase_enabled:
        return False
    if _initialized:
        return True
    with _init_lock:
        if _initialized:
            return True
        try:
            import firebase_admin
            from firebase_admin import credentials

            sa = _load_service_account()
            _project_id = sa.get("project_id")
            cred = credentials.Certificate(sa)
            if not firebase_admin._apps:  # type: ignore[attr-defined]
                firebase_admin.initialize_app(cred)
            _initialized = True
            _init_error = None
            return True
        except Exception as exc:  # noqa: BLE001
            _init_error = f"{exc.__class__.__name__}: {exc}"
            print(f"[firebase] init failed, falling back to mock: {_init_error}")
            return False


def verify_phone_token(id_token: str) -> Optional[str]:
    """Verify a Firebase ID token (or mock token) and return an E.164 phone.

    Returns the phone number on success, or None if the token is invalid.
    """
    global _verify_error
    if not id_token:
        return None

    # Mock/dev token: "mock:+919876543210". Only honoured when real Firebase is
    # NOT configured, so it can never bypass verification in production.
    if id_token.startswith(_MOCK_PREFIX):
        if settings.firebase_enabled:
            return None
        return _normalize_phone(id_token[len(_MOCK_PREFIX):])

    if not _ensure_app():
        return None
    try:
        from firebase_admin import auth as fb_auth

        decoded = fb_auth.verify_id_token(id_token)
        phone = _normalize_phone(decoded.get("phone_number"))
        if phone is None:
            _verify_error = f"token verified but no phone_number claim (keys={list(decoded.keys())})"
        else:
            _verify_error = None
        return phone
    except Exception as exc:  # noqa: BLE001
        _verify_error = f"{exc.__class__.__name__}: {exc}"
        print(f"[firebase] token verification failed: {_verify_error}")
        return None


def diagnostics() -> dict:
    """Non-secret status for debugging the OTP chain (no keys are exposed)."""
    # Force a (idempotent) init attempt so the status reflects whether the
    # service account actually loads, even before any OTP has been tried.
    if settings.firebase_enabled:
        _ensure_app()
    return {
        "service_account_configured": settings.firebase_enabled,
        "admin_initialized": _initialized,
        "admin_project_id": _project_id,
        "web_project_id": settings.FIREBASE_PROJECT_ID,
        "init_error": _init_error,
        "last_verify_error": _verify_error,
    }
