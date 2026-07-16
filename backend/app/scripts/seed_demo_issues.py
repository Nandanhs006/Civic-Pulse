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
import sys
import uuid
from datetime import datetime, timedelta, timezone

from app.db.base import Base  # noqa: F401 (registers models)
from app.db.session import engine, SessionLocal
from app.db.models.suggestion import Suggestion
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

# Curated, category-relevant REAL photos from Wikimedia Commons (stable CDN,
# no API key). Filenames are descriptive so the subject is guaranteed on-topic;
# an issue picks one at random (repetition across issues is fine).
import urllib.parse as _uparse

_COMMONS = "https://commons.wikimedia.org/wiki/Special:FilePath/"
CATEGORY_IMG_FILES = {
    "Water": [
        "Leak_in_rusted_pipe_side_view.jpg",
        "Leak_in_rusted_pipe_bottom_view.jpg",
        "Suspected_Leaking_Water_Pipe_in_Glen_Loth,_Sutherland_-_geograph.org.uk_-_6508585.jpg",
    ],
    "Roads": [
        "Newport_Carisbrooke_Road_pothole_2.JPG",
        "Newport_Carisbrooke_Road_pothole_3.JPG",
        "A_Road_filled_with_potholes.jpg",
        "Pothole.jpg",
    ],
    "Education": [
        "A_Classroom_in_a_Government_Primary_school_in_Kerala.jpg",
        "Classroom_of_Jawaharlal_Nehru_Vidyapith.jpg",
        "Tamil_Nadu_school_kids.jpg",
    ],
    "Health": [
        "Calcutta_Heart_Clinic_&_Hospital_in_Salt_Lake_04.jpg",
        "Ruby_Hall_Clinic.JPG",
        "Calcutta_Heart_Clinic_&_Hospital_in_Salt_Lake_15.jpg",
    ],
    "Sanitation": [
        "Garbage_in_Kathmandu.jpg",
        "Hyderabad_Street_Garbage_collection_2005.jpg",
        "Garbage_1.jpg",
    ],
    "Public Spaces": [
        "Outdoor_gym_in_Telok_Blangah_Hill_Park_01.jpg",
        "Outdoor_gym_in_Telok_Blangah_Hill_Park_04.jpg",
        "Outdoor_gym_in_Telok_Blangah_Hill_Park_03.jpg",
    ],
    "Electricity": [
        "Mere_Lane_lamp_standard_1.jpg",
        "Rome_(Italy),_street_light_--_2013_--_3484.jpg",
        "Streetlamp,_Linz_(P1130861).jpg",
    ],
    "Safety": [
        "Tokyo_Shibuya_Scramble_Crossing_2018-10-09.jpg",
        "Dotonbori,_Osaka,_at_night,_November_2016.jpg",
        "Los_Angeles_(California,_USA),_South_Olive_Street_--_2012_--_4847.jpg",
    ],
}


def _category_images(category: str) -> list:
    files = CATEGORY_IMG_FILES.get(category) or CATEGORY_IMG_FILES["Roads"]
    return [_COMMONS + _uparse.quote(f) + "?width=640" for f in files]


def _category_image(category: str) -> str:
    return random.choice(_category_images(category))


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


def main() -> None:
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 300
    Base.metadata.create_all(bind=engine)
    data = json.load(open(PC_GEOJSON, encoding="utf-8"))
    features = [f for f in data["features"] if f.get("geometry")]

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
                image_url=_category_image(category),
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
