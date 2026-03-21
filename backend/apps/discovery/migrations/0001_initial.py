# Etap 5 — discovery + compare

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("listings", "0005_etap3_rich_data"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="DiscoveryCollection",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("deleted_at", models.DateTimeField(blank=True, db_index=True, null=True)),
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("slug", models.SlugField(max_length=120, unique=True)),
                ("title", models.CharField(max_length=200)),
                ("description", models.TextField(blank=True, default="")),
                ("sort_order", models.PositiveSmallIntegerField(db_index=True, default=0)),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                (
                    "travel_mode",
                    models.CharField(
                        blank=True,
                        default="",
                        help_text="Opcjonalny filtr trybu (link „Zobacz więcej”).",
                        max_length=32,
                    ),
                ),
            ],
            options={
                "ordering": ("sort_order", "title"),
            },
        ),
        migrations.CreateModel(
            name="CompareSession",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("deleted_at", models.DateTimeField(blank=True, db_index=True, null=True)),
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("session_key", models.CharField(blank=True, db_index=True, default="", max_length=64)),
                ("expires_at", models.DateTimeField(db_index=True)),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="compare_sessions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="CollectionListing",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("deleted_at", models.DateTimeField(blank=True, db_index=True, null=True)),
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
                (
                    "collection",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="collection_listings",
                        to="discovery.discoverycollection",
                    ),
                ),
                (
                    "listing",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="collection_memberships",
                        to="listings.listing",
                    ),
                ),
            ],
            options={
                "ordering": ("sort_order", "id"),
            },
        ),
        migrations.AddField(
            model_name="discoverycollection",
            name="listings",
            field=models.ManyToManyField(
                blank=True,
                related_name="discovery_collections",
                through="discovery.CollectionListing",
                to="listings.listing",
            ),
        ),
        migrations.AddField(
            model_name="comparesession",
            name="listings",
            field=models.ManyToManyField(
                blank=True,
                related_name="compare_sessions",
                to="listings.listing",
            ),
        ),
        migrations.AddConstraint(
            model_name="collectionlisting",
            constraint=models.UniqueConstraint(
                condition=models.Q(deleted_at__isnull=True),
                fields=("collection", "listing"),
                name="discovery_collection_listing_uniq",
            ),
        ),
        migrations.AddConstraint(
            model_name="comparesession",
            constraint=models.UniqueConstraint(
                condition=models.Q(user__isnull=False),
                fields=("user",),
                name="discovery_compare_one_session_per_user",
            ),
        ),
        migrations.AddConstraint(
            model_name="comparesession",
            constraint=models.UniqueConstraint(
                condition=~Q(session_key=""),
                fields=("session_key",),
                name="discovery_compare_session_key_uniq",
            ),
        ),
    ]
