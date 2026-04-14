from __future__ import annotations

from django.db.models import Case, ExpressionWrapper, F, IntegerField, Q, Value, When

from apps.search.schemas import VALID_TRAVEL_MODES

_OUTDOOR_KW = [
    "las",
    "góry",
    "bieszczady",
    "tatry",
    "beskidy",
    "natura",
    "spacer",
    "rower",
    "szlak",
    "kajak",
    "trekking",
    "aktywny",
    "outdoor",
    "przygod",
    "wędrówk",
]
_LAKE_KW = ["jezioro", "mazur", "żeglar", "plaża", "pomost", "kajak", "kąpiel", "jeziora", "woda"]
_MOUNTAIN_KW = [
    "góry",
    "tatry",
    "beskidy",
    "karkonosze",
    "śnieżka",
    "zakopane",
    "sudety",
    "szczyt",
    "stok",
    "narty",
    "snowboard",
    "widok",
    "panorama",
]
_WELLNESS_KW = ["spa", "sauna", "wellness", "jacuzzi", "relaks", "masaż", "balia", "basen", "odpręż"]
_ROMANTIC_KW = [
    "romantyczn",
    "kameraln",
    "przytuln",
    "dwojga",
    "dla par",
    "we dwoje",
    "rocznica",
    "randka",
    "intymn",
    "nastroj",
    "kominek",
    "wanna",
]
_SLOW_KW = [
    "spokojn",
    "wioska",
    "agroturyst",
    "eko",
    "cisza",
    "detoks",
    "wyloguj",
    "natura",
    "las",
    "odpoczynek",
    "reset",
]
_WORKATION_KW = [
    "wifi",
    "biurko",
    "remote",
    "cowork",
    "praca",
    "zdaln",
    "internet",
    "workspace",
    "skupien",
]
_FAMILY_KW = [
    "rodzin",
    "dzieci",
    "plac zabaw",
    "łóżeczk",
    "krzesełk",
    "bezpieczn",
    "dużo miejs",
    "przestronn",
]
_PET_KW = ["pies", "psa", "pupil", "zwierzę", "ogrodzon", "spacery", "pieski"]


def _keyword_q(words: list[str]) -> Q:
    q = Q()
    for w in words:
        q |= (
            Q(title__icontains=w)
            | Q(location__city__icontains=w)
            | Q(location__region__icontains=w)
            | Q(description__icontains=w)
            | Q(short_description__icontains=w)
        )
    return q


def _keyword_score_when(words: list[str], points: int) -> When:
    return When(_keyword_q(words), then=Value(points))


def _amenity_score_when(amenity_id: str, points: int) -> When:
    return When(Q(amenities__contains=[{"id": amenity_id}]), then=Value(points))


def _tag_score_when(tag_name: str, points: int) -> When:
    return When(Q(**{f"location__{tag_name}": True}), then=Value(points))


class TravelModeRanker:
    """Dopasowuje scoring pod tryb podróży (heurystyki na polach z Etapu 1)."""

    @classmethod
    def apply(cls, qs, travel_mode: str | None):
        if not travel_mode:
            return qs
        mode = travel_mode.lower()
        if mode not in VALID_TRAVEL_MODES:
            return qs

        scores = []

        if mode == "family":
            # Więcej osób = lepiej dla rodzin
            scores.append(Case(When(max_guests__gte=4, then=Value(30)), default=Value(0)))
            scores.append(Case(_keyword_score_when(_FAMILY_KW, 25), default=Value(0)))
            # Udogodnienia dla dzieci
            scores.append(Case(_amenity_score_when("child_friendly", 35), default=Value(0)))
            scores.append(Case(_amenity_score_when("plac_zabaw", 35), default=Value(0)))
            scores.append(Case(_amenity_score_when("crib", 20), default=Value(0)))
            scores.append(Case(_amenity_score_when("lozeczko", 20), default=Value(0)))
            # Synchro z seedem:
            scores.append(Case(_amenity_score_when("rowery", 10), default=Value(0)))
            # Lokalizacja
            scores.append(Case(_tag_score_when("near_lake", 15), default=Value(0)))
            scores.append(Case(_tag_score_when("near_sea", 15), default=Value(0)))
            scores.append(Case(_tag_score_when("beach_access", 10), default=Value(0)))

        elif mode == "romantic":
            # Dokładnie 2 osoby to ideał dla par
            scores.append(Case(When(max_guests=2, then=Value(30)), default=Value(0)))
            scores.append(Case(_keyword_score_when(_ROMANTIC_KW, 25), default=Value(0)))
            # Klimat
            scores.append(Case(_amenity_score_when("jacuzzi_int", 25), default=Value(0)))
            scores.append(Case(_amenity_score_when("jacuzzi_ext", 25), default=Value(0)))
            scores.append(Case(_amenity_score_when("balia", 20), default=Value(0)))
            scores.append(Case(_amenity_score_when("kominek", 20), default=Value(0)))
            scores.append(Case(_amenity_score_when("sauna_fin", 15), default=Value(0)))
            scores.append(Case(_amenity_score_when("sauna_infra", 15), default=Value(0)))
            # Spokój
            scores.append(Case(_tag_score_when("near_forest", 10), default=Value(0)))
            scores.append(Case(_tag_score_when("quiet_rural", 10), default=Value(0)))

        elif mode == "pet":
            # Krytyczny warunek
            scores.append(Case(When(is_pet_friendly=True, then=Value(100)), default=Value(0)))
            scores.append(Case(_keyword_score_when(_PET_KW, 25), default=Value(0)))
            # Udogodnienia
            scores.append(Case(_amenity_score_when("pies_ok", 40), default=Value(0)))
            # Tereny na spacery
            scores.append(Case(_tag_score_when("near_forest", 20), default=Value(0)))
            scores.append(Case(_tag_score_when("near_sea", 10), default=Value(0)))

        elif mode == "workation":
            scores.append(Case(_keyword_score_when(_WORKATION_KW, 30), default=Value(0)))
            # Infrastruktura
            scores.append(Case(_amenity_score_when("wifi_500", 35), default=Value(0)))
            scores.append(Case(_amenity_score_when("wifi_100", 25), default=Value(0)))
            scores.append(Case(_amenity_score_when("biurko", 35), default=Value(0)))
            # Szybka rezerwacja
            scores.append(Case(When(booking_mode="instant", then=Value(15)), default=Value(0)))

        elif mode == "slow":
            scores.append(Case(_keyword_score_when(_SLOW_KW, 30), default=Value(0)))
            # Lokalizacja "off-grid"
            scores.append(Case(_tag_score_when("quiet_rural", 45), default=Value(0)))
            scores.append(Case(_tag_score_when("near_forest", 25), default=Value(0)))
            scores.append(Case(_tag_score_when("near_protected_area", 20), default=Value(0)))
            # Tryb rezerwacji (bardziej osobisty kontakt)
            scores.append(Case(When(booking_mode="request", then=Value(15)), default=Value(0)))

        elif mode == "outdoor":
            scores.append(Case(_keyword_score_when(_OUTDOOR_KW, 30), default=Value(0)))
            # Aktywność
            scores.append(Case(_tag_score_when("near_forest", 30), default=Value(0)))
            scores.append(Case(_tag_score_when("cycling_routes_nearby", 35), default=Value(0)))
            scores.append(Case(_tag_score_when("near_mountains", 25), default=Value(0)))
            scores.append(Case(_tag_score_when("near_river", 20), default=Value(0)))
            # Przechowywanie sprzętu
            scores.append(Case(_amenity_score_when("narty_schowek", 15), default=Value(0)))
            scores.append(Case(_amenity_score_when("rowery", 15), default=Value(0)))
            scores.append(Case(_amenity_score_when("kajaki", 15), default=Value(0)))

        elif mode == "lake":
            scores.append(Case(_tag_score_when("near_lake", 65), default=Value(0)))
            scores.append(Case(_tag_score_when("beach_access", 35), default=Value(0)))
            scores.append(Case(_tag_score_when("near_river", 15), default=Value(0)))
            scores.append(Case(_keyword_score_when(_LAKE_KW, 30), default=Value(0)))
            scores.append(Case(_amenity_score_when("kajaki", 25), default=Value(0)))
            scores.append(Case(_amenity_score_when("balia", 10), default=Value(0)))

        elif mode == "mountains":
            scores.append(Case(_tag_score_when("near_mountains", 65), default=Value(0)))
            scores.append(Case(_tag_score_when("ski_slopes_nearby", 40), default=Value(0)))
            scores.append(Case(_keyword_score_when(_MOUNTAIN_KW, 30), default=Value(0)))
            scores.append(Case(_amenity_score_when("narty_schowek", 20), default=Value(0)))
            scores.append(Case(_amenity_score_when("kominek", 15), default=Value(0)))
            scores.append(Case(_amenity_score_when("sauna_fin", 15), default=Value(0)))

        elif mode == "wellness":
            scores.append(Case(_keyword_score_when(_WELLNESS_KW, 30), default=Value(0)))
            # Relax priority
            scores.append(Case(_amenity_score_when("sauna_fin", 45), default=Value(0)))
            scores.append(Case(_amenity_score_when("sauna_infra", 45), default=Value(0)))
            scores.append(Case(_amenity_score_when("jacuzzi_ext", 45), default=Value(0)))
            scores.append(Case(_amenity_score_when("jacuzzi_int", 40), default=Value(0)))
            scores.append(Case(_amenity_score_when("balia", 40), default=Value(0)))
            scores.append(Case(_amenity_score_when("basen_ext", 35), default=Value(0)))
            scores.append(Case(_amenity_score_when("basen_int", 35), default=Value(0)))
            scores.append(Case(_amenity_score_when("masaz", 30), default=Value(0)))

        if not scores:
            return qs.annotate(travel_score=Value(0))

        # Sumujemy wszystkie komponenty scoringu
        total_score = scores[0]
        for s in scores[1:]:
            total_score += s

        return qs.annotate(
            travel_score=ExpressionWrapper(total_score, output_field=IntegerField())
        )
