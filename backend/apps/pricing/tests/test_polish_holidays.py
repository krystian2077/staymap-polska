from datetime import date

from apps.pricing.polish_holidays import (
    extra_pricing_peak_name,
    is_extra_pricing_peak_day,
    is_polish_public_holiday,
    is_pricing_peak_day,
    pricing_peak_day_name,
)


def test_new_year_is_public_and_peak():
    d = date(2030, 1, 1)
    assert is_polish_public_holiday(d)
    assert is_pricing_peak_day(d)
    assert pricing_peak_day_name(d) == "Nowy Rok"


def test_sylwester_peak_not_public():
    d = date(2030, 12, 31)
    assert not is_polish_public_holiday(d)
    assert is_extra_pricing_peak_day(d)
    assert is_pricing_peak_day(d)
    assert extra_pricing_peak_name(d) == "Sylwester"
    assert pricing_peak_day_name(d) == "Sylwester"


def test_valentines_peak_not_public():
    d = date(2030, 2, 14)
    assert not is_polish_public_holiday(d)
    assert is_extra_pricing_peak_day(d)
    assert pricing_peak_day_name(d) == "Walentynki"


def test_majowka_bridge_may2():
    d = date(2030, 5, 2)
    assert is_extra_pricing_peak_day(d)
    assert pricing_peak_day_name(d) == "Majówka (dzień mostowy)"


def test_august_assumption_adjacent_peak():
    d14 = date(2031, 8, 14)
    d16 = date(2031, 8, 16)
    assert is_extra_pricing_peak_day(d14)
    assert is_extra_pricing_peak_day(d16)
    assert pricing_peak_day_name(d14) == "Długi weekend sierpniowy"


def test_good_friday_is_extra_peak():
    # Wielkanoc 2030: 21 IV → Wielki Piątek 19 IV
    gf = date(2030, 4, 19)
    assert is_extra_pricing_peak_day(gf)
    assert pricing_peak_day_name(gf) == "Wielki Piątek"


def test_wigilia_and_andrzejki():
    assert is_extra_pricing_peak_day(date(2030, 12, 24))
    assert "Wigilia" in (pricing_peak_day_name(date(2030, 12, 24)) or "")
    assert is_extra_pricing_peak_day(date(2030, 11, 29))
    assert pricing_peak_day_name(date(2030, 11, 29)) == "Andrzejki"
