"""Powiadomienia WebSocket — grupa `notifications_{user_id}`."""

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def push_user_event(user_id, data: dict) -> None:
    """Wysyła JSON do klienta: `{ "type": ..., "payload": ... }` lub inny kształt zgodny z frontendem."""
    if not user_id:
        return
    layer = get_channel_layer()
    async_to_sync(layer.group_send)(
        f"notifications_{user_id}",
        {"type": "notify.event", "data": data},
    )


def notify_new_message(
    *, recipient_user_id, conversation_id: str, preview: str, recipient_is_host: bool
) -> None:
    link = (
        f"/host/messages?conv={conversation_id}"
        if recipient_is_host
        else "/bookings"
    )
    push_user_event(
        recipient_user_id,
        {
            "type": "notification.new",
            "payload": {
                "type": "message.new",
                "title": "Nowa wiadomość",
                "body": preview[:120] + ("…" if len(preview) > 120 else ""),
                "link": link,
            },
        },
    )


def notify_booking_status_changed(*, user_id, booking_id, new_status: str) -> None:
    push_user_event(
        user_id,
        {
            "type": "booking.status_changed",
            "payload": {"booking_id": str(booking_id), "new_status": new_status},
        },
    )


def notify_host_new_booking_request(*, host_user_id, booking_id) -> None:
    push_user_event(
        host_user_id,
        {
            "type": "notification.new",
            "payload": {
                "type": "booking.new",
                "title": "Nowa prośba o rezerwację",
                "body": "Masz nową rezerwację do rozpatrzenia.",
                "link": "/host/dashboard",
            },
        },
    )
