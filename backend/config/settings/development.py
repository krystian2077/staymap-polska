from .base import *  # noqa: F403

DEBUG = True

# Opcjonalnie: ten sam DSN co produkcja — tylko gdy SENTRY_ENABLE_DEV=True (np. test integracji).
if SENTRY_DSN and SENTRY_ENABLE_DEV:  # noqa: F405
    from config.sentry_config import init_sentry

    init_sentry(
        dsn=SENTRY_DSN,
        environment=env("SENTRY_ENVIRONMENT", default="development"),  # noqa: F405
        traces_sample_rate=env.float("SENTRY_TRACES_SAMPLE_RATE", default=0.0),  # noqa: F405
        profiles_sample_rate=SENTRY_PROFILES_SAMPLE_RATE,  # noqa: F405
        send_default_pii=env.bool("SENTRY_SEND_DEFAULT_PII", default=False),  # noqa: F405
    )
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

INSTALLED_APPS += ["debug_toolbar", "django_extensions"]  # noqa: F405

MIDDLEWARE.insert(1, "debug_toolbar.middleware.DebugToolbarMiddleware")
INTERNAL_IPS = ["127.0.0.1", "0.0.0.0"]
