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
