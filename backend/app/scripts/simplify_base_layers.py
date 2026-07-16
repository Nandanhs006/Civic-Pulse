"""One-off: bundle simplified base map layers for the live map.

Produces two small GeoJSON files under app/scripts/data/:
  - india_states.geojson  : state polygons (prop: state) for the state fill/borders
  - india_outline.geojson : the national boundary, drawn dotted on the map

Sources (same open providers we already use elsewhere):
  - states  : geohacker/india  state/india_state.geojson  (prop NAME_1)
  - outline : datameet/maps     Country/india-composite.geojson

Both are downloaded at full precision and shrunk by rounding coordinates and
dropping consecutive duplicates / sliver rings.

Dev/data-prep only. Run:  python -m app.scripts.simplify_base_layers
"""

import json
import os

import httpx

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
STATES_URL = (
    "https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson"
)
OUTLINE_URL = (
    "https://raw.githubusercontent.com/datameet/maps/master/Country/india-composite.geojson"
)
STATES_OUT = os.path.join(DATA_DIR, "india_states.geojson")
OUTLINE_OUT = os.path.join(DATA_DIR, "india_outline.geojson")
USER_AGENT = "CivicPulse-BaseLayers/1.0 (educational hackathon project)"
PRECISION = 2  # ~1.1 km — plenty for always-on state/national base layers


def _fetch(url: str) -> dict:
    with httpx.Client(headers={"User-Agent": USER_AGENT}, timeout=180) as c:
        r = c.get(url)
        r.raise_for_status()
        return r.json()


def _ring(ring: list) -> list:
    out: list = []
    last = None
    for pt in ring:
        p = [round(pt[0], PRECISION), round(pt[1], PRECISION)]
        if p != last:
            out.append(p)
            last = p
    return out if len(out) >= 4 else []


def _geom(geom: dict) -> dict:
    t = geom.get("type")
    if t == "Polygon":
        rings = [r for r in (_ring(r) for r in geom["coordinates"]) if r]
        return {"type": "Polygon", "coordinates": rings}
    if t == "MultiPolygon":
        polys = []
        for poly in geom["coordinates"]:
            rings = [r for r in (_ring(r) for r in poly) if r]
            if rings:
                polys.append(rings)
        return {"type": "MultiPolygon", "coordinates": polys}
    return geom


def main() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)

    print("[dl] states ...")
    states = _fetch(STATES_URL)
    sfeats = []
    for f in states.get("features", []):
        g = _geom(f.get("geometry") or {})
        if not g.get("coordinates"):
            continue
        props = f.get("properties", {})
        sfeats.append(
            {
                "type": "Feature",
                "geometry": g,
                "properties": {"state": props.get("NAME_1") or props.get("ST_NM")},
            }
        )
    with open(STATES_OUT, "w", encoding="utf-8") as fh:
        json.dump({"type": "FeatureCollection", "features": sfeats}, fh)
    print(f"[done] {len(sfeats)} states -> {STATES_OUT} "
          f"({os.path.getsize(STATES_OUT)/1e6:.1f} MB)")

    print("[dl] outline ...")
    outline = _fetch(OUTLINE_URL)
    ofeats = []
    for f in outline.get("features", []):
        g = _geom(f.get("geometry") or {})
        if g.get("coordinates"):
            ofeats.append({"type": "Feature", "geometry": g, "properties": {}})
    with open(OUTLINE_OUT, "w", encoding="utf-8") as fh:
        json.dump({"type": "FeatureCollection", "features": ofeats}, fh)
    print(f"[done] outline -> {OUTLINE_OUT} "
          f"({os.path.getsize(OUTLINE_OUT)/1e6:.1f} MB)")


if __name__ == "__main__":
    main()
