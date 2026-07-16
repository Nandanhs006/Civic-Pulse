"""One-off: bundle Bengaluru police station points for the SOS feature.

Filters the national MHA police-station point dataset (via the india-geodata
mirror) down to the Bengaluru districts and writes a small local GeoJSON of
station points used to resolve the nearest station for an SOS ping — offline
and reliable (no dependency on live Overpass at request time).

Note: this is station *locations*, not official jurisdiction polygons (those
aren't in open point data); the app treats "nearest station" as the de-facto
jurisdiction. Dev/data-prep only.
Run:  python -m app.scripts.bundle_bengaluru_police
"""

import json
import os

import httpx

SRC = (
    "https://raw.githubusercontent.com/yashveeeeeeer/india-geodata/main/"
    "data/police/stations/INDIA_POLICE_STATIONS.geojson"
)
OUT = os.path.join(
    os.path.dirname(__file__), "data", "bengaluru_police_stations.geojson"
)
USER_AGENT = "CivicPulse-Police/1.0 (educational hackathon project)"
# MHA district labels that make up Bengaluru urban.
BLR_DISTRICTS = {"BANGALORE CITY", "BANGALORE"}
# Bengaluru city bounding box. The MHA dataset has some rural + a few garbage
# coordinates (e.g. lat ~19 in Maharashtra); clip to keep only city stations.
BLR_BBOX = (77.42, 12.80, 77.80, 13.16)  # minLng, minLat, maxLng, maxLat


def main() -> None:
    with httpx.Client(headers={"User-Agent": USER_AGENT}, timeout=120) as c:
        r = c.get(SRC)
        r.raise_for_status()
        data = r.json()

    feats = []
    for f in data.get("features", []):
        p = f.get("properties", {})
        if p.get("state") != "KARNATAKA":
            continue
        if (p.get("district") or "").upper() not in BLR_DISTRICTS:
            continue
        lat, lng = p.get("latitude"), p.get("longitude")
        if lat is None or lng is None:
            continue
        # Drop rural + garbage-coordinate outliers outside the city bbox.
        minx, miny, maxx, maxy = BLR_BBOX
        if not (minx <= lng <= maxx and miny <= lat <= maxy):
            continue
        feats.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [lng, lat]},
                "properties": {
                    "name": str(p.get("ps", "")).strip().title(),
                    "district": str(p.get("district", "")).strip().title(),
                    "ps_cd": p.get("ps_cd"),
                },
            }
        )

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump({"type": "FeatureCollection", "features": feats}, fh)
    print(f"[done] wrote {len(feats)} Bengaluru police stations -> {OUT} "
          f"({os.path.getsize(OUT)/1e3:.0f} KB)")


if __name__ == "__main__":
    main()
