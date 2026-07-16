"""Tests for the MPLADS funds-vs-demand endpoint."""

from app.db.models.constituency import Constituency
from app.db.models.suggestion import Suggestion


def _make_constituency(db, name="Test PC", state="Karnataka"):
    c = Constituency(name=name, state=state)
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


def test_mplads_404_for_unknown(client):
    assert client.get("/api/v1/mplads/999999").status_code == 404


def test_mplads_funds_and_demand(client, db):
    c = _make_constituency(db)
    # Two open + one resolved request for this constituency.
    db.add_all([
        Suggestion(content="a", category="Water", status="Submitted", constituency_id=c.id),
        Suggestion(content="b", category="Water", status="Processing", constituency_id=c.id),
        Suggestion(content="c", category="Roads", status="Approved", constituency_id=c.id),
    ])
    db.commit()

    d = client.get(f"/api/v1/mplads/{c.id}").json()
    # Fund fields present and internally consistent.
    assert d["allocated_lakh"] >= d["utilised_lakh"]
    assert d["unspent_lakh"] == max(0, d["allocated_lakh"] - d["utilised_lakh"])
    assert 0 <= d["pct_utilised"] <= 100
    # Demand is REAL: 3 total, 2 unresolved, Water top open.
    assert d["demand"]["total_requests"] == 3
    assert d["demand"]["unresolved_requests"] == 2
    assert d["demand"]["top_open_categories"][0]["category"] == "Water"
    assert isinstance(d["insight"], str) and len(d["insight"]) > 0


def test_mplads_deterministic(client, db):
    c = _make_constituency(db, name="Stable PC")
    a = client.get(f"/api/v1/mplads/{c.id}").json()
    b = client.get(f"/api/v1/mplads/{c.id}").json()
    assert a["allocated_lakh"] == b["allocated_lakh"]  # reproducible sample
