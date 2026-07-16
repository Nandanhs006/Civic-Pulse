"""Tests for the citizen 'Near me' civic endpoints."""


def test_centers_geojson(client):
    fc = client.get("/api/v1/civic/centers").json()
    assert fc["type"] == "FeatureCollection"
    assert len(fc["features"]) > 10
    cats = {f["properties"]["category"] for f in fc["features"]}
    assert {"bangalore_one", "csc_aadhaar", "waste"} <= cats


def test_near_me_aggregate(client):
    r = client.get("/api/v1/civic/near-me", params={"lat": 12.9352, "lng": 77.6245})
    assert r.status_code == 200
    d = r.json()
    assert {"area", "constituency", "police", "safety", "centers", "summary"} <= set(d.keys())
    assert isinstance(d["centers"], list) and len(d["centers"]) >= 1
    # per-category cap of 2 is respected
    from collections import Counter
    counts = Counter(c["category"] for c in d["centers"])
    assert all(v <= 2 for v in counts.values())
    assert isinstance(d["summary"], str) and len(d["summary"]) > 0
    # bundled police lookup works offline
    assert d["police"] is None or "distance_km" in d["police"]
