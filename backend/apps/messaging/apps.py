from django.apps import AppConfig


class MessagingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.messaging"
    label = "messaging"
    verbose_name = "Wiadomości"

    def ready(self):
        from apps.messaging import signals  # noqa: F401
