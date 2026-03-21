from django.contrib import admin

from .models import CustomDatePrice, HolidayPricingRule, LongStayDiscountRule, SeasonalPricingRule


@admin.register(CustomDatePrice)
class CustomDatePriceAdmin(admin.ModelAdmin):
    list_display = ("listing", "date", "price_override", "created_at")
    list_filter = ("listing",)


@admin.register(SeasonalPricingRule)
class SeasonalPricingRuleAdmin(admin.ModelAdmin):
    list_display = ("listing", "name", "valid_from", "valid_to", "multiplier", "priority")


@admin.register(HolidayPricingRule)
class HolidayPricingRuleAdmin(admin.ModelAdmin):
    list_display = ("listing", "date", "multiplier")


@admin.register(LongStayDiscountRule)
class LongStayDiscountRuleAdmin(admin.ModelAdmin):
    list_display = ("listing", "min_nights", "discount_percent", "priority")
