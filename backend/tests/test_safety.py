"""Tests for the women-safety SOS ("amplify + inform") endpoints."""


def test_sos_creates_anonymized_incident(client):
    r = client.post(
        "/api/v1/safety/sos",
        json={"latitude": 12.9716, "longitude": 77.5946, "note": "poor lighting"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["logged"] is True
    assert body["incident_id"] > 0
    assert body["emergency_number"] == "112"
    assert "112" in body["message"]
    # Response never echoes personal data.
    assert "phone" not in body and "citizen_phone" not in body


def test_sos_outside_bengaluru_not_logged(client):
    before = client.get("/api/v1/safety/summary").json()["total"]
    # Mumbai coordinates — outside the Bengaluru service area.
    r = client.post(
        "/api/v1/safety/sos", json={"latitude": 19.076, "longitude": 72.8777}
    )
    assert r.status_code == 200
    body = r.json()
    assert body["logged"] is False
    assert body["incident_id"] is None
    assert "112" in body["message"]
    # Nothing was persisted.
    after = client.get("/api/v1/safety/summary").json()["total"]
    assert after == before


def test_sos_without_coordinates_not_logged_but_guides_112(client):
    # No coordinates -> can't confirm Bengaluru, so not logged, but 112 still works.
    r = client.post("/api/v1/safety/sos", json={})
    assert r.status_code == 200
    body = r.json()
    assert body["logged"] is False
    assert body["incident_id"] is None
    assert "112" in body["message"]


def test_summary_and_incidents_reflect_posts(client):
    before = client.get("/api/v1/safety/summary").json()["total"]
    client.post(
        "/api/v1/safety/sos", json={"latitude": 12.97, "longitude": 77.59}
    )
    after = client.get("/api/v1/safety/summary").json()
    assert after["total"] == before + 1
    assert len(after["by_hour"]) == 24
    assert sum(after["by_hour"]) == after["total"]

    pts = client.get("/api/v1/safety/incidents").json()
    assert isinstance(pts, list) and len(pts) >= 1
    assert {"id", "latitude", "longitude", "hour"} <= set(pts[0].keys())


def test_police_stations_bundled(client):
    fc = client.get("/api/v1/safety/police-stations").json()
    assert fc["type"] == "FeatureCollection"
    assert len(fc["features"]) > 100  # ~194 Bengaluru stations
    assert fc["features"][0]["geometry"]["type"] == "Point"


def test_nearby_alerts_radius(client):
    # A ping in Bengaluru...
    client.post("/api/v1/safety/sos", json={"latitude": 12.9756, "longitude": 77.6068})
    # ...is returned for a nearby query...
    near = client.get(
        "/api/v1/safety/nearby-alerts",
        params={"lat": 12.9756, "lng": 77.6068, "radius_km": 3},
    ).json()
    assert len(near) >= 1
    assert {"id", "distance_km", "minutes_ago"} <= set(near[0].keys())
    # ...but not for a far-away query (Delhi).
    far = client.get(
        "/api/v1/safety/nearby-alerts",
        params={"lat": 28.6, "lng": 77.2, "radius_km": 3},
    ).json()
    assert far == []
