from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from apps.listings.models import Listing
from apps.users.models import SavedSearch
from apps.users.serializers import (
    SavedSearchCreateSerializer,
    SavedSearchSerializer,
    WishlistAddSerializer,
    WishlistItemSerializer,
)
from apps.users.services_etap5 import SavedSearchService, WishlistService


class WishlistViewSet(ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(summary="Lista życzeń")
    def list(self, request):
        qs = WishlistService.list_for_user(request.user)
        ser = WishlistItemSerializer(qs, many=True, context={"request": request})
        return Response({"data": ser.data, "meta": {"count": len(ser.data)}})

    @extend_schema(summary="Dodaj ofertę do listy życzeń", request=WishlistAddSerializer)
    def create(self, request):
        ser = WishlistAddSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        lid = ser.validated_data["listing_id"]
        try:
            WishlistService.add(request.user, lid)
        except Listing.DoesNotExist:
            return Response(
                {
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Nie znaleziono publicznej oferty.",
                        "field": "listing_id",
                    }
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({"data": {"ok": True}, "meta": {}}, status=status.HTTP_201_CREATED)

    @extend_schema(summary="Usuń z listy życzeń")
    def destroy(self, request, listing_id=None):
        WishlistService.remove(request.user, listing_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SavedSearchViewSet(ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(summary="Zapisane wyszukiwania")
    def list(self, request):
        qs = SavedSearchService.list_for_user(request.user)
        ser = SavedSearchSerializer(qs, many=True)
        return Response({"data": ser.data, "meta": {"count": len(ser.data)}})

    @extend_schema(summary="Zapisz wyszukiwanie", request=SavedSearchCreateSerializer)
    def create(self, request):
        ser = SavedSearchCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        obj = SavedSearchService.create(
            request.user,
            name=ser.validated_data["name"],
            query_payload=ser.validated_data["query_payload"],
            notify_new_listings=ser.validated_data.get("notify_new_listings", False),
        )
        out = SavedSearchSerializer(obj)
        return Response({"data": out.data, "meta": {}}, status=status.HTTP_201_CREATED)

    @extend_schema(summary="Usuń zapisane wyszukiwanie")
    def destroy(self, request, pk=None):
        get_object_or_404(
            SavedSearch.objects.filter(user=request.user, deleted_at__isnull=True),
            pk=pk,
        )
        SavedSearchService.delete(request.user, pk)
        return Response(status=status.HTTP_204_NO_CONTENT)
