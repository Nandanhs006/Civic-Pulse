"""Central Gemini client with API-key **and** model rotation.

Free-tier Gemini keys rate-limit aggressively (429 / RESOURCE_EXHAUSTED), which
made single-key calls fail under load. This pools MANY keys and a model fallback
chain, so a request keeps trying until something succeeds:

    for model in MODELS:            # cheapest/best first, then fallbacks
        for key in KEYS:            # round-robin start, skipping cooled-down keys
            try -> return

Behaviour
- **Round-robin start**: each call starts at the next key, so load spreads instead
  of hammering key #1 until it's exhausted.
- **Cooldown**: a key that reports quota exhaustion is skipped for a while, so we
  stop wasting calls on it (and it recovers automatically).
- **Model fallback**: if every key is exhausted on one model, the next model is
  tried — a different model often has separate quota.
- **Never fatal**: callers already fall back to the deterministic/mock pipeline;
  we raise only after every (model, key) combo fails.

Configure with either (both are merged + de-duplicated):
    GEMINI_API_KEYS=key1,key2,key3      # the pool (comma or newline separated)
    GEMINI_API_KEY=key1,key2            # legacy; also accepts a comma list
    GEMINI_MODELS=gemini-flash-latest,gemini-2.0-flash   # optional override
"""

from __future__ import annotations

import logging
import re
import threading
import time
from typing import Any, List, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

# How long to skip a key after it reports quota exhaustion.
COOLDOWN_SECONDS = 60.0

# Signals that mean "this key is rate-limited/out of quota" (rotate to the next).
_QUOTA_PATTERNS = re.compile(
    r"429|quota|rate.?limit|resource.?exhausted|too many requests", re.IGNORECASE
)


def _split_keys(raw: Optional[str]) -> List[str]:
    if not raw:
        return []
    return [k.strip() for k in re.split(r"[,\n\s]+", raw) if k.strip()]


def is_quota_error(exc: BaseException) -> bool:
    return bool(_QUOTA_PATTERNS.search(str(exc)))


class GeminiPool:
    """Thread-safe pool of Gemini API keys with model fallback."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._cursor = 0
        self._cooldown_until: dict[str, float] = {}
        self._last_error: Optional[str] = None
        self._calls = 0
        self._rotations = 0

    # ── configuration ────────────────────────────────────────────────────────
    @property
    def keys(self) -> List[str]:
        """All configured keys (GEMINI_API_KEYS + legacy GEMINI_API_KEY), de-duped."""
        pooled = _split_keys(getattr(settings, "GEMINI_API_KEYS", None))
        legacy = _split_keys(settings.GEMINI_API_KEY)
        out: List[str] = []
        for k in pooled + legacy:
            if k not in out:
                out.append(k)
        return out

    @property
    def models(self) -> List[str]:
        return [m.strip() for m in (settings.GEMINI_MODELS or "").split(",") if m.strip()]

    @property
    def enabled(self) -> bool:
        return bool(self.keys) and not settings.MOCK_AI_PIPELINE

    # ── internals ────────────────────────────────────────────────────────────
    def _ordered_keys(self) -> List[str]:
        """Keys starting at the round-robin cursor, cooled-down ones last."""
        keys = self.keys
        if not keys:
            return []
        with self._lock:
            start = self._cursor % len(keys)
            self._cursor = (self._cursor + 1) % len(keys)
        rotated = keys[start:] + keys[:start]
        now = time.time()
        fresh = [k for k in rotated if self._cooldown_until.get(k, 0) <= now]
        cooling = [k for k in rotated if self._cooldown_until.get(k, 0) > now]
        # Try fresh keys first, but still fall back to cooling ones as a last resort.
        return fresh + cooling

    def _penalise(self, key: str) -> None:
        with self._lock:
            self._cooldown_until[key] = time.time() + COOLDOWN_SECONDS
            self._rotations += 1

    def _run(self, fn, *, what: str) -> Any:
        """Try fn(key, model) over every (model, key) combo until one succeeds."""
        keys = self._ordered_keys()
        if not keys:
            raise RuntimeError("[gemini] no API keys configured")
        models = self.models or ["gemini-flash-latest"]

        last_exc: Optional[BaseException] = None
        for model in models:
            for key in keys:
                try:
                    result = fn(key, model)
                    with self._lock:
                        self._calls += 1
                        self._last_error = None
                    return result
                except Exception as exc:  # noqa: BLE001
                    last_exc = exc
                    self._last_error = f"{exc.__class__.__name__}: {exc}"
                    if is_quota_error(exc):
                        self._penalise(key)
                        logger.warning(
                            "[gemini] %s: key …%s rate-limited on %s — rotating",
                            what, key[-4:], model,
                        )
                    else:
                        logger.warning(
                            "[gemini] %s: key …%s failed on %s: %s",
                            what, key[-4:], model, exc,
                        )
        raise last_exc or RuntimeError(f"[gemini] {what} failed on every key/model")

    # ── public API ───────────────────────────────────────────────────────────
    def generate(self, prompt: Any, **kwargs: Any) -> Any:
        """generate_content across the key/model pool. Returns the SDK response."""
        import google.generativeai as genai

        def call(key: str, model: str):
            genai.configure(api_key=key)
            return genai.GenerativeModel(model).generate_content(prompt, **kwargs)

        return self._run(call, what="generate")

    def generate_text(self, prompt: Any, **kwargs: Any) -> str:
        """Convenience: the response text, or '' if the SDK returned nothing."""
        return (self.generate(prompt, **kwargs).text or "").strip()

    def embed(
        self, text: str, model: str = "models/text-embedding-004", **kwargs: Any
    ) -> List[float]:
        """embed_content across the key pool (embeddings use their own model id)."""
        import google.generativeai as genai

        def call(key: str, _model: str):
            genai.configure(api_key=key)
            return genai.embed_content(model=model, content=text, **kwargs)["embedding"]

        # The embedding model is fixed, so this rotates keys only.
        return self._run(call, what="embed")

    def status(self) -> dict:
        now = time.time()
        return {
            "enabled": self.enabled,
            "mock_pipeline": settings.MOCK_AI_PIPELINE,
            "keys_configured": len(self.keys),
            "keys_cooling_down": sum(1 for t in self._cooldown_until.values() if t > now),
            "models": self.models,
            "successful_calls": self._calls,
            "key_rotations": self._rotations,
            "last_error": self._last_error,
        }


# Shared singleton — import this.
gemini = GeminiPool()
