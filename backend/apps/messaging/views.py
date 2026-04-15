from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models import Count, Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from apps.host.models import HostProfile
from apps.listings.models import Listing

from .models import Conversation, Message, MessageTemplate
from .serializers import (
    ConversationCreateSerializer,
    ConversationSerializer,
    MessageCreateSerializer,
    MessageSerializer,
    MessageTemplateSerializer,
)
from .services import assert_conversation_member, get_or_create_conversation, resolve_guest_user
from .template_seeding import ensure_default_message_templates
from .ws_notify import notify_new_message


def _conversation_qs(user):
    unread_filter = (
        Q(messages__deleted_at__isnull=True, messages__read_at__isnull=True)
        & ~Q(messages__sender=user)
    )
    return (
        Conversation.objects.filter(deleted_at__isnull=True)
        .filter(Q(listing__host__user=user) | Q(guest=user))
        .select_related("listing", "listing__host", "listing__host__user", "guest")
        .annotate(unread_count=Count("messages", filter=unread_filter))
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
        Message.objects.filter(
            conversation=conv,
            deleted_at__isnull=True,
            read_at__isnull=True,
        ).exclude(sender=request.user).update(read_at=timezone.now())
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
                message_id=str(msg.id),
            )
        elif uid == host_uid and guest_uid:
            notify_new_message(
                recipient_user_id=guest_uid,
                conversation_id=str(conv.pk),
                preview=body_text,
                recipient_is_host=False,
                message_id=str(msg.id),
            )
        out = MessageSerializer(msg)
        return Response({"data": out.data, "meta": {}}, status=status.HTTP_201_CREATED)


class ConversationSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        totals = _conversation_qs(request.user).aggregate(unread_total=Sum("unread_count"))
        return Response(
            {
                "data": {
                    "unread_total": int(totals.get("unread_total") or 0),
                },
                "meta": {},
            },
            status=200,
        )


class MessageTemplateViewSet(ModelViewSet):
    """CRUD szablonów wiadomości dla zalogowanego gospodarza."""

    serializer_class = MessageTemplateSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        host = get_object_or_404(HostProfile, user=self.request.user)
        # Gdy migracja/sygnał nie dołożyły zestawu (np. istniejąca baza), pierwsze zapytanie
        # uzupełnia 6 domyślnych szablonów.
        ensure_default_message_templates(host)
        return MessageTemplate.objects.filter(host=host, deleted_at__isnull=True).order_by(
            "sort_order", "created_at"
        )

    def perform_create(self, serializer):
        host = get_object_or_404(HostProfile, user=self.request.user)
        serializer.save(host=host)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response({"data": serializer.data, "meta": {}})

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({"data": serializer.data, "meta": {}})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response({"data": serializer.data, "meta": {}}, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"data": serializer.data, "meta": {}})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.soft_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

