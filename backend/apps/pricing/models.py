import uuid

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.common.models import BaseModel
from apps.listings.models import Listing


class CustomDatePrice(BaseModel):
    """Nadpisanie ceny bazowej za konkretną noc (dzień zameldowania = ta noc)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.ForeignKey(
        Listing,
        on_delete=models.CASCADE,
        related_name="custom_date_prices",
    )
    date = models.DateField(db_index=True)
    price_override = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = "Cena dzienna"
        verbose_name_plural = "Ceny dzienne"
        constraints = [
            models.UniqueConstraint(
                fields=["listing", "date"],
                condition=models.Q(deleted_at__isnull=True),
                name="pricing_customdateprice_listing_date_uniq",
            ),
        ]

    def __str__(self):
        return f"{self.listing.title} @ {self.date}: {self.price_override}"


class SeasonalPricingRule(BaseModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.ForeignKey(
        Listing,
        on_delete=models.CASCADE,
        related_name="seasonal_rules",
    )
    name = models.CharField(max_length=120, blank=True)
    valid_from = models.DateField(db_index=True)
    valid_to = models.DateField(db_index=True)
    multiplier = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=1,
        validators=[MinValueValidator(0)],
    )
    priority = models.PositiveSmallIntegerField(default=0)

    class Meta:
        verbose_name = "Reguła sezonowa"
        verbose_name_plural = "Reguły sezonowe"
        ordering = ["-priority", "-multiplier"]

    def __str__(self):
        return f"{self.listing.title}: ×{self.multiplier} ({self.valid_from}–{self.valid_to})"


class HolidayPricingRule(BaseModel):
    """Opcjonalny mnożnik na konkretną datę (nadpisuje domyślny ze świąt narodowych)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.ForeignKey(
        Listing,
        on_delete=models.CASCADE,
        related_name="holiday_rules",
    )
    date = models.DateField(db_index=True)
    multiplier = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )

    class Meta:
        verbose_name = "Reguła świąteczna"
        verbose_name_plural = "Reguły świąteczne"
        constraints = [
            models.UniqueConstraint(
                fields=["listing", "date"],
                condition=models.Q(deleted_at__isnull=True),
                name="pricing_holidayrule_listing_date_uniq",
            ),
        ]

    def __str__(self):
        return f"{self.listing.title} święto {self.date}: ×{self.multiplier}"


class LongStayDiscountRule(BaseModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.ForeignKey(
        Listing,
        on_delete=models.CASCADE,
        related_name="long_stay_rules",
    )
    min_nights = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1)],
    )
    discount_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    priority = models.PositiveSmallIntegerField(default=0)

    class Meta:
        verbose_name = "Rabat długiego pobytu"
        verbose_name_plural = "Rabaty długiego pobytu"
        ordering = ["-min_nights", "-priority"]

    def __str__(self):
        return f"{self.listing.title}: ≥{self.min_nights} nocy → -{self.discount_percent}%"
