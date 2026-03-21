import logging

from celery import shared_task
from django.utils import timezone

from apps.ai_assistant.models import AiTravelSession

logger = logging.getLogger(__name__)


@shared_task(name="apps.ai_assistant.tasks.cleanup_expired_ai_sessions")
def cleanup_expired_ai_sessions():
    """Usuwa zakończone lub nieudane sesje AI po wygaśnięciu (oszczędność DB)."""
    qs = AiTravelSession.objects.filter(
        expires_at__lt=timezone.now(),
        status__in=[
            AiTravelSession.Status.COMPLETE,
            AiTravelSession.Status.FAILED,
        ],
    )
    n, _ = qs.delete()
    if n:
        logger.info("AI session cleanup: deleted %s rows", n)
    return n


@shared_task(name="apps.ai_assistant.tasks.monthly_ai_cost_report")
def monthly_ai_cost_report():
    """Miejsce na raport kosztów OpenAI (log / e-mail) — szkielet pod produkcję."""
    logger.info("monthly_ai_cost_report: stub — skonfiguruj metryki po wdrożeniu płatności AI.")
    return {"status": "stub"}
