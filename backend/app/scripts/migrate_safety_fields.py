"""Add responder/resolve fields to safety_incidents + create safety_acks.

Idempotent. Needed for existing DBs because create_all only CREATES missing
tables, it never ALTERs an existing one. Fresh DBs get the full schema from
create_all and don't need this. Run:  python -m app.scripts.migrate_safety_fields
"""

from sqlalchemy import text

import app.db.base  # noqa: F401 — registers all models
from app.db.base import Base
from app.db.session import engine

_ALTERS = [
    "ALTER TABLE safety_incidents ADD COLUMN IF NOT EXISTS share_precise BOOLEAN DEFAULT FALSE",
    "ALTER TABLE safety_incidents ADD COLUMN IF NOT EXISTS resolve_token VARCHAR(36)",
    "ALTER TABLE safety_incidents ADD COLUMN IF NOT EXISTS photo_url VARCHAR(512)",
    "ALTER TABLE safety_incidents ADD COLUMN IF NOT EXISTS credibility_score INTEGER",
    "ALTER TABLE safety_incidents ADD COLUMN IF NOT EXISTS credibility_level VARCHAR(20)",
    "ALTER TABLE safety_incidents ADD COLUMN IF NOT EXISTS credibility_note VARCHAR(300)",
]


def main() -> None:
    # 1. Create any missing tables (e.g. safety_acks).
    Base.metadata.create_all(bind=engine)
    print("[migrate] ensured tables exist (safety_acks)")

    # 2. Add the new safety_incidents columns if missing (Postgres).
    with engine.begin() as conn:
        for sql in _ALTERS:
            try:
                conn.execute(text(sql))
                print(f"[migrate] ok: {sql.split('ADD COLUMN IF NOT EXISTS')[-1].strip()}")
            except Exception as e:  # noqa: BLE001 — SQLite lacks IF NOT EXISTS; ignore
                print(f"[migrate] skipped ({e.__class__.__name__})")
    print("[migrate] done")


if __name__ == "__main__":
    main()
