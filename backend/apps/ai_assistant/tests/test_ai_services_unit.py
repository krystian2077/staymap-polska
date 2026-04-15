"""Testy jednostkowe AISearchService (parsowanie JSON, błędy LLM, geokodowanie)."""
from __future__ import annotations

from decimal import Decimal
from datetime import date
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from django.test import override_settings

from apps.ai_assistant.services import (
    AISearchService,
    _extract_natural_date_hints,
    _format_premium_summary,
    _geocode_if_needed,
    _parse_llm_json,
    _rule_based_match_explanation,
    _seasonality_note_for_params,
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
    assert hints.get("location") in (None, "")


def test_rule_based_hints_explicit_mountain_region_sets_location():
    hints = AISearchService._rule_based_hints("romantyczny weekend w Tatrach")
    assert hints.get("location") == "Tatry"
    assert hints.get("near_mountains") is True


def test_extract_natural_date_hints_majowka():
    out = _extract_natural_date_hints("romantyczny wieczor w gorach na majowke", today=date(2026, 4, 15))
    assert out.get("date_from") == date(2026, 5, 1)
    assert out.get("date_to") == date(2026, 5, 5)


def test_extract_natural_date_hints_boze_cialo_long_weekend():
    out = _extract_natural_date_hints("wyjazd na Boże Ciało", today=date(2026, 4, 15))
    assert out.get("date_from") == date(2026, 6, 3)
    assert out.get("date_to") == date(2026, 6, 8)


def test_extract_natural_date_hints_sierpniowy_dlug_weekend():
    out = _extract_natural_date_hints("wypoczynek nad morzem na długi weekend 15 sierpnia", today=date(2026, 4, 15))
    assert out.get("date_from") == date(2026, 8, 14)
    assert out.get("date_to") == date(2026, 8, 18)


def test_extract_natural_date_hints_wakacje():
    out = _extract_natural_date_hints("wypoczynek nad morzem we wakacje", today=date(2026, 4, 15))
    assert out.get("date_from") == date(2026, 6, 1)
    assert out.get("date_to") == date(2026, 9, 16)


def test_extract_natural_date_hints_sylwester():
    out = _extract_natural_date_hints("gory w sylwestra", today=date(2026, 10, 20))
    assert out.get("date_from") == date(2026, 12, 31)
    assert out.get("date_to") == date(2027, 1, 2)


def test_extract_natural_date_hints_long_weekend():
    out = _extract_natural_date_hints("romantyczny długi weekend w górach", today=date(2026, 4, 15))
    assert out.get("date_from") == date(2026, 5, 1)
    assert out.get("date_to") == date(2026, 5, 5)


def test_extract_natural_date_hints_listopadowy_most():
    out = _extract_natural_date_hints("listopadowy długi weekend z rodziną", today=date(2026, 4, 15))
    assert out.get("date_from") == date(2026, 10, 30)
    assert out.get("date_to") == date(2026, 11, 3)


def test_extract_natural_date_hints_christmas_and_new_year():
    out = _extract_natural_date_hints("święta Bożego Narodzenia i Nowy Rok", today=date(2026, 4, 15))
    assert out.get("date_from") == date(2026, 12, 24)
    assert out.get("date_to") == date(2027, 1, 2)


def test_extract_natural_date_hints_polish_range():
    out = _extract_natural_date_hints("weekend z rodzina od 3 do 8 czerwca", today=date(2026, 4, 15))
    assert out.get("date_from") == date(2026, 6, 3)
    assert out.get("date_to") == date(2026, 6, 9)


def test_seasonality_note_for_holiday_range():
    note = _seasonality_note_for_params({"date_from": date(2026, 5, 1), "date_to": date(2026, 5, 4)})
    assert isinstance(note, str)
    assert "ceny" in note.lower()


def test_seasonality_note_for_boze_cialo_mentions_peak_period():
    note = _seasonality_note_for_params({"date_from": date(2026, 6, 3), "date_to": date(2026, 6, 8)})
    assert isinstance(note, str)
    assert "boże cia" in note.lower() or "podwyższonego popytu" in note.lower()


def _stub_listing(*, lid: str, title: str, city: str, region: str, near_mountains=False, near_lake=False):
    loc = SimpleNamespace(
        city=city,
        region=region,
        near_mountains=near_mountains,
        near_lake=near_lake,
        near_forest=False,
    )
    return SimpleNamespace(
        id=lid,
        title=title,
        short_description=title,
        description="",
        location=loc,
        amenities=[],
        max_guests=2,
        base_price=500,
        average_rating=4.5,
    )


def test_rerank_prefers_mountain_romantic_for_matching_prompt():
    mountain = _stub_listing(
        lid="m-1",
        title="Romantyczny domek w górach z widokiem",
        city="Zakopane",
        region="Małopolskie",
        near_mountains=True,
    )
    sea = _stub_listing(
        lid="s-1",
        title="Apartament blisko morza",
        city="Sopot",
        region="Pomorskie",
        near_lake=False,
    )
    ranked = AISearchService._rerank_listings_by_prompt_relevance(
        [sea, mountain],
        prompt_text="romantyczny wieczór w górach",
        params={"travel_mode": "romantic", "near_mountains": True},
        limit=2,
    )
    assert ranked[0].id == "m-1"


def test_rerank_prefers_seaside_for_sea_prompt():
    mountain = _stub_listing(
        lid="m-2",
        title="Weekend w górach",
        city="Karpacz",
        region="Dolnośląskie",
        near_mountains=True,
    )
    sea = _stub_listing(
        lid="s-2",
        title="Wakacje nad morzem w Gdańsku",
        city="Gdańsk",
        region="Pomorskie",
        near_lake=False,
    )
    ranked = AISearchService._rerank_listings_by_prompt_relevance(
        [mountain, sea],
        prompt_text="wypoczynek nad morzem w wakacje",
        params={"ordering": "recommended"},
        limit=2,
    )
    assert ranked[0].id == "s-2"


@patch("apps.ai_assistant.services.AISearchService._retrieval_listings_for_prompt")
def test_merge_candidate_ids_with_prompt_retrieval_prioritizes_prompt_pool(mock_retrieval):
    mock_retrieval.return_value = [SimpleNamespace(id="r-1"), SimpleNamespace(id="r-2")]
    merged = AISearchService._merge_candidate_ids_with_prompt_retrieval(
        ["o-1", "r-2", "o-2"],
        prompt_text="romantyczny wieczór w górach",
        params={"travel_mode": "romantic", "near_mountains": True},
        pool_limit=5,
    )
    assert merged[:2] == ["r-1", "r-2"]
    assert "o-1" in merged and "o-2" in merged


def test_seasonality_note_for_summer_without_holiday_mentions_high_season():
    note = _seasonality_note_for_params({"date_from": date(2026, 7, 10), "date_to": date(2026, 7, 13)})
    assert isinstance(note, str)
    assert "poza świętami ustawowymi" in note.lower() or "wysokiego sezonu" in note.lower()


def test_permute_ordered_ids_differs_by_prompt_same_pool():
    ids = [f"id-{i}" for i in range(20)]
    a = AISearchService._permute_ordered_ids_for_prompt(ids, "Mazury nocleg", "sess-a")
    b = AISearchService._permute_ordered_ids_for_prompt(ids, "Tatry zima", "sess-a")
    assert len(a) == len(ids) == len(b)
    assert sorted(a) == sorted(ids)
    assert a != b


@patch("apps.ai_assistant.services.SearchOrchestrator.get_ordered_ids")
def test_ordered_ids_with_constraints_skips_global_fallback(mock_get_ids):
    def _fake(candidate, use_cache=True):
        if candidate.get("ordering") and len(candidate.keys()) == 1:
            return ["id-global-only"]
        return []

    mock_get_ids.side_effect = _fake
    ids, level = AISearchService._ordered_ids_with_fallback(
        {
            "travel_mode": "romantic",
            "near_mountains": True,
            "ordering": "recommended",
        },
        prompt_fingerprint="romantyczny wieczor w gorach",
    )
    assert ids == []
    assert level == "no_results"


@patch("apps.ai_assistant.services.SearchOrchestrator.build_queryset")
def test_apply_travel_quality_gate_filters_low_scores(mock_build_queryset):
    class _FakeQS:
        def filter(self, **kwargs):
            return self

        def values_list(self, *args, **kwargs):
            return [
                ("id-top", 62),
                ("id-low", 18),
            ]

    mock_build_queryset.return_value = _FakeQS()
    ids, removed, threshold = AISearchService._apply_travel_quality_gate(
        ["id-top", "id-low"],
        {"travel_mode": "romantic", "near_mountains": True},
    )
    assert ids == ["id-top"]
    assert removed == 1
    assert threshold == 45


def test_apply_travel_quality_gate_no_mode_is_noop():
    src = ["id-1", "id-2"]
    ids, removed, threshold = AISearchService._apply_travel_quality_gate(src, {"ordering": "recommended"})
    assert ids == src
    assert removed == 0
    assert threshold is None


@override_settings(
    AI_TRAVEL_SCORE_MIN=20,
    AI_TRAVEL_SCORE_MIN_BY_MODE={
        "romantic": 33,
        "romantic_mountains": 47,
    },
)
def test_travel_quality_threshold_uses_mode_settings():
    assert AISearchService._travel_quality_threshold({"travel_mode": "romantic"}) == 33
    assert AISearchService._travel_quality_threshold({"travel_mode": "romantic", "near_mountains": True}) == 47


@override_settings(AI_CHAT_EMOJI_ENABLED=True, AI_CHAT_EMOJI_RATE=1.0)
def test_format_premium_summary_can_prefix_context_emoji():
    text = _format_premium_summary("romantyczny klimat i prywatność", {"travel_mode": "romantic"})
    assert text[0] in {"💑", "✨", "🏔", "🌲", "🌊", "🧖", "🐕", "💻", "👨", "🥾"}
    assert text.endswith(".")


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


def test_rule_based_match_explanation_uses_available_facts():
    text, highlights = _rule_based_match_explanation(
        {
            "location": {"city": "Zakopane", "region": "Małopolskie", "near_mountains": True},
            "scores": {"quiet": 9.1, "travel_fit": 8.6, "travel_fit_key": "romantic"},
            "amenities": {"sauna": True, "jacuzzi": False},
            "max_guests": 4,
            "average_rating": 4.8,
            "review_count": 32,
            "response_rate_pct": 96,
            "base_price": 490,
            "currency": "PLN",
        },
        {"quiet_score_min": 8, "sauna": True, "guests": 2},
    )
    assert "Zakopane" in text
    assert isinstance(highlights, list)
    assert highlights


@pytest.mark.django_db
@override_settings(OPENAI_API_KEY="sk-x", AI_MATCH_EXPLANATION_USE_LLM=False)
@patch("apps.ai_assistant.services.AISearchService._call_llm")
def test_run_sync_llm_failure_sets_failed(mock_llm, user_host):
    from apps.ai_assistant.models import AiTravelSession
    from apps.ai_assistant.services import AISearchService

    mock_llm.side_effect = AIServiceError("down")
    s = AISearchService.run_sync(user_host, "noclegi")
    assert s.status == AiTravelSession.Status.FAILED


@pytest.mark.django_db
@override_settings(OPENAI_API_KEY="sk-x", AI_MATCH_EXPLANATION_USE_LLM=False)
@patch("apps.ai_assistant.services.AISearchService._call_llm")
@patch("apps.ai_assistant.services.SearchOrchestrator.get_ordered_ids")
def test_run_sync_invalid_llm_params_uses_lenient_repair(mock_search, mock_llm, user_host):
    from apps.ai_assistant.models import AiTravelSession
    from apps.ai_assistant.services import AISearchService

    mock_search.return_value = []

    mock_llm.return_value = (
        {"travel_mode": "nope", "summary_pl": "bad"},
        5,
        Decimal("0"),
    )
    s = AISearchService.run_sync(user_host, "test")
    assert s.status == AiTravelSession.Status.COMPLETE


@pytest.mark.django_db
@override_settings(OPENAI_API_KEY="sk-x", AI_MATCH_EXPLANATION_USE_LLM=False)
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
