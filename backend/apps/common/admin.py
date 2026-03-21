from django.contrib import admin

from apps.common.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "action", "object_type", "object_id", "actor", "request_id")
    list_filter = ("action", "object_type")
    search_fields = ("object_id", "request_id", "actor__email")
    readonly_fields = ("created_at", "actor", "action", "object_type", "object_id", "metadata", "request_id")
    date_hierarchy = "created_at"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
