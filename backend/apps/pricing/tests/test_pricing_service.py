from datetime import date, timedelta
from decimal import Decimal

import pytest

from apps.common.exceptions import PricingError
from apps.pricing.models import LongStayDiscountRule, SeasonalPricingRule
from apps.pricing.services import PricingService


@pytest.mark.django_db
class TestPricingService:
    def test_basic_three_nights(self, listing):
        listing.base_price = Decimal("200")
        listing.cleaning_fee = Decimal("100")
        listing.save()
        d0 = date.today() + timedelta(days=10)
        d1 = d0 + timedelta(days=3)
        r = PricingService.calculate(listing, d0, d1, guests=1, adults=1, children=0)
        assert r["nights"] == 3
        assert Decimal(r["accommodation_subtotal"]) == Decimal("600")
        assert Decimal(r["cleaning_fee"]) == Decimal("100")
        assert Decimal(r["service_fee"]) == Decimal("90")
        assert Decimal(r["total"]) == Decimal("790")

    def test_extra_adults_and_children_surcharge(self, listing):
        listing.base_price = Decimal("100")
        listing.cleaning_fee = Decimal("0")
        listing.save()
        d0 = date.today() + timedelta(days=14)
        d1 = d0 + timedelta(days=2)

        # 2 noce, 2 dorosłych + 1 dziecko:
        # baza: 100*2 = 200
        # dopłata dorosły: 10%*100*2 = 20
        # dopłata dziecko: 5%*100*2 = 10
        # subtotal: 230, service 15%: 34.50, total: 264.50
        r = PricingService.calculate(listing, d0, d1, guests=3, adults=2, children=1, pets=2)

        assert Decimal(r["adults_surcharge_total"]) == Decimal("20.00")
        assert Decimal(r["children_surcharge_total"]) == Decimal("10.00")
        assert Decimal(r["guest_surcharge_total"]) == Decimal("30.00")
        assert Decimal(r["accommodation_subtotal"]) == Decimal("200.00")
        assert Decimal(r["service_fee"]) == Decimal("34.50")
        assert Decimal(r["total"]) == Decimal("264.50")

    def test_long_stay_discount(self, listing):
        listing.base_price = Decimal("100")
        listing.cleaning_fee = Decimal("0")
        listing.save()
        LongStayDiscountRule.objects.create(
            listing=listing,
            min_nights=3,
            discount_percent=Decimal("10"),
        )
        d0 = date.today() + timedelta(days=20)
        d1 = d0 + timedelta(days=3)
        r = PricingService.calculate(listing, d0, d1)
        assert Decimal(r["accommodation_subtotal"]) == Decimal("300")
        assert Decimal(r["long_stay_discount"]) == Decimal("30")
        assert Decimal(r["total"]) > 0

    def test_seasonal_multiplier(self, listing):
        listing.base_price = Decimal("100")
        listing.cleaning_fee = Decimal("0")
        listing.save()
        d0 = date.today() + timedelta(days=40)
        d1 = d0 + timedelta(days=1)
        SeasonalPricingRule.objects.create(
            listing=listing,
            name="high",
            valid_from=d0,
            valid_to=d0,
            multiplier=Decimal("2"),
            priority=1,
        )
        r = PricingService.calculate(listing, d0, d1)
        assert Decimal(r["accommodation_subtotal"]) == Decimal("200")

    def test_too_many_guests_raises(self, listing):
        listing.max_guests = 2
        listing.save()
        d0 = date.today() + timedelta(days=5)
        d1 = d0 + timedelta(days=2)
        with pytest.raises(PricingError):
            PricingService.calculate(listing, d0, d1, guests=5)

    def test_daily_rates_for_calendar(self, listing):
        listing.base_price = Decimal("100")
        listing.save()
        d0 = date.today() + timedelta(days=60)
        d1 = d0 + timedelta(days=2)
        r = PricingService.daily_rates_for_calendar(listing, d0, d1)
        assert r["currency"] == "PLN"
        assert len(r["days"]) == 3
        assert r["days"][0]["date"] == d0.isoformat()
        assert Decimal(r["days"][0]["nightly_rate"]) == Decimal("100")

    def test_daily_calendar_range_too_long(self, listing):
        d0 = date.today()
        d1 = d0 + timedelta(days=100)
        with pytest.raises(PricingError):
            PricingService.daily_rates_for_calendar(listing, d0, d1)


@pytest.fixture
def listing(db, user_host):
    from django.contrib.gis.geos import Point

    from apps.host.models import HostProfile
    from apps.listings.models import Listing, ListingLocation

    profile, _ = HostProfile.objects.get_or_create(user=user_host)
    l = Listing.objects.create(
        host=profile,
        title="Test nocleg",
        slug="test-nocleg-pricing",
        description="",
        base_price=Decimal("200"),
        cleaning_fee=Decimal("0"),
        currency="PLN",
        status=Listing.Status.APPROVED,
        max_guests=4,
    )
    ListingLocation.objects.create(
        listing=l,
        point=Point(21.0, 52.0, srid=4326),
        city="Testowo",
        region="mazowieckie",
        country="PL",
    )
    return l
