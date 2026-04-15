"""
Dodatkowe dni szczytu cenowego w PL (poza GUS): komercyjne, „mosty”, Wielki Piątek,
piątek po Bożym Ciele, Wigilia, typowe przedłużenia majówki itd.

Logika jest roczna (cache), żeby szybko liczyć kalendarze dla wielu ofert.
"""

from __future__ import annotations

from datetime import date, timedelta
from functools import lru_cache

from dateutil.easter import easter
from django.conf import settings


def _flag(name: str, default: bool = True) -> bool:
    return bool(getattr(settings, name, default))


@lru_cache(maxsize=128)
def _extra_peak_dates_for_year(y: int) -> frozenset[date]:
    s: set[date] = set()

    # --- Stałe (wysoki ruch turystyczny / komercja) ---
    for m, d in (
        (12, 31),  # Sylwester
        (2, 14),  # Walentynki
        (5, 2),  # Majówka — klasyczny „most” między 1 a 3 maja
        (12, 24),  # Wigilia — wyjazdy do rodzin / w góry
        (8, 14),
        (8, 16),  # Częste przedłużenie przy 15 VIII
    ):
        s.add(date(y, m, d))

    if _flag("PL_EXTRA_PEAK_INCLUDE_WOMENS_DAY", True):
        s.add(date(y, 3, 8))
    if _flag("PL_EXTRA_PEAK_INCLUDE_ALL_SOULS", True):
        s.add(date(y, 11, 2))
    if _flag("PL_EXTRA_PEAK_INCLUDE_ANDRZEJKI", True):
        s.add(date(y, 11, 29))

    e = easter(y)

    # Wielki Piątek (nie ustawowo wolny, ale bardzo silny ruch)
    s.add(e - timedelta(days=2))

    # Boże Ciało = czwartek; piątek po to typowy „most” na 4 dni
    corpus = e + timedelta(days=60)
    s.add(corpus + timedelta(days=1))

    # Majówka: dzień tuż przed 1 maja (często brane jako urlop)
    may1 = date(y, 5, 1)
    wd1 = may1.weekday()
    if wd1 in (1, 2, 3, 4, 5):  # wt–sob: piątek przed majówką w sobotę też
        s.add(may1 - timedelta(days=1))

    # Gdy 3 maja jest czwartkiem — piątek 4.05 jako przedłużenie
    may3 = date(y, 5, 3)
    if may3.weekday() == 3:
        s.add(may3 + timedelta(days=1))

    return frozenset(s)


def is_extra_pricing_peak_day(d: date) -> bool:
    return d in _extra_peak_dates_for_year(d.year)


def extra_pricing_peak_name(d: date) -> str | None:
    """Nazwa dla dnia z listy dodatkowych szczytów (gdy nie jest świętem GUS)."""
    if d not in _extra_peak_dates_for_year(d.year):
        return None
    y = d.year
    e = easter(y)
    corpus = e + timedelta(days=60)

    if d == e - timedelta(days=2):
        return "Wielki Piątek"
    if d == corpus + timedelta(days=1):
        return "Piątek po Bożym Ciele"

    may1 = date(y, 5, 1)
    may3 = date(y, 5, 3)
    if d == may1 - timedelta(days=1) and may1.weekday() in (1, 2, 3, 4, 5):
        return "Majówka (dzień przed 1 maja)"
    if d == may3 + timedelta(days=1) and may3.weekday() == 3:
        return "Majówka (piątek po 3 maja)"

    md = (d.month, d.day)
    if md == (12, 31):
        return "Sylwester"
    if md == (2, 14):
        return "Walentynki"
    if md == (5, 2):
        return "Majówka (dzień mostowy)"
    if md == (12, 24):
        return "Wigilia Bożego Narodzenia"
    if md == (8, 14):
        return "Długi weekend sierpniowy"
    if md == (8, 16):
        return "Długi weekend sierpniowy"
    if md == (3, 8):
        return "Dzień Kobiet (ruch weekendowy)"
    if md == (11, 2):
        return "Zaduszki"
    if md == (11, 29):
        return "Andrzejki"
    return "Dzień podwyższonego popytu"


def clear_travel_peak_cache() -> None:
    """Testy / reload ustawień."""
    _extra_peak_dates_for_year.cache_clear()
