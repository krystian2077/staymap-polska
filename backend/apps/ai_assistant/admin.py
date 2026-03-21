from django.contrib import admin

from apps.ai_assistant.models import (
    AiFilterInterpretation,
    AiRecommendation,
    AiTravelPrompt,
    AiTravelSession,
)


@admin.register(AiTravelSession)
class AiTravelSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "status", "model_used", "result_total_count", "created_at")
    list_filter = ("status",)
    search_fields = ("user__email",)
    readonly_fields = ("created_at", "updated_at", "deleted_at")


@admin.register(AiTravelPrompt)
class AiTravelPromptAdmin(admin.ModelAdmin):
    list_display = ("id", "session", "created_at")
    search_fields = ("raw_text",)


@admin.register(AiFilterInterpretation)
class AiFilterInterpretationAdmin(admin.ModelAdmin):
    list_display = ("id", "prompt", "created_at")


@admin.register(AiRecommendation)
class AiRecommendationAdmin(admin.ModelAdmin):
    list_display = ("id", "interpretation", "listing", "rank")
    raw_id_fields = ("interpretation", "listing")
