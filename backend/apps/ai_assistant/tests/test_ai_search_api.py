from __future__ import annotations

from decimal import Decimal
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
@override_settings(
    OPENAI_API_KEY="sk-test-dummy",
    AI_MATCH_EXPLANATION_USE_LLM=False,
    AI_SEARCH_ASYNC_ENABLED=False,
)
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
            "ordering": "recommended",
        },
        120,
        Decimal("0"),
    )
    api_client.force_authenticate(user=user_host)
    res = api_client.post("/api/v1/ai/search/", {"prompt": "Zakopane romantycznie"}, format="json")
    assert res.status_code == 201
    create_data = res.json()["data"]
    sid = create_data["session_id"]
    detail = api_client.get(f"/api/v1/ai/search/{sid}/")
    assert detail.status_code == 200
    data = detail.json()["data"]

    assert set(("messages", "latest_response", "search_params")).issubset(set(create_data.keys()))
    assert set(("messages", "latest_response", "search_params")).issubset(set(data.keys()))
    assert data["status"] == "complete"
    assert isinstance(data["latest_response"], str)
    assert data["assistant_reply"] == data["latest_response"]
    assert data["conversation"] == data["messages"]
    assert isinstance(data["assistant_reply"], str)
    assert isinstance(data["follow_up_suggestions"], list)
    assert isinstance(data["messages"], list)
    assert data["filters"]["travel_mode"] == "romantic"
    assert isinstance(data["search_params"], dict)
    assert data["search_params"].get("travel_mode") == "romantic"
    if data["results"]:
        assert isinstance(data["results"][0].get("match_explanation"), str)
        assert isinstance(data["results"][0].get("match_highlights"), list)


@pytest.mark.django_db
@override_settings(
    OPENAI_API_KEY="sk-test-dummy",
    AI_MATCH_EXPLANATION_USE_LLM=False,
    AI_SEARCH_ASYNC_ENABLED=False,
)
@patch("apps.ai_assistant.services.AISearchService._call_llm")
def test_ai_search_cannot_read_other_user_session(mock_llm, api_client, django_user_model):
    mock_llm.return_value = (
        {
            "location": "Gdańsk",
            "latitude": 54.352,
            "longitude": 18.6466,
            "radius_km": 40,
            "summary_pl": "Test",
            "ordering": "recommended",
        },
        10,
        Decimal("0"),
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


@pytest.mark.django_db
@override_settings(
    OPENAI_API_KEY="sk-test-dummy",
    AI_MATCH_EXPLANATION_USE_LLM=False,
    AI_SEARCH_ASYNC_ENABLED=False,
)
@patch("apps.ai_assistant.services.AISearchService._call_llm")
def test_ai_search_follow_up_in_same_session(mock_llm, api_client, user_host):
    mock_llm.side_effect = [
        (
            {
                "location": "Mazury",
                "travel_mode": "lake",
                "summary_pl": "Wybieram dla Ciebie klimatyczne noclegi na Mazurach.",
                "ordering": "recommended",
            },
            30,
            Decimal("0"),
        ),
        (
            {
                "location": "Mazury",
                "travel_mode": "lake",
                "max_price": 500,
                "summary_pl": "Zawężam wyniki do budżetu do 500 PLN za noc.",
                "ordering": "price_asc",
            },
            35,
            Decimal("0"),
        ),
    ]

    api_client.force_authenticate(user=user_host)
    first = api_client.post("/api/v1/ai/search/", {"prompt": "Mazury na weekend"}, format="json")
    assert first.status_code == 201
    sid = first.json()["data"]["session_id"]

    second = api_client.post(
        "/api/v1/ai/search/",
        {"prompt": "Do 500 zł za noc", "session_id": sid},
        format="json",
    )
    assert second.status_code == 201
    assert second.json()["data"]["session_id"] == sid
    assert isinstance(second.json()["data"].get("results"), list)

    detail = api_client.get(f"/api/v1/ai/search/{sid}/")
    assert detail.status_code == 200
    payload = detail.json()["data"]
    assert payload["status"] == "complete"
    assert len(payload["messages"]) >= 3
    assert payload["assistant_reply"] == payload["latest_response"]


@pytest.mark.django_db
@override_settings(
    OPENAI_API_KEY="sk-test-dummy",
    AI_MATCH_EXPLANATION_USE_LLM=False,
    AI_SEARCH_ASYNC_ENABLED=False,
)
@patch("apps.ai_assistant.services.AISearchService._call_llm")
def test_ai_search_repairs_invalid_llm_filters_instead_of_failing(mock_llm, api_client, user_host):
    mock_llm.return_value = (
        {
            "travel_mode": "romance",
            "ordering": "best_match",
            "summary_pl": "Dobieram oferty dla pary.",
        },
        12,
        Decimal("0"),
    )
    api_client.force_authenticate(user=user_host)
    res = api_client.post("/api/v1/ai/search/", {"prompt": "romantyczny wyjazd"}, format="json")
    assert res.status_code == 201
    data = res.json()["data"]
    assert data["status"] == "complete"
    assert isinstance(data.get("search_params"), dict)
    assert data["search_params"].get("ordering") == "recommended"
    assert data["search_params"].get("travel_mode") == "romantic"


