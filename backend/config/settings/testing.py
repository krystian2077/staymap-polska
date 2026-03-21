from .base import *  # noqa: F403

DEBUG = False
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
DATABASES = {
    "default": {
        "ENGINE": "django.contrib.gis.db.backends.postgis",
        "NAME": env("TEST_DATABASE_NAME", default="staymap_test"),  # noqa: F405
        "USER": env("TEST_DATABASE_USER", default="staymap"),  # noqa: F405
        "PASSWORD": env("TEST_DATABASE_PASSWORD", default="staymap_secret"),  # noqa: F405
        "HOST": env("TEST_DATABASE_HOST", default="localhost"),  # noqa: F405
        "PORT": env("TEST_DATABASE_PORT", default="5432"),  # noqa: F405
    }
}

# Izolacja throttle (np. auth_register) od Redis dev i innych procesów
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "staymap-test",
    }
}

CELERY_TASK_ALWAYS_EAGER = True

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    },
}
