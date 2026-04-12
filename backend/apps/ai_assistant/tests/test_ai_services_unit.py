"""Testy jednostkowe AISearchService (parsowanie JSON, błędy LLM, geokodowanie)."""
from __future__ import annotations

from decimal import Decimal
from unittest.mock import patch

import pytest
from django.test import override_settings

from apps.ai_assistant.services import (
    AISearchService,
    _geocode_if_needed,
    _parse_llm_json,
    _strip_json_fence,
    _usage_cost_usd,
    _usage_tokens,
)
from apps.common.exceptions import AIServiceError


def test_strip_json_fence():
    raw = '```json\n{"a": 1}\n```'
    assert _strip_json_fence(raw) == '{"a": 1}'


def test_parse_llm_json_ok():
    assert _parse_llm_json('{"x": true}') == {"x": True}


def test_parse_llm_json_not_object():
    with pytest.raises(ValueError):
        _parse_llm_json("[1,2]")


def test_usage_tokens_and_cost():
    class U:
        prompt_tokens = 10
        completion_tokens = 5

    assert _usage_tokens(U()) == 15
    assert _usage_cost_usd(U()) == Decimal("0")


def test_rule_based_hints_budget_and_location():
    hints = AISearchService._rule_based_hints("cichy domek w gorach do 500 zl dla 4 osob")
    assert hints.get("max_price") == 500
    assert hints.get("guests") == 4
    assert hints.get("near_mountains") is True
    assert hints.get("location")


def test_merge_llm_with_hints_prefers_price_asc_for_cheap_prompt():
    merged = AISearchService._merge_llm_with_hints(
        {"ordering": "recommended", "travel_mode": None},
        "tanie miejsce z sauna",
    )
    assert merged["ordering"] == "price_asc"
    assert merged.get("sauna") is True


def test_best_fuzzy_match_returns_closest_candidate():
    hit = AISearchService._best_fuzzy_match("zakopne", ["Zakopane", "Gdansk"], min_score=0.7)
    assert hit == "Zakopane"


@pytest.mark.django_db
@override_settings(OPENAI_API_KEY="sk-x")
@patch("apps.ai_assistant.services.AISearchService._call_llm")
def test_run_sync_llm_failure_sets_failed(mock_llm, user_host):
    from apps.ai_assistant.models import AiTravelSession
    from apps.ai_assistant.services import AISearchService

    mock_llm.side_effect = AIServiceError("down")
    s = AISearchService.run_sync(user_host, "noclegi")
    assert s.status == AiTravelSession.Status.FAILED


@pytest.mark.django_db
@override_settings(OPENAI_API_KEY="sk-x")
@patch("apps.ai_assistant.services.AISearchService._call_llm")
def test_run_sync_invalid_llm_params_fails_session(mock_llm, user_host):
    from apps.ai_assistant.models import AiTravelSession
    from apps.ai_assistant.services import AISearchService

    mock_llm.return_value = (
        {"travel_mode": "nope", "summary_pl": "bad"},
        5,
        Decimal("0"),
    )
    s = AISearchService.run_sync(user_host, "test")
    assert s.status == AiTravelSession.Status.FAILED
    assert s.error_message


@pytest.mark.django_db
@override_settings(OPENAI_API_KEY="sk-x")
@patch("apps.ai_assistant.services.SearchOrchestrator.get_ordered_ids")
@patch("apps.ai_assistant.services.AISearchService._call_llm")
def test_run_sync_search_orchestrator_error(mock_llm, mock_search, user_host):
    from apps.ai_assistant.models import AiTravelSession
    from apps.ai_assistant.services import AISearchService

    mock_llm.return_value = (
        {"location": "X", "summary_pl": "ok", "ordering": "recommended"},
        1,
        Decimal("0"),
    )
    mock_search.side_effect = RuntimeError("boom")
    s = AISearchService.run_sync(user_host, "test")
    assert s.status == AiTravelSession.Status.FAILED
    assert "wyszukiwania" in (s.error_message or "").lower()


@patch("apps.ai_assistant.services.geocode_poland")
def test_geocode_if_needed(mock_geo):
    mock_geo.return_value = {"lat": 52.0, "lng": 21.0}
    out = _geocode_if_needed({"location": "Warszawa", "latitude": None, "longitude": None})
    assert out["latitude"] == 52.0
    assert out["longitude"] == 21.0
