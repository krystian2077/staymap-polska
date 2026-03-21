import json
import logging
import urllib.error
import urllib.parse
import urllib.request

from django.conf import settings

logger = logging.getLogger(__name__)


def geocode_poland(query: str) -> dict | None:
    """
    OpenStreetMap Nominatim (darmowe, bez klucza).
    Polityka: https://operations.osmfoundation.org/policies/nominatim/
    """
    q = (query or "").strip()
    if not q or len(q) > 200:
        return None

    base = getattr(
        settings,
        "NOMINATIM_SEARCH_URL",
        "https://nominatim.openstreetmap.org/search",
    )
    params = urllib.parse.urlencode(
        {
            "q": q,
            "format": "json",
            "limit": "1",
            "countrycodes": "pl",
            "addressdetails": "1",
        }
    )
    url = f"{base}?{params}"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": settings.NOMINATIM_USER_AGENT,
            "Accept": "application/json",
            "Accept-Language": "pl",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw = json.loads(resp.read().decode())
    except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError) as e:
        logger.warning("Nominatim request failed: %s", e)
        return None

    if not isinstance(raw, list) or not raw:
        return None
    row = raw[0]
    try:
        lat = float(row["lat"])
        lon = float(row["lon"])
    except (KeyError, TypeError, ValueError):
        return None
    display = row.get("display_name") or q
    return {"lat": lat, "lng": lon, "display_name": display}
