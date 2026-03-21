from django.contrib import admin

from apps.host.models import HostProfile


@admin.register(HostProfile)
class HostProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "created_at")
    search_fields = ("user__email", "user__first_name", "user__last_name")
    raw_id_fields = ("user",)
