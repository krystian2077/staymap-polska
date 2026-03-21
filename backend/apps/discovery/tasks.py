import logging

from celery import shared_task

from apps.discovery.services import cleanup_expired_compare_sessions

logger = logging.getLogger(__name__)


@shared_task(name="apps.discovery.tasks.cleanup_expired_compare_sessions")
def cleanup_expired_compare_sessions_task():
    n = cleanup_expired_compare_sessions()
    if n:
        logger.info("Compare session cleanup: deleted %s rows", n)
    return n
