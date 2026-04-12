import environ
from pathlib import Path
from datetime import timedelta

from celery.schedules import crontab

env = environ.Env()
BASE_DIR = Path(__file__).resolve().parent.parent.parent
environ.Env.read_env(BASE_DIR.parent.parent / ".env")

SECRET_KEY = env("SECRET_KEY", default="dev-only-change-me-in-production")
DEBUG = env.bool("DEBUG", default=False)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1", "0.0.0.0"])

DJANGO_APPS = [
    "daphne",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.gis",
]
THIRD_PARTY_APPS = [
    "channels",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "drf_spectacular",
    "corsheaders",
    "django_filters",
    "django_celery_beat",
]
LOCAL_APPS = [
    "apps.common",
    "apps.users",
    "apps.host",
    "apps.listings",
    "apps.location_intelligence",
    "apps.search",
    "apps.pricing",
    "apps.bookings",
    "apps.ai_assistant",
    "apps.discovery",
    "apps.reviews",
    "apps.messaging",
    "apps.moderation",
]
INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.common.middleware.RequestIDMiddleware",
]

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [env("REDIS_URL", default="redis://redis:6379/0")],
        },
    },
}
AUTH_USER_MODEL = "users.User"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

DATABASES = {
    "default": env.db(
        "DATABASE_URL",
        default="postgis://staymap:staymap_secret@db:5432/staymap_dev",
    )
}
DATABASES["default"]["ENGINE"] = "django.contrib.gis.db.backends.postgis"

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": env("REDIS_URL", default="redis://redis:6379/0"),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "pl"
TIME_ZONE = "Europe/Warsaw"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_FILE_STORAGE = "django.core.files.storage.FileSystemStorage"
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
    "DEFAULT_PAGINATION_CLASS": "apps.common.pagination.MapCursorPagination",
    "PAGE_SIZE": 24,
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "apps.common.exceptions.custom_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": [],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/min",
        "user": "300/min",
        "auth_login": "5/min",
        "auth_register": "3/min",
        "upload": "20/hour",
        "geocode": "30/min",
        "booking_create": "10/min",
        "listing_nearby": "18/hour",
        "listing_nearby_user": "60/hour",
        "ai_search": "20/min",
    },
}

# OpenAI-compatible API (OpenAI, Groq, lokalny proxy itd.)
OPENAI_API_KEY = env("OPENAI_API_KEY", default="")
OPENAI_BASE_URL = env("OPENAI_BASE_URL", default="")
OPENAI_MODEL_CHEAP = env("OPENAI_MODEL_CHEAP", default="gpt-4o-mini")
OPENAI_MODEL = env("OPENAI_MODEL", default="gpt-4o-mini")
OPENAI_MAX_TOKENS = env.int("OPENAI_MAX_TOKENS", default=800)
AI_SESSION_TTL_HOURS = env.int("AI_SESSION_TTL_HOURS", default=24)
AI_MAX_LISTING_IDS_PER_SESSION = env.int("AI_MAX_LISTING_IDS_PER_SESSION", default=500)

COMPARE_SESSION_TTL_HOURS = env.int("COMPARE_SESSION_TTL_HOURS", default=48)
COMPARE_MAX_LISTINGS = env.int("COMPARE_MAX_LISTINGS", default=3)

MAX_LISTING_IMAGES = env.int("MAX_LISTING_IMAGES", default=20)

FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:3000")
PLATFORM_SERVICE_FEE_PERCENT = env.int("PLATFORM_SERVICE_FEE_PERCENT", default=15)
DEFAULT_HOLIDAY_PRICE_MULTIPLIER = env("DEFAULT_HOLIDAY_PRICE_MULTIPLIER", default="1.15")
HOST_REQUEST_ACCEPT_HOURS = env.int("HOST_REQUEST_ACCEPT_HOURS", default=24)
BOOKING_PAYMENT_TIMEOUT_H = env.int("BOOKING_PAYMENT_TIMEOUT_H", default=1)

CELERY_BROKER_URL = env("CELERY_BROKER_URL", default=env("REDIS_URL", default="redis://redis:6379/0"))
CELERY_RESULT_BACKEND = env("CELERY_RESULT_BACKEND", default=CELERY_BROKER_URL)
CELERY_TASK_ALWAYS_EAGER = env.bool("CELERY_TASK_ALWAYS_EAGER", default=False)
CELERY_TASK_EAGER_PROPAGATES = True

# Harmonogram dla `celery beat` (django-celery-beat: tabele + opcjonalnie edycja w /admin).
CELERY_BEAT_SCHEDULE = {
    "cancel-abandoned-bookings": {
        "task": "apps.bookings.tasks.cancel_abandoned_bookings",
        "schedule": crontab(minute="*/30"),
    },
    "auto-reject-expired-requests": {
        "task": "apps.bookings.tasks.auto_reject_expired_requests",
        "schedule": crontab(minute=0),
    },
    "refresh-stale-poi-caches": {
        "task": "apps.location_intelligence.tasks.refresh_stale_poi_caches",
        "schedule": crontab(hour=3, minute=5),
    },
    "refresh-stale-area-summaries": {
        "task": "apps.location_intelligence.tasks.refresh_stale_area_summaries",
        "schedule": crontab(hour=4, minute=10),
    },
    "cleanup-expired-ai-sessions": {
        "task": "apps.ai_assistant.tasks.cleanup_expired_ai_sessions",
        "schedule": crontab(minute=12),
    },
    "cleanup-expired-compare-sessions": {
        "task": "apps.discovery.tasks.cleanup_expired_compare_sessions_task",
        "schedule": crontab(minute=22),
    },
    "send-review-reminder-emails": {
        "task": "apps.reviews.tasks.send_review_reminder_emails",
        "schedule": crontab(hour=10, minute=0),
    },
    "monthly-ai-cost-report": {
        "task": "apps.ai_assistant.tasks.monthly_ai_cost_report",
        "schedule": crontab(day_of_month=1, hour=6, minute=0),
    },
}

# Nominatim — wymagany identyfikujący User-Agent (polityka OSM)
NOMINATIM_USER_AGENT = env(
    "NOMINATIM_USER_AGENT",
    default="StayMapPolska/1.0 (dev; +https://github.com/staymap-polska)",
)
NOMINATIM_SEARCH_URL = env(
    "NOMINATIM_SEARCH_URL",
    default="https://nominatim.openstreetmap.org/search",
)

OVERPASS_INTERPRETER_URL = env(
    "OVERPASS_INTERPRETER_URL",
    default="https://overpass-api.de/api/interpreter",
)
OVERPASS_USER_AGENT = env("OVERPASS_USER_AGENT", default=NOMINATIM_USER_AGENT)

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env.int("JWT_ACCESS_MINUTES", 60)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env.int("JWT_REFRESH_DAYS", 30)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "TOKEN_OBTAIN_SERIALIZER": "apps.users.serializers.EmailTokenObtainPairSerializer",
    "TOKEN_REFRESH_SERIALIZER": "apps.users.serializers.StayMapTokenRefreshSerializer",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "StayMap Polska API",
    "DESCRIPTION": "Map-first platforma rezerwacji noclegów.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
}

DEFAULT_FROM_EMAIL = env("EMAIL_FROM", default="noreply@staymap.pl")
EMAIL_BACKEND = env(
    "EMAIL_BACKEND",
    default="django.core.mail.backends.console.EmailBackend",
)
EMAIL_HOST = env("EMAIL_HOST", default="smtp.gmail.com")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")

# Sentry — `config.sentry_config.init_sentry` (production / opcjonalnie development).
SENTRY_DSN = env("SENTRY_DSN", default="")
SENTRY_ENABLE_DEV = env.bool("SENTRY_ENABLE_DEV", default=False)
SENTRY_PROFILES_SAMPLE_RATE = env.float("SENTRY_PROFILES_SAMPLE_RATE", default=0.0)
