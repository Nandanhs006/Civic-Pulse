"""Precise GPS -> parliamentary constituency resolution via point-in-polygon.

Uses bundled 2019 delimitation boundaries (india_pc_2019_simplified.geojson,
DataMeet) - the same delimitation in force for the 2024 general election.
Polygons are matched to our DB constituencies by (state, name).
"""

import json
import os
import re
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from app.db.models.constituency import Constituency

_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "scripts", "data")
GEOJSON_PATH = os.path.join(_DATA_DIR, "india_pc_2019_simplified.geojson")
AC_GEOJSON_PATH = os.path.join(_DATA_DIR, "karnataka_ac.geojson")
INDIA_AC_GEOJSON_PATH = os.path.join(_DATA_DIR, "india_ac_simplified.geojson")
STATES_GEOJSON_PATH = os.path.join(_DATA_DIR, "india_states.geojson")
OUTLINE_GEOJSON_PATH = os.path.join(_DATA_DIR, "india_outline.geojson")
POLICE_GEOJSON_PATH = os.path.join(_DATA_DIR, "bengaluru_police_stations.geojson")
CIVIC_GEOJSON_PATH = os.path.join(_DATA_DIR, "bengaluru_civic_centers.geojson")

# Module-level caches (built once per process).
_features: Optional[List[dict]] = None
_name_map: Optional[dict] = None
_ac_features: Optional[List[dict]] = None
_ac_name_map: Optional[dict] = None
_boundary_fc: Optional[dict] = None
_india_ac_features: Optional[List[dict]] = None
_base_layers: Optional[dict] = None
_police_fc: Optional[dict] = None
_civic_fc: Optional[dict] = None


def _norm(s: Optional[str]) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower()) if s else ""


def _clean_ac_name(s: str) -> str:
    return re.sub(r"\s*\((SC|ST)\)\s*$", "", s or "").strip()


def _polygon_bbox(geom: dict) -> Tuple[float, float, float, float]:
    xs: List[float] = []
    ys: List[float] = []
    t = geom.get("type")
    rings = []
    if t == "Polygon":
        rings = geom["coordinates"]
    elif t == "MultiPolygon":
        rings = [ring for poly in geom["coordinates"] for ring in poly]
    for ring in rings:
        for pt in ring:
            xs.append(pt[0])
            ys.append(pt[1])
    if not xs:
        return (0.0, 0.0, 0.0, 0.0)
    return (min(xs), min(ys), max(xs), max(ys))


def _point_in_ring(x: float, y: float, ring: list) -> bool:
    inside = False
    n = len(ring)
    j = n - 1
    for i in range(n):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if ((yi > y) != (yj > y)) and (
            x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-15) + xi
        ):
            inside = not inside
        j = i
    return inside


def _geometry_contains(geom: dict, x: float, y: float) -> bool:
    t = geom.get("type")
    if t == "Polygon":
        polys = [geom["coordinates"]]
    elif t == "MultiPolygon":
        polys = geom["coordinates"]
    else:
        return False
    for poly in polys:
        if not poly:
            continue
        # First ring is the outer boundary; the rest are holes.
        if _point_in_ring(x, y, poly[0]) and not any(
            _point_in_ring(x, y, hole) for hole in poly[1:]
        ):
            return True
    return False


def _load_features() -> List[dict]:
    global _features
    if _features is not None:
        return _features
    feats: List[dict] = []
    try:
        with open(GEOJSON_PATH, encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:  # noqa: BLE001
        print(f"[geo] could not load boundaries: {e}")
        _features = []
        return _features
    for feat in data.get("features", []):
        geom = feat.get("geometry")
        props = feat.get("properties", {})
        if not geom:
            continue
        feats.append(
            {
                "bbox": _polygon_bbox(geom),
                "geometry": geom,
                "state": props.get("st_name", ""),
                "name": props.get("pc_name", ""),
            }
        )
    _features = feats
    print(f"[geo] loaded {len(feats)} constituency boundary polygons")
    return _features


def _load_ac_features() -> List[dict]:
    global _ac_features
    if _ac_features is not None:
        return _ac_features
    feats: List[dict] = []
    try:
        with open(AC_GEOJSON_PATH, encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:  # noqa: BLE001
        print(f"[geo] could not load AC boundaries: {e}")
        _ac_features = []
        return _ac_features
    for feat in data.get("features", []):
        geom = feat.get("geometry")
        props = feat.get("properties", {})
        if not geom:
            continue
        feats.append(
            {
                "bbox": _polygon_bbox(geom),
                "geometry": geom,
                "state": "Karnataka",
                "name": _clean_ac_name(props.get("ac_name", "")),
            }
        )
    _ac_features = feats
    print(f"[geo] loaded {len(feats)} assembly-constituency polygons")
    return _ac_features


def _load_india_ac_features() -> List[dict]:
    """All-India assembly-constituency polygons (simplified) for the map layer."""
    global _india_ac_features
    if _india_ac_features is not None:
        return _india_ac_features
    feats: List[dict] = []
    try:
        with open(INDIA_AC_GEOJSON_PATH, encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:  # noqa: BLE001
        print(f"[geo] could not load India AC boundaries: {e}")
        _india_ac_features = []
        return _india_ac_features
    for feat in data.get("features", []):
        geom = feat.get("geometry")
        props = feat.get("properties", {})
        if not geom:
            continue
        feats.append(
            {
                "bbox": _polygon_bbox(geom),
                "geometry": geom,
                "state": props.get("st_name", ""),
                "name": _clean_ac_name(props.get("ac_name", "")),
                "ac_no": props.get("ac_no"),
                "pc_name": props.get("pc_name", ""),
            }
        )
    _india_ac_features = feats
    print(f"[geo] loaded {len(feats)} India AC polygons")
    return _india_ac_features


# Bengaluru bounding box (city + immediate suburbs). The women-safety SOS
# feature is Bengaluru-focused, so incidents are only logged within this box.
BANGALORE_BBOX = (77.30, 12.70, 77.90, 13.25)  # minLng, minLat, maxLng, maxLat


def is_in_bangalore(lat: float, lng: float) -> bool:
    minx, miny, maxx, maxy = BANGALORE_BBOX
    return miny <= lat <= maxy and minx <= lng <= maxx


def _read_fc(path: str) -> dict:
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:  # noqa: BLE001
        print(f"[geo] could not load {os.path.basename(path)}: {e}")
        return {"type": "FeatureCollection", "features": []}


def get_base_layers() -> dict:
    """State polygons + national outline for the map's always-on base layers."""
    global _base_layers
    if _base_layers is None:
        _base_layers = {
            "states": _read_fc(STATES_GEOJSON_PATH),
            "outline": _read_fc(OUTLINE_GEOJSON_PATH),
        }
    return _base_layers


def get_police_stations() -> dict:
    """Bengaluru police station points (GeoJSON) for the map + nearest lookup."""
    global _police_fc
    if _police_fc is None:
        _police_fc = _read_fc(POLICE_GEOJSON_PATH)
    return _police_fc


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    import math

    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(min(1.0, math.sqrt(a)))


def get_civic_centers() -> dict:
    """Bengaluru demo civic-amenity points (GeoJSON) for the map + Near-me card."""
    global _civic_fc
    if _civic_fc is None:
        _civic_fc = _read_fc(CIVIC_GEOJSON_PATH)
    return _civic_fc


def nearby_civic_centers(
    lat: float, lng: float, radius_km: float = 6.0, per_category: int = 2
) -> List[dict]:
    """Nearest demo civic centres near a point, capped per category."""
    scored: List[dict] = []
    for f in get_civic_centers().get("features", []):
        coords = (f.get("geometry") or {}).get("coordinates") or []
        if len(coords) != 2:
            continue
        d = _haversine_km(lat, lng, coords[1], coords[0])
        if d > radius_km:
            continue
        p = f.get("properties", {})
        scored.append(
            {
                "category": p.get("category"),
                "category_label": p.get("category_label"),
                "name": p.get("name"),
                "locality": p.get("locality"),
                "latitude": coords[1],
                "longitude": coords[0],
                "distance_km": round(d, 2),
            }
        )
    scored.sort(key=lambda x: x["distance_km"])
    counts: dict = {}
    out: List[dict] = []
    for s in scored:
        c = s["category"]
        if counts.get(c, 0) >= per_category:
            continue
        counts[c] = counts.get(c, 0) + 1
        out.append(s)
    return out


def nearest_police_station(lat: float, lng: float) -> Optional[dict]:
    """Nearest bundled Bengaluru police station (offline). None if data missing."""
    best = None
    for f in get_police_stations().get("features", []):
        coords = (f.get("geometry") or {}).get("coordinates") or []
        if len(coords) != 2:
            continue
        plng, plat = coords[0], coords[1]
        d = _haversine_km(lat, lng, plat, plng)
        if best is None or d < best["distance_km"]:
            props = f.get("properties", {})
            best = {
                "name": props.get("name") or "Police station",
                "district": props.get("district"),
                "latitude": plat,
                "longitude": plng,
                "distance_km": round(d, 2),
            }
    return best


class GeoService:
    def __init__(self, db: Session):
        self.db = db

    def get_ac_boundaries(
        self,
        state: Optional[str] = None,
        bbox: Optional[Tuple[float, float, float, float]] = None,
    ) -> dict:
        """Assembly-constituency boundaries as a GeoJSON FeatureCollection.

        Because there are ~4,180 ACs nationwide, callers should pass a ``bbox``
        (map viewport: minx,miny,maxx,maxy) and/or ``state`` to bound the payload.
        """
        feats = []
        for f in _load_india_ac_features():
            if state and _norm(f["state"]) != _norm(state):
                continue
            if bbox is not None:
                x0, y0, x1, y1 = f["bbox"]
                bx0, by0, bx1, by1 = bbox
                # Skip features whose bbox does not intersect the query bbox.
                if x1 < bx0 or x0 > bx1 or y1 < by0 or y0 > by1:
                    continue
            feats.append(
                {
                    "type": "Feature",
                    "geometry": f["geometry"],
                    "properties": {
                        "name": f["name"],
                        "ac_no": f["ac_no"],
                        "pc_name": f["pc_name"],
                        "state": f["state"],
                    },
                }
            )
        return {"type": "FeatureCollection", "features": feats}

    def _get_name_map(self) -> dict:
        global _name_map
        if _name_map is not None:
            return _name_map
        m: dict = {}
        for c in self.db.query(Constituency).all():
            state_str = str(c.state) if c.state is not None else ""
            name_str = str(c.name) if c.name is not None else ""
            m[_norm(state_str) + "|" + _norm(name_str)] = c.id
            m.setdefault(_norm(name_str), c.id)  # name-only fallback
        _name_map = m
        return m

    def _match_constituency_id(self, state: str, name: str) -> Optional[int]:
        m = self._get_name_map()
        return m.get(_norm(state) + "|" + _norm(name)) or m.get(_norm(name))

    def locate_constituency_id(
        self, latitude: float, longitude: float
    ) -> Optional[int]:
        """Return the DB constituency id whose boundary contains the point."""
        feats = _load_features()
        x, y = longitude, latitude
        for f in feats:
            x0, y0, x1, y1 = f["bbox"]
            if not (x0 <= x <= x1 and y0 <= y <= y1):
                continue
            if _geometry_contains(f["geometry"], x, y):
                return self._match_constituency_id(f["state"], f["name"])
        return None

    def get_boundary(self, constituency_id: int) -> Optional[dict]:
        """Return the GeoJSON geometry for a constituency, or None if unmapped."""
        for f in _load_features():
            if self._match_constituency_id(f["state"], f["name"]) == constituency_id:
                return f["geometry"]
        return None

    def get_all_boundaries(self, state: Optional[str] = None) -> dict:
        """All PC boundaries as one GeoJSON FeatureCollection for the live map.

        Each feature embeds its matched DB ``constituency_id`` (may be null if
        the polygon has no DB match) so the client can tap a polygon and look up
        the MP without a separate point-in-polygon round trip. Built once and
        cached; ``state`` filters the cached collection by name.
        """
        global _boundary_fc
        if _boundary_fc is None:
            feats = [
                {
                    "type": "Feature",
                    "geometry": f["geometry"],
                    "properties": {
                        "constituency_id": self._match_constituency_id(
                            f["state"], f["name"]
                        ),
                        "name": f["name"],
                        "state": f["state"],
                    },
                }
                for f in _load_features()
            ]
            _boundary_fc = {"type": "FeatureCollection", "features": feats}
        if state:
            sn = _norm(state)
            return {
                "type": "FeatureCollection",
                "features": [
                    ft
                    for ft in _boundary_fc["features"]
                    if _norm(ft["properties"]["state"]) == sn
                ],
            }
        return _boundary_fc

    def _get_ac_name_map(self) -> dict:
        global _ac_name_map
        if _ac_name_map is not None:
            return _ac_name_map
        from app.db.models.assembly_constituency import AssemblyConstituency

        m: dict = {}
        for ac in self.db.query(AssemblyConstituency).all():
            state_str = str(ac.state) if ac.state is not None else ""
            name_str = str(ac.name) if ac.name is not None else ""
            m[_norm(state_str) + "|" + _norm(name_str)] = ac.id
            m.setdefault(_norm(name_str), ac.id)
        _ac_name_map = m
        return m

    def locate_assembly_constituency_id(
        self, latitude: float, longitude: float
    ) -> Optional[int]:
        """Return the DB assembly-constituency id whose boundary contains the point."""
        x, y = longitude, latitude
        for f in _load_ac_features():
            x0, y0, x1, y1 = f["bbox"]
            if not (x0 <= x <= x1 and y0 <= y <= y1):
                continue
            if _geometry_contains(f["geometry"], x, y):
                m = self._get_ac_name_map()
                return m.get(_norm(f["state"]) + "|" + _norm(f["name"])) or m.get(
                    _norm(f["name"])
                )
        return None
