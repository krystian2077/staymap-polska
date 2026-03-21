import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

app = Celery("staymap")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

# Harmonogram: `CELERY_BEAT_SCHEDULE` w config.settings (django-celery-beat: migracje + opcjonalnie admin).
app.conf.timezone = "Europe/Warsaw"
