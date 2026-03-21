import uuid

from django.db import models
from django.utils.text import slugify

from django.contrib.gis.db import models as gis_models
from django.contrib.postgres.indexes import GistIndex

from apps.common.models import BaseModel
from apps.host.models import HostProfile


def listing_image_upload_path(instance, filename):
    return f"listings/{instance.listing_id}/{filename}"


class Listing(BaseModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Szkic"
        PENDING = "pending", "Oczekuje na moderację"
        APPROVED = "approved", "Zatwierdzona"
        REJECTED = "rejected", "Odrzucona"
        ARCHIVED = "archived", "Zarchiwizowana"

    class BookingMode(models.TextChoices):
        INSTANT = "instant", "Natychmiastowa"
        REQUEST = "request", "Na prośbę"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    host = models.ForeignKey(HostProfile, on_delete=models.PROTECT, related_name="listings")
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, db_index=True)
    description = models.TextField(blank=True)
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="PLN")
    booking_mode = models.CharField(
        max_length=20,
        choices=BookingMode.choices,
        default=BookingMode.INSTANT,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    max_guests = models.PositiveSmallIntegerField(default=2)

    class Meta:
        verbose_name = "Oferta"
        verbose_name_plural = "Oferty"
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["host_id", "status"]),
        ]

    def __str__(self):
        return f"{self.title} [{self.status}] — {self.base_price} {self.currency}/noc"

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title)[:180] or "listing"
            candidate = base
            n = 0
            while Listing.all_objects.filter(slug=candidate).exclude(pk=self.pk).exists():
                n += 1
                candidate = f"{base}-{n}"
            self.slug = candidate
        super().save(*args, **kwargs)


class ListingLocation(BaseModel):
    listing = models.OneToOneField(
        Listing,
        on_delete=models.CASCADE,
        related_name="location",
    )
    point = gis_models.PointField(geography=True, srid=4326)
    city = models.CharField(max_length=120, blank=True)
    region = models.CharField(max_length=120, blank=True)
    country = models.CharField(max_length=2, default="PL")

    class Meta:
        verbose_name = "Lokalizacja oferty"
        verbose_name_plural = "Lokalizacje ofert"
        indexes = [
            GistIndex(fields=["point"]),
        ]

    def __str__(self):
        return f"{self.city or '—'}, {self.listing.title}"


class ListingImage(BaseModel):
    listing = models.ForeignKey(
        Listing,
        on_delete=models.CASCADE,
        related_name="images",
    )
    image = models.ImageField(upload_to=listing_image_upload_path)
    is_cover = models.BooleanField(default=False)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        verbose_name = "Zdjęcie oferty"
        verbose_name_plural = "Zdjęcia ofert"
        ordering = ["-is_cover", "sort_order", "id"]

    def __str__(self):
        cover = " [okładka]" if self.is_cover else ""
        return f"Zdjęcie #{self.sort_order}{cover} — {self.listing.title}"
