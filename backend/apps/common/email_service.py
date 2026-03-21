"""Centralna wysyłka e-maili HTML + plain text (Django templates)."""

from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


class EmailService:
    """Szablony w `templates/emails/<name>.html` i `.txt`."""

    @classmethod
    def send(cls, to: list[str] | str, subject: str, template: str, context: dict) -> None:
        if isinstance(to, str):
            to = [to]
        if not to:
            return
        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@staymap.pl")
        try:
            html_body = render_to_string(f"emails/{template}.html", context)
            plain_body = render_to_string(f"emails/{template}.txt", context)
            msg = EmailMultiAlternatives(subject, plain_body, from_email, to)
            msg.attach_alternative(html_body, "text/html")
            msg.send()
            logger.info("Email sent: %s → %s", template, to)
        except Exception:
            logger.exception("Email failed: %s → %s", template, to)
            raise

    @classmethod
    def booking_confirmed_guest(cls, booking) -> None:
        listing = booking.listing
        guest = booking.guest
        host = listing.host.user
        ctx = {
            "booking": booking,
            "listing": listing,
            "guest": guest,
            "host": host,
            "frontend_url": getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/"),
        }
        cls.send(
            to=[guest.email],
            subject=f"✅ Potwierdzenie rezerwacji — {listing.title}",
            template="booking_confirmed_guest",
            context=ctx,
        )

    @classmethod
    def booking_confirmed_host(cls, booking) -> None:
        listing = booking.listing
        guest = booking.guest
        host = listing.host.user
        ctx = {
            "booking": booking,
            "listing": listing,
            "guest": guest,
            "host": host,
            "frontend_url": getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/"),
        }
        cls.send(
            to=[host.email],
            subject=f"🏠 Nowa rezerwacja — {listing.title}",
            template="booking_confirmed_host",
            context=ctx,
        )

    @classmethod
    def review_reminder_guest(cls, booking) -> None:
        listing = booking.listing
        guest = booking.guest
        ctx = {
            "booking": booking,
            "listing": listing,
            "guest": guest,
            "frontend_url": getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/"),
        }
        cls.send(
            to=[guest.email],
            subject=f"⭐ Jak minął pobyt? Oceń {listing.title}",
            template="review_reminder_guest",
            context=ctx,
        )
