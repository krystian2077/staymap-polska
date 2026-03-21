from django.contrib import admin

from apps.users.models import User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    ordering = ("-created_at",)
    list_display = ("email", "first_name", "last_name", "is_host", "is_staff", "is_active", "created_at")
    list_filter = ("is_host", "is_admin", "is_staff", "is_active")
    search_fields = ("email", "first_name", "last_name", "phone_number")
    readonly_fields = ("created_at", "updated_at", "last_login", "password")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Dane", {"fields": ("first_name", "last_name", "phone_number")}),
        ("Uprawnienia", {"fields": ("is_host", "is_admin", "is_active", "is_staff", "is_superuser")}),
        ("Daty", {"fields": ("created_at", "updated_at", "last_login", "deleted_at")}),
    )
