# Etap 4 — cache krótkiego opisu okolicy

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0005_etap3_rich_data"),
        ("location_intelligence", "0001_etap4_nearby_place_cache"),
    ]

    operations = [
        migrations.CreateModel(
            name="AreaSummaryCache",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("body", models.TextField()),
                ("meta", models.JSONField(blank=True, default=dict)),
                ("fetched_at", models.DateTimeField()),
                (
                    "listing",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="area_summary_cache",
                        to="listings.listing",
                    ),
                ),
            ],
            options={
                "verbose_name": "Opis okolicy (cache)",
                "verbose_name_plural": "Opisy okolicy (cache)",
            },
        ),
    ]
