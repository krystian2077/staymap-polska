from __future__ import annotations

import logging
from typing import Any

from apps.common.models import AuditLog

logger = logging.getLogger(__name__)


def log_action(
    *,
    action: str,
    object_type: str = "",
    object_id: str = "",
    actor=None,
    metadata: dict[str, Any] | None = None,
    request_id: str = "",
) -> AuditLog | None:
    """Zapis audytu — błędy logowania nie przerywają żądania."""
    try:
        return AuditLog.objects.create(
            action=action,
            object_type=object_type or "",
            object_id=str(object_id) if object_id else "",
            actor=actor,
            metadata=metadata or {},
            request_id=request_id or "",
        )
    except Exception:
        logger.exception("audit log failed: %s", action)
        return None
