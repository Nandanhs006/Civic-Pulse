"""Advisory AI triage for women-safety SOS incidents.

CRITICAL GUARDRAIL: this NEVER suppresses, hides, or downgrades an alert. It only
produces an advisory *credibility* signal (score + one-line rationale) to help
responders and MPs prioritise attention. The lowest level is "unverified", which
still means "treat as real and respond" — the app never calls an SOS "fake".

Core is deterministic and offline (hotspot history, clustering, time, photo,
text keywords). It is optionally augmented by Gemini for the free-text note when
GEMINI_API_KEY is configured (otherwise skipped).
"""

from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.safety_incident import SafetyIncident
from app.services.geo_service import _haversine_km

# Distress cues in the free-text note / transcript (best-effort, English).
_DISTRESS_WORDS = {
    "help", "followed", "following", "follow", "stalk", "stalking", "unsafe",
    "scared", "afraid", "threat", "attack", "attacked", "harass", "harassed",
    "grab", "grabbed", "chase", "chasing", "danger", "emergency", "assault",
    "touch", "touched", "molest", "creep", "trapped", "screaming",
}


def _is_night(hour: int) -> bool:
    return hour >= 20 or hour < 6


def _llm_distress(note: Optional[str]) -> Optional[int]:
    """Best-effort Gemini distress rating 0-15; None unless keys are configured.

    Uses the shared key/model pool so a rate-limited key rotates instead of
    silently degrading the triage.
    """
    from app.services.gemini_client import gemini

    if not note or not gemini.enabled:
        return None
    try:
        prompt = (
            "On a 0-15 scale, how strongly does this message indicate a REAL "
            "personal-safety emergency (0 = none, 15 = severe)? Reply with only "
            "the number.\nMessage: " + note[:400]
        )
        text = gemini.generate_text(prompt)
        digits = "".join(ch for ch in text if ch.isdigit())[:2]
        return max(0, min(15, int(digits or "0")))
    except Exception:  # noqa: BLE001 — never let AI break the SOS path
        return None


def assess(
    db: Session,
    lat: Optional[float],
    lng: Optional[float],
    note: Optional[str],
    has_photo: bool,
    hour: int,
) -> dict:
    """Return {score, level, note} — advisory only. Never suppresses the alert."""
    signals = []
    score = 20  # floor: every SOS starts credible; we never brand one "fake"

    if lat is not None and lng is not None:
        since_30d = datetime.utcnow() - timedelta(days=30)
        past = (
            db.query(SafetyIncident)
            .filter(SafetyIncident.created_at >= since_30d)
            .filter(SafetyIncident.latitude.isnot(None))
            .all()
        )
        near_hist = sum(
            1 for r in past
            if _haversine_km(lat, lng, float(r.latitude), float(r.longitude)) <= 1.0
        )
        if near_hist >= 5:
            score += 30
            signals.append(f"known hotspot ({near_hist} past pings within 1 km)")
        elif near_hist >= 1:
            score += 15
            signals.append(f"{near_hist} past ping(s) nearby")

        since_30m = datetime.utcnow() - timedelta(minutes=30)
        near_recent = sum(
            1 for r in past
            if r.created_at
            and r.created_at.replace(tzinfo=None) >= since_30m
            and _haversine_km(lat, lng, float(r.latitude), float(r.longitude)) <= 1.0
        )
        if near_recent >= 1:
            score += 20
            signals.append(f"{near_recent} other ping(s) nearby in last 30 min")

    if _is_night(hour):
        score += 10
        signals.append("late-night")
    if has_photo:
        score += 12
        signals.append("photo attached")
    if note:
        low = note.lower()
        hits = [w for w in _DISTRESS_WORDS if w in low]
        if hits:
            score += min(18, 6 * len(hits))
            signals.append("distress terms: " + ", ".join(sorted(hits)[:3]))

    llm = _llm_distress(note)
    if llm is not None:
        score += llm
        signals.append("AI text analysis")

    score = max(0, min(100, score))
    if score >= 60:
        level = "corroborated"
    elif score >= 35:
        level = "some-signals"
    else:
        level = "unverified"

    if level == "corroborated":
        rationale = "Corroborated — " + "; ".join(signals) + "."
    elif signals:
        rationale = "Signals — " + "; ".join(signals) + "."
    else:
        rationale = "No corroborating signals yet — treat as real and respond."
    return {"score": score, "level": level, "note": rationale[:290]}
