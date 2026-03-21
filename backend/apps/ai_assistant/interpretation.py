from __future__ import annotations

from typing import Any

from apps.search.schemas import (
    VALID_ORDERING,
    VALID_TRAVEL_MODES,
    _parse_date_str,
    _parse_float,
    _parse_int,
)


def normalized_search_params_from_llm(llm: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    """
    Mapuje słownik z modelu językowego na parametry SearchOrchestrator.
    Zwraca (params, errors) — przy niepustych errors należy oznaczyć sesję jako failed.
    """
    errors: list[str] = []
    params: dict[str, Any] = {}

    loc = llm.get("location")
    if loc is not None and str(loc).strip():
        params["location"] = str(loc).strip()[:200]

    tm_raw = llm.get("travel_mode")
    if tm_raw is not None and str(tm_raw).strip():
        mode = str(tm_raw).strip().lower()
        if mode not in VALID_TRAVEL_MODES:
            errors.append(f"Nieprawidłowy travel_mode: {mode}")
        else:
            params["travel_mode"] = mode

    guests = _parse_int(llm.get("guests"))
    if llm.get("guests") not in (None, ""):
        if guests is None or guests < 1:
            errors.append("guests musi być liczbą całkowitą >= 1")
        else:
            params["guests"] = guests

    lat = _parse_float(llm.get("latitude"))
    lng = _parse_float(llm.get("longitude"))
    has_lat = llm.get("latitude") not in (None, "")
    has_lng = llm.get("longitude") not in (None, "")
    if has_lat or has_lng:
        if lat is None or lng is None:
            errors.append("Podaj jednocześnie poprawne latitude i longitude lub usuń oba")
        else:
            if not (-90 <= lat <= 90):
                errors.append("latitude musi być między -90 a 90")
            elif not (-180 <= lng <= 180):
                errors.append("longitude musi być między -180 a 180")
            else:
                params["latitude"] = lat
                params["longitude"] = lng

    rk = _parse_float(llm.get("radius_km"))
    if llm.get("radius_km") not in (None, ""):
        if rk is None:
            errors.append("radius_km musi być liczbą")
        elif not (1 <= rk <= 500):
            errors.append("radius_km musi być między 1 a 500")
        else:
            params["radius_km"] = rk

    df = _parse_date_str(llm.get("date_from"))
    dt = _parse_date_str(llm.get("date_to"))
    if llm.get("date_from") not in (None, "") and df is None:
        errors.append("date_from musi być datą ISO (YYYY-MM-DD)")
    elif df is not None:
        params["date_from"] = df
    if llm.get("date_to") not in (None, "") and dt is None:
        errors.append("date_to musi być datą ISO (YYYY-MM-DD)")
    elif dt is not None:
        params["date_to"] = dt
    if df is not None and dt is not None and dt <= df:
        errors.append("date_to musi być późniejsze niż date_from")

    mp = _parse_float(llm.get("min_price"))
    if llm.get("min_price") not in (None, ""):
        if mp is None or mp < 0:
            errors.append("min_price musi być liczbą >= 0")
        else:
            params["min_price"] = mp

    xp = _parse_float(llm.get("max_price"))
    if llm.get("max_price") not in (None, ""):
        if xp is None or xp < 0:
            errors.append("max_price musi być liczbą >= 0")
        else:
            params["max_price"] = xp

    if (
        params.get("min_price") is not None
        and params.get("max_price") is not None
        and params["max_price"] < params["min_price"]
    ):
        errors.append("max_price nie może być mniejsze niż min_price")

    bm = (llm.get("booking_mode") or "").strip() or None
    if bm:
        if bm not in ("instant", "request"):
            errors.append("booking_mode musi być instant lub request")
        else:
            params["booking_mode"] = bm

    ordering = (llm.get("ordering") or "recommended").strip().lower()
    if ordering not in VALID_ORDERING:
        errors.append(f"Nieprawidłowy ordering: {ordering}")
    else:
        params["ordering"] = ordering

    return params, errors


def json_safe_normalized_params(params: dict[str, Any]) -> dict[str, Any]:
    """Wersja do JSONField (daty → ISO)."""
    out: dict[str, Any] = {}
    for k, v in params.items():
        if hasattr(v, "isoformat"):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out
