def test_get_ward_officers(client):
    response = client.get("/api/v1/ward/officers")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "active_cases" in data[0]
    assert "ward_id" in data[0]


def test_dispatch_suggestion(client):
    # 1. Create a dummy suggestion
    response = client.post(
        "/api/v1/suggestions/",
        data={
            "content": "Broken streetlights on sector B main lane.",
            "citizen_phone": "+9199999999",
            "latitude": "12.9716",
            "longitude": "77.5946",
        },
    )
    assert response.status_code == 201
    suggestion_id = response.json()["id"]

    # 2. Fetch active officers
    officers_response = client.get("/api/v1/ward/officers")
    assert officers_response.status_code == 200
    officer_id = officers_response.json()[0]["id"]

    # 3. Dispatch the suggestion to this officer
    dispatch_response = client.post(
        "/api/v1/ward/dispatch",
        json={"suggestion_id": suggestion_id, "officer_id": officer_id},
    )
    assert dispatch_response.status_code == 200
    updated_suggestion = dispatch_response.json()
    assert updated_suggestion["assigned_officer_id"] == officer_id
    assert updated_suggestion["dispatch_status"] == "Dispatched"
    assert updated_suggestion["status"] == "Reviewed"


def test_get_my_officer(client):
    response = client.get(
        "/api/v1/ward/my-officer?latitude=12.9716&longitude=77.5946"
    )
    assert response.status_code == 200
    data = response.json()
    if data is not None:
        assert "name" in data
        assert "email" in data
        assert "ward_id" in data
