try:
    from .celery import app as celery_app
except ImportError:  # pragma: no cover — brak Celery przed pip install / stary obraz
    celery_app = None

__all__ = ("celery_app",)
