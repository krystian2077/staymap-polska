"""
Inicjalizacja Sentry — wywoływana z production (i opcjonalnie development przy ustawionym DSN).
"""

from __future__ import annotations

import logging
import os
from typing import Any

logger = logging.getLogger(__name__)


def init_sentry(
    *,
    dsn: str,
    environment: str,
    traces_sample_rate: float,
    profiles_sample_rate: float = 0.0,
    send_default_pii: bool = False,
) -> None:
    if not dsn or not str(dsn).strip():
        return

    import sentry_sdk
    from sentry_sdk.integrations.celery import CeleryIntegration
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration
    from sentry_sdk.integrations.redis import RedisIntegration

    release = (
        os.environ.get("SENTRY_RELEASE")
        or os.environ.get("GIT_COMMIT")
        or os.environ.get("RENDER_GIT_COMMIT")
        or None
    )

    def before_send(event: dict[str, Any], hint: dict[str, Any]) -> dict[str, Any] | None:
        # Nie wysyłaj zdarzeń z healthchecków (opcjonalnie — zmniejsza szum)
        url = str((event.get("request") or {}).get("url") or "")
        if "/health/" in url or url.endswith("/health/live/") or url.endswith("/health/ready/"):
            return None
        return event

    integrations = [
        DjangoIntegration(),
        CeleryIntegration(),
        RedisIntegration(),
        LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
    ]

    kwargs: dict[str, Any] = {
        "dsn": dsn.strip(),
        "integrations": integrations,
        "environment": environment,
        "send_default_pii": send_default_pii,
        "traces_sample_rate": traces_sample_rate,
        "profiles_sample_rate": profiles_sample_rate,
        "release": release,
        "before_send": before_send,
    }

    sentry_sdk.init(**kwargs)
    logger.info("Sentry initialized (environment=%s)", environment)
