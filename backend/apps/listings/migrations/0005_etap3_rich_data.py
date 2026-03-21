# Generated manually for Etap 3 rich listing data + reviews

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def _default_listing_type():
    return {"name": "Domek", "icon": "🏠", "slug": "domek"}


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("listings", "0004_etap3_booking_pricing"),
    ]

    operations = [
        migrations.AddField(
            model_name="listing",
            name="short_description",
            field=models.CharField(blank=True, max_length=320),
        ),
        migrations.AddField(
            model_name="listing",
            name="bedrooms",
            field=models.PositiveSmallIntegerField(default=1),
        ),
        migrations.AddField(
            model_name="listing",
            name="beds",
            field=models.PositiveSmallIntegerField(default=1),
        ),
        migrations.AddField(
            model_name="listing",
            name="bathrooms",
            field=models.PositiveSmallIntegerField(default=1),
        ),
        migrations.AddField(
            model_name="listing",
            name="is_pet_friendly",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="listing",
            name="cancellation_policy",
            field=models.CharField(
                choices=[
                    ("flexible", "Elastyczna"),
                    ("moderate", "Umiarkowana"),
                    ("strict", "Ścisła"),
                    ("non_refundable", "Bezzwrotna"),
                ],
                default="flexible",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="listing",
            name="check_in_time",
            field=models.CharField(default="15:00", max_length=5),
        ),
        migrations.AddField(
            model_name="listing",
            name="check_out_time",
            field=models.CharField(default="11:00", max_length=5),
        ),
        migrations.AddField(
            model_name="listing",
            name="listing_type",
            field=models.JSONField(default=_default_listing_type),
        ),
        migrations.AddField(
            model_name="listing",
            name="amenities",
            field=models.JSONField(default=list),
        ),
        migrations.AddField(
            model_name="listing",
            name="destination_score_cache",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="listing",
            name="average_rating",
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=3, null=True
            ),
        ),
        migrations.AddField(
            model_name="listing",
            name="review_count",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="listinglocation",
            name="address_line",
            field=models.CharField(blank=True, max_length=240),
        ),
        migrations.AddField(
            model_name="listinglocation",
            name="postal_code",
            field=models.CharField(blank=True, max_length=16),
        ),
        migrations.AddField(
            model_name="listinglocation",
            name="near_lake",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="listinglocation",
            name="near_mountains",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="listinglocation",
            name="near_forest",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="listinglocation",
            name="near_sea",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="listingimage",
            name="alt_text",
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.CreateModel(
            name="ListingReview",
            fields=[
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True),
                ),
                (
                    "deleted_at",
                    models.DateTimeField(blank=True, db_index=True, null=True),
                ),
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "author_display_first",
                    models.CharField(blank=True, max_length=80),
                ),
                (
                    "author_display_last",
                    models.CharField(blank=True, max_length=80),
                ),
                (
                    "overall_rating",
                    models.DecimalField(decimal_places=1, max_digits=2),
                ),
                ("title", models.CharField(blank=True, max_length=200)),
                ("content", models.TextField()),
                (
                    "subscores",
                    models.JSONField(
                        blank=True,
                        help_text='np. {"cleanliness":4.5,"location":5,"communication":4.5,"accuracy":5}',
                        null=True,
                    ),
                ),
                (
                    "author",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="listing_reviews",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "listing",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="reviews",
                        to="listings.listing",
                    ),
                ),
            ],
            options={
                "verbose_name": "Opinia o ofercie",
                "verbose_name_plural": "Opinie o ofertach",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="listingreview",
            index=models.Index(
                fields=["listing_id", "created_at"],
                name="listings_li_listing_6e1c0e_idx",
            ),
        ),
    ]
