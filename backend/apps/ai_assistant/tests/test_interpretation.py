from apps.ai_assistant.interpretation import json_safe_normalized_params, normalized_search_params_from_llm


def test_normalized_search_params_invalid_travel_mode():
    params, errs = normalized_search_params_from_llm({"travel_mode": "invalid_mode"})
    assert errs
    assert "travel_mode" in errs[0]


def test_normalized_search_params_lat_without_lng():
    params, errs = normalized_search_params_from_llm({"latitude": 50.0})
    assert errs


def test_normalized_search_params_radius_out_of_range():
    params, errs = normalized_search_params_from_llm({"radius_km": 999})
    assert errs


def test_normalized_search_params_price_range_invalid():
    params, errs = normalized_search_params_from_llm({"min_price": 500, "max_price": 100})
    assert errs


def test_normalized_search_params_valid_minimal():
    params, errs = normalized_search_params_from_llm(
        {
            "location": "Gdańsk",
            "guests": 2,
            "ordering": "recommended",
        }
    )
    assert not errs
    assert params.get("location") == "Gdańsk"
    assert params.get("guests") == 2


def test_json_safe_normalized_params_date():
    from datetime import date

    out = json_safe_normalized_params({"date_from": date(2025, 7, 1)})
    assert out["date_from"] == "2025-07-01"

