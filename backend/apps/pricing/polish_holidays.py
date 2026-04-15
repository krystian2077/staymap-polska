"""Święta ustawowo wolne od pracy w PL (GUS) — stałe + ruchome (Wielkanoc, Boże Ciało).

Dodatkowe dni szczytu (mosty, Wigilia, Wielki Piątek itd.) — moduł polish_travel_peaks.
"""

from __future__ import annotations

from datetime import date, timedelta

from dateutil.easter import easter

from .polish_travel_peaks import extra_pricing_peak_name, is_extra_pricing_peak_day


def _easter_sunday(year: int) -> date:
    return easter(year)


def _easter_monday(year: int) -> date:
    return easter(year) + timedelta(days=1)


def _corpus_christi(year: int) -> date:
    return easter(year) + timedelta(days=60)


def is_polish_public_holiday(d: date) -> bool:
    y = d.year
    fixed = {
        (1, 1),
        (1, 6),
        (5, 1),
        (5, 3),
        (8, 15),
        (11, 1),
        (11, 11),
        (12, 25),
        (12, 26),
    }
    if (d.month, d.day) in fixed:
        return True
    if d == _easter_sunday(y):
        return True
    if d == _easter_monday(y):
        return True
    if d == _corpus_christi(y):
        return True
    return False


def is_pricing_peak_day(d: date) -> bool:
    """Globalnie: święto GUS lub dodatkowy dzień szczytu (bez kontekstu oferty)."""
    return is_polish_public_holiday(d) or is_extra_pricing_peak_day(d)


def polish_public_holiday_name(d: date) -> str | None:
    """Krótka nazwa do UI; None jeśli to nie dzień wolny od pracy."""
    if not is_polish_public_holiday(d):
        return None
    y = d.year
    key = (d.month, d.day)
    names: dict[tuple[int, int], str] = {
        (1, 1): "Nowy Rok",
        (1, 6): "Święto Trzech Króli",
        (5, 1): "Święto Pracy",
        (5, 3): "Święto Konstytucji 3 Maja",
        (8, 15): "Wniebowzięcie NMP",
        (11, 1): "Wszystkich Świętych",
        (11, 11): "Narodowe Święto Niepodległości",
        (12, 25): "Boże Narodzenie (pierwszy dzień)",
        (12, 26): "Boże Narodzenie (drugi dzień)",
    }
    if key in names:
        return names[key]
    if d == _easter_sunday(y):
        return "Wielkanoc"
    if d == _easter_monday(y):
        return "Poniedziałek Wielkanocny"
    if d == _corpus_christi(y):
        return "Boże Ciało"
    return "Święto ustawowe"


def pricing_peak_day_name(d: date) -> str | None:
    """Etykieta bez kontekstu oferty — święta GUS + dodatkowe szczyty."""
    if is_polish_public_holiday(d):
        return polish_public_holiday_name(d)
    return extra_pricing_peak_name(d)
