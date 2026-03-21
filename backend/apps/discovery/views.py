from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from apps.common.exceptions import CompareLimitError, CompareSessionRequiredError
from apps.discovery.serializers import SimilarListingCardSerializer
from apps.discovery.services import CompareService, DiscoveryFeedService
from apps.listings.models import Listing


class DiscoveryHomepageView(ViewSet):
    permission_classes = [permissions.AllowAny]

    @extend_schema(summary="Feed strony głównej (kolekcje + last minute)")
    def list(self, request):
        data = DiscoveryFeedService.get_homepage(request)
        return Response({"data": data, "meta": {}})


class CompareViewSet(ViewSet):
    permission_classes = [permissions.AllowAny]

    @extend_schema(summary="Porównanie — pobierz sesję i oferty")
    def list(self, request):
        try:
            session = CompareService.resolve_session(request)
        except CompareSessionRequiredError as e:
            return Response(
                {"error": {"code": e.default_code, "message": str(e.detail), "field": None}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ids = list(session.listings.values_list("id", flat=True))
        if not ids:
            return Response(
                {
                    "data": {
                        "session_id": str(session.id),
                        "expires_at": session.expires_at.isoformat(),
                        "listing_ids": [],
                        "listings": [],
                    },
                    "meta": {},
                }
            )
        order = {lid: i for i, lid in enumerate(ids)}
        qs = (
            Listing.objects.filter(id__in=ids, status=Listing.Status.APPROVED)
            .select_related("location", "host__user")
            .prefetch_related("images")
        )
        rows = sorted(qs, key=lambda x: order.get(x.id, 999))
        ser = SimilarListingCardSerializer(rows, many=True, context={"request": request})
        return Response(
            {
                "data": {
                    "session_id": str(session.id),
                    "expires_at": session.expires_at.isoformat(),
                    "listing_ids": [str(x) for x in session.listings.values_list("id", flat=True)],
                    "listings": ser.data,
                },
                "meta": {},
            }
        )

    @extend_schema(summary="Porównanie — nowa sesja anonimowa")
    @action(detail=False, methods=["post"], url_path="bootstrap")
    def bootstrap(self, request):
        session = CompareService.bootstrap_anonymous()
        return Response(
            {
                "data": {
                    "session_key": session.session_key,
                    "session_id": str(session.id),
                    "expires_at": session.expires_at.isoformat(),
                },
                "meta": {},
            },
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(summary="Porównanie — dodaj ofertę")
    @action(detail=False, methods=["post"], url_path="listings")
    def add_listing(self, request):
        listing_id = request.data.get("listing_id")
        if not listing_id:
            return Response(
                {"error": {"code": "VALIDATION_ERROR", "message": "Pole listing_id jest wymagane.", "field": "listing_id"}},
                status=400,
            )
        try:
            session = CompareService.resolve_session(request)
            CompareService.add_listing(session, listing_id)
        except CompareSessionRequiredError as e:
            return Response(
                {"error": {"code": e.default_code, "message": str(e.detail), "field": None}},
                status=400,
            )
        except CompareLimitError as e:
            return Response(
                {"error": {"code": e.default_code, "message": str(e.detail), "field": None}},
                status=400,
            )
        except Listing.DoesNotExist:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "Nie znaleziono oferty.", "field": "listing_id"}},
                status=404,
            )
        return Response({"data": {"ok": True}, "meta": {}}, status=status.HTTP_200_OK)

    def remove_listing(self, request, listing_id):
        try:
            session = CompareService.resolve_session(request)
            CompareService.remove_listing(session, listing_id)
        except CompareSessionRequiredError as e:
            return Response(
                {"error": {"code": e.default_code, "message": str(e.detail), "field": None}},
                status=400,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)
