from __future__ import annotations

from django.db.models import Case, ExpressionWrapper, F, IntegerField, Q, Value, When

from apps.search.schemas import VALID_TRAVEL_MODES

_OUTDOOR_KW = [
    "las",
    "gór",
    "bieszczad",
    "tatry",
    "beskid",
    "natura",
    "spacer",
    "rower",
    "szlak",
]
_LAKE_KW = ["jezior", "mazur", "żegl", "plaż"]
_MOUNTAIN_KW = ["gór", "tatry", "beskid", "karkonosz", "śnieżk", "zakopan", "sudet"]
_WELLNESS_KW = ["spa", "saun", "wellness", "jacuzzi", "relaks", "masaż"]
_ROMANTIC_KW = ["romant", "kameraln", "przytul", "dwojga"]
_SLOW_KW = ["spokojn", "wioska", "agroturyst", "eko"]
_WORKATION_KW = ["wifi", "biur", "remote", "cowork"]


def _keyword_q(words: list[str]) -> Q:
    q = Q()
    for w in words:
        q |= (
            Q(title__icontains=w)
            | Q(location__city__icontains=w)
            | Q(location__region__icontains=w)
        )
    return q


def _keyword_score_when(words: list[str], points: int) -> When:
    return When(_keyword_q(words), then=Value(points))


class TravelModeRanker:
    """Dopasowuje scoring pod tryb podróży (heurystyki na polach z Etapu 1)."""

    @classmethod
    def apply(cls, qs, travel_mode: str | None):
        if not travel_mode:
            return qs
        mode = travel_mode.lower()
        if mode not in VALID_TRAVEL_MODES:
            return qs

        if mode == "family":
            return qs.annotate(
                travel_score=ExpressionWrapper(F("max_guests") * 8, output_field=IntegerField())
            )

        if mode == "romantic":
            text_bonus = Case(
                _keyword_score_when(_ROMANTIC_KW, 40),
                default=Value(0),
                output_field=IntegerField(),
            )
            size_bonus = ExpressionWrapper(
                (Value(10) - F("max_guests")) * 6 + Value(15),
                output_field=IntegerField(),
            )
            return qs.annotate(
                travel_score=ExpressionWrapper(
                    text_bonus + size_bonus,
                    output_field=IntegerField(),
                )
            )

        if mode == "workation":
            text_bonus = Case(
                _keyword_score_when(_WORKATION_KW, 30),
                default=Value(0),
                output_field=IntegerField(),
            )
            mode_bonus = Case(
                When(booking_mode="instant", then=Value(25)),
                default=Value(8),
                output_field=IntegerField(),
            )
            return qs.annotate(
                travel_score=ExpressionWrapper(
                    text_bonus + mode_bonus,
                    output_field=IntegerField(),
                )
            )

        if mode == "slow":
            text_bonus = Case(
                _keyword_score_when(_SLOW_KW, 35),
                default=Value(0),
                output_field=IntegerField(),
            )
            mode_bonus = Case(
                When(booking_mode="request", then=Value(28)),
                default=Value(10),
                output_field=IntegerField(),
            )
            return qs.annotate(
                travel_score=ExpressionWrapper(
                    text_bonus + mode_bonus,
                    output_field=IntegerField(),
                )
            )

        if mode == "pet":
            return qs.annotate(travel_score=Value(0, output_field=IntegerField()))

        kw_map = {
            "outdoor": _OUTDOOR_KW,
            "lake": _LAKE_KW,
            "mountains": _MOUNTAIN_KW,
            "wellness": _WELLNESS_KW,
        }
        words = kw_map.get(mode)
        if words:
            return qs.annotate(
                travel_score=Case(
                    _keyword_score_when(words, 55),
                    default=Value(0),
                    output_field=IntegerField(),
                )
            )

        return qs
