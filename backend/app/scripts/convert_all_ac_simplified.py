"""One-off: convert the DataMeet India assembly-constituency shapefile into a
bundled, SIMPLIFIED all-India GeoJSON for the map's AC drill-down layer.

Unlike convert_ac_shapefile.py (Karnataka-only, full precision), this keeps ALL
states but shrinks the payload so ~4,120 ACs are servable:
  - coordinates rounded to 4 decimals (~11 m),
  - consecutive duplicate points (after rounding) dropped,
  - tiny sliver rings removed.

Writes app/scripts/data/india_ac_simplified.geojson with props:
  ac_no, ac_name, pc_name, dist_name, st_name.

Dev/data-prep only (needs `pyshp`); the running app just reads the GeoJSON.
Run:  python -m app.scripts.convert_all_ac_simplified
"""

import json
import os
import tempfile

import httpx
import shapefile  # pyshp

BASE = "https://raw.githubusercontent.com/datameet/maps/master/assembly-constituencies"
PARTS = ["India_AC.shp", "India_AC.dbf", "India_AC.shx"]
OUT = os.path.join(
    os.path.dirname(__file__), "data", "india_ac_simplified.geojson"
)
USER_AGENT = "CivicPulse-AC-Convert/1.0 (educational hackathon project)"
PRECISION = 4


def download(tmpdir: str) -> str:
    with httpx.Client(headers={"User-Agent": USER_AGENT}, timeout=180) as client:
        for part in PARTS:
            dest = os.path.join(tmpdir, part)
            print(f"[dl] {part} ...")
            with client.stream("GET", f"{BASE}/{part}") as r:
                r.raise_for_status()
                with open(dest, "wb") as f:
                    for chunk in r.iter_bytes():
                        f.write(chunk)
    return os.path.join(tmpdir, "India_AC")


def _simplify_ring(ring: list) -> list:
    out: list = []
    last = None
    for pt in ring:
        p = [round(pt[0], PRECISION), round(pt[1], PRECISION)]
        if p != last:
            out.append(p)
            last = p
    # A ring needs >= 4 points (closed); drop degenerate slivers.
    return out if len(out) >= 4 else []


def _simplify_geometry(geom: dict) -> dict:
    t = geom.get("type")
    if t == "Polygon":
        rings = [_simplify_ring(r) for r in geom["coordinates"]]
        rings = [r for r in rings if r]
        return {"type": "Polygon", "coordinates": rings}
    if t == "MultiPolygon":
        polys = []
        for poly in geom["coordinates"]:
            rings = [_simplify_ring(r) for r in poly]
            rings = [r for r in rings if r]
            if rings:
                polys.append(rings)
        return {"type": "MultiPolygon", "coordinates": polys}
    return geom


def main() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        base = download(tmp)
        reader = shapefile.Reader(base, encoding="latin-1")
        fields = [f[0] for f in reader.fields[1:]]
        features = []
        for sr in reader.iterShapeRecords():
            rec = dict(zip(fields, sr.record))
            geom = _simplify_geometry(sr.shape.__geo_interface__)
            if not geom.get("coordinates"):
                continue
            features.append(
                {
                    "type": "Feature",
                    "geometry": geom,
                    "properties": {
                        "ac_no": rec.get("AC_NO"),
                        "ac_name": str(rec.get("AC_NAME", "")).strip(),
                        "pc_name": str(rec.get("PC_NAME", "")).strip(),
                        "dist_name": str(rec.get("DIST_NAME", "")).strip(),
                        "st_name": str(rec.get("ST_NAME", "")).strip(),
                    },
                }
            )
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": features}, f)
    size = os.path.getsize(OUT)
    print(f"[done] wrote {len(features)} ACs -> {OUT} ({size/1e6:.1f} MB)")
    states = sorted({x["properties"]["st_name"] for x in features})
    print(f"[states] {len(states)}: {states[:5]} ...")


if __name__ == "__main__":
    main()
