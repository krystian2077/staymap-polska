"""
Tagi okolicy (ListingLocation) — jedna lista kolejności i nazw pól (snake_case).
Używane w serializerach, wyszukiwaniu i (opcjonalnie) UI.
"""

from __future__ import annotations

# (nazwa pola w modelu, krótka etykieta PL do admina / narzędzi)
LOCATION_TAGS_ORDERED: tuple[tuple[str, str], ...] = (
    ("near_mountains", "Góry"),
    ("near_forest", "Las"),
    ("near_lake", "Jezioro"),
    ("near_sea", "Morze"),
    ("near_river", "Rzeka"),
    ("near_protected_area", "Park / rezerwat"),
    ("beach_access", "Plaża / kąpielisko"),
    ("ski_slopes_nearby", "Stoki / narty"),
    ("quiet_rural", "Cicha okolica / wieś"),
    ("historic_center_nearby", "Zabytki / centrum historyczne"),
    ("cycling_routes_nearby", "Trasy rowerowe"),
)

LOCATION_TAG_FIELD_NAMES: tuple[str, ...] = tuple(t[0] for t in LOCATION_TAGS_ORDERED)


def location_tag_dict(location) -> dict[str, bool]:
    """Słownik wszystkich tagów z obiektu ListingLocation (lub None → wszystko False)."""
    if location is None:
        return {k: False for k in LOCATION_TAG_FIELD_NAMES}
    out: dict[str, bool] = {}
    for k in LOCATION_TAG_FIELD_NAMES:
        out[k] = bool(getattr(location, k, False))
    return out
