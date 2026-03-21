import hashlib
import json

from django.core.cache import cache
from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.common.throttles import BookingCreateThrottle
from apps.listings.models import Listing, ListingImage
from apps.pricing.services import PricingService

from .models import Booking
from .permissions import IsBookingGuest
from .serializers import (
    BookingCreateSerializer,
    BookingDetailSerializer,
    BookingQuoteSerializer,
)
from .services import BookingService


def _booking_detail_qs():
    img_qs = ListingImage.objects.order_by("-is_cover", "sort_order", "id")
    return (
        Booking.objects.filter(deleted_at__isnull=True)
        .select_related("listing", "listing__host", "listing__host__user", "listing__location")
        .prefetch_related(
            Prefetch("listing__images", queryset=img_qs),
            "status_history",
        )
    )


class BookingViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    throttle_classes = [BookingCreateThrottle]

    def get_throttles(self):
        if self.action in ("me", "quote"):
            return []
        return super().get_throttles()

    @action(detail=False, methods=["post"], url_path="quote")
    def quote(self, request):
        ser = BookingQuoteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        lid = ser.validated_data["listing_id"]
        listing = get_object_or_404(Listing, pk=lid, deleted_at__isnull=True)
        if listing.status != Listing.Status.APPROVED:
            return Response(
                {
                    "error": {
                        "code": "LISTING_NOT_BOOKABLE",
                        "message": "Ta oferta nie przyjmuje rezerwacji.",
                        "field": None,
                        "status": 400,
                    }
                },
                status=400,
            )
        v = ser.validated_data
        cache_key_raw = json.dumps(
            {
                "listing": str(lid),
                "in": v["check_in"].isoformat(),
                "out": v["check_out"].isoformat(),
                "guests": v["guests"],
                "adults": v["adults"],
            },
            sort_keys=True,
        )
        cache_key = "quote:" + hashlib.sha256(cache_key_raw.encode()).hexdigest()[:32]
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached, status=200)

        breakdown = PricingService.calculate(
            listing,
            v["check_in"],
            v["check_out"],
            guests=v["guests"],
        )
        payload = {"data": breakdown, "meta": {}}
        cache.set(cache_key, payload, 900)
        return Response(payload, status=200)

    def create(self, request):
        ser = BookingCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        v = ser.validated_data
        booking = BookingService.create_booking(
            listing_id=v["listing_id"],
            guest=request.user,
            check_in=v["check_in"],
            check_out=v["check_out"],
            guests_count=v["guests_count"],
            adults=v["adults"],
            children=v["children"],
            special_requests=v.get("special_requests") or "",
        )
        booking = _booking_detail_qs().get(pk=booking.pk)
        out = BookingDetailSerializer(booking, context={"request": request})
        return Response({"data": out.data, "meta": {}}, status=201)

    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        qs = _booking_detail_qs().filter(guest=request.user).order_by("-created_at")
        data = BookingDetailSerializer(qs, many=True, context={"request": request}).data
        return Response({"data": data, "meta": {}}, status=200)

    def retrieve(self, request, pk=None):
        booking = get_object_or_404(
            _booking_detail_qs().filter(guest=request.user),
            pk=pk,
        )
        self.check_object_permissions(request, booking)
        data = BookingDetailSerializer(booking, context={"request": request}).data
        return Response({"data": data, "meta": {}}, status=200)

    def get_permissions(self):
        if self.action == "retrieve":
            return [IsAuthenticated(), IsBookingGuest()]
        return super().get_permissions()

    def destroy(self, request, pk=None):
        booking = get_object_or_404(
            _booking_detail_qs().filter(guest=request.user),
            pk=pk,
        )
        BookingService.cancel_by_guest(booking, request.user)
        booking = _booking_detail_qs().get(pk=booking.pk)
        data = BookingDetailSerializer(booking, context={"request": request}).data
        return Response({"data": data, "meta": {}}, status=200)
