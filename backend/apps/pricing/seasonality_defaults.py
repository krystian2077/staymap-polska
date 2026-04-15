"""Domyślna sezonowość (PL), gdy gospodarz nie zdefiniował reguł SeasonalPricingRule."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from django.conf import settings


def default_seasonal_multiplier(d: date) -> Decimal:
    """
    Mnożnik poza regułami w bazie: lato, okres świąteczny; reszta roku = 1.
    Włącza się tylko przy DEFAULT_SEASONAL_PRICING_ENABLED.
    """
    if not getattr(settings, "DEFAULT_SEASONAL_PRICING_ENABLED", True):
        return Decimal("1")

    summer = Decimal(str(getattr(settings, "DEFAULT_SEASONAL_SUMMER_MULTIPLIER", "1.12")))
    winter = Decimal(str(getattr(settings, "DEFAULT_SEASONAL_WINTER_PEAK_MULTIPLIER", "1.10")))

    md = (d.month, d.day)

    # Główny sezon urlopowy: od początku czerwca do połowy września (wakacje szkolne + „pełne lato”)
    start = getattr(settings, "DEFAULT_SEASONAL_SUMMER_START", (6, 1))
    end = getattr(settings, "DEFAULT_SEASONAL_SUMMER_END", (9, 15))
    if start <= md <= end:
        return summer

    # 22.12 – 31.12 lub 01.01 – 07.01 — święta / sylwester / Trzech Króli
    if md >= (12, 22) or md <= (1, 7):
        return winter

    return Decimal("1")
