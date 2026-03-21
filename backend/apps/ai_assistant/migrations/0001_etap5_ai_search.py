# Generated manually for Etap 5 — AI search

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AiTravelSession",
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
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Oczekuje"),
                            ("processing", "Przetwarza"),
                            ("complete", "Zakończona"),
                            ("failed", "Błąd"),
                        ],
                        db_index=True,
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("expires_at", models.DateTimeField(db_index=True)),
                ("total_tokens_used", models.PositiveIntegerField(default=0)),
                (
                    "total_cost_usd",
                    models.DecimalField(decimal_places=6, default=0, max_digits=10),
                ),
                ("model_used", models.CharField(blank=True, default="", max_length=80)),
                ("result_listing_ids", models.JSONField(blank=True, default=list)),
                ("result_total_count", models.PositiveIntegerField(default=0)),
                ("error_message", models.TextField(blank=True, default="")),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="ai_travel_sessions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ("-created_at",),
            },
        ),
        migrations.CreateModel(
            name="AiTravelPrompt",
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
                ("raw_text", models.TextField()),
                (
                    "session",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="prompts",
                        to="ai_assistant.aitravelsession",
                    ),
                ),
            ],
            options={
                "ordering": ("-created_at",),
            },
        ),
        migrations.CreateModel(
            name="AiFilterInterpretation",
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
                ("raw_llm_json", models.JSONField(blank=True, default=dict)),
                (
                    "normalized_params",
                    models.JSONField(
                        blank=True,
                        default=dict,
                        help_text="Parametry przekazane do SearchOrchestrator (daty jako YYYY-MM-DD).",
                    ),
                ),
                ("summary_pl", models.TextField(blank=True, default="")),
                (
                    "prompt",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="interpretation",
                        to="ai_assistant.aitravelprompt",
                    ),
                ),
            ],
            options={
                "verbose_name": "AI filter interpretation",
                "verbose_name_plural": "AI filter interpretations",
            },
        ),
        migrations.AddIndex(
            model_name="aitravelsession",
            index=models.Index(
                fields=["user", "-created_at"],
                name="ai_assistant_user_id_0f8b2d_idx",
            ),
        ),
    ]
