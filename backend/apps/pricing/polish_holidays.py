"""Święta ustawowo wolne od pracy w PL (GUS) — stałe + ruchome (Wielkanoc, Boże Ciało)."""

from __future__ import annotations

from datetime import date, timedelta

from dateutil.easter import easter


def _easter_monday(year: int) -> date:
    return easter(year) + timedelta(days=1)


def _corpus_christi(year: int) -> date:
    # W Polsce: 60. dzień po Wielkanocy (włącznie z Wielkanocą → +59 dni po Easter Sunday)
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
    if d == _easter_monday(y):
        return True
    if d == _corpus_christi(y):
        return True
    return False
