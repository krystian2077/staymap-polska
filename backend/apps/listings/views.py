from django.db.models import Prefetch, Q
from rest_framework import mixins, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from apps.common.permissions import IsOwnerOrAdmin
from apps.common.throttles import UploadThrottle
from apps.listings.models import Listing, ListingImage
from apps.listings.serializers import (
    ListingDetailSerializer,
    ListingImageUploadSerializer,
    ListingListSerializer,
    ListingWriteSerializer,
)
from apps.listings.services import ListingService


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
            Listing.objects.select_related("host__user", "location")
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
