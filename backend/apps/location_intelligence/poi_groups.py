"""Klasyfikacja elementów Overpass → grupy UI + statystyki pod Destination Score."""

from __future__ import annotations

from typing import Any

from apps.location_intelligence.geo import distance_m



def _poi_name(tags: dict) -> str:
    if not tags:
        return "POI"
    return (
        tags.get("name:pl")
        or tags.get("name")
        or tags.get("official_name")
        or tags.get("brand")
        or "POI"
    )


def _classify_group(tags: dict) -> str | None:
    """Zwraca klucz grupy lub None (pomijamy)."""
    amenity = tags.get("amenity")
    leisure = tags.get("leisure")
    tourism = tags.get("tourism")
    natural = tags.get("natural")
    highway = tags.get("highway")
    railway = tags.get("railway")

    if natural == "peak":
        return "outdoor"
    if leisure == "playground":
        return "family"
    if leisure == "park":
        return "nature_leisure"
    if tourism == "museum":
        return "culture"
    if tourism == "viewpoint":
        return "outdoor"
    if tourism == "attraction":
        return "culture"
    if highway == "bus_stop" or railway == "station":
        return "transport"
    if amenity == "nightclub":
        return "nightlife"
    if amenity in ("bar", "pub"):
        return "nightlife"
    if amenity in ("restaurant", "cafe", "fast_food"):
        return "eat_drink"
    if amenity == "pharmacy":
        return "services"
    return None


def build_nearby_payload(
    elements: list[dict],
    center_lat: float,
    center_lng: float,
    radius_m: int,
) -> dict[str, Any]:
    groups: dict[str, list[dict]] = {
        "eat_drink": [],
        "nature_leisure": [],
        "family": [],
        "culture": [],
        "transport": [],
        "nightlife": [],
        "outdoor": [],
        "services": [],
    }

    for el in elements:
        if el.get("type") != "node":
            continue
        lat, lon = el.get("lat"), el.get("lon")
        if lat is None or lon is None:
            continue
        try:
            lat_f, lon_f = float(lat), float(lon)
        except (TypeError, ValueError):
            continue
        d = distance_m(center_lat, center_lng, lat_f, lon_f)
        if d > radius_m + 50:
            continue
        tags = el.get("tags") or {}
        grp = _classify_group(tags)
        if not grp:
            continue
        item = {
            "name": _poi_name(tags),
            "lat": round(lat_f, 6),
            "lng": round(lon_f, 6),
            "distance_m": int(round(d)),
            "kind": tags.get("amenity") or tags.get("leisure") or tags.get("tourism") or tags.get("natural"),
            "osm_id": el.get("id"),
        }
        groups[grp].append(item)

    for key in groups:
        groups[key].sort(key=lambda x: x["distance_m"])

    # Limit per group (payload size)
    cap = 24
    for key in groups:
        groups[key] = groups[key][:cap]

    parks = len(groups["nature_leisure"])
    peaks = len([x for x in groups["outdoor"] if x.get("kind") == "peak"])
    viewpoints = len([x for x in groups["outdoor"] if x.get("kind") == "viewpoint"])
    outdoor_attr = len([x for x in groups["culture"] if x.get("kind") == "attraction"])
    playgrounds = len(groups["family"])
    nightlife = len(groups["nightlife"])
    cafes = len([x for x in groups["eat_drink"] if x.get("kind") == "cafe"])

    transport_nodes = len(groups["transport"])

    stats = {
        "parks": parks,
        "peaks": peaks,
        "viewpoints": viewpoints,
        "outdoor_attractions": outdoor_attr,
        "playgrounds": playgrounds,
        "nightlife": nightlife,
        "cafes": cafes,
        "transport_nodes": transport_nodes,
        "outdoor_score_nodes": parks + peaks + viewpoints + outdoor_attr,
    }

    return {
        "center": {"lat": center_lat, "lng": center_lng},
        "radius_m": radius_m,
        "groups": groups,
        "stats": stats,
    }
