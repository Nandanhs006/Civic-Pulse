"""Spam / test-entry detection for citizen submissions.

Drops obvious non-issues (people testing the app, gibberish, keyboard mashing)
BEFORE they are persisted, so they never reach the map, dashboards, routing or
analytics. Deliberately CONSERVATIVE — it must not flag a real grievance; when
unsure it lets the report through. Deterministic core + optional Gemini check.
"""

import re
from typing import Optional, Tuple

from app.core.config import settings

# Explicit test / placeholder phrases (substring match on lowercased text).
_TEST_PHRASES = [
    "test test", "just testing", "testing 123", "this is a test", "just a test",
    "ignore this", "just checking", "sample text", "lorem ipsum", "hello world",
    "asdf", "qwerty", "aaaa", "blah blah", "random text", "dummy", "pls ignore",
    "please ignore", "no issue", "nothing", "na na na",
]
# Single tokens that, if they are essentially the WHOLE message, are spam.
_TEST_TOKENS = {
    "test", "testing", "tested", "hi", "hello", "hey", "ok", "okay", "yo",
    "abc", "abcd", "xyz", "asd", "123", "1234", "12345", "check", "sample",
    "demo", "trial", "spam", ".", "..", "...",
}


def _llm_is_spam(text: str) -> Optional[bool]:
    """Best-effort Gemini check; None unless a key is configured."""
    if settings.MOCK_AI_PIPELINE or not settings.GEMINI_API_KEY:
        return None
    try:
        import google.generativeai as genai  # type: ignore

        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-flash-latest")
        prompt = (
            "Is the following a GENUINE civic/public grievance, or just a test / "
            "spam / gibberish with no real issue? Answer only REAL or SPAM.\n\n"
            + text[:400]
        )
        out = (model.generate_content(prompt).text or "").strip().upper()
        if "SPAM" in out:
            return True
        if "REAL" in out:
            return False
        return None
    except Exception:  # noqa: BLE001 — never block a submission on the AI call
        return None


def spam_check(text: Optional[str]) -> Tuple[bool, str]:
    """Return (is_spam, reason). Conservative: real reports pass through."""
    if not text:
        return (False, "")  # audio-only / empty — nothing to judge here
    t = text.strip().lower()
    compact = re.sub(r"\s+", "", t)

    if len(compact) < 6:
        return (True, "too short to be a real report")

    # Whole message is a single throwaway token.
    if t in _TEST_TOKENS or compact in _TEST_TOKENS:
        return (True, "looks like a test entry")

    for p in _TEST_PHRASES:
        if p in t:
            return (True, "looks like a test / placeholder entry")

    # Keyboard mashing: one char repeated, or almost no distinct characters.
    letters = re.sub(r"[^a-zऀ-ॿ]", "", t)
    if letters and len(set(letters)) <= 2:
        return (True, "repeated / gibberish characters")
    if re.fullmatch(r"(.)\1{4,}", compact):
        return (True, "repeated characters")

    # Very few real words AND no digits/context — likely not a grievance.
    words = re.findall(r"[a-zऀ-ॿ]{3,}", t)
    if len(words) < 2 and not re.search(r"\d", t):
        return (True, "not enough detail to be a real issue")

    llm = _llm_is_spam(text)
    if llm is not None:
        return (llm, "AI flagged this as a non-issue" if llm else "")

    return (False, "")
