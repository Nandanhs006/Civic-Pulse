"""Seed synthetic citizen issues spread across India for the live map demo.

Places each issue near a random parliamentary-constituency centroid (from the
bundled PC GeoJSON), assigns a constituency, and varies category/severity/
status/sentiment/date so clustering, drill-down, legends and filters are visible.

Issues are marked "[demo]" in content so re-runs don't duplicate them and they
can be removed easily. Run:  python -m app.scripts.seed_demo_issues [count]
"""

import json
import os
import random
import shutil
import sys
import uuid
from datetime import datetime, timedelta, timezone

from app.db.base import Base  # noqa: F401 (registers models)
from app.db.session import engine, SessionLocal
from app.db.models.suggestion import Suggestion
from app.db.models.ward import Ward
from app.core.config import settings
from app.services.geo_service import GeoService, _norm

PC_GEOJSON = os.path.join(
    os.path.dirname(__file__), "data", "india_pc_2019_simplified.geojson"
)
DEMO_MARKER = "[demo]"

CATEGORIES = [
    "Water",
    "Roads",
    "Education",
    "Health",
    "Sanitation",
    "Public Spaces",
    "Electricity",
    "Safety",
]
CONTENT = {
    "Water": "Irregular water supply and broken pipelines in this area.",
    "Roads": "Large potholes on the main road are causing accidents.",
    "Education": "The government school needs more classrooms and teachers.",
    "Health": "The local health centre is short of medicines and staff.",
    "Sanitation": "Garbage is not being collected and drains are overflowing.",
    "Public Spaces": "The community park is poorly maintained and unsafe.",
    "Electricity": "Frequent power cuts and non-working streetlights at night.",
    "Safety": "Unsafe crossing and no streetlights; needs urgent attention.",
}
# status weights (unresolved dominate; some resolved)
STATUSES = (
    ["Submitted"] * 60
    + ["Reviewed"] * 12
    + ["Approved"] * 10
    + ["Sanctioned"] * 8
    + ["Completed"] * 10
)
SENTIMENTS = ["Negative"] * 5 + ["Neutral"] * 3 + ["Positive"] * 2


def _centroid(geom: dict):
    t = geom.get("type")
    if t == "Polygon":
        ring = geom["coordinates"][0]
    elif t == "MultiPolygon":
        ring = geom["coordinates"][0][0]
    else:
        return None
    xs = [p[0] for p in ring]
    ys = [p[1] for p in ring]
    return sum(xs) / len(xs), sum(ys) / len(ys)


def _ensure_sample_image() -> str:
    """Copy a bundled image into uploads so ~some issues show a photo. Returns url."""
    dest_dir = os.path.join(settings.UPLOAD_DIR, "images")
    os.makedirs(dest_dir, exist_ok=True)
    dest = os.path.join(dest_dir, "demo_sample.jpg")
    if not os.path.exists(dest):
        src = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "..",
            "frontend",
            "public",
            "emblems",
            "bbmp.jpg",
        )
        try:
            shutil.copyfile(src, dest)
        except Exception:  # noqa: BLE001
            return ""
    return "/static/images/demo_sample.jpg"


def main() -> None:
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 300
    Base.metadata.create_all(bind=engine)
    data = json.load(open(PC_GEOJSON, encoding="utf-8"))
    features = [f for f in data["features"] if f.get("geometry")]
    sample_img = _ensure_sample_image()

    db = SessionLocal()
    geo = GeoService(db)
    name_map = geo._get_name_map()  # normalized (state|name)->id and name->id
    now = datetime.now(timezone.utc)
    created = 0
    try:
        existing_demo = (
            db.query(Suggestion)
            .filter(Suggestion.content.like(f"{DEMO_MARKER}%"))
            .count()
        )
        if existing_demo:
            print(f"[seed] {existing_demo} demo issues already present; skipping.")
            return
        wards = db.query(Ward).all()
        for _ in range(count):
            feat = random.choice(features)
            c = _centroid(feat["geometry"])
            if not c:
                continue
            lng, lat = c[0] + random.uniform(-0.03, 0.03), c[1] + random.uniform(
                -0.03, 0.03
            )
            props = feat.get("properties", {})
            cid = name_map.get(
                _norm(props.get("st_name")) + "|" + _norm(props.get("pc_name"))
            ) or name_map.get(_norm(props.get("pc_name")))

            # Resolve assembly constituency
            assembly_constituency_id = None
            if lat is not None and lng is not None:
                assembly_constituency_id = geo.locate_assembly_constituency_id(
                    float(lat), float(lng)
                )

            # Resolve ward
            ward_id = None
            if lat is not None and lng is not None and wards:
                ward_index = int((abs(lat) + abs(lng)) * 100) % len(wards)
                ward_id = wards[ward_index].id

            category = random.choice(CATEGORIES)
            status = random.choice(STATUSES)
            issue = Suggestion(
                id=str(uuid.uuid4()),
                content=f"{DEMO_MARKER} {CONTENT[category]}",
                english_translation=f"{DEMO_MARKER} {CONTENT[category]}",
                language_code="en",
                latitude=lat,
                longitude=lng,
                category=category,
                sentiment=random.choice(SENTIMENTS),
                priority_score=random.randint(15, 96),
                status=status,
                constituency_id=cid,
                assembly_constituency_id=assembly_constituency_id,
                ward_id=ward_id,
                image_url=(
                    sample_img if (sample_img and random.random() < 0.15) else None
                ),
                created_at=now
                - timedelta(days=random.randint(0, 60), hours=random.randint(0, 23)),
            )
            db.add(issue)
            created += 1
        db.commit()
        with_cid = (
            db.query(Suggestion)
            .filter(
                Suggestion.content.like(f"{DEMO_MARKER}%"),
                Suggestion.constituency_id.isnot(None),
            )
            .count()
        )
        print(f"[seed] created {created} demo issues ({with_cid} with a constituency).")
    except Exception as e:  # noqa: BLE001
        db.rollback()
        print(f"[seed] error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
