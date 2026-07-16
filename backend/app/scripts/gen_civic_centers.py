"""One-off: generate a DEMO dataset of Bengaluru civic amenities.

These are illustrative points (Bangalore One / Karnataka One / Grama One /
CSC-Aadhaar citizen-service centres, dry-waste collection centres and public
help desks) placed at real Bengaluru localities. They are DEMO data for the
"Near me" feature — not an official directory. Names are marked accordingly.

Run:  python -m app.scripts.gen_civic_centers
"""

import json
import os

OUT = os.path.join(
    os.path.dirname(__file__), "data", "bengaluru_civic_centers.geojson"
)

# (locality, lat, lng) — approximate real coordinates.
LOCALITIES = [
    ("Jayanagar", 12.925, 77.583),
    ("Koramangala", 12.935, 77.624),
    ("Indiranagar", 12.971, 77.640),
    ("Malleshwaram", 13.003, 77.569),
    ("Whitefield", 12.969, 77.749),
    ("Banashankari", 12.925, 77.546),
    ("HSR Layout", 12.911, 77.647),
    ("Marathahalli", 12.956, 77.701),
    ("Rajajinagar", 12.990, 77.552),
    ("Basavanagudi", 12.941, 77.575),
    ("Yelahanka", 13.100, 77.596),
    ("Electronic City", 12.845, 77.660),
    ("BTM Layout", 12.916, 77.610),
    ("JP Nagar", 12.908, 77.585),
    ("KR Puram", 13.007, 77.695),
    ("Hebbal", 13.035, 77.591),
    ("Vijayanagar", 12.972, 77.538),
    ("RT Nagar", 13.020, 77.594),
    ("Bommanahalli", 12.899, 77.622),
    ("Ulsoor", 12.981, 77.621),
]

# category key -> (label, brand name template, which locality indices to place at)
CATEGORIES = {
    "bangalore_one": ("Citizen Service", "Bangalore One - {loc}",
                      [0, 1, 2, 3, 4, 6, 12, 17]),
    "karnataka_one": ("Citizen Service", "Karnataka One - {loc}",
                      [5, 8, 15, 19]),
    "grama_one": ("Rural Service", "Grama One - {loc}", [10, 11, 14]),
    "csc_aadhaar": ("Aadhaar / CSC", "CSC Aadhaar Centre - {loc}",
                    [1, 7, 9, 13, 16, 18]),
    "waste": ("Dry Waste Centre", "BBMP Dry Waste Collection Centre - {loc}",
              [0, 3, 6, 9, 12, 15, 17]),
    "help": ("Public Help Desk", "Citizen Help Desk - {loc}",
             [2, 5, 10, 14]),
}


def main() -> None:
    feats = []
    fid = 1
    for cat, (label, tmpl, idxs) in CATEGORIES.items():
        for i in idxs:
            loc, lat, lng = LOCALITIES[i]
            # small deterministic offset so co-located categories don't overlap
            off = (fid % 5) * 0.0009
            feats.append(
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [lng + off, lat - off]},
                    "properties": {
                        "id": fid,
                        "category": cat,
                        "category_label": label,
                        "name": tmpl.format(loc=loc),
                        "locality": loc,
                        "demo": True,
                    },
                }
            )
            fid += 1

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": feats}, f)
    print(f"[done] wrote {len(feats)} demo civic centres -> {OUT}")


if __name__ == "__main__":
    main()
