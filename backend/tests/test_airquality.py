"""Tests for the CPCB air-quality feature (data.gov.in, with fallback)."""

from app.services.air_quality import _sub_index, classify


def test_aqi_sub_index_and_classify():
    # PM2.5 = 88 -> AQI ~193 (Moderate band per CPCB breakpoints).
    si = _sub_index("PM2.5", 88)
    assert 185 <= si <= 200
    assert classify(si)["category"] == "Moderate"
    assert classify(20)["category"] == "Good"
    assert classify(450)["category"] == "Severe"


def test_stations_endpoint(client):
    d = client.get("/api/v1/airquality/stations").json()
    assert d["count"] >= 1
    s = d["stations"][0]
    assert {"station", "aqi", "category", "color", "advice", "dominant_pollutant"} <= set(s.keys())
    assert isinstance(s["aqi"], int)


def test_near_endpoint(client):
    s = client.get("/api/v1/airquality/near", params={"lat": 12.917, "lng": 77.623}).json()
    assert s is not None
    assert "aqi" in s and "distance_km" in s
    # Nearest to Silk Board should basically be Silk Board (~0 km).
    assert s["distance_km"] < 1
