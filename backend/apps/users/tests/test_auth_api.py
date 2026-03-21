import pytest


@pytest.mark.django_db
def test_register_returns_201_and_data_shape(api_client):
    res = api_client.post(
        "/api/v1/auth/register/",
        {
            "email": "new@staymap.pl",
            "password": "securepass123",
            "first_name": "Anna",
            "last_name": "Nowak",
        },
        format="json",
    )
    assert res.status_code == 201
    body = res.json()
    assert "data" in body
    assert body["data"]["email"] == "new@staymap.pl"


@pytest.mark.django_db
def test_validation_error_envelope(api_client):
    res = api_client.post("/api/v1/auth/register/", {}, format="json")
    assert res.status_code == 400
    body = res.json()
    assert "error" in body
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert body["error"]["message"]
    assert "status" in body["error"]


@pytest.mark.django_db
def test_profile_matches_auth_me(api_client, user_host):
    api_client.force_authenticate(user=user_host)
    me = api_client.get("/api/v1/auth/me/")
    prof = api_client.get("/api/v1/profile/")
    assert me.status_code == 200 and prof.status_code == 200
    assert me.json() == prof.json()


@pytest.mark.django_db
def test_login_returns_tokens(api_client, user_host):
    res = api_client.post(
        "/api/v1/auth/login/",
        {"email": "host@test.pl", "password": "secret12345"},
        format="json",
    )
    assert res.status_code == 200
    data = res.json()
    assert "access" in data and "refresh" in data
