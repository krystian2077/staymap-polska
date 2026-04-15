import uuid

from django.conf import settings
from django.db import models

from apps.common.models import BaseModel


class MessageTemplate(BaseModel):
    """Szablony szybkich odpowiedzi dla gospodarza (czat z gościem)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    host = models.ForeignKey(
        "host.HostProfile",
        on_delete=models.CASCADE,
        related_name="message_templates",
    )
    title = models.CharField(max_length=100)
    body = models.TextField(help_text="Możesz użyć {{guest_name}} i {{listing_title}}.")
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "created_at"]
        verbose_name = "Szablon wiadomości"
        verbose_name_plural = "Szablony wiadomości"

    def __str__(self):
        return f"{self.title} [{self.host_id}]"


class Conversation(BaseModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.ForeignKey(
        "listings.Listing",
        on_delete=models.CASCADE,
        related_name="conversations",
    )
    guest = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="guest_conversations",
    )

    class Meta:
        verbose_name = "Rozmowa"
        verbose_name_plural = "Rozmowy"
        constraints = [
            models.UniqueConstraint(
                fields=["listing", "guest"],
                condition=models.Q(deleted_at__isnull=True),
                name="messaging_conversation_listing_guest_uniq",
            ),
        ]
        indexes = [
            models.Index(fields=["listing_id", "guest_id"]),
        ]

    def __str__(self):
        return f"{self.guest.email} ↔ {self.listing.title}"


class Message(BaseModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_messages",
    )
    body = models.TextField()
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Wiadomość"
        verbose_name_plural = "Wiadomości"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["conversation_id", "created_at"]),
        ]

    def __str__(self):
        return f"{self.sender.email}: {self.body[:40]}"
