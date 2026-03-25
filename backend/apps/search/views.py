from urllib.parse import urlencode

from django.contrib.gis.db.models.functions import Distance
from django.db.models import Prefetch
from django.contrib.gis.geos import Point
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from apps.listings.models import Listing, ListingImage
from apps.search.cursors import decode_offset, encode_offset
from apps.search.schemas import parse_search_params
from apps.search.serializers import ListingSearchSerializer
from apps.search.services import MAX_MAP_PINS, SearchOrchestrator


def _search_params_for_cache(params: dict) -> dict:
    return {k: v for k, v in params.items() if k not in ("page_size", "limit")}


def _url_with_cursor(request, new_cursor: str | None):
    q = request.GET.copy()
    if new_cursor is None:
        q.pop("cursor", None)
    else:
        q["cursor"] = new_cursor
    qs = urlencode(q, doseq=True)
    path = request.path
    return request.build_absolute_uri(f"{path}?{qs}" if qs else path)


def _attach_distance(rows, cache_params: dict, page_ids):
    if not page_ids:
        return
    lat, lng = cache_params.get("latitude"), cache_params.get("longitude")
    if lat is None or lng is None:
        return
    pt = Point(float(lng), float(lat), srid=4326)
    dist_qs = Listing.objects.filter(id__in=page_ids).annotate(
        distance=Distance("location__point", pt)
    )
    dist_map = {r.id: r.distance for r in dist_qs}
    for row in rows:
        if row.id in dist_map:
            row.distance = dist_map[row.id]


class SearchViewSet(ViewSet):
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Wyszukiwanie ofert",
        parameters=[
            OpenApiParameter(name="location", type=str, required=False),
            OpenApiParameter(name="latitude", type=float, required=False),
            OpenApiParameter(name="longitude", type=float, required=False),
            OpenApiParameter(name="radius_km", type=float, required=False),
            OpenApiParameter(name="guests", type=int, required=False),
            OpenApiParameter(name="travel_mode", type=str, required=False),
            OpenApiParameter(name="min_price", type=float, required=False),
            OpenApiParameter(name="max_price", type=float, required=False),
            OpenApiParameter(name="booking_mode", type=str, required=False),
            OpenApiParameter(name="ordering", type=str, required=False),
            OpenApiParameter(name="cursor", type=str, required=False),
            OpenApiParameter(name="page_size", type=int, required=False),
        ],
    )
    def list(self, request):
        params, errors = parse_search_params(request.query_params)
        if errors:
            raise ValidationError("; ".join(errors))

        page_size = int(params.get("page_size") or 24)
        cache_params = _search_params_for_cache(params)
        ordered_ids = SearchOrchestrator.get_ordered_ids(cache_params)
        start = decode_offset(request.query_params.get("cursor"))
        end = min(start + page_size, len(ordered_ids))
        page_ids = ordered_ids[start:end]

        preserved = {pk: i for i, pk in enumerate(page_ids)}
        img_qs = ListingImage.objects.order_by("-is_cover", "sort_order", "id")
        qs = (
            Listing.objects.filter(id__in=page_ids)
            .select_related("location", "host__user")
            .prefetch_related(Prefetch("images", queryset=img_qs))
            .defer("description")
        )
        rows = list(qs)
        rows.sort(key=lambda r: preserved[r.id])
        _attach_distance(rows, cache_params, page_ids)

        ser = ListingSearchSerializer(rows, many=True, context={"request": request})
        next_cursor = encode_offset(end) if end < len(ordered_ids) else None
        prev_cursor = encode_offset(max(0, start - page_size)) if start > 0 else None
        return Response(
            {
                "data": ser.data,
                "meta": {
                    "next": _url_with_cursor(request, next_cursor) if next_cursor else None,
                    "previous": _url_with_cursor(request, prev_cursor) if prev_cursor else None,
                    "count": len(ordered_ids),
                },
            }
        )

    @extend_schema(
        summary="Piny mapy",
        parameters=[
            OpenApiParameter(name="location", type=str, required=False),
            OpenApiParameter(name="latitude", type=float, required=False),
            OpenApiParameter(name="longitude", type=float, required=False),
            OpenApiParameter(name="radius_km", type=float, required=False),
            OpenApiParameter(name="guests", type=int, required=False),
            OpenApiParameter(name="travel_mode", type=str, required=False),
            OpenApiParameter(name="min_price", type=float, required=False),
            OpenApiParameter(name="max_price", type=float, required=False),
            OpenApiParameter(name="booking_mode", type=str, required=False),
            OpenApiParameter(name="ordering", type=str, required=False),
            OpenApiParameter(name="limit", type=int, required=False),
        ],
    )
    @action(detail=False, methods=["get"], url_path="map")
    def map_pins(self, request):
        params, errors = parse_search_params(request.query_params)
        if errors:
            raise ValidationError("; ".join(errors))
        cache_params = _search_params_for_cache(params)

        lim_raw = request.query_params.get("limit")
        limit = MAX_MAP_PINS
        if lim_raw not in (None, ""):
            try:
                limit = min(MAX_MAP_PINS, max(1, int(lim_raw)))
            except (TypeError, ValueError):
                raise ValidationError(f"limit musi być liczbą całkowitą 1–{MAX_MAP_PINS}")

        qs = SearchOrchestrator.build_map_queryset(cache_params)[:limit]
        pins = []
        for row in qs.iterator(chunk_size=200):
            loc = row.location
            if not loc:
                continue
            p = loc.point
            pins.append(
                {
                    "id": str(row.id),
                    "lat": p.y,
                    "lng": p.x,
                    "price": str(row.base_price),
                }
            )
        return Response({"data": pins, "meta": {"count": len(pins)}})
