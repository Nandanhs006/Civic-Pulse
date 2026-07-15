"""
Dialogflow CX Webhook Handler
================================
Processes conversational AI webhook requests from Dialogflow CX agents.
Enables guided multi-turn complaint submission via WhatsApp, SMS, and voice IVR.

Architecture:
  Citizen → WhatsApp/SMS → Dialogflow CX Agent → This Webhook → /api/v1/suggestions (POST)

PITCH-READY: Webhook endpoint is always active. Dialogflow CX agent setup in GCP console
required to activate the conversational channel — no credentials needed for the webhook itself.

Supported Intent Handlers:
  - civic.welcome          → Greeting + language selection
  - civic.complaint.start  → Ask for complaint type
  - civic.complaint.detail → Collect description
  - civic.complaint.submit → Create suggestion via internal API
  - civic.status.check     → Look up existing complaint by ID
"""

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Response builder helpers ───────────────────────────────────────────────────

def dialogflow_response(
    fulfillment_text: str,
    session_params: Optional[Dict[str, Any]] = None,
    end_conversation: bool = False,
) -> Dict[str, Any]:
    """Build a valid Dialogflow CX webhook response payload."""
    response: Dict[str, Any] = {
        "fulfillmentResponse": {
            "messages": [
                {"text": {"text": [fulfillment_text]}}
            ]
        }
    }
    if session_params:
        response["sessionInfo"] = {"parameters": session_params}
    if end_conversation:
        response["fulfillmentResponse"]["mergeBehavior"] = "REPLACE"
    return response


# ── Intent → Category map ──────────────────────────────────────────────────────
INTENT_CATEGORY_MAP = {
    "water":        "Water",
    "road":         "Roads",
    "pothole":      "Roads",
    "school":       "Education",
    "health":       "Health",
    "doctor":       "Health",
    "garbage":      "Sanitation",
    "toilet":       "Sanitation",
    "light":        "Electricity",
    "electricity":  "Electricity",
    "park":         "Public Spaces",
    "safety":       "Safety",
    "crime":        "Safety",
}


def detect_category_from_text(text: str) -> str:
    """Simple keyword → category mapper for conversational intake."""
    lower = text.lower()
    for keyword, category in INTENT_CATEGORY_MAP.items():
        if keyword in lower:
            return category
    return "General"


# ── Webhook endpoint ───────────────────────────────────────────────────────────

@router.post("/webhook", tags=["Dialogflow"])
async def dialogflow_webhook(request: Request) -> JSONResponse:
    """
    Dialogflow CX Fulfillment Webhook.

    Receives POST requests from Dialogflow CX when the agent needs to:
    - Fetch live data (constituency, complaint status)
    - Submit a complaint to the Civic Pulse database

    Always returns a valid Dialogflow response — never raises HTTP errors
    that would break the conversational flow for the citizen.
    """
    try:
        body = await request.json()
    except Exception:
        logger.error("[Dialogflow] Failed to parse webhook body.")
        return JSONResponse(
            content=dialogflow_response(
                "Sorry, I could not understand your request. Please try again."
            )
        )

    # Extract Dialogflow request fields safely
    intent_name: str = ""
    session_params: Dict[str, Any] = {}
    user_text: str = ""

    try:
        intent_info = body.get("intentInfo", {})
        intent_name = intent_info.get("displayName", "").lower()
        session_info = body.get("sessionInfo", {})
        session_params = session_info.get("parameters", {})
        messages = body.get("text", "") or ""
        # Also check fulfillmentInfo for intent name
        fulfillment_info = body.get("fulfillmentInfo", {})
        if not intent_name:
            intent_name = fulfillment_info.get("tag", "").lower()
        user_text = messages if isinstance(messages, str) else ""
        logger.info(f"[Dialogflow] Webhook received: intent='{intent_name}' params={list(session_params.keys())}")
    except Exception as e:
        logger.warning(f"[Dialogflow] Error parsing request fields: {e}")

    # ── Intent Routing ─────────────────────────────────────────────────────────

    # 1. Welcome / Default
    if not intent_name or "welcome" in intent_name or "default" in intent_name:
        return JSONResponse(content=dialogflow_response(
            "Welcome to Civic Pulse! 🏛️\n"
            "You can:\n"
            "• Report a civic issue (type 'report')\n"
            "• Check complaint status (type 'status')\n"
            "What would you like to do today?"
        ))

    # 2. Start complaint
    if "complaint" in intent_name and "start" in intent_name:
        return JSONResponse(content=dialogflow_response(
            "Please describe the issue in your area. "
            "You can write in Hindi, Tamil, Telugu, Bengali, or English.\n\n"
            "Example: 'There is no water supply in our street for 3 days.'"
        ))

    # 3. Collect complaint detail → auto-classify
    if "complaint" in intent_name and "detail" in intent_name:
        description = session_params.get("complaint_text", user_text or "civic issue reported")
        category = detect_category_from_text(description)
        return JSONResponse(content=dialogflow_response(
            f"Got it! I've classified your issue as: *{category}*\n\n"
            f"Your complaint: \"{description}\"\n\n"
            "Shall I submit this? Reply 'yes' to confirm or 'edit' to change.",
            session_params={"detected_category": category, "complaint_text": description}
        ))

    # 4. Submit complaint via internal service
    if "submit" in intent_name or ("complaint" in intent_name and "confirm" in intent_name):
        description = session_params.get("complaint_text", "Issue reported via Dialogflow")
        category = session_params.get("detected_category", "General")
        phone = session_params.get("phone", None)

        try:
            # Import and call suggestion service directly
            from app.db.session import SessionLocal
            from app.services.suggestion_service import SuggestionService
            from app.services.location_service import LocationService
            from app.services.geo_service import GeoService

            db = SessionLocal()
            try:
                svc = SuggestionService(db=db)
                suggestion = svc.create_suggestion(
                    content=description,
                    citizen_phone=str(phone) if phone else None,
                    language_code="en",
                )
                short_id = suggestion.id[:8].upper()
                return JSONResponse(content=dialogflow_response(
                    f"✅ Your complaint has been registered!\n\n"
                    f"📋 Reference ID: *{short_id}*\n"
                    f"📂 Category: {suggestion.category or category}\n"
                    f"⚡ Priority: {suggestion.priority_score}/100\n\n"
                    f"Your MP's office has been notified. "
                    f"Save your ID to track progress. Thank you! 🙏",
                    end_conversation=True,
                ))
            finally:
                db.close()

        except Exception as e:
            logger.error(f"[Dialogflow] Failed to create suggestion via webhook: {e}")
            return JSONResponse(content=dialogflow_response(
                "Your complaint has been noted. However, our system is temporarily busy. "
                "Please try again in a moment or visit civicpulse.gov for direct submission."
            ))

    # 5. Status check
    if "status" in intent_name:
        complaint_id = session_params.get("complaint_id", "").upper()
        if not complaint_id:
            return JSONResponse(content=dialogflow_response(
                "Please provide your complaint reference ID (the 8-character code you received)."
            ))
        try:
            from app.db.session import SessionLocal
            from app.db.models.suggestion import Suggestion
            db = SessionLocal()
            try:
                suggestion = db.query(Suggestion).filter(
                    Suggestion.id.like(f"{complaint_id.lower()}%")
                ).first()
                if suggestion:
                    return JSONResponse(content=dialogflow_response(
                        f"📋 Complaint {complaint_id}:\n"
                        f"Status: *{suggestion.status}*\n"
                        f"Category: {suggestion.category}\n"
                        f"Submitted: {suggestion.created_at.strftime('%d %b %Y') if suggestion.created_at else 'N/A'}\n"
                        f"Dispatch: {suggestion.dispatch_status}"
                    ))
                else:
                    return JSONResponse(content=dialogflow_response(
                        f"No complaint found with ID '{complaint_id}'. "
                        "Please check the ID and try again."
                    ))
            finally:
                db.close()
        except Exception as e:
            logger.error(f"[Dialogflow] Status check failed: {e}")
            return JSONResponse(content=dialogflow_response(
                "Could not retrieve status right now. Please try again shortly."
            ))

    # ── Default fallthrough ────────────────────────────────────────────────────
    logger.info(f"[Dialogflow] Unhandled intent: '{intent_name}' — returning default response.")
    return JSONResponse(content=dialogflow_response(
        "I'm here to help with civic issues. You can report a problem or check complaint status. "
        "Type 'report' or 'status' to get started."
    ))
