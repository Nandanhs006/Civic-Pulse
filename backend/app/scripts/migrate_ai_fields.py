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

Safe to run multiple times. Works for both PostgreSQL and SQLite.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.db.session import engine
from sqlalchemy import text, inspect

# Column definitions (dialect-neutral additions)
COLUMNS_TO_ADD = [
    ("ai_confidence", "FLOAT", None),
    ("ai_reasoning", "VARCHAR(500)", None),
    ("image_analysis", "TEXT", None),
    ("is_duplicate", "BOOLEAN", "DEFAULT FALSE"),
    ("duplicate_of_id", "VARCHAR(36)", "REFERENCES suggestions(id)"),
    ("embedding_text", "TEXT", None),
]


def run_migration():
    print(f"🔄 Running AI Enhancement Migration (Database: {engine.dialect.name})...")
    inspector = inspect(engine)
    existing_cols = {c["name"] for c in inspector.get_columns("suggestions")}

    with engine.connect() as conn:
        # Add missing columns
        for col_name, col_type, col_constraints in COLUMNS_TO_ADD:
            if col_name in existing_cols:
                print(f"  ℹ️ Column {col_name} already exists. Skipping.")
                continue

            alter_sql = f"ALTER TABLE suggestions ADD COLUMN {col_name} {col_type}"
            if col_constraints:
                alter_sql += f" {col_constraints}"
            alter_sql += ";"

            try:
                conn.execute(text(alter_sql))
                print(f"  ✅ Added column: {col_name}")
            except Exception as e:
                print(f"  ⚠️ Error adding column {col_name}: {e}")

        # Add indexes (using IF NOT EXISTS where supported, otherwise try-catch)
        indexes_sql = [
            ("idx_suggestions_is_duplicate", "CREATE INDEX idx_suggestions_is_duplicate ON suggestions(is_duplicate);"),
            ("idx_suggestions_duplicate_of", "CREATE INDEX idx_suggestions_duplicate_of ON suggestions(duplicate_of_id);"),
        ]

        # Get existing index names
        existing_indexes = {idx["name"] for idx in inspector.get_indexes("suggestions")}

        for idx_name, create_sql in indexes_sql:
            if idx_name in existing_indexes:
                print(f"  ℹ️ Index {idx_name} already exists. Skipping.")
                continue
            try:
                conn.execute(text(create_sql))
                print(f"  ✅ Created index: {idx_name}")
            except Exception as e:
                print(f"  ⚠️ Error creating index {idx_name}: {e}")

        conn.commit()
    print("✅ Migration complete: AI enhancement fields checked/added to suggestions table.")


if __name__ == "__main__":
    run_migration()

