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

# Module-level caches (built once per process).
_features: Optional[List[dict]] = None
_name_map: Optional[dict] = None
_ac_features: Optional[List[dict]] = None
_ac_name_map: Optional[dict] = None


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


class GeoService:
    def __init__(self, db: Session):
        self.db = db

    def _get_name_map(self) -> dict:
        global _name_map
        if _name_map is not None:
            return _name_map
        m: dict = {}
        for c in self.db.query(Constituency).all():
            m[_norm(c.state) + "|" + _norm(c.name)] = c.id
            m.setdefault(_norm(c.name), c.id)  # name-only fallback
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

    def _get_ac_name_map(self) -> dict:
        global _ac_name_map
        if _ac_name_map is not None:
            return _ac_name_map
        from app.db.models.assembly_constituency import AssemblyConstituency

        m: dict = {}
        for ac in self.db.query(AssemblyConstituency).all():
            m[_norm(ac.state) + "|" + _norm(ac.name)] = ac.id
            m.setdefault(_norm(ac.name), ac.id)
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
