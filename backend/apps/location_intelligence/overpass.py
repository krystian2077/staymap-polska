"""Klient Overpass API — tylko węzły (node), bez ciężkich relacji."""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.parse
import urllib.request

from django.conf import settings

logger = logging.getLogger(__name__)


def _build_query(lat: float, lng: float, radius_m: int) -> str:
    # Współrzędne: around:RADIUS,LAT,LNG
    r = int(radius_m)
    return f"""[out:json][timeout:35];
(
  node["amenity"~"^(restaurant|cafe|bar|pub|fast_food|nightclub|pharmacy)$"](around:{r},{lat},{lng});
  node["leisure"~"^(park|playground)$"](around:{r},{lat},{lng});
  node["tourism"~"^(museum|attraction|viewpoint)$"](around:{r},{lat},{lng});
  node["natural"="peak"](around:{r},{lat},{lng});
  node["highway"="bus_stop"](around:{r},{lat},{lng});
  node["railway"="station"](around:{r},{lat},{lng});
);
out body;
"""


def fetch_overpass_elements(lat: float, lng: float, radius_m: int = 8000) -> tuple[list[dict], str | None]:
    """
    Zwraca (elements, error_message).
    Przy błędzie sieci / parsowania: ([], opis).
    """
    url = settings.OVERPASS_INTERPRETER_URL
    ua = settings.OVERPASS_USER_AGENT
    query = _build_query(lat, lng, radius_m)
    body = urllib.parse.urlencode({"data": query}).encode()
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": ua,
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        logger.warning("Overpass request failed: %s", e)
        return [], str(e)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        logger.warning("Overpass JSON error: %s", e)
        return [], "invalid_json"

    elements = data.get("elements") or []
    if not isinstance(elements, list):
        return [], "invalid_response"
    return elements, None
