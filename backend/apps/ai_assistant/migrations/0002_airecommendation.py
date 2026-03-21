# AiRecommendation (ERD)

import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ai_assistant", "0001_etap5_ai_search"),
        ("listings", "0005_etap3_rich_data"),
    ]

    operations = [
        migrations.CreateModel(
            name="AiRecommendation",
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
                ("rank", models.PositiveSmallIntegerField(default=0)),
                (
                    "interpretation",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="recommendations",
                        to="ai_assistant.aifilterinterpretation",
                    ),
                ),
                (
                    "listing",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="ai_recommendations",
                        to="listings.listing",
                    ),
                ),
            ],
            options={
                "ordering": ("rank", "id"),
            },
        ),
        migrations.AddConstraint(
            model_name="airecommendation",
            constraint=models.UniqueConstraint(
                fields=("interpretation", "listing"),
                name="ai_assistant_recommendation_uniq",
            ),
        ),
    ]
