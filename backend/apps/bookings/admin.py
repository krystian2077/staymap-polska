from django.contrib import admin

from .models import BlockedDate, Booking, BookingStatusHistory, Payment, StripeWebhookEvent


class BookingStatusHistoryInline(admin.TabularInline):
    model = BookingStatusHistory
    extra = 0
    readonly_fields = ("old_status", "new_status", "changed_by", "note", "created_at")
    can_delete = False


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ("id", "listing", "guest", "check_in", "check_out", "status", "final_amount", "currency")
    list_filter = ("status", "currency")
    search_fields = ("guest__email", "listing__title")
    inlines = [BookingStatusHistoryInline]
    readonly_fields = ("pricing_breakdown", "created_at", "updated_at")


@admin.register(BlockedDate)
class BlockedDateAdmin(admin.ModelAdmin):
    list_display = ("listing", "date")


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("booking", "amount", "currency", "status", "provider_payment_id")
    search_fields = ("provider_payment_id",)


@admin.register(StripeWebhookEvent)
class StripeWebhookEventAdmin(admin.ModelAdmin):
    list_display = ("stripe_event_id", "event_type", "processed", "created_at")
    readonly_fields = ("stripe_event_id", "event_type", "payload_summary", "processed", "created_at")
