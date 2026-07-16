"""
Embedding & Duplicate Detection Service
=========================================
Uses Gemini text-embedding-004 to generate vector embeddings for citizen complaint text,
then detects near-duplicate submissions via cosine similarity.

REQUIRES: GEMINI_API_KEY (already used by ai_service — no extra credentials needed)
FALLBACK:  If embedding fails, duplicate check is skipped and suggestion saved normally.

Duplicate Logic:
  - On each new submission, generate embedding of the english_translation text
  - Compare against last 500 suggestions in the same constituency (last 7 days)
  - If cosine_similarity > DUPLICATE_THRESHOLD → flag as duplicate, link to original
  - Duplicates are ALWAYS saved — citizens always get a confirmation
  - MP/PMO views filter out is_duplicate=True to show only unique issues
"""

import os
import math
import json
import logging
from typing import Optional, List, Tuple

logger = logging.getLogger(__name__)

# ── Configurable threshold via env var ────────────────────────────────────────
DUPLICATE_THRESHOLD = float(os.environ.get("DUPLICATE_SIMILARITY_THRESHOLD", "0.92"))
DUPLICATE_LOOKBACK_LIMIT = int(os.environ.get("DUPLICATE_LOOKBACK_LIMIT", "500"))

# ── Attempt to load Gemini SDK ─────────────────────────────────────────────────
try:
    import google.generativeai as genai  # type: ignore
    _GENAI_AVAILABLE = True
except ImportError:
    genai = None  # type: ignore
    _GENAI_AVAILABLE = False
    logger.warning("[Embedding] google-generativeai not installed. Duplicate detection disabled.")


def _cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Compute cosine similarity between two equal-length float vectors."""
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    mag_a = math.sqrt(sum(a ** 2 for a in vec_a))
    mag_b = math.sqrt(sum(b ** 2 for b in vec_b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


class EmbeddingService:
    """
    Gemini Embedding API wrapper for semantic duplicate detection.

    Uses model: models/text-embedding-004
    Output dimensions: 768 floats per text chunk.

    All operations are wrapped in try/except — if embedding or similarity check
    fails for any reason, the caller skips duplicate detection silently.
    """

    EMBEDDING_MODEL = "models/text-embedding-004"

    def __init__(self) -> None:
        # Keys/models come from the shared pool (GEMINI_API_KEYS + GEMINI_API_KEY),
        # which rotates on rate limits instead of failing the call.
        from app.services.gemini_client import gemini

        self._pool = gemini
        if not _GENAI_AVAILABLE:
            logger.info("[Embedding] SDK unavailable. Duplicate detection in standby.")
        elif not self._pool.enabled:
            logger.info("[Embedding] No Gemini keys set. Duplicate detection in standby.")
        else:
            logger.info(
                "[Embedding] text-embedding-004 active over %d key(s).",
                len(self._pool.keys),
            )

    @property
    def enabled(self) -> bool:
        return _GENAI_AVAILABLE and self._pool.enabled

    def is_available(self) -> bool:
        return self.enabled

    def generate_embedding(self, text: str) -> Optional[List[float]]:
        """
        Generate a 768-dimensional embedding vector for the given text.

        Args:
            text: The complaint text to embed (use english_translation for consistency).

        Returns:
            List of 768 floats, or None if generation fails.
        """
        if not self.enabled or not text or not text.strip():
            return None

        try:
            return self._pool.embed(
                text.strip(),
                model=self.EMBEDDING_MODEL,
                task_type="SEMANTIC_SIMILARITY",
                request_options={"timeout": 5.0},
            )
        except Exception as e:  # noqa: BLE001 — duplicate detection is best-effort
            logger.error(f"[Embedding] All keys failed to generate embedding: {e}")
            return None

    def serialize_embedding(self, embedding: List[float]) -> str:
        """Serialize embedding list to compact JSON string for DB storage."""
        return json.dumps(embedding, separators=(",", ":"))

    def deserialize_embedding(self, stored: str) -> Optional[List[float]]:
        """Deserialize embedding from DB string back to float list."""
        try:
            return json.loads(stored)
        except Exception:
            return None

    def find_duplicate(
        self,
        new_embedding: List[float],
        candidate_embeddings: List[Tuple[str, str]],
    ) -> Optional[Tuple[str, float]]:
        """
        Check if new_embedding is a near-duplicate of any candidate.

        Args:
            new_embedding:        Embedding of the new complaint.
            candidate_embeddings: List of (suggestion_id, serialized_embedding_string)
                                  from recent suggestions in the same constituency.

        Returns:
            Tuple of (original_suggestion_id, similarity_score) if duplicate found,
            or None if no duplicate exceeds the threshold.
        """
        if not new_embedding or not candidate_embeddings:
            return None

        best_match_id: Optional[str] = None
        best_score: float = 0.0

        for suggestion_id, stored_embedding_str in candidate_embeddings:
            if not stored_embedding_str:
                continue
            candidate_vec = self.deserialize_embedding(stored_embedding_str)
            if not candidate_vec:
                continue
            score = _cosine_similarity(new_embedding, candidate_vec)
            if score > best_score:
                best_score = score
                best_match_id = suggestion_id

        if best_score >= DUPLICATE_THRESHOLD and best_match_id:
            logger.info(
                f"[Embedding] Duplicate detected → original={best_match_id}, "
                f"similarity={best_score:.4f} (threshold={DUPLICATE_THRESHOLD})"
            )
            return (best_match_id, best_score)

        return None

    def status_summary(self) -> str:
        """Human-readable status for health checks."""
        if self.is_available():
            return f"Gemini Embeddings ✅ (model={self.EMBEDDING_MODEL}, threshold={DUPLICATE_THRESHOLD})"
        return "Gemini Embeddings ⏸ (standby — GEMINI_API_KEY not set)"


# ── Singleton ──────────────────────────────────────────────────────────────────
embedding_service = EmbeddingService()
