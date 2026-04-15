from __future__ import annotations

from typing import Any, Optional

from apps.search.schemas import (
    VALID_ORDERING,
    VALID_TRAVEL_MODES,
    _parse_date_str,
    _parse_float,
    _parse_int,
)


def _normalize_travel_mode_lenient(raw: Any) -> tuple[Optional[str], Optional[str]]:
    if raw in (None, ""):
        return None, None
    mode = str(raw).strip().lower()
    aliases = {
        "romance": "romantic",
        "romans": "romantic",
        "para": "romantic",
        "couple": "romantic",
        "mountain": "mountains",
        "gory": "mountains",
        "lakehouse": "lake",
        "pets": "pet",
        "remote": "workation",
    }
    mode = aliases.get(mode, mode)
    if mode in VALID_TRAVEL_MODES:
        return mode, None
    return None, f"travel_mode '{raw}' pominięty (poza dozwolonym zakresem)"


def _normalize_ordering_lenient(raw: Any) -> tuple[str, Optional[str]]:
    ordering = str(raw or "recommended").strip().lower()
    if ordering in VALID_ORDERING:
        return ordering, None
    return "recommended", f"ordering '{raw}' zastąpiono 'recommended'"


def _parse_bool(v: Any) -> Optional[bool]:
    if v is None or v == "":
        return None
    if isinstance(v, bool):
        return v
    return str(v).strip().lower() in ("1", "true", "yes", "on", "tak")


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
            if mode == "pet":
                params["is_pet_friendly"] = True

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

    for tag in ("near_mountains", "near_lake", "near_forest"):
        bv = _parse_bool(llm.get(tag))
        if bv is True:
            params[tag] = True

    sauna = _parse_bool(llm.get("sauna"))
    if sauna is True:
        # SearchOrchestrator filtruje po "amenities".
        params["amenities"] = ["sauna", "private_sauna"]

    quiet_min = _parse_int(llm.get("quiet_score_min"))
    if llm.get("quiet_score_min") not in (None, ""):
        if quiet_min is None:
            errors.append("quiet_score_min musi być liczbą całkowitą")
        elif not (0 <= quiet_min <= 10):
            errors.append("quiet_score_min musi być między 0 a 10")
        elif quiet_min >= 7:
            # SearchOrchestrator wspiera filtr quiet_rural zamiast bezpośredniego score.
            params["quiet_rural"] = True

    return params, errors


def normalized_search_params_from_llm_lenient(llm: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    """Naprawia typowe błędy odpowiedzi LLM i zwraca bezpieczne parametry + ostrzeżenia."""
    params: dict[str, Any] = {}
    warnings: list[str] = []

    loc = llm.get("location")
    if loc is not None and str(loc).strip():
        params["location"] = str(loc).strip()[:200]

    mode, mode_warn = _normalize_travel_mode_lenient(llm.get("travel_mode"))
    if mode:
        params["travel_mode"] = mode
        if mode == "pet":
            params["is_pet_friendly"] = True
    if mode_warn:
        warnings.append(mode_warn)

    ordering, ord_warn = _normalize_ordering_lenient(llm.get("ordering"))
    params["ordering"] = ordering
    if ord_warn:
        warnings.append(ord_warn)

    guests = _parse_int(llm.get("guests"))
    if guests is not None and guests >= 1:
        params["guests"] = guests
    elif llm.get("guests") not in (None, ""):
        warnings.append("guests pominięto (niepoprawna wartość)")

    lat = _parse_float(llm.get("latitude"))
    lng = _parse_float(llm.get("longitude"))
    has_lat = llm.get("latitude") not in (None, "")
    has_lng = llm.get("longitude") not in (None, "")
    if has_lat or has_lng:
        if lat is None or lng is None:
            warnings.append("geolokalizacja pominięta (brak pary latitude/longitude)")
        elif not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
            warnings.append("geolokalizacja pominięta (współrzędne poza zakresem)")
        else:
            params["latitude"] = lat
            params["longitude"] = lng

    rk = _parse_float(llm.get("radius_km"))
    if llm.get("radius_km") not in (None, ""):
        if rk is None:
            warnings.append("radius_km pominięto (nie jest liczbą)")
        else:
            if rk < 1:
                warnings.append("radius_km podniesiono do 1 km")
                rk = 1.0
            if rk > 500:
                warnings.append("radius_km obcięto do 500 km")
                rk = 500.0
            params["radius_km"] = rk

    df = _parse_date_str(llm.get("date_from"))
    dt = _parse_date_str(llm.get("date_to"))
    if llm.get("date_from") not in (None, "") and df is None:
        warnings.append("date_from pominięto (niepoprawny format)")
    elif df is not None:
        params["date_from"] = df
    if llm.get("date_to") not in (None, "") and dt is None:
        warnings.append("date_to pominięto (niepoprawny format)")
    elif dt is not None:
        params["date_to"] = dt
    if params.get("date_from") is not None and params.get("date_to") is not None and params["date_to"] <= params["date_from"]:
        warnings.append("date_to pominięto (musi być późniejsze niż date_from)")
        params.pop("date_to", None)

    min_p = _parse_float(llm.get("min_price"))
    max_p = _parse_float(llm.get("max_price"))
    if llm.get("min_price") not in (None, ""):
        if min_p is None or min_p < 0:
            warnings.append("min_price pominięto (niepoprawna wartość)")
        else:
            params["min_price"] = min_p
    if llm.get("max_price") not in (None, ""):
        if max_p is None or max_p < 0:
            warnings.append("max_price pominięto (niepoprawna wartość)")
        else:
            params["max_price"] = max_p
    if (
        params.get("min_price") is not None
        and params.get("max_price") is not None
        and params["max_price"] < params["min_price"]
    ):
        params["min_price"], params["max_price"] = params["max_price"], params["min_price"]
        warnings.append("zamieniono min_price i max_price (odwrócony zakres)")

    bm = (llm.get("booking_mode") or "").strip() or None
    if bm in ("instant", "request"):
        params["booking_mode"] = bm
    elif bm is not None:
        warnings.append("booking_mode pominięto (nieobsługiwana wartość)")

    for tag in ("near_mountains", "near_lake", "near_forest"):
        bv = _parse_bool(llm.get(tag))
        if bv is True:
            params[tag] = True

    sauna = _parse_bool(llm.get("sauna"))
    if sauna is True:
        params["amenities"] = ["sauna", "private_sauna"]

    quiet_min = _parse_int(llm.get("quiet_score_min"))
    if quiet_min is not None:
        if quiet_min < 0:
            quiet_min = 0
            warnings.append("quiet_score_min podniesiono do 0")
        if quiet_min > 10:
            quiet_min = 10
            warnings.append("quiet_score_min obcięto do 10")
        if quiet_min >= 7:
            params["quiet_rural"] = True

    return params, warnings


def json_safe_normalized_params(params: dict[str, Any]) -> dict[str, Any]:
    """Wersja do JSONField (daty → ISO)."""
    out: dict[str, Any] = {}
    for k, v in params.items():
        if hasattr(v, "isoformat"):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out
