"""Tests for the issue tracking timeline."""

import uuid

from app.db.models.suggestion import Suggestion
from app.services import issue_timeline


def _make(db, status="Reviewed"):
    s = Suggestion(id=str(uuid.uuid4()), content="pothole", status=status)
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


def test_tracking_code_and_lookup(client, db):
    s = _make(db)
    code = issue_timeline.tracking_code(s.id)
    assert code.startswith("CP-") and len(code) == 11
    # timeline by full id and by short code resolve to the same issue
    by_id = client.get(f"/api/v1/suggestions/{s.id}/timeline").json()
    by_code = client.get(f"/api/v1/suggestions/{code}/timeline").json()
    assert by_id["id"] == by_code["id"] == s.id
    assert by_id["tracking_code"] == code


def test_timeline_stages_reflect_status(client, db):
    s = _make(db, status="Reviewed")
    d = client.get(f"/api/v1/suggestions/{s.id}/timeline").json()
    stages = {x["key"]: x for x in d["stages"]}
    assert stages["received"]["done"] and stages["reviewing"]["done"]
    assert stages["reviewing"]["current"]
    assert not stages["assigned"]["done"]
    # done stages have a timestamp (lazily back-filled)
    assert stages["received"]["at"] is not None


def test_advance_moves_to_next_stage(client, db):
    s = _make(db, status="Reviewed")
    tl = issue_timeline.advance(db, s, actor="MP office", note="assigned to ward")
    assert s.status == "Approved"
    assert tl["current_stage"] == "assigned"
    stages = {x["key"]: x for x in tl["stages"]}
    assert stages["assigned"]["current"] and stages["assigned"]["done"]


def test_timeline_404_for_unknown(client):
    assert client.get("/api/v1/suggestions/CP-ZZZZZZZZ/timeline").status_code == 404


def test_assign_department(client, db):
    s = _make(db, status="Submitted")
    tl = issue_timeline.assign_department(db, s, "PWD / BBMP Roads", actor="MP office")
    assert s.department == "PWD / BBMP Roads"
    assert s.status == "Approved"  # moved to the Assigned stage
    assert tl["current_stage"] == "assigned"
    # the assign is logged in the timeline
    assert any(x["key"] == "assigned" and x["done"] for x in tl["stages"])


def test_departments_endpoint(client):
    d = client.get("/api/v1/suggestions/meta/departments").json()
    assert len(d["departments"]) >= 5
    assert d["by_category"]["Water"].startswith("BWSSB")
