"""API panelu gospodarza: reguły cenowe per oferta."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any

from django.shortcuts import get_object_or_404
from rest_framework.exceptions import ValidationError

from apps.listings.models import Listing
from apps.pricing.models import CustomDatePrice, HolidayPricingRule, LongStayDiscountRule, SeasonalPricingRule
from apps.pricing.platform_calendar_info import get_platform_pricing_reference

RULE_TYPES = frozenset({"seasonal", "holiday_date", "custom_price", "long_stay"})


def _serialize_seasonal(r: SeasonalPricingRule) -> dict[str, Any]:
    return {
        "id": str(r.id),
        "rule_type": "seasonal",
        "name": r.name or "",
        "valid_from": r.valid_from.isoformat(),
        "valid_to": r.valid_to.isoformat(),
        "multiplier": str(r.multiplier),
        "priority": r.priority,
    }


def _serialize_holiday(r: HolidayPricingRule) -> dict[str, Any]:
    return {
        "id": str(r.id),
        "rule_type": "holiday_date",
        "date": r.date.isoformat(),
        "multiplier": str(r.multiplier),
    }


def _serialize_custom(r: CustomDatePrice) -> dict[str, Any]:
    return {
        "id": str(r.id),
        "rule_type": "custom_price",
        "date": r.date.isoformat(),
        "price_override": str(r.price_override),
    }


def _serialize_long_stay(r: LongStayDiscountRule) -> dict[str, Any]:
    return {
        "id": str(r.id),
        "rule_type": "long_stay",
        "min_nights": r.min_nights,
        "discount_percent": str(r.discount_percent),
        "priority": r.priority,
    }


def host_get_pricing_rules(listing: Listing) -> dict[str, Any]:
    seasonal = [_serialize_seasonal(r) for r in listing.seasonal_rules.filter(deleted_at__isnull=True)]
    holidays = [_serialize_holiday(r) for r in listing.holiday_rules.filter(deleted_at__isnull=True)]
    custom = [_serialize_custom(r) for r in listing.custom_date_prices.filter(deleted_at__isnull=True)]
    long_stay = [_serialize_long_stay(r) for r in listing.long_stay_rules.filter(deleted_at__isnull=True)]
    return {
        "listing_id": str(listing.id),
        "apply_pl_travel_peak_extras": listing.apply_pl_travel_peak_extras,
        "platform_reference": get_platform_pricing_reference(),
        "seasonal_rules": seasonal,
        "holiday_date_rules": holidays,
        "custom_date_prices": custom,
        "long_stay_rules": long_stay,
    }


def _parse_decimal(v: Any, field: str) -> Decimal:
    try:
        return Decimal(str(v))
    except Exception as e:
        raise ValidationError({field: "Nieprawidłowa liczba."}) from e


def host_create_pricing_rule(listing: Listing, data: dict[str, Any]) -> dict[str, Any]:
    rt = data.get("rule_type")
    if rt not in RULE_TYPES:
        raise ValidationError({"rule_type": f"Wymagane: jedno z {sorted(RULE_TYPES)}."})

    if rt == "seasonal":
        vf = data.get("valid_from")
        vt = data.get("valid_to")
        if not vf or not vt:
            raise ValidationError({"valid_from": "Podaj zakres dat.", "valid_to": "Podaj zakres dat."})
        d0 = date.fromisoformat(str(vf)[:10])
        d1 = date.fromisoformat(str(vt)[:10])
        if d1 < d0:
            raise ValidationError({"valid_to": "Data końcowa nie może być wcześniejsza niż początkowa."})
        m = _parse_decimal(data.get("multiplier"), "multiplier")
        pr = int(data.get("priority") or 0)
        name = (data.get("name") or "")[:120]
        r = SeasonalPricingRule.objects.create(
            listing=listing,
            name=name,
            valid_from=d0,
            valid_to=d1,
            multiplier=m,
            priority=max(0, pr),
        )
        return _serialize_seasonal(r)

    if rt == "holiday_date":
        raw = data.get("date")
        if not raw:
            raise ValidationError({"date": "Podaj datę."})
        d = date.fromisoformat(str(raw)[:10])
        m = _parse_decimal(data.get("multiplier"), "multiplier")
        r = HolidayPricingRule.objects.create(listing=listing, date=d, multiplier=m)
        return _serialize_holiday(r)

    if rt == "custom_price":
        raw = data.get("date")
        if not raw:
            raise ValidationError({"date": "Podaj datę."})
        d = date.fromisoformat(str(raw)[:10])
        p = _parse_decimal(data.get("price_override"), "price_override")
        if p < 0:
            raise ValidationError({"price_override": "Cena nie może być ujemna."})
        r = CustomDatePrice.objects.create(listing=listing, date=d, price_override=p)
        return _serialize_custom(r)

    # long_stay
    mn = data.get("min_nights")
    if mn is None:
        raise ValidationError({"min_nights": "Podaj minimalną liczbę nocy."})
    try:
        min_n = int(mn)
    except (TypeError, ValueError):
        raise ValidationError({"min_nights": "Musi być liczbą całkowitą."}) from None
    if min_n < 1:
        raise ValidationError({"min_nights": "Minimum 1 noc."})
    dp = _parse_decimal(data.get("discount_percent"), "discount_percent")
    if dp < 0 or dp > 100:
        raise ValidationError({"discount_percent": "0–100."})
    pr = int(data.get("priority") or 0)
    r = LongStayDiscountRule.objects.create(
        listing=listing,
        min_nights=min_n,
        discount_percent=dp,
        priority=max(0, pr),
    )
    return _serialize_long_stay(r)


def host_patch_pricing_rule(listing: Listing, rule_id: str, data: dict[str, Any]) -> dict[str, Any]:
    rt = data.get("rule_type")
    if rt not in RULE_TYPES:
        raise ValidationError({"rule_type": f"Wymagane: jedno z {sorted(RULE_TYPES)}."})

    if rt == "seasonal":
        r = get_object_or_404(SeasonalPricingRule, id=rule_id, listing=listing, deleted_at__isnull=True)
        if "name" in data:
            r.name = (data.get("name") or "")[:120]
        if "valid_from" in data and data["valid_from"]:
            r.valid_from = date.fromisoformat(str(data["valid_from"])[:10])
        if "valid_to" in data and data["valid_to"]:
            r.valid_to = date.fromisoformat(str(data["valid_to"])[:10])
        if r.valid_to < r.valid_from:
            raise ValidationError({"valid_to": "Data końcowa nie może być wcześniejsza."})
        if "multiplier" in data and data["multiplier"] is not None:
            r.multiplier = _parse_decimal(data["multiplier"], "multiplier")
        if "priority" in data and data["priority"] is not None:
            r.priority = max(0, int(data["priority"]))
        r.save()
        return _serialize_seasonal(r)

    if rt == "holiday_date":
        r = get_object_or_404(HolidayPricingRule, id=rule_id, listing=listing, deleted_at__isnull=True)
        if "date" in data and data["date"]:
            r.date = date.fromisoformat(str(data["date"])[:10])
        if "multiplier" in data and data["multiplier"] is not None:
            r.multiplier = _parse_decimal(data["multiplier"], "multiplier")
        r.save()
        return _serialize_holiday(r)

    if rt == "custom_price":
        r = get_object_or_404(CustomDatePrice, id=rule_id, listing=listing, deleted_at__isnull=True)
        if "date" in data and data["date"]:
            r.date = date.fromisoformat(str(data["date"])[:10])
        if "price_override" in data and data["price_override"] is not None:
            p = _parse_decimal(data["price_override"], "price_override")
            if p < 0:
                raise ValidationError({"price_override": "Cena nie może być ujemna."})
            r.price_override = p
        r.save()
        return _serialize_custom(r)

    r = get_object_or_404(LongStayDiscountRule, id=rule_id, listing=listing, deleted_at__isnull=True)
    if "min_nights" in data and data["min_nights"] is not None:
        r.min_nights = max(1, int(data["min_nights"]))
    if "discount_percent" in data and data["discount_percent"] is not None:
        dp = _parse_decimal(data["discount_percent"], "discount_percent")
        if dp < 0 or dp > 100:
            raise ValidationError({"discount_percent": "0–100."})
        r.discount_percent = dp
    if "priority" in data and data["priority"] is not None:
        r.priority = max(0, int(data["priority"]))
    r.save()
    return _serialize_long_stay(r)


def host_delete_pricing_rule(listing: Listing, rule_id: str, rule_type: str) -> None:
    if rule_type not in RULE_TYPES:
        raise ValidationError({"rule_type": f"Wymagane: jedno z {sorted(RULE_TYPES)}."})

    if rule_type == "seasonal":
        r = get_object_or_404(SeasonalPricingRule, id=rule_id, listing=listing, deleted_at__isnull=True)
    elif rule_type == "holiday_date":
        r = get_object_or_404(HolidayPricingRule, id=rule_id, listing=listing, deleted_at__isnull=True)
    elif rule_type == "custom_price":
        r = get_object_or_404(CustomDatePrice, id=rule_id, listing=listing, deleted_at__isnull=True)
    else:
        r = get_object_or_404(LongStayDiscountRule, id=rule_id, listing=listing, deleted_at__isnull=True)
    r.soft_delete()
