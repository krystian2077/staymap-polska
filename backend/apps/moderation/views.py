from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsAdmin
from apps.listings.models import Listing
from apps.listings.serializers import ListingListSerializer


class ModerationListingQueueView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        qs = (
            Listing.objects.filter(deleted_at__isnull=True, status=Listing.Status.PENDING)
            .select_related("host", "host__user", "location")
            .order_by("created_at")
        )
        ser = ListingListSerializer(qs, many=True, context={"request": request})
        return Response({"data": ser.data, "meta": {}}, status=200)


class ModerationListingApproveView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, listing_id):
        listing = get_object_or_404(Listing.objects.filter(deleted_at__isnull=True), pk=listing_id)
        if listing.status != Listing.Status.PENDING:
            return Response(
                {
                    "error": {
                        "code": "INVALID_STATUS",
                        "message": "Oferta nie oczekuje na moderację.",
                        "field": None,
                        "status": 400,
                    }
                },
                status=400,
            )
        listing.status = Listing.Status.APPROVED
        listing.moderation_comment = ""
        listing.save(update_fields=["status", "moderation_comment", "updated_at"])
        ser = ListingListSerializer(listing, context={"request": request})
        return Response({"data": ser.data, "meta": {}}, status=200)


class ModerationListingRejectView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, listing_id):
        listing = get_object_or_404(Listing.objects.filter(deleted_at__isnull=True), pk=listing_id)
        comment = (request.data.get("comment") or "").strip()[:2000]
        if listing.status != Listing.Status.PENDING:
            return Response(
                {
                    "error": {
                        "code": "INVALID_STATUS",
                        "message": "Oferta nie oczekuje na moderację.",
                        "field": None,
                        "status": 400,
                    }
                },
                status=400,
            )
        listing.status = Listing.Status.REJECTED
        listing.moderation_comment = comment
        listing.save(update_fields=["status", "moderation_comment", "updated_at"])
        ser = ListingListSerializer(listing, context={"request": request})
        return Response({"data": ser.data, "meta": {}}, status=200)
