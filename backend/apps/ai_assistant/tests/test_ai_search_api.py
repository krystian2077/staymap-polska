from __future__ import annotations

from unittest.mock import patch

import pytest
from django.test import override_settings


@pytest.mark.django_db
def test_ai_search_post_requires_auth(api_client):
    res = api_client.post("/api/v1/ai/search/", {"prompt": "noclegi nad morzem"}, format="json")
    assert res.status_code == 401


@pytest.mark.django_db
@override_settings(OPENAI_API_KEY="")
def test_ai_search_post_no_api_key_returns_503(api_client, user_host):
    api_client.force_authenticate(user=user_host)
    res = api_client.post("/api/v1/ai/search/", {"prompt": "Zakopane dla dwojga"}, format="json")
    assert res.status_code == 503
    body = res.json()
    assert body["error"]["code"] == "AI_SERVICE_UNAVAILABLE"


@pytest.mark.django_db
@override_settings(OPENAI_API_KEY="sk-test-dummy")
@patch("apps.ai_assistant.services.AISearchService._call_llm")
def test_ai_search_happy_path(mock_llm, api_client, user_host):
    mock_llm.return_value = (
        {
            "location": "Zakopane",
            "latitude": 49.2992,
            "longitude": 19.9496,
            "radius_km": 25,
            "travel_mode": "romantic",
            "guests": 2,
            "summary_pl": "Romantyczny wyjazd dla dwojga w Zakopanem.",
        },
        120,
        __import__("decimal").Decimal("0"),
    )
    api_client.force_authenticate(user=user_host)
    res = api_client.post("/api/v1/ai/search/", {"prompt": "Zakopane romantycznie"}, format="json")
    assert res.status_code == 201
    sid = res.json()["data"]["session_id"]
    detail = api_client.get(f"/api/v1/ai/search/{sid}/")
    assert detail.status_code == 200
    data = detail.json()["data"]
    assert data["status"] == "complete"
    assert data["interpretation"]["summary_pl"]
    assert "normalized_params" in data["interpretation"]


@pytest.mark.django_db
@override_settings(OPENAI_API_KEY="sk-test-dummy")
@patch("apps.ai_assistant.services.AISearchService._call_llm")
def test_ai_search_cannot_read_other_user_session(mock_llm, api_client, django_user_model):
    mock_llm.return_value = (
        {
            "location": "Gdańsk",
            "latitude": 54.352,
            "longitude": 18.6466,
            "radius_km": 40,
            "summary_pl": "Test",
        },
        10,
        __import__("decimal").Decimal("0"),
    )
    u1 = django_user_model.objects.create_user(
        email="a1@test.pl",
        password="x" * 12,
        first_name="A",
        last_name="One",
    )
    u2 = django_user_model.objects.create_user(
        email="a2@test.pl",
        password="x" * 12,
        first_name="B",
        last_name="Two",
    )
    api_client.force_authenticate(user=u1)
    sid = api_client.post("/api/v1/ai/search/", {"prompt": "Gdańsk"}, format="json").json()["data"][
        "session_id"
    ]
    api_client.force_authenticate(user=u2)
    assert api_client.get(f"/api/v1/ai/search/{sid}/").status_code == 404


@pytest.mark.django_db
def test_ai_search_validation_empty_prompt(api_client, user_host):
    api_client.force_authenticate(user=user_host)
    with override_settings(OPENAI_API_KEY="sk-test"):
        res = api_client.post("/api/v1/ai/search/", {"prompt": "  "}, format="json")
    assert res.status_code == 400
