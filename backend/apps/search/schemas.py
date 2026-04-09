from __future__ import annotations

from datetime import date
from typing import Any, TypedDict

from apps.listings.location_tags import LOCATION_TAG_FIELD_NAMES

# Zgodnie z dokumentacją (WA-2 + Etap 2 API)
VALID_TRAVEL_MODES = frozenset(
    {
        "romantic",
        "family",
        "pet",
        "workation",
        "slow",
        "outdoor",
        "lake",
        "mountains",
        "wellness",
    }
)

VALID_ORDERING = frozenset(
    {
        "recommended",
        "price_asc",
        "price_desc",
        "newest",
    }
)


class SearchQuerySchema(TypedDict, total=False):
    location: str | None
    latitude: float | None
    longitude: float | None
    radius_km: float | None
    date_from: str | None
    date_to: str | None
    guests: int | None
    travel_mode: str | None
    min_price: float | None
    max_price: float | None
    booking_mode: str | None
    ordering: str | None


def _parse_float(v: Any) -> float | None:
    if v is None or v == "":
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _parse_int(v: Any) -> int | None:
    if v is None or v == "":
        return None
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def _parse_date_str(v: Any) -> date | None:
    if v is None or v == "":
        return None
    if isinstance(v, date):
        return v
    if not isinstance(v, str):
        return None
    try:
        return date.fromisoformat(v.strip()[:10])
    except ValueError:
        return None


def _getlist(query_dict, key: str) -> list[str]:
    """Pobiera listę wartości dla klucza (QueryDict lub zwykły dict)."""
    if hasattr(query_dict, "getlist"):
        return [v for v in query_dict.getlist(key) if v]
    val = query_dict.get(key)
    if val is None:
        return []
    if isinstance(val, list):
        return [str(v) for v in val if v]
    return [str(val)]


def parse_search_params(query_dict) -> tuple[dict[str, Any], list[str]]:
    """
    Parsuje query params HTTP do dict używanego przez SearchOrchestrator.
    Zwraca (params, errors).
    """
    errors: list[str] = []
    data: dict[str, Any] = {key: query_dict.get(key) for key in query_dict.keys()}

    params: dict[str, Any] = {}

    if loc := (data.get("location") or "").strip():
        params["location"] = loc

    lat = _parse_float(data.get("latitude"))
    lng = _parse_float(data.get("longitude"))
    has_lat = data.get("latitude") not in (None, "")
    has_lng = data.get("longitude") not in (None, "")
    if has_lat or has_lng:
        if lat is None or lng is None:
            errors.append("Podaj jednocześnie poprawne latitude i longitude (liczby)")
        else:
            ok = True
            if not (-90 <= lat <= 90):
                errors.append("latitude musi być między -90 a 90")
                ok = False
            if not (-180 <= lng <= 180):
                errors.append("longitude musi być między -180 a 180")
                ok = False
            if ok:
                params["latitude"] = lat
                params["longitude"] = lng

    rk = _parse_float(data.get("radius_km"))
    if data.get("radius_km") not in (None, ""):
        if rk is None:
            errors.append("radius_km musi być liczbą")
        elif not (1 <= rk <= 500):
            errors.append("radius_km musi być między 1 a 500")
        else:
            params["radius_km"] = rk

    guests = _parse_int(data.get("guests"))
    if data.get("guests") not in (None, ""):
        if guests is None or guests < 1:
            errors.append("guests musi być liczbą całkowitą >= 1")
        else:
            params["guests"] = guests

    df = _parse_date_str(data.get("date_from"))
    dt = _parse_date_str(data.get("date_to"))
    if data.get("date_from") not in (None, "") and df is None:
        errors.append("date_from musi być datą ISO (YYYY-MM-DD)")
    elif df is not None:
        params["date_from"] = df
    if data.get("date_to") not in (None, "") and dt is None:
        errors.append("date_to musi być datą ISO (YYYY-MM-DD)")
    elif dt is not None:
        params["date_to"] = dt
    if df is not None and dt is not None and dt <= df:
        errors.append("date_to musi być późniejsze niż date_from")

    mode = (data.get("travel_mode") or "").strip().lower() or None
    if mode:
        if mode not in VALID_TRAVEL_MODES:
            errors.append(f"Nieprawidłowy travel_mode: {mode}")
        else:
            params["travel_mode"] = mode

    mp = _parse_float(data.get("min_price"))
    if data.get("min_price") not in (None, ""):
        if mp is None or mp < 0:
            errors.append("min_price musi być liczbą >= 0")
        else:
            params["min_price"] = mp

    xp = _parse_float(data.get("max_price"))
    if data.get("max_price") not in (None, ""):
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

    bm = (data.get("booking_mode") or "").strip() or None
    if bm:
        if bm not in ("instant", "request"):
            errors.append("booking_mode musi być instant lub request")
        else:
            params["booking_mode"] = bm

    ordering = (data.get("ordering") or "recommended").strip().lower()
    if ordering not in VALID_ORDERING:
        errors.append(f"Nieprawidłowy ordering: {ordering}")
    else:
        params["ordering"] = ordering

    ps = _parse_int(data.get("page_size"))
    if data.get("page_size") not in (None, ""):
        if ps is None or not (1 <= ps <= 50):
            errors.append("page_size musi być między 1 a 50")
        else:
            params["page_size"] = ps

    def _truthy(v: Any) -> bool:
        if v is True:
            return True
        if v in (None, "", False):
            return False
        return str(v).strip().lower() in ("1", "true", "yes", "on")

    for tag in LOCATION_TAG_FIELD_NAMES:
        raw = data.get(tag)
        if raw not in (None, "") and _truthy(raw):
            params[tag] = True

    # listing_types — lista slugów (np. domek, apartament)
    listing_types = _getlist(query_dict, "listing_types")
    if listing_types:
        params["listing_types"] = [t.strip().lower() for t in listing_types if t.strip()]

    # amenities — lista ID (np. wifi, sauna)
    amenities = _getlist(query_dict, "amenities")
    if amenities:
        params["amenities"] = [a.strip() for a in amenities if a.strip()]

    # is_pet_friendly
    pet_raw = data.get("is_pet_friendly")
    if pet_raw not in (None, ""):
        params["is_pet_friendly"] = _truthy(pet_raw)

    # bbox (viewport mapy): south, west, north, east
    for b_key in ("bbox_south", "bbox_west", "bbox_north", "bbox_east"):
        bv = _parse_float(data.get(b_key))
        if data.get(b_key) not in (None, "") and bv is not None:
            params[b_key] = bv

    allowed = {
        "location",
        "latitude",
        "longitude",
        "radius_km",
        "date_from",
        "date_to",
        "guests",
        "travel_mode",
        "min_price",
        "max_price",
        "booking_mode",
        "ordering",
        "cursor",
        "page_size",
        "limit",
        "listing_types",
        "amenities",
        "is_pet_friendly",
        "bbox_south",
        "bbox_west",
        "bbox_north",
        "bbox_east",
        *LOCATION_TAG_FIELD_NAMES,
    }
    unknown = set(data.keys()) - allowed
    if unknown:
        errors.append(f"Nieznane parametry: {sorted(unknown)}")

    return params, errors


# Pola zapisywane w SavedSearch.query_payload (bez cursor / page_size)
SAVED_SEARCH_PARAM_KEYS = frozenset(
    {
        "location",
        "latitude",
        "longitude",
        "radius_km",
        "date_from",
        "date_to",
        "guests",
        "travel_mode",
        "min_price",
        "max_price",
        "booking_mode",
        "ordering",
        "listing_types",
        "amenities",
        "is_pet_friendly",
        *LOCATION_TAG_FIELD_NAMES,
    }
)


def validate_saved_search_payload(raw: dict) -> tuple[dict, list[str]]:
    """
    Walidacja JSON zapisu wyszukiwania (WA-2).
    Zwraca (params jak w SearchOrchestrator / parse_search_params, errors).
    """
    if not isinstance(raw, dict):
        return {}, ["query_payload musi być obiektem JSON"]

    unknown = set(raw.keys()) - SAVED_SEARCH_PARAM_KEYS
    if unknown:
        return {}, [f"Nieznane pola: {sorted(unknown)}"]

    from django.http import QueryDict

    qd = QueryDict(mutable=True)
    for key in SAVED_SEARCH_PARAM_KEYS:
        if key not in raw:
            continue
        val = raw[key]
        if val is None:
            continue
        if isinstance(val, bool):
            qd.append(key, "true" if val else "false")
        elif isinstance(val, (int, float)):
            qd.append(key, str(val))
        elif isinstance(val, str):
            qd.append(key, val)
        elif isinstance(val, list):
            for item in val:
                if isinstance(item, str):
                    qd.append(key, item)
                else:
                    return {}, [f"Pole {key}: elementy listy muszą być ciągami znaków"]
        else:
            return {}, [f"Pole {key}: niedozwolony typ"]

    params, errors = parse_search_params(qd)
    for drop in ("page_size", "cursor", "limit"):
        params.pop(drop, None)
    return params, errors


def saved_search_payload_to_json(params: dict) -> dict:
    """Serializacja do JSONField (date → ISO)."""
    out: dict = {}
    for k, v in params.items():
        if hasattr(v, "isoformat"):
            out[k] = v.isoformat()
        elif v is not None:
            out[k] = v
    return out
