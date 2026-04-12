from datetime import date
import logging

from django.db import transaction
from django.db.models import Avg, Prefetch
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.bookings.models import BlockedDate, Booking, BookingStatusHistory
from apps.bookings.serializers import BookingDetailSerializer
from apps.bookings.services import BookingService
from apps.common.models import AuditLog
from apps.common.permissions import IsHost
from apps.common.throttles import UploadThrottle
from apps.listings.models import Listing, ListingImage
from apps.reviews.models import Review
from apps.reviews.serializers import HostReviewItemSerializer
from apps.listings.serializers import (
    ListingDetailSerializer,
    ListingImageUploadSerializer,
    ListingListSerializer,
    ListingWriteSerializer,
)
from apps.listings.services import ListingService
from apps.messaging.models import Message

from .models import HostProfile
from .serializers import HostOnboardingSerializer
from .services import host_stats_payload


class HostStatsView(APIView):
    permission_classes = [IsAuthenticated, IsHost]

    def get(self, request):
        return Response({"data": host_stats_payload(request.user), "meta": {}}, status=200)


class HostReviewsListView(APIView):
    permission_classes = [IsAuthenticated, IsHost]

    def get(self, request):
        qs = (
            Review.objects.filter(
                deleted_at__isnull=True,
                listing__host__user=request.user,
                reviewer_role=Review.ReviewerRole.GUEST,
            )
            .select_related("listing", "booking", "author")
            .order_by("-created_at")
        )
        data = HostReviewItemSerializer(qs, many=True, context={"request": request}).data
        avg = qs.filter(is_public=True).aggregate(a=Avg("overall_rating"))["a"]
        pending = qs.filter(is_public=True, host_response="").count()
        return Response(
            {
                "data": data,
                "meta": {
                    "count": qs.count(),
                    "avg_rating": float(avg) if avg is not None else 0.0,
                    "pending_response_count": pending,
                },
            },
            status=200,
        )


class HostOnboardingStartView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile, created = HostProfile.objects.get_or_create(user=request.user)
        if not request.user.is_host:
            request.user.is_host = True
            request.user.save(update_fields=["is_host", "updated_at"])
        ser = HostOnboardingSerializer(profile, context={"request": request})
        return Response({"data": ser.data, "meta": {"created": created}}, status=200)


class HostListingViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsHost]
    lookup_field = "pk"

    def get_queryset(self):
        img_qs = ListingImage.objects.order_by("-is_cover", "sort_order", "id")
        return (
            Listing.objects.filter(host__user=self.request.user, deleted_at__isnull=True)
            .select_related("host", "host__user", "location")
            .prefetch_related(Prefetch("images", queryset=img_qs))
        )

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ListingWriteSerializer
        if self.action == "retrieve":
            return ListingDetailSerializer
        return ListingListSerializer

    def _auto_publish_pending(self, listing_ids):
        ids = [str(x) for x in listing_ids if x]
        if not ids:
            return
        Listing.objects.filter(id__in=ids, status=Listing.Status.PENDING).update(
            status=Listing.Status.APPROVED,
            updated_at=timezone.now(),
        )

    def perform_destroy(self, instance):
        ListingService.soft_delete_listing(instance)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            with transaction.atomic():
                self.perform_destroy(instance)
                AuditLog.objects.create(
                    actor=request.user,
                    action="listing.soft_delete",
                    object_type="Listing",
                    object_id=str(instance.id),
                    metadata={
                        "title": instance.title,
                        "slug": instance.slug,
                        "status": instance.status,
                        "host_id": str(instance.host_id)
                    }
                )
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            logger = logging.getLogger(__name__)
            logger.exception(f"Error deleting listing {instance.id}: {str(e)}")
            return Response(
                {
                    "error": {
                        "code": "DELETE_FAILED",
                        "message": f"Nie udało się usunąć oferty: {str(e)}",
                        "status": 500
                    }
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        listing = serializer.save()
        out = ListingDetailSerializer(listing, context={"request": request})
        return Response({"data": out.data, "meta": {}}, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        self._auto_publish_pending([instance.id])
        instance.refresh_from_db()
        serializer = ListingDetailSerializer(instance, context={"request": request})
        return Response({"data": serializer.data, "meta": {}}, status=200)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        self._auto_publish_pending(queryset.values_list("id", flat=True))
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response({"data": serializer.data, "meta": {}}, status=200)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        out = ListingDetailSerializer(instance, context={"request": request})
        return Response({"data": out.data, "meta": {}}, status=200)

    @action(
        detail=True,
        methods=["post"],
        url_path="images",
        parser_classes=[MultiPartParser, FormParser],
        throttle_classes=[UploadThrottle],
    )
    def images(self, request, pk=None):
        listing = self.get_object()
        ser = ListingImageUploadSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        payload = ser.add_to_listing(listing, request)
        return Response({"data": payload, "meta": {}}, status=201)

    @action(
        detail=True,
        methods=["delete"],
        url_path=r"images/(?P<image_id>\d+)",
    )
    def delete_image(self, request, pk=None, image_id=None):
        listing = self.get_object()
        image = get_object_or_404(ListingImage, id=image_id, listing=listing)
        
        with transaction.atomic():
            was_cover = image.is_cover
            image.delete()  # Soft delete because it inherits from BaseModel
            
            if was_cover:
                new_cover = ListingImage.objects.filter(listing=listing).order_by("sort_order", "id").first()
                if new_cover:
                    new_cover.is_cover = True
                    new_cover.save(update_fields=["is_cover", "updated_at"])

        return Response(status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="submit-for-review")
    def submit_for_review(self, request, pk=None):
        listing = self.get_object()
        if listing.status != Listing.Status.DRAFT:
            return Response(
                {
                    "error": {
                        "code": "INVALID_STATUS",
                        "message": "Tylko szkic można opublikować.",
                        "field": None,
                        "status": 400,
                    }
                },
                status=400,
            )

        errors: dict[str, str] = {}
        host_name = f"{request.user.first_name or ''} {request.user.last_name or ''}".strip()
        if not host_name:
            errors["host_name"] = "Wyświetlana nazwa hosta jest wymagana."
        if len((listing.title or "").strip()) < 5:
            errors["title"] = "Tytuł oferty musi mieć co najmniej 5 znaków."
        if len((listing.description or "").strip()) < 20:
            errors["description"] = "Opis oferty musi mieć co najmniej 20 znaków."
        if listing.images.count() < 1:
            errors["images"] = "Dodaj co najmniej 1 zdjęcie oferty."
        amenities = listing.amenities if isinstance(listing.amenities, list) else []
        if len(amenities) < 1:
            errors["amenities"] = "Dodaj co najmniej 1 udogodnienie."
        if errors:
            return Response(
                {
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "message": "Uzupełnij wymagane pola przed publikacją oferty.",
                        "field": None,
                        "details": errors,
                        "status": 400,
                    }
                },
                status=400,
            )

        listing.status = Listing.Status.APPROVED
        listing.moderation_comment = ""
        listing.save(update_fields=["status", "moderation_comment", "updated_at"])
        out = ListingListSerializer(listing, context={"request": request})
        return Response({"data": out.data, "meta": {}}, status=200)

    @action(detail=True, methods=["post"], url_path="block-dates")
    def block_dates(self, request, pk=None):
        listing = self.get_object()
        dates = request.data.get("dates")
        if not isinstance(dates, list):
            return Response(
                {
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "message": 'Oczekiwano listy "dates" (np. ["2025-03-01","2025-03-02"]).',
                        "field": "dates",
                        "status": 400,
                    }
                },
                status=400,
            )
        created: list[str] = []
        with transaction.atomic():
            for raw in dates:
                if raw is None:
                    continue
                d = parse_date(str(raw)[:10]) if not isinstance(raw, date) else raw
                if d is None:
                    continue
                existing = BlockedDate.all_objects.filter(listing=listing, date=d).first()
                if existing:
                    if existing.deleted_at is not None:
                        existing.deleted_at = None
                        existing.save(update_fields=["deleted_at", "updated_at"])
                else:
                    BlockedDate.objects.create(listing=listing, date=d)
                created.append(d.isoformat())
        return Response(
            {
                "data": {"dates": created, "reason": request.data.get("reason", "")},
                "meta": {},
            },
            status=200,
        )


class HostBookingListView(APIView):
    permission_classes = [IsAuthenticated, IsHost]

    def get(self, request):
        qs = (
            Booking.objects.filter(deleted_at__isnull=True, listing__host__user=request.user)
            .select_related("listing", "listing__host", "listing__host__user", "listing__location")
            .prefetch_related("listing__images", "status_history")
            .order_by("-created_at")
        )
        status_filter = request.query_params.get("status")
        if status_filter:
            valid = {c.value for c in Booking.Status}
            if status_filter in valid:
                qs = qs.filter(status=status_filter)
        page_size = request.query_params.get("page_size")
        if page_size and page_size.isdigit():
            qs = qs[: int(page_size)]
        data = BookingDetailSerializer(qs, many=True, context={"request": request}).data
        return Response({"data": data, "meta": {"count": len(data)}}, status=200)


class HostNotificationsListView(APIView):
    permission_classes = [IsAuthenticated, IsHost]

    def get(self, request):
        limit_raw = request.query_params.get("limit")
        try:
            limit = int(limit_raw or 100)
        except (TypeError, ValueError):
            limit = 100
        limit = max(1, min(limit, 300))

        feed: list[dict] = []

        guest_messages = (
            Message.objects.filter(
                deleted_at__isnull=True,
                conversation__listing__host__user=request.user,
            )
            .exclude(sender=request.user)
            .select_related("conversation", "conversation__listing")
            .order_by("-created_at")[: limit * 3]
        )
        for msg in guest_messages:
            body = (msg.body or "").strip()
            feed.append(
                {
                    "id": f"message:{msg.id}",
                    "type": "message.new",
                    "title": "Nowa wiadomosc",
                    "body": body[:120] + ("..." if len(body) > 120 else ""),
                    "link": f"/host/messages?conv={msg.conversation_id}",
                    "created_at": msg.created_at,
                    "is_read": msg.read_at is not None,
                }
            )

        pending_bookings = (
            Booking.objects.filter(
                deleted_at__isnull=True,
                listing__host__user=request.user,
                status=Booking.Status.PENDING,
            )
            .select_related("listing")
            .order_by("-created_at")[: limit]
        )
        for booking in pending_bookings:
            feed.append(
                {
                    "id": f"booking.new:{booking.id}",
                    "type": "booking.new",
                    "title": "Nowa prosba o rezerwacje",
                    "body": f"{booking.listing.title} wymaga decyzji hosta.",
                    "link": "/host/bookings/pending",
                    "created_at": booking.created_at,
                    "is_read": True,
                }
            )

        status_changes = (
            BookingStatusHistory.objects.filter(
                deleted_at__isnull=True,
                booking__listing__host__user=request.user,
                new_status__in=["cancelled", "confirmed", "rejected"],
            )
            .select_related("booking", "booking__listing")
            .order_by("-created_at")[: limit * 2]
        )
        status_labels = {
            "cancelled": "Rezerwacja anulowana",
            "confirmed": "Rezerwacja potwierdzona",
            "rejected": "Rezerwacja odrzucona",
        }
        for row in status_changes:
            feed.append(
                {
                    "id": f"booking.status:{row.id}",
                    "type": f"booking.{row.new_status}",
                    "title": status_labels.get(row.new_status, "Zmiana statusu rezerwacji"),
                    "body": f"{row.booking.listing.title} · status: {row.new_status}",
                    "link": "/host/bookings",
                    "created_at": row.created_at,
                    "is_read": True,
                }
            )

        feed.sort(key=lambda x: x["created_at"], reverse=True)
        data = feed[:limit]
        return Response({"data": data, "meta": {"count": len(data)}}, status=200)


class HostBookingStatusView(APIView):
    permission_classes = [IsAuthenticated, IsHost]

    def patch(self, request, booking_id):
        booking = get_object_or_404(
            Booking.objects.filter(deleted_at__isnull=True, listing__host__user=request.user),
            pk=booking_id,
        )
        new_status = request.data.get("status")
        if new_status == "confirmed":
            target = Booking.Status.CONFIRMED
        elif new_status == "rejected":
            target = Booking.Status.REJECTED
        else:
            return Response(
                {
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "message": "Pole status musi mieć wartość „confirmed” lub „rejected”.",
                        "field": "status",
                        "status": 400,
                    }
                },
                status=400,
            )
        booking = BookingService.update_status_by_host(booking, request.user, target)
        booking = (
            Booking.objects.filter(pk=booking.pk)
            .select_related("listing", "listing__host", "listing__host__user", "listing__location")
            .prefetch_related("listing__images", "status_history")
            .first()
        )
        out = BookingDetailSerializer(booking, context={"request": request})
        return Response({"data": out.data, "meta": {}}, status=200)
