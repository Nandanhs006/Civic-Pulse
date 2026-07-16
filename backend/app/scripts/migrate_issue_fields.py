"""Add issue-workflow fields: suggestions.department + suggestion_events table.

Idempotent. Fresh DBs get this from create_all; existing DBs need the ALTER.
Run:  python -m app.scripts.migrate_issue_fields
"""

from sqlalchemy import text

import app.db.base  # noqa: F401 — registers all models
from app.db.base import Base
from app.db.session import engine

_ALTERS = [
    "ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS department VARCHAR(80)",
]


def main() -> None:
    Base.metadata.create_all(bind=engine)  # creates suggestion_events
    print("[migrate] ensured tables exist (suggestion_events)")
    with engine.begin() as conn:
        for sql in _ALTERS:
            try:
                conn.execute(text(sql))
                print(f"[migrate] ok: {sql.split('ADD COLUMN IF NOT EXISTS')[-1].strip()}")
            except Exception as e:  # noqa: BLE001
                print(f"[migrate] skipped ({e.__class__.__name__})")
    print("[migrate] done")


if __name__ == "__main__":
    main()
