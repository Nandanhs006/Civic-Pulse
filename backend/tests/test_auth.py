def test_register_user(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "testuser@civicpulse.gov",
            "password": "testpassword123",
            "full_name": "Test Administrator",
            "is_admin": True,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "testuser@civicpulse.gov"
    assert "id" in data
    assert "hashed_password" not in data


def test_login_user(client):
    # Register first
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "loginuser@civicpulse.gov",
            "password": "loginpassword123",
            "full_name": "Login User",
        },
    )

    # Login
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "loginuser@civicpulse.gov", "password": "loginpassword123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
