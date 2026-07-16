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


def _ensure_app() -> bool:
    """Initialise the Firebase Admin app once. Returns True if usable."""
    global _initialized
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

            raw = settings.FIREBASE_SERVICE_ACCOUNT or ""
            if os.path.isfile(raw):
                cred = credentials.Certificate(raw)
            else:
                cred = credentials.Certificate(json.loads(raw))
            if not firebase_admin._apps:  # type: ignore[attr-defined]
                firebase_admin.initialize_app(cred)
            _initialized = True
            return True
        except Exception as exc:  # noqa: BLE001
            print(f"[firebase] init failed, falling back to mock: {exc}")
            return False


def verify_phone_token(id_token: str) -> Optional[str]:
    """Verify a Firebase ID token (or mock token) and return an E.164 phone.

    Returns the phone number on success, or None if the token is invalid.
    """
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
        return _normalize_phone(decoded.get("phone_number"))
    except Exception as exc:  # noqa: BLE001
        print(f"[firebase] token verification failed: {exc}")
        return None
