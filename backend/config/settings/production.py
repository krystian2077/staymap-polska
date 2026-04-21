from .base import *  # noqa: F403, F401

DEBUG = False

# Static files served by WhiteNoise (inserted after SecurityMiddleware at index 0)
MIDDLEWARE.insert(1, "whitenoise.middleware.WhiteNoiseMiddleware")  # noqa: F405
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

if SENTRY_DSN:  # noqa: F405
    from config.sentry_config import init_sentry  # noqa: E402

    init_sentry(
        dsn=SENTRY_DSN,  # noqa: F405
        environment=env("SENTRY_ENVIRONMENT", default="production"),  # noqa: F405
        traces_sample_rate=env.float("SENTRY_TRACES_SAMPLE_RATE", default=0.0),  # noqa: F405
        profiles_sample_rate=SENTRY_PROFILES_SAMPLE_RATE,  # noqa: F405
        send_default_pii=env.bool("SENTRY_SEND_DEFAULT_PII", default=False),  # noqa: F405
    )

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])

_bucket = env("AWS_STORAGE_BUCKET_NAME", default="")
if env.bool("USE_S3", default=False) and _bucket:
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }
    AWS_ACCESS_KEY_ID = env("AWS_ACCESS_KEY_ID", default="")
    AWS_SECRET_ACCESS_KEY = env("AWS_SECRET_ACCESS_KEY", default="")
    AWS_STORAGE_BUCKET_NAME = _bucket
    AWS_S3_REGION_NAME = env("AWS_S3_REGION_NAME", default="auto")
    AWS_S3_ENDPOINT_URL = env("AWS_S3_ENDPOINT_URL", default="")
    AWS_S3_SIGNATURE_VERSION = "s3v4"
    AWS_DEFAULT_ACL = "public-read"
    AWS_S3_FILE_OVERWRITE = False
    AWS_QUERYSTRING_AUTH = False
