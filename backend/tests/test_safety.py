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


def test_sos_responder_and_victim_loop(client):
    # Victim raises SOS in Bengaluru (opts to share precise location).
    r = client.post(
        "/api/v1/safety/sos",
        json={"latitude": 12.9716, "longitude": 77.5946, "share_precise": True},
    )
    body = r.json()
    iid, token = body["incident_id"], body["resolve_token"]
    assert iid and token and body["share_precise"] is True

    # Two distinct responders acknowledge (one is "responding").
    client.post(f"/api/v1/safety/incidents/{iid}/ack", json={"responder_id": "A", "responding": False})
    s = client.post(f"/api/v1/safety/incidents/{iid}/ack", json={"responder_id": "B", "responding": True}).json()
    assert s["aware_count"] == 2 and s["responding_count"] == 1
    # Re-acking the same responder does not double-count.
    s = client.post(f"/api/v1/safety/incidents/{iid}/ack", json={"responder_id": "A", "responding": False}).json()
    assert s["aware_count"] == 2

    # Nearby alert carries counts + precise coords (because victim shared).
    alerts = client.get(
        "/api/v1/safety/nearby-alerts",
        params={"lat": 12.9716, "lng": 77.5946, "radius_km": 3},
    ).json()
    a = next(x for x in alerts if x["id"] == iid)
    assert a["aware_count"] == 2 and a["responding_count"] == 1 and a["precise"] is True

    # Wrong token can't resolve; correct token marks safe.
    assert client.post(f"/api/v1/safety/incidents/{iid}/resolve", json={"resolve_token": "nope"}).status_code == 403
    assert client.post(f"/api/v1/safety/incidents/{iid}/resolve", json={"resolve_token": token}).json()["status"] == "resolved"

    # Resolved alert disappears from nearby.
    alerts2 = client.get(
        "/api/v1/safety/nearby-alerts", params={"lat": 12.9716, "lng": 77.5946, "radius_km": 3}
    ).json()
    assert all(x["id"] != iid for x in alerts2)


def test_precise_hidden_when_not_shared(client):
    r = client.post("/api/v1/safety/sos", json={"latitude": 12.9716, "longitude": 77.5946}).json()
    alerts = client.get(
        "/api/v1/safety/nearby-alerts", params={"lat": 12.9716, "lng": 77.5946, "radius_km": 3}
    ).json()
    a = next(x for x in alerts if x["id"] == r["incident_id"])
    # Coarse to ~2 decimals (neighbourhood level), not the exact 6-dp coords.
    assert a["precise"] is False
    assert a["latitude"] == round(12.9716, 2)


def test_credibility_is_advisory_never_fake(client):
    # A ping with distress terms scores higher than a bare one, but the low one
    # is NEVER labelled "fake" — the lowest level is "unverified" = treat as real.
    distress = client.post(
        "/api/v1/safety/sos",
        json={"latitude": 12.97, "longitude": 77.59, "note": "someone is following me, help, scared"},
    ).json()
    bare = client.post(
        "/api/v1/safety/sos", json={"latitude": 13.09, "longitude": 77.72}
    ).json()
    assert distress["credibility_score"] > bare["credibility_score"]
    assert bare["credibility_level"] in ("unverified", "some-signals")
    assert "fake" not in (bare["credibility_note"] or "").lower()


def test_sos_message_thread(client):
    iid = client.post(
        "/api/v1/safety/sos", json={"latitude": 12.9716, "longitude": 77.5946}
    ).json()["incident_id"]
    # The person in distress (owner) can reply on their own alert without verification.
    client.post(f"/api/v1/safety/incidents/{iid}/messages", json={"responder_id": "A", "text": "on my way", "is_owner": True})
    # A responder must be a phone-OTP-verified citizen — unauthenticated is rejected.
    unauth = client.post(f"/api/v1/safety/incidents/{iid}/messages", json={"responder_id": "B", "text": "police called", "is_owner": False})
    assert unauth.status_code == 403
    # Verified citizen (mock OTP in tests) can respond.
    tok = client.post("/api/v1/auth/phone/login", json={"id_token": "mock:+919876500000"}).json()["access_token"]
    client.post(
        f"/api/v1/safety/incidents/{iid}/messages",
        json={"responder_id": "B", "text": "police called", "is_owner": False},
        headers={"Authorization": f"Bearer {tok}"},
    )
    msgs = client.get(f"/api/v1/safety/incidents/{iid}/messages").json()
    assert len(msgs) == 2 and msgs[0]["text"] == "on my way"
    # Empty message rejected (owner path so it reaches the empty-text check).
    assert client.post(f"/api/v1/safety/incidents/{iid}/messages", json={"responder_id": "A", "text": "  ", "is_owner": True}).status_code == 400


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
