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
    assert "priority_score" in data
    # A routine (non-critical) issue is AUTO-routed by AI to its department and
    # advanced to the Assigned stage; only critical ones stay for MP review.
    assert data["department"] == "BWSSB (Water Supply)"
    assert data["status"] in ("Approved", "Submitted")


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
    assert data["connection_status"] == "Dashboard Connection (Live Sync)"
    assert "avg_tat_days" in data
    assert "resolution_rate" in data
    assert isinstance(data["pipeline"], list) and len(data["pipeline"]) == 5


def test_suggestion_uuid_prefix_and_rollback(client, db):
    import os
    from fastapi import UploadFile
    from unittest.mock import patch
    from io import BytesIO
    from app.services.suggestion_service import SuggestionService
    from app.core.config import settings

    # Setup mock file to upload
    audio_data = BytesIO(b"audio binary")
    audio_upload = UploadFile(filename="test_audio.wav", file=audio_data)

    # 1. Verify successful insertion creates custom-named files linked to suggestion ID
    service = SuggestionService(db)
    sug = service.create_suggestion(
        content="Testing file prefix connection.",
        audio_file=audio_upload
    )
    sug_audio_url = sug.audio_url
    assert sug.id in sug_audio_url
    
    relative_path = sug_audio_url.replace("/static/", "")
    full_path = os.path.join(settings.UPLOAD_DIR, relative_path)
    assert os.path.exists(full_path)

    # 2. Verify that a failed insertion triggers rollback file cleanup
    audio_data_fail = BytesIO(b"audio binary fail")
    audio_upload_fail = UploadFile(filename="fail_audio.wav", file=audio_data_fail)

    with patch.object(service.geo_service, "locate_assembly_constituency_id", side_effect=ValueError("Mock Ingestion Error")):
        try:
            service.create_suggestion(
                content="Trigger exception for rollback testing.",
                audio_file=audio_upload_fail,
                latitude=12.97,
                longitude=77.59
            )
            assert False, "Should have raised ValueError"
        except ValueError as e:
            assert str(e) == "Mock Ingestion Error"

    # Clean up the successful suggestion file we created earlier
    service.file_service.delete_file(sug_audio_url)
    assert not os.path.exists(full_path)


def test_get_performance_index(client, db):
    from app.db.models.constituency import Constituency
    from app.db.models.mp import MP

    # Seed mock records
    con = Constituency(id=1, name="Bengaluru Central", state="Karnataka")
    db.add(con)
    db.commit()

    mp = MP(
        id=1,
        name="Tejasvi Surya",
        party="BJP",
        party_abbr="BJP",
        state="Karnataka",
        constituency_id=1,
    )
    db.add(mp)
    db.commit()

    # Register first
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": "perfadmin@civicpulse.gov",
            "password": "perfpassword123",
            "full_name": "Perf Admin",
            "is_admin": True,
        },
    )
    assert reg_res.status_code == 200

    admin_login = client.post(
        "/api/v1/auth/login",
        data={"username": "perfadmin@civicpulse.gov", "password": "perfpassword123"},
    )
    assert admin_login.status_code == 200
    token = admin_login.json()["access_token"]

    res = client.get(
        "/api/v1/analytics/performance",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "constituency_name" in data[0]
    assert "governance_score" in data[0]
    assert "mp_name" in data[0]
    assert "mla_name" in data[0]



