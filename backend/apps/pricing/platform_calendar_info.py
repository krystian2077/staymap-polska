"""Statyczny opis domyślnego kalendarza cen PL do panelu gospodarza (read-only)."""

from __future__ import annotations

from django.conf import settings


def get_platform_pricing_reference() -> dict:
    summer_start = getattr(settings, "DEFAULT_SEASONAL_SUMMER_START", (6, 1))
    summer_end = getattr(settings, "DEFAULT_SEASONAL_SUMMER_END", (9, 15))
    sm = str(getattr(settings, "DEFAULT_SEASONAL_SUMMER_MULTIPLIER", "1.12"))
    wm = str(getattr(settings, "DEFAULT_SEASONAL_WINTER_PEAK_MULTIPLIER", "1.10"))
    hm = str(getattr(settings, "DEFAULT_HOLIDAY_PRICE_MULTIPLIER", "1.15"))

    def fmt(m: tuple[int, int]) -> str:
        return f"{m[1]:02d}.{m[0]:02d}"

    return {
        "seasonality_default": {
            "title": "Domyślna sezonowość",
            "description": (
                "Gdy nie masz własnych reguł sezonowych w panelu, stosujemy mnożniki z kalendarza PL: "
                "lato oraz okres świąteczny. Po dodaniu reguły sezonowej nakładającej się na daty "
                "— liczy się wyższy priorytet z panelu (i nasze domyślne sezony nie dublowają się tam, "
                "gdzie masz własną regułę)."
            ),
            "summer_label": f"{fmt(summer_start)} – {fmt(summer_end)}",
            "summer_multiplier": sm,
            "winter_label": "22.12 – 07.01",
            "winter_multiplier": wm,
        },
        "public_holidays_gus": {
            "title": "Święta ustawowo wolne od pracy (mnożnik świąteczny)",
            "items": [
                "1 stycznia — Nowy Rok",
                "6 stycznia — Trzech Króli",
                "Wielkanoc (niedziela i poniedziałek)",
                "1 maja — Święto Pracy",
                "3 maja — Święto Konstytucji",
                "Boże Ciało",
                "15 sierpnia — Wniebowzięcie NMP",
                "1 listopada — Wszystkich Świętych",
                "11 listopada — Niepodległość",
                "25–26 grudnia — Boże Narodzenie",
            ],
        },
        "travel_peak_extras": {
            "title": "Typowe dni podwyższonego ruchu (opcjonalnie dla oferty)",
            "description": (
                "Gdy opcja „dodatkowe szczyty PL” jest włączona przy ofercie, do świąt GUS dokładamy m.in.: "
                "Wielki Piątek, piątek po Bożym Ciele, Wigilię, Sylwester, Walentynki, majówkę (mosty), "
                "wybrane dni sierpnia, 8 marca, Zaduszki, Andrzejki itd. Możesz to wyłączyć per oferta."
            ),
            "toggle_field": "apply_pl_travel_peak_extras",
        },
        "default_multipliers": {
            "holiday_when_no_host_rule": hm,
            "note": "Własna reguła na konkretną datę w panelu zastępuje domyślny mnożnik świąteczny tego dnia.",
        },
    }
