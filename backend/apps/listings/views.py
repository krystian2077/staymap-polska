import calendar
from datetime import date

from django.db.models import Prefetch, Q
from django.utils import timezone
from rest_framework import mixins, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from apps.common.permissions import IsOwnerOrAdmin
from apps.common.throttles import (
    ListingNearbyAnonThrottle,
    ListingNearbyUserThrottle,
    UploadThrottle,
)
from apps.listings.models import Listing, ListingImage
from apps.listings.serializers import (
    ListingDetailSerializer,
    ListingImageUploadSerializer,
    ListingListSerializer,
    ListingWriteSerializer,
)
from apps.reviews.models import Review
from apps.reviews.serializers import ReviewSerializer
from apps.bookings.services import calendar_blocked_dates, calendar_booked_dates, calendar_busy_ranges
from apps.common.exceptions import PricingError
from apps.listings.services import ListingService
from apps.location_intelligence.services import ensure_destination_scores, get_nearby_places
from apps.pricing.services import PricingService


class ListingViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    lookup_field = "slug"
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        img_qs = ListingImage.objects.order_by("-is_cover", "sort_order", "id")
        qs = (
            Listing.objects.select_related("host", "host__user", "location")
            .prefetch_related(Prefetch("images", queryset=img_qs))
            .all()
        )
        user = self.request.user
        if user.is_authenticated:
            return qs.filter(Q(status=Listing.Status.APPROVED) | Q(host__user=user))
        return qs.filter(status=Listing.Status.APPROVED)

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ListingWriteSerializer
        if self.action == "retrieve":
            return ListingDetailSerializer
        return ListingListSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "images", "destroy"):
            return [permissions.IsAuthenticated()]
        return super().get_permissions()

    @action(
        detail=True,
        methods=["post"],
        url_path="images",
        parser_classes=[MultiPartParser, FormParser],
        throttle_classes=[UploadThrottle],
    )
    def images(self, request, slug=None):
        listing = self.get_object()
        self._check_host_owner(listing)
        ser = ListingImageUploadSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        payload = ser.add_to_listing(listing, request)
        return Response({"data": payload, "meta": {}}, status=201)

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        self._check_host_owner(serializer.instance)
        serializer.save()

    def _check_host_owner(self, listing):
        if not IsOwnerOrAdmin().has_object_permission(self.request, self, listing):
            self.permission_denied(self.request)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status != Listing.Status.APPROVED:
            self._check_host_owner(instance)
        ensure_destination_scores(instance, fetch_poi=False)
        serializer = self.get_serializer(instance)
        return Response({"data": serializer.data, "meta": {}})

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        data = response.data
        if isinstance(data, dict) and "results" in data:
            wrapped = {
                "data": data["results"],
                "meta": {
                    "next": data.get("next"),
                    "previous": data.get("previous"),
                },
            }
        else:
            wrapped = {"data": data, "meta": {}}
        return Response(wrapped, status=response.status_code)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        out = ListingDetailSerializer(serializer.instance, context={"request": request})
        return Response({"data": out.data, "meta": {}}, status=201)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        self._check_host_owner(instance)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        out = ListingDetailSerializer(serializer.instance, context={"request": request})
        return Response({"data": out.data, "meta": {}})

    def destroy(self, request, *args, **kwargs):
        listing = self.get_object()
        self._check_host_owner(listing)
        ListingService.soft_delete_listing(listing)
        return Response(
            {
                "data": {
                    "id": str(listing.id),
                    "slug": listing.slug,
                    "deleted_at": listing.deleted_at.isoformat() if listing.deleted_at else None,
                },
                "meta": {},
            },
            status=200,
        )

    @action(detail=True, methods=["get"], url_path="price-calendar")
    def price_calendar(self, request, slug=None):
        listing = self.get_object()
        if listing.status != Listing.Status.APPROVED:
            self._check_host_owner(listing)

        today = timezone.now().date()
        raw_from = request.query_params.get("from") or request.query_params.get("date_from")
        raw_to = request.query_params.get("to") or request.query_params.get("date_to")

        if raw_from and raw_to:
            try:
                date_from = date.fromisoformat(str(raw_from)[:10])
                date_to = date.fromisoformat(str(raw_to)[:10])
            except ValueError:
                return Response(
                    {
                        "error": {
                            "code": "INVALID_DATE",
                            "message": "Parametry from i to muszą być datami ISO (YYYY-MM-DD).",
                            "field": "from",
                            "status": 400,
                        }
                    },
                    status=400,
                )
        else:
            y, m = today.year, today.month
            date_from = date(y, m, 1)
            last_d = calendar.monthrange(y, m)[1]
            date_to = date(y, m, last_d)

        try:
            payload = PricingService.daily_rates_for_calendar(listing, date_from, date_to)
        except PricingError as e:
            return Response(
                {
                    "error": {
                        "code": "PRICING_ERROR",
                        "message": str(e),
                        "field": None,
                        "status": 400,
                    }
                },
                status=400,
            )

        return Response({"data": payload, "meta": {}}, status=200)

    @action(detail=True, methods=["get"], url_path="availability")
    def availability(self, request, slug=None):
        listing = self.get_object()
        if listing.status != Listing.Status.APPROVED:
            self._check_host_owner(listing)
        return Response(
            {
                "data": {
                    "blocked_dates": calendar_blocked_dates(listing.id),
                    "busy_dates": calendar_booked_dates(listing.id),
                    "booked_dates": calendar_booked_dates(listing.id),
                    "busy_ranges": calendar_busy_ranges(listing.id),
                },
                "meta": {},
            },
            status=200,
        )

    @action(
        detail=True,
        methods=["get"],
        url_path="nearby",
        throttle_classes=[ListingNearbyAnonThrottle, ListingNearbyUserThrottle],
    )
    def nearby(self, request, slug=None):
        listing = self.get_object()
        if listing.status != Listing.Status.APPROVED:
            self._check_host_owner(listing)
        try:
            radius_m = int(request.query_params.get("radius_m", 8000))
        except (TypeError, ValueError):
            radius_m = 8000
        force_refresh = request.query_params.get("refresh") in ("1", "true", "yes")
        payload, source = get_nearby_places(
            listing,
            radius_m=radius_m,
            force_refresh=force_refresh,
        )
        return Response(
            {
                "data": {
                    **payload,
                    "source": source,
                },
                "meta": {"radius_m": radius_m, "force_refresh": force_refresh},
            },
            status=200,
        )

    @action(detail=True, methods=["get"], url_path="reviews")
    def reviews(self, request, slug=None):
        listing = self.get_object()
        if listing.status != Listing.Status.APPROVED:
            self._check_host_owner(listing)
        try:
            page_size = int(request.query_params.get("page_size", 10))
        except (TypeError, ValueError):
            page_size = 10
        page_size = max(1, min(page_size, 50))
        qs = (
            Review.objects.filter(
                listing=listing,
                deleted_at__isnull=True,
                is_public=True,
                reviewer_role=Review.ReviewerRole.GUEST,
            )
            .select_related("author")
            .order_by("-created_at")[:page_size]
        )
        ser = ReviewSerializer(qs, many=True, context={"request": request})
        return Response({"data": ser.data, "meta": {"page_size": page_size}}, status=200)
