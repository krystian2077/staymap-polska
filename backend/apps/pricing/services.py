from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from typing import Optional

from django.conf import settings

from apps.common.exceptions import PricingError
from apps.listings.models import Listing

from .models import CustomDatePrice, HolidayPricingRule, LongStayDiscountRule, SeasonalPricingRule
from .polish_holidays import is_polish_public_holiday, polish_public_holiday_name
from .polish_travel_peaks import extra_pricing_peak_name, is_extra_pricing_peak_day
from .seasonality_defaults import default_seasonal_multiplier


def _listing_use_travel_peak_extras(listing: Listing) -> bool:
    return getattr(listing, "apply_pl_travel_peak_extras", True)


def _is_pricing_peak_for_listing(listing: Listing, d: date) -> bool:
    if is_polish_public_holiday(d):
        return True
    if _listing_use_travel_peak_extras(listing) and is_extra_pricing_peak_day(d):
        return True
    return False


def _pricing_peak_day_name_for_listing(listing: Listing, d: date) -> str | None:
    if is_polish_public_holiday(d):
        return polish_public_holiday_name(d)
    if _listing_use_travel_peak_extras(listing) and is_extra_pricing_peak_day(d):
        return extra_pricing_peak_name(d)
    return None


def _service_fee_percent() -> Decimal:
    return Decimal(str(getattr(settings, "PLATFORM_SERVICE_FEE_PERCENT", 15)))


def _default_holiday_multiplier() -> Decimal:
    return Decimal(str(getattr(settings, "DEFAULT_HOLIDAY_PRICE_MULTIPLIER", "1.15")))


def _iter_nights(check_in: date, check_out: date):
    d = check_in
    while d < check_out:
        yield d
        d += timedelta(days=1)


class PricingService:
    """base × (sezon × święto per noc) − rabat długiego pobytu + cleaning + prowizja."""

    @classmethod
    def calculate(
        cls,
        listing: Listing,
        check_in: date,
        check_out: date,
        guests: int = 1,
        adults: Optional[int] = None,
        children: int = 0,
        pets: int = 0,
    ) -> dict:
        if check_out <= check_in:
            raise PricingError("Data wyjazdu musi być późniejsza niż przyjazdu.")
        if guests < 1:
            raise PricingError("Liczba gości musi być co najmniej 1.")
        if guests > listing.max_guests:
            raise PricingError("Przekroczono maksymalną liczbę gości dla tej oferty.")

        ad = adults if adults is not None else guests
        ch = max(0, int(children))
        pt = max(0, int(pets))
        if ad < 1:
            raise PricingError("Wymagany jest co najmniej jeden dorosły.")
        if ad + ch != guests:
            raise PricingError("Liczba gości musi być równa dorosłym + dzieciom.")

        nights = (check_out - check_in).days
        currency = listing.currency
        cleaning = listing.cleaning_fee or Decimal("0")
        svc_pct = _service_fee_percent()

        extra_adults = max(0, ad - 1)
        extra_children = ch
        adult_pct = Decimal("0.10")
        child_pct = Decimal("0.05")

        custom_map = cls._custom_prices_map(listing, check_in, check_out)
        nightly_lines = []
        accommodation_base_total = Decimal("0")
        adults_surcharge_total = Decimal("0")
        children_surcharge_total = Decimal("0")

        for d in _iter_nights(check_in, check_out):
            base = custom_map.get(d, listing.base_price)
            seasonal = cls._seasonal_multiplier(listing, d)
            holiday = cls._holiday_multiplier(listing, d)
            
            # Cena za noc dla 1 osoby
            nightly_base = (base * seasonal * holiday).quantize(Decimal("0.01"))
            adults_surcharge_per_night = (
                nightly_base * Decimal(str(extra_adults)) * adult_pct
            ).quantize(Decimal("0.01"))
            children_surcharge_per_night = (
                nightly_base * Decimal(str(extra_children)) * child_pct
            ).quantize(Decimal("0.01"))

            accommodation_base_total += nightly_base
            adults_surcharge_total += adults_surcharge_per_night
            children_surcharge_total += children_surcharge_per_night

            nightly_lines.append(
                {
                    "date": d.isoformat(),
                    "base_price": str(base),
                    "seasonal_multiplier": str(seasonal),
                    "holiday_multiplier": str(holiday),
                    "nightly_base": str(nightly_base),
                    "adults_surcharge_fee": str(adults_surcharge_per_night),
                    "children_surcharge_fee": str(children_surcharge_per_night),
                    "line_total": str(
                        nightly_base + adults_surcharge_per_night + children_surcharge_per_night
                    ),
                }
            )

        # Suma przed rabatem (zakwaterowanie + dopłaty osobowe)
        guest_surcharge_total = (adults_surcharge_total + children_surcharge_total).quantize(Decimal("0.01"))
        subtotal_with_guests = accommodation_base_total + guest_surcharge_total

        discount_pct = cls._long_stay_discount_percent(listing, nights)
        long_stay_discount = (subtotal_with_guests * discount_pct / Decimal("100")).quantize(Decimal("0.01"))
        accommodation_after = (subtotal_with_guests - long_stay_discount).quantize(Decimal("0.01"))

        service_fee = ((accommodation_after + cleaning) * svc_pct / Decimal("100")).quantize(Decimal("0.01"))
        total = (accommodation_after + cleaning + service_fee).quantize(Decimal("0.01"))

        avg_nightly_base = (accommodation_base_total / Decimal(nights)).quantize(Decimal("0.01")) if nights else Decimal("0")

        if nightly_lines:
            nlines = len(nightly_lines)
            avg_seasonal = (
                sum(Decimal(x["seasonal_multiplier"]) for x in nightly_lines) / Decimal(nlines)
            ).quantize(Decimal("0.01"))
            avg_holiday = (
                sum(Decimal(x["holiday_multiplier"]) for x in nightly_lines) / Decimal(nlines)
            ).quantize(Decimal("0.01"))
        else:
            avg_seasonal = Decimal("1")
            avg_holiday = Decimal("1")

        return {
            "nights": nights,
            "guests": guests,
            "adults": ad,
            "children": ch,
            "pets": pt,
            "guests_included": listing.guests_included,
            "extra_adults": extra_adults,
            "adult_surcharge_percent": str((adult_pct * Decimal("100")).quantize(Decimal("0.01"))),
            "adults_surcharge_total": str(adults_surcharge_total),
            "extra_children": extra_children,
            "child_surcharge_percent": str((child_pct * Decimal("100")).quantize(Decimal("0.01"))),
            "children_surcharge_total": str(children_surcharge_total),
            "guest_surcharge_total": str(guest_surcharge_total),
            # Zachowanie kompatybilności ze starym kontraktem UI/API.
            "extra_guests": extra_adults + extra_children,
            "extra_guest_fee_per_night": "0.00",
            "extra_guests_total": str(guest_surcharge_total),
            "nightly_rate": str(avg_nightly_base),
            "seasonal_multiplier": str(avg_seasonal),
            "holiday_multiplier": str(avg_holiday),
            "nightly_lines": nightly_lines,
            "seasonal_note": "per noc — reguła o najwyższym priority",
            "holiday_note": "per noc — święta PL lub reguła oferty",
            "accommodation_subtotal": str(accommodation_base_total),
            "long_stay_discount_percent": str(discount_pct),
            "long_stay_discount": str(long_stay_discount),
            "accommodation_after_discount": str(accommodation_after),
            "cleaning_fee": str(cleaning),
            "service_fee_percent": str(svc_pct),
            "service_fee": str(service_fee),
            "total": str(total),
            "currency": currency,
        }

    @classmethod
    def _custom_prices_map(cls, listing, check_in, check_out):
        rows = CustomDatePrice.objects.filter(
            listing=listing,
            date__gte=check_in,
            date__lt=check_out,
            deleted_at__isnull=True,
        )
        return {r.date: r.price_override for r in rows}

    @classmethod
    def _seasonal_multiplier(cls, listing: Listing, d: date) -> Decimal:
        qs = SeasonalPricingRule.objects.filter(
            listing=listing,
            valid_from__lte=d,
            valid_to__gte=d,
            deleted_at__isnull=True,
        )
        best = None
        for r in qs:
            if best is None:
                best = r
                continue
            if r.priority > best.priority:
                best = r
            elif r.priority == best.priority and r.multiplier > best.multiplier:
                best = r
        if best:
            return best.multiplier
        return default_seasonal_multiplier(d)

    @classmethod
    def _holiday_multiplier(cls, listing: Listing, d: date) -> Decimal:
        rule = (
            HolidayPricingRule.objects.filter(
                listing=listing,
                date=d,
                deleted_at__isnull=True,
            )
            .first()
        )
        if rule:
            return rule.multiplier
        if _is_pricing_peak_for_listing(listing, d):
            return _default_holiday_multiplier()
        return Decimal("1")

    @classmethod
    def daily_rates_for_calendar(
        cls,
        listing: Listing,
        date_from: date,
        date_to: date,
    ) -> dict:
        """
        Stawka za noc (zakwaterowanie) dla każdego dnia w zakresie [date_from, date_to] — bez rabatu
        długiego pobytu (ten zależy od całego zakresu rezerwacji).
        """
        if date_to < date_from:
            raise PricingError("Parametr „to” nie może być wcześniejszy niż „from”.")
        span = (date_to - date_from).days + 1
        if span > 96:
            raise PricingError("Zakres kalendarza cen nie może przekraczać 96 dni.")

        end_exclusive = date_to + timedelta(days=1)
        custom_map = cls._custom_prices_map(listing, date_from, end_exclusive)
        days: list[dict] = []
        d = date_from
        while d <= date_to:
            base = custom_map.get(d, listing.base_price)
            seasonal = cls._seasonal_multiplier(listing, d)
            holiday = cls._holiday_multiplier(listing, d)
            nightly = (base * seasonal * holiday).quantize(Decimal("0.01"))
            pub = is_polish_public_holiday(d)
            peak = _is_pricing_peak_for_listing(listing, d)
            days.append(
                {
                    "date": d.isoformat(),
                    "nightly_rate": str(nightly),
                    "base_price": str(base),
                    "seasonal_multiplier": str(seasonal),
                    "holiday_multiplier": str(holiday),
                    "is_public_holiday": pub,
                    "is_pricing_peak": peak,
                    "holiday_name": _pricing_peak_day_name_for_listing(listing, d) if peak else None,
                }
            )
            d += timedelta(days=1)

        return {
            "currency": listing.currency,
            "days": days,
            "date_from": date_from.isoformat(),
            "date_to": date_to.isoformat(),
        }

    @classmethod
    def _long_stay_discount_percent(cls, listing: Listing, nights: int) -> Decimal:
        rules = LongStayDiscountRule.objects.filter(
            listing=listing,
            min_nights__lte=nights,
            deleted_at__isnull=True,
        ).order_by("-min_nights", "-priority", "-discount_percent")
        best = rules.first()
        return best.discount_percent if best else Decimal("0")
