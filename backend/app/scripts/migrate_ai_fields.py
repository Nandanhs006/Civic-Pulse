"""
Migration: Add AI Enhancement Fields to Suggestions Table
==========================================================
Adds 6 new columns to support the AI & ML expansion modules:
  - ai_confidence     (FLOAT)    : Vertex AI classification confidence
  - ai_reasoning      (VARCHAR)  : Structured reasoning from Vertex AI agent
  - image_analysis    (TEXT)     : JSON output from Gemini Vision photo analysis
  - is_duplicate      (BOOLEAN)  : Duplicate detection flag
  - duplicate_of_id   (VARCHAR)  : FK to original suggestion if duplicate
  - embedding_text    (TEXT)     : Serialized Gemini embedding vector

Safe to run multiple times (uses ADD COLUMN IF NOT EXISTS).
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.db.session import engine
from sqlalchemy import text

MIGRATION_SQL = [
    # Module 1: Vertex AI confidence + reasoning
    "ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS ai_confidence FLOAT;",
    "ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS ai_reasoning VARCHAR(500);",
    # Module 3: Gemini Vision image analysis
    "ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS image_analysis TEXT;",
    # Module 4: Duplicate detection
    "ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS duplicate_of_id VARCHAR(36) REFERENCES suggestions(id);",
    "ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS embedding_text TEXT;",
    # Index for fast duplicate lookups
    "CREATE INDEX IF NOT EXISTS idx_suggestions_is_duplicate ON suggestions(is_duplicate);",
    "CREATE INDEX IF NOT EXISTS idx_suggestions_duplicate_of ON suggestions(duplicate_of_id);",
]


def run_migration():
    print("🔄 Running AI Enhancement Migration...")
    with engine.connect() as conn:
        for sql in MIGRATION_SQL:
            try:
                conn.execute(text(sql))
                print(f"  ✅ {sql[:70]}...")
            except Exception as e:
                print(f"  ⚠️  Skipped (likely already exists): {e}")
        conn.commit()
    print("✅ Migration complete: AI enhancement fields added to suggestions table.")


if __name__ == "__main__":
    run_migration()
