from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.listings.models import Listing

from .models import Conversation, Message
from .serializers import (
    ConversationCreateSerializer,
    ConversationSerializer,
    MessageCreateSerializer,
    MessageSerializer,
)
from .services import assert_conversation_member, get_or_create_conversation, resolve_guest_user
from .ws_notify import notify_new_message


def _conversation_qs(user):
    return (
        Conversation.objects.filter(deleted_at__isnull=True)
        .filter(Q(listing__host__user=user) | Q(guest=user))
        .select_related("listing", "listing__host", "listing__host__user")
    )


class ConversationListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _conversation_qs(request.user).order_by("-updated_at", "-created_at")
        ser = ConversationSerializer(qs, many=True)
        return Response({"data": ser.data, "meta": {}}, status=200)

    def post(self, request):
        ser = ConversationCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        listing = get_object_or_404(
            Listing.objects.filter(deleted_at__isnull=True),
            pk=ser.validated_data["listing_id"],
        )
        guest = resolve_guest_user(
            listing=listing,
            request_user=request.user,
            guest_id=ser.validated_data.get("guest_id"),
        )
        conv, _ = get_or_create_conversation(listing, guest)
        out = ConversationSerializer(conv, context={"request": request})
        return Response({"data": out.data, "meta": {}}, status=200)


class ConversationMessageListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, conversation_id):
        conv = get_object_or_404(_conversation_qs(request.user), pk=conversation_id)
        assert_conversation_member(conv, request.user)
        msgs = (
            Message.objects.filter(conversation=conv, deleted_at__isnull=True)
            .order_by("created_at")
            .select_related("sender")[:200]
        )
        ser = MessageSerializer(msgs, many=True)
        return Response({"data": ser.data, "meta": {}}, status=200)

    def post(self, request, conversation_id):
        conv = get_object_or_404(_conversation_qs(request.user), pk=conversation_id)
        assert_conversation_member(conv, request.user)
        ser = MessageCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        msg = Message.objects.create(
            conversation=conv,
            sender=request.user,
            body=ser.validated_data["body"].strip(),
        )
        channel_layer = get_channel_layer()
        payload = MessageSerializer(msg).data
        async_to_sync(channel_layer.group_send)(
            f"conversation_{conv.pk}",
            {"type": "chat.message", "message": payload},
        )
        host_uid = conv.listing.host.user_id
        guest_uid = conv.guest_id
        uid = request.user.id
        body_text = ser.validated_data["body"].strip()
        if uid == guest_uid and host_uid:
            notify_new_message(
                recipient_user_id=host_uid,
                conversation_id=str(conv.pk),
                preview=body_text,
                recipient_is_host=True,
            )
        elif uid == host_uid and guest_uid:
            notify_new_message(
                recipient_user_id=guest_uid,
                conversation_id=str(conv.pk),
                preview=body_text,
                recipient_is_host=False,
            )
        out = MessageSerializer(msg)
        return Response({"data": out.data, "meta": {}}, status=status.HTTP_201_CREATED)
