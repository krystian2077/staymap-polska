from django.apps import AppConfig


class LocationIntelligenceConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.location_intelligence"
    verbose_name = "Location intelligence"

    def ready(self):
        from apps.location_intelligence import signals  # noqa: F401
