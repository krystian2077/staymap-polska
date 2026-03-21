from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.search.nominatim import geocode_poland


class GeocodeView(APIView):
    """Geokodowanie tekstu → współrzędne (Nominatim / OSM), bez kluczy API."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "geocode"

    @extend_schema(
        summary="Geokodowanie (Nominatim, PL)",
        parameters=[
            OpenApiParameter(name="q", type=str, required=True, description="Zapytanie tekstowe"),
        ],
    )
    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        if not q:
            return Response(
                {
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "message": "Parametr q jest wymagany.",
                        "field": "q",
                        "status": 400,
                    }
                },
                status=400,
            )
        hit = geocode_poland(q)
        if not hit:
            return Response(
                {
                    "data": None,
                    "meta": {"found": False},
                },
                status=200,
            )
        return Response(
            {
                "data": {
                    "lat": hit["lat"],
                    "lng": hit["lng"],
                    "display_name": hit["display_name"],
                },
                "meta": {"found": True},
            }
        )
