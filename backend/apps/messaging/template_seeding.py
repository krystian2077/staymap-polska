"""Tworzenie domyślnych szablonów wiadomości dla profilu gospodarza."""

from __future__ import annotations

from apps.host.models import HostProfile
from apps.messaging.default_templates import DEFAULT_HOST_MESSAGE_TEMPLATES
from apps.messaging.models import MessageTemplate


def ensure_default_message_templates(host: HostProfile) -> int:
    """
    Dodaje domyślne szablony, jeśli gospodarz nie ma jeszcze żadnego aktywnego szablonu.
    Zwraca liczbę utworzonych rekordów (0, jeśli nic nie dodano).
    """
    exists = MessageTemplate.objects.filter(host=host, deleted_at__isnull=True).exists()
    if exists:
        return 0
    rows = [
        MessageTemplate(
            host=host,
            title=item["title"],
            body=item["body"],
            sort_order=item["sort_order"],
        )
        for item in DEFAULT_HOST_MESSAGE_TEMPLATES
    ]
    MessageTemplate.objects.bulk_create(rows)
    return len(rows)
