from __future__ import annotations

import uuid
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.common.models import BaseModel


class AiTravelSession(BaseModel):
    """
    Sesja wyszukiwania w języku naturalnym (Etap 5).
    TTL i limity tokenów — zgodnie z dokumentacją (WA-3).
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Oczekuje"
        PROCESSING = "processing", "Przetwarza"
        COMPLETE = "complete", "Zakończona"
        FAILED = "failed", "Błąd"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ai_travel_sessions",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    expires_at = models.DateTimeField(db_index=True)

    total_tokens_used = models.PositiveIntegerField(default=0)
    total_cost_usd = models.DecimalField(max_digits=10, decimal_places=6, default=0)
    model_used = models.CharField(max_length=80, blank=True, default="")

    result_listing_ids = models.JSONField(default=list, blank=True)
    result_total_count = models.PositiveIntegerField(default=0)
    error_message = models.TextField(blank=True, default="")

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["user", "-created_at"]),
        ]

    def save(self, *args, **kwargs):
        if self.expires_at is None:
            hours = getattr(settings, "AI_SESSION_TTL_HOURS", 24)
            self.expires_at = timezone.now() + timedelta(hours=hours)
        super().save(*args, **kwargs)


class AiTravelPrompt(BaseModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        AiTravelSession,
        on_delete=models.CASCADE,
        related_name="prompts",
    )
    raw_text = models.TextField()

    class Meta:
        ordering = ("-created_at",)


class AiFilterInterpretation(BaseModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    prompt = models.OneToOneField(
        AiTravelPrompt,
        on_delete=models.CASCADE,
        related_name="interpretation",
    )
    raw_llm_json = models.JSONField(default=dict, blank=True)
    normalized_params = models.JSONField(
        default=dict,
        blank=True,
        help_text="Parametry przekazane do SearchOrchestrator (daty jako YYYY-MM-DD).",
    )
    summary_pl = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = "AI filter interpretation"
        verbose_name_plural = "AI filter interpretations"


class AiRecommendation(BaseModel):
    """Powiązanie wyniku AI z ofertą (ERD §3.1)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    interpretation = models.ForeignKey(
        AiFilterInterpretation,
        on_delete=models.CASCADE,
        related_name="recommendations",
    )
    listing = models.ForeignKey(
        "listings.Listing",
        on_delete=models.CASCADE,
        related_name="ai_recommendations",
    )
    rank = models.PositiveSmallIntegerField(default=0)
    match_explanation = models.TextField(blank=True, default="")
    match_highlights = models.JSONField(default=list, blank=True)
    explanation_source = models.CharField(max_length=16, blank=True, default="rule")

    class Meta:
        ordering = ("rank", "id")
        constraints = [
            models.UniqueConstraint(
                fields=["interpretation", "listing"],
                name="ai_assistant_recommendation_uniq",
            ),
        ]
