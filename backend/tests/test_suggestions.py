from io import BytesIO


def test_submit_text_suggestion(client):
    response = client.post(
        "/api/v1/suggestions/",
        data={
            "content": "Road water leakage near city hall.",
            "citizen_phone": "9876543210",
            "latitude": "27.7172",
            "longitude": "85.3240",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["content"] == "Road water leakage near city hall."
    assert data["category"] == "Water"  # Categorized by mock NLP rule
    assert data["status"] == "Submitted"
    assert "priority_score" in data


def test_submit_audio_suggestion(client):
    # Mock voice audio file upload
    audio_data = BytesIO(b"dummy_wav_binary_content")
    response = client.post(
        "/api/v1/suggestions/",
        data={
            "citizen_phone": "9876543210",
            "latitude": "27.7172",
            "longitude": "85.3240",
        },
        files={"audio": ("mock_recording.wav", audio_data, "audio/wav")},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["audio_url"] is not None
    assert data["content"] != ""  # Auto-transcribed by mock Whisper AI
    assert data["status"] == "Submitted"


def test_timeout_middleware_under_limit(client):
    response = client.get("/api/v1/test-timeout?seconds=0.01")
    assert response.status_code == 200
    assert response.json() == {"status": "success"}


def test_get_bigquery_federated_analytics(client):
    # Register admin/PMO user
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": "pmoadmin@civicpulse.gov",
            "password": "pmopassword123",
            "full_name": "PMO Admin",
            "is_admin": True,
        },
    )
    assert reg_res.status_code == 200

    # Login to get JWT
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": "pmoadmin@civicpulse.gov", "password": "pmopassword123"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    # Query BigQuery Analytics endpoint
    res = client.get(
        "/api/v1/analytics/bigquery",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["connection_status"] == "BigQuery Federated Connection (Live on Cloud SQL)"
    assert "avg_tat_days" in data
    assert "dispatch_saturation" in data
    assert "officer_load" in data

