"""Tests for the constituency boundary endpoints used by the live map."""


def test_boundaries_returns_feature_collection(client):
    r = client.get("/api/v1/constituencies/boundaries")
    assert r.status_code == 200
    fc = r.json()
    assert fc["type"] == "FeatureCollection"
    assert len(fc["features"]) > 0
    f0 = fc["features"][0]
    assert f0["type"] == "Feature"
    assert f0["geometry"]["type"] in ("Polygon", "MultiPolygon")
    props = f0["properties"]
    assert {"constituency_id", "name", "state"} <= set(props.keys())


def test_boundaries_state_filter(client):
    all_fc = client.get("/api/v1/constituencies/boundaries").json()
    ka_fc = client.get(
        "/api/v1/constituencies/boundaries", params={"state": "Karnataka"}
    ).json()
    assert 0 < len(ka_fc["features"]) < len(all_fc["features"])
    assert all(
        f["properties"]["state"] == "Karnataka" for f in ka_fc["features"]
    )
