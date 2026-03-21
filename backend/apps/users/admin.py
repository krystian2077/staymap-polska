from django.contrib import admin

from apps.users.models import SavedSearch, User, UserProfile, WishlistItem


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "preferred_language", "country", "created_at")
    search_fields = ("user__email", "bio")
    raw_id_fields = ("user",)


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


@admin.register(WishlistItem)
class WishlistItemAdmin(admin.ModelAdmin):
    list_display = ("user", "listing", "created_at")
    raw_id_fields = ("user", "listing")


@admin.register(SavedSearch)
class SavedSearchAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "notify_new_listings", "created_at")
    raw_id_fields = ("user",)
