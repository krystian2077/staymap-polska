# Etap 4 — cache POI (Overpass) per listing

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("listings", "0005_etap3_rich_data"),
    ]

    operations = [
        migrations.CreateModel(
            name="NearbyPlaceCache",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("radius_m", models.PositiveIntegerField(default=8000)),
                ("payload", models.JSONField(default=dict)),
                ("fetched_at", models.DateTimeField()),
                (
                    "listing",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="nearby_places_cache",
                        to="listings.listing",
                    ),
                ),
            ],
            options={
                "verbose_name": "Cache POI w pobliżu",
                "verbose_name_plural": "Cache POI w pobliżu",
            },
        ),
    ]
