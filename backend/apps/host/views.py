from datetime import date

from django.db import transaction
from django.db.models import Avg, Prefetch
from django.shortcuts import get_object_or_404
from django.utils.dateparse import parse_date
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.bookings.models import BlockedDate, Booking
from apps.bookings.serializers import BookingDetailSerializer
from apps.bookings.services import BookingService
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

    def perform_destroy(self, instance):
        ListingService.soft_delete_listing(instance)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        listing = serializer.save()
        out = ListingDetailSerializer(listing, context={"request": request})
        return Response({"data": out.data, "meta": {}}, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = ListingDetailSerializer(instance, context={"request": request})
        return Response({"data": serializer.data, "meta": {}}, status=200)

    def list(self, request, *args, **kwargs):
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
        ser = ListingImageUploadSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        payload = ser.add_to_listing(listing, request)
        return Response({"data": payload, "meta": {}}, status=201)

    @action(detail=True, methods=["post"], url_path="submit-for-review")
    def submit_for_review(self, request, pk=None):
        listing = self.get_object()
        if listing.status != Listing.Status.DRAFT:
            return Response(
                {
                    "error": {
                        "code": "INVALID_STATUS",
                        "message": "Tylko szkic można wysłać do moderacji.",
                        "field": None,
                        "status": 400,
                    }
                },
                status=400,
            )
        listing.status = Listing.Status.PENDING
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
