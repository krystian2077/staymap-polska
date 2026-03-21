from django.contrib import admin

from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "listing", "reviewer_role", "overall_rating", "is_public", "created_at")
    list_filter = ("reviewer_role", "is_public")
    search_fields = ("listing__title", "content")
