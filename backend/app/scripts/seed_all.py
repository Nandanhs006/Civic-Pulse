"""One-shot data setup: create tables and seed everything, in the right order.

Runs (each is idempotent, so re-running is safe):
  1. Constituencies + 543 Lok Sabha MPs + PMO/MP logins   (ingest_mps)
  2. Karnataka assembly constituencies + MLAs + civic tier (ingest_mlas)
  3. ~300 demo issues across India for the live map         (seed_demo_issues)

Note: the 4 demographic "wards" and the legacy admin@civicpulse.gov account are
seeded automatically the first time the backend (uvicorn) starts. The PMO login
pmo@civicpulse.gov / pmo@india is created by step 1 here.

Run:  python -m app.scripts.seed_all [demo_issue_count]
"""
import sys

from app.db.base import Base
from app.db.session import engine
from app.scripts import ingest_mps, ingest_mlas, seed_demo_issues


def main() -> None:
    print("== creating tables (if missing) ==")
    Base.metadata.create_all(bind=engine)

    print("\n== [1/3] Constituencies + Lok Sabha MPs ==")
    ingest_mps.main()

    print("\n== [2/3] Karnataka MLAs + local civic tier ==")
    ingest_mlas.main()

    print("\n== [3/3] Demo issues for the live map ==")
    seed_demo_issues.main()  # reads optional count from argv (propagates from here)

    print("\n== seed complete ==")


if __name__ == "__main__":
    main()
