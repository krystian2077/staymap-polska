from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.db.models import Q
from django.utils import timezone


class ConversationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope["url_route"]["kwargs"]["conversation_id"]
        user = self.scope["user"]
        if not user.is_authenticated:
            await self.close(code=4401)
            return
        allowed = await self._user_may_join(user.id, self.conversation_id)
        if not allowed:
            await self.close(code=4403)
            return
        self.group = f"conversation_{self.conversation_id}"
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, "group"):
            await self.channel_layer.group_discard(self.group, self.channel_name)

    async def receive_json(self, content, **kwargs):
        user = self.scope["user"]
        if not user.is_authenticated:
            return
        msg_type = content.get("type")
        payload = content.get("payload") or {}
        if msg_type == "message.new":
            await self._handle_message_new(user, payload)
        elif msg_type in ("typing.start", "typing.stop"):
            await self._handle_typing(user, msg_type == "typing.start")
        elif msg_type == "message.read":
            await self._handle_read(user, payload)

    async def _handle_message_new(self, user, payload):
        body = (payload.get("content") or "").strip()
        if not body:
            return
        msg_data = await self._create_message_and_notify(user, body)
        if msg_data:
            await self.channel_layer.group_send(
                self.group,
                {"type": "chat.message", "message": msg_data},
            )

    @database_sync_to_async
    def _create_message_and_notify(self, user, body: str):
        from .models import Conversation, Message
        from .serializers import MessageSerializer
        from .ws_notify import notify_new_message

        conv = (
            Conversation.objects.filter(pk=self.conversation_id, deleted_at__isnull=True)
            .select_related("listing__host")
            .filter(Q(listing__host__user_id=user.id) | Q(guest_id=user.id))
            .first()
        )
        if not conv:
            return None
        msg = Message.objects.create(conversation=conv, sender=user, body=body)
        data = MessageSerializer(msg).data
        host_uid = conv.listing.host.user_id
        guest_uid = conv.guest_id
        if user.id == guest_uid and host_uid:
            notify_new_message(
                recipient_user_id=host_uid,
                conversation_id=str(conv.pk),
                preview=body,
                recipient_is_host=True,
                message_id=str(msg.id),
            )
        elif user.id == host_uid and guest_uid:
            notify_new_message(
                recipient_user_id=guest_uid,
                conversation_id=str(conv.pk),
                preview=body,
                recipient_is_host=False,
                message_id=str(msg.id),
            )
        return data

    async def _handle_typing(self, user, is_typing: bool):
        await self.channel_layer.group_send(
            self.group,
            {
                "type": "chat.typing",
                "user_id": str(user.id),
                "is_typing": is_typing,
            },
        )

    async def _handle_read(self, user, payload):
        mid = payload.get("message_id")
        if not mid:
            return
        ok = await self._mark_message_read(user, mid)
        if ok:
            await self.channel_layer.group_send(
                self.group,
                {"type": "chat.read", "conversation_id": str(self.conversation_id)},
            )

    @database_sync_to_async
    def _mark_message_read(self, user, message_id) -> bool:
        from .models import Message

        n = (
            Message.objects.filter(
                pk=message_id,
                conversation_id=self.conversation_id,
                read_at__isnull=True,
            )
            .exclude(sender_id=user.id)
            .update(read_at=timezone.now())
        )
        return n > 0

    async def chat_message(self, event):
        await self.send_json({"type": "message.new", "payload": event["message"]})

    async def chat_typing(self, event):
        if event["user_id"] == str(self.scope["user"].id):
            return
        await self.send_json(
            {
                "type": "typing.indicator",
                "payload": {
                    "user_id": event["user_id"],
                    "is_typing": event["is_typing"],
                },
            }
        )

    async def chat_read(self, event):
        await self.send_json(
            {
                "type": "message.read",
                "payload": {"conversation_id": event["conversation_id"]},
            }
        )

    @database_sync_to_async
    def _user_may_join(self, user_id, conversation_id):
        from .models import Conversation

        return Conversation.objects.filter(
            pk=conversation_id,
            deleted_at__isnull=True,
        ).filter(Q(listing__host__user_id=user_id) | Q(guest_id=user_id)).exists()


class NotificationsConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope["user"]
        if not user.is_authenticated:
            await self.close(code=4401)
            return
        self.group = f"notifications_{user.id}"
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, "group"):
            await self.channel_layer.group_discard(self.group, self.channel_name)

    async def notify_event(self, event):
        data = event.get("data") or {}
        await self.send_json(data)
