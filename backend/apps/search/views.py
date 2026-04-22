import logging
from urllib.parse import urlencode
import unicodedata

from django.db import models

logger = logging.getLogger(__name__)
from django.contrib.gis.db.models.functions import Distance
from django.db.models import Prefetch
from django.contrib.gis.geos import Point
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ViewSet

from apps.listings.models import Listing, ListingImage, ListingLocation
from apps.search.cursors import decode_offset, encode_offset
from apps.search.schemas import parse_search_params
from apps.search.serializers import ListingSearchSerializer
from apps.search.services import MAX_MAP_PINS, PUBLIC_SEARCH_STATUSES, SearchOrchestrator


def _search_params_for_cache(params: dict) -> dict:
    from apps.search.schemas import SAVED_SEARCH_PARAM_KEYS
    return {k: v for k, v in params.items() if k in SAVED_SEARCH_PARAM_KEYS}


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


def _normalize_text(value: str) -> str:
    return unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii").lower()


HOME_REGION_DEFINITIONS = [
    {
        "key": "gory",
        "title": "GĂłry",
        "subtitle": "Tatry, Beskidy i Bieszczady",
        "emoji": "đźŹ”ď¸Ź",
        "bg": "linear-gradient(145deg,#d8e7e1,#b9d0c7)",
        "glow": "rgba(34,197,94,.26)",
        "anchor_label": "Zakopane i okolice",
        "large": True,
        "tag": "NAJPOPULARNIEJSZY",
        "price_label": "od 180 zl/noc",
        "search_params": {
            "location": "Zakopane",
            "latitude": 49.2992,
            "longitude": 19.9496,
            "radius_km": 90,
            "near_mountains": True,
            "ordering": "recommended",
        },
        "highlights": ["widoki premium", "domki z sauna", "szlaki w zasiegu"],
    },
    {
        "key": "baltyk",
        "title": "BaĹ‚tyk",
        "subtitle": "Sopot, Hel, KoĹ‚obrzeg",
        "emoji": "đźŚŠ",
        "bg": "linear-gradient(145deg,#cad9e2,#afc4d0)",
        "glow": "rgba(56,189,248,.24)",
        "anchor_label": "Pas nadmorski",
        "search_params": {
            "location": "BaĹ‚tyk",
            "latitude": 54.45,
            "longitude": 18.67,
            "radius_km": 120,
            "near_sea": True,
            "ordering": "recommended",
        },
        "highlights": ["plaze i molo", "apartamenty z widokiem", "weekend nad morzem"],
    },
    {
        "key": "jeziora",
        "title": "Jeziora",
        "subtitle": "Mazury i relaks nad wodÄ…",
        "emoji": "đźŹŠ",
        "bg": "linear-gradient(145deg,#d0dfca,#b8cbaf)",
        "glow": "rgba(16,185,129,.23)",
        "anchor_label": "Kraina Wielkich Jezior",
        "search_params": {
            "location": "Mazury",
            "latitude": 53.8,
            "longitude": 21.5,
            "radius_km": 100,
            "near_lake": True,
            "ordering": "recommended",
        },
        "highlights": ["pomost i kajaki", "domki nad woda", "cisza po sezonie"],
    },
    {
        "key": "uzdrowiska",
        "title": "Uzdrowiska & SPA",
        "subtitle": "Kotlina Klodzka, Cieplice, Swieradow",
        "emoji": "â™¨ď¸Ź",
        "bg": "linear-gradient(145deg,#d8d5e9,#beb7de)",
        "glow": "rgba(167,139,250,.25)",
        "anchor_label": "Slow travel i regeneracja",
        "search_params": {
            "location": "Kotlina Klodzka",
            "latitude": 50.366,
            "longitude": 16.386,
            "radius_km": 115,
            "near_forest": True,
            "near_mountains": True,
            "ordering": "recommended",
        },
        "highlights": ["wellness i termy", "mikroklimat gorski", "weekend detox"],
    },
    {
        "key": "lasy",
        "title": "Lasy",
        "subtitle": "Bory, puszcze i totalny reset",
        "emoji": "đźŚż",
        "bg": "linear-gradient(145deg,#dad2ca,#c3bbb0)",
        "glow": "rgba(132,204,22,.18)",
        "anchor_label": "Puszcza i dzika przyroda",
        "search_params": {
            "location": "BiaĹ‚owieĹĽa",
            "latitude": 52.74,
            "longitude": 23.86,
            "radius_km": 120,
            "near_forest": True,
            "ordering": "recommended",
        },
        "highlights": ["reset offline", "puszcze i bory", "natura 360"],
    },
]


def _region_filters_from_params(params: dict) -> dict:
    return {k: True for k, v in params.items() if k.startswith("near_") and v is True}


def _region_href_from_params(params: dict) -> str:
    pairs = []
    for key, value in params.items():
        if value is None:
            continue
        if isinstance(value, bool):
            if value:
                pairs.append((key, "true"))
            continue
        pairs.append((key, str(value)))
    return f"/search?{urlencode(pairs, doseq=True)}"


def _build_home_regions_payload() -> list[dict]:
    payload = []
    for region in HOME_REGION_DEFINITIONS:
        search_params = dict(region["search_params"])
        map_queryset = SearchOrchestrator.build_map_queryset(dict(search_params))
        count = map_queryset.count()
        stats = map_queryset.aggregate(min_price=models.Min("base_price"))
        min_price = stats.get("min_price")
        payload.append(
            {
                "key": region["key"],
                "title": region["title"],
                "subtitle": region["subtitle"],
                "emoji": region["emoji"],
                "bg": region["bg"],
                "glow": region["glow"],
                "anchor_label": region["anchor_label"],
                "large": bool(region.get("large", False)),
                "tag": region.get("tag"),
                "price_label": region.get("price_label"),
                "count": count,
                "map_pin_count": min(count, MAX_MAP_PINS),
                "starting_price": float(min_price) if min_price is not None else None,
                "location": search_params.get("location", ""),
                "map_center": {
                    "lat": search_params.get("latitude"),
                    "lng": search_params.get("longitude"),
                },
                "radius_km": search_params.get("radius_km"),
                "filters": _region_filters_from_params(search_params),
                "highlights": region.get("highlights", []),
                "search_query": search_params,
                "href": _region_href_from_params(search_params),
            }
        )
    return payload


# Strony SEO /noclegi/{slug} — musi być zgodne z parametrami SearchOrchestrator
REGION_PAGE_META = {
    "mazury": {
        "title": "Mazury",
        "description": "Kraina Wielkich Jezior — noclegi nad wodą, kajaki, domki z pomostem.",
        "search_params": {
            "location": "Mazury",
            "latitude": 53.8,
            "longitude": 21.5,
            "radius_km": 100,
            "near_lake": True,
            "ordering": "recommended",
        },
    },
    "tatry": {
        "title": "Tatry i Zakopane",
        "description": "Góralskie domki, widok na szczyty, sauna po dniu na szlaku.",
        "search_params": {
            "location": "Zakopane",
            "latitude": 49.2992,
            "longitude": 19.9496,
            "radius_km": 60,
            "near_mountains": True,
            "ordering": "recommended",
        },
    },
    "bieszczady": {
        "title": "Bieszczady",
        "description": "Dzika przyroda, cisza i domki z dala od cywilizacji.",
        "search_params": {
            "location": "Bieszczady",
            "latitude": 49.05,
            "longitude": 22.5,
            "radius_km": 80,
            "near_mountains": True,
            "near_forest": True,
            "ordering": "recommended",
        },
    },
    "baltyk": {
        "title": "Bałtyk",
        "description": "Apartamenty przy plaży, domki z widokiem na morze.",
        "search_params": {
            "location": "Sopot",
            "latitude": 54.45,
            "longitude": 18.67,
            "radius_km": 120,
            "near_sea": True,
            "ordering": "recommended",
        },
    },
    "karkonosze": {
        "title": "Karkonosze i Szklarska Poręba",
        "description": "Domki w Sudetach — idealne na narty zimą, wędrówki latem.",
        "search_params": {
            "location": "Szklarska Poręba",
            "latitude": 50.83,
            "longitude": 15.52,
            "radius_km": 50,
            "near_mountains": True,
            "ordering": "recommended",
        },
    },
}


class RegionDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, region_slug):
        meta = REGION_PAGE_META.get(region_slug)
        if not meta:
            return Response({"error": "Region nie istnieje"}, status=404)

        params = {**meta["search_params"], "ordering": "recommended"}
        ids = SearchOrchestrator.get_ordered_ids(params)
        listing_ids = ids[:6]
        listings_qs = (
            Listing.objects.filter(id__in=listing_ids, status=Listing.Status.APPROVED)
            .prefetch_related("images", "location")
        )
        listing_map = {str(l.id): l for l in listings_qs}
        ordered = [listing_map[str(i)] for i in listing_ids if str(i) in listing_map]

        ser = ListingSearchSerializer(ordered, many=True, context={"request": request})
        return Response(
            {
                "slug": region_slug,
                "title": meta["title"],
                "description": meta["description"],
                "listing_count": len(ids),
                "top_listings": ser.data,
                "search_params": meta["search_params"],
            }
        )


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
        try:
            ordered_ids = SearchOrchestrator.get_ordered_ids(cache_params)
            start = decode_offset(request.query_params.get("cursor"))
            end = min(start + page_size, len(ordered_ids))
            page_ids = ordered_ids[start:end]

            preserved = {pk: i for i, pk in enumerate(page_ids)}
            img_qs = ListingImage.objects.order_by("-is_cover", "sort_order", "id")
            qs = (
                Listing.objects.filter(id__in=page_ids)
                .filter(status__in=PUBLIC_SEARCH_STATUSES)
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
        except Exception as exc:
            import traceback
            tb = traceback.format_exc()
            logger.exception("Search list crashed, params=%s", cache_params)
            return Response(
                {"error": {"code": "SEARCH_CRASH", "message": str(exc), "traceback": tb, "params": str(cache_params)}},
                status=500,
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
                raise ValidationError(f"limit musi byÄ‡ liczbÄ… caĹ‚kowitÄ… 1â€“{MAX_MAP_PINS}")

        try:
            qs = SearchOrchestrator.build_map_queryset(cache_params)[:limit]
            pins = []
            for row in qs:
                loc = row.location
                if not loc:
                    continue
                p = loc.point
                if p is None:
                    continue
                pins.append(
                    {
                        "id": str(row.id),
                        "lat": p.y,
                        "lng": p.x,
                        "price": str(row.base_price),
                        "slug": row.slug,
                        "title": row.title,
                        "city": loc.city or "",
                        "average_rating": float(row.average_rating) if row.average_rating is not None else None,
                        "listing_type": row.listing_type or {},
                    }
                )
            return Response({"data": pins, "meta": {"count": len(pins)}})
        except Exception as exc:
            import traceback
            tb = traceback.format_exc()
            logger.exception("Search map_pins crashed, params=%s", cache_params)
            return Response(
                {"error": {"code": "MAP_PINS_CRASH", "message": str(exc), "traceback": tb, "params": str(cache_params)}},
                status=500,
            )

    @extend_schema(summary="Liczba ofert w regionach homepage")
    @action(detail=False, methods=["get"], url_path="region-counts")
    def region_counts(self, request):
        regions = _build_home_regions_payload()
        counts = {region["key"]: region["count"] for region in regions}
        return Response({"data": counts})

    @extend_schema(summary="Regiony homepage (peĹ‚na synchronizacja z mapÄ… i filtrami)")
    @action(detail=False, methods=["get"], url_path="regions")
    def regions(self, request):
        return Response({"data": _build_home_regions_payload()})

    @extend_schema(summary="Sugerowane kierunki na podstawie ofert")
    @action(detail=False, methods=["get"], url_path="suggested-destinations")
    def suggested_destinations(self, request):
        """Pobiera oferty zgrupowane po kategoriach: Góry, Bałtyk, Jeziora, Zachodnia Polska, Lasy."""
        data = []

        regions = [
            {
                "id": "gory",
                "name": "Góry",
                "icon": "city",
                "description": "Górskie wędrówki i piękne widoki",
                "filters": {"near_mountains": True},
                "fallback": {"name": "Zakopane", "region": "Podhale", "lat": 49.2992, "lng": 19.9495},
            },
            {
                "id": "baltyk",
                "name": "Bałtyk",
                "icon": "beach",
                "description": "Plaże i morski klimat",
                "filters": {"near_sea": True},
                "fallback": {"name": "Gdańsk", "region": "Pomorskie", "lat": 54.3520, "lng": 18.6466},
            },
            {
                "id": "jeziora",
                "name": "Jeziora",
                "icon": "beach",
                "description": "Relaks nad wodą",
                "filters": {"near_lake": True},
                "fallback": {"name": "Mikołajki", "region": "Warmińsko-Mazurskie", "lat": 53.7510, "lng": 21.4910},
            },
            {
                "id": "zachodnia_polska",
                "name": "Zachodnia Polska",
                "icon": "city",
                "description": "Bogate dziedzictwo kulturowe",
                "filters": {"region__in": ["Lubuskie", "Dolny Śląsk", "Wielkopolska", "Zachodniopomorskie"]},
                "fallback": {"name": "Wrocław", "region": "Dolny Śląsk", "lat": 51.1079, "lng": 17.0385},
            },
            {
                "id": "lasy",
                "name": "Lasy",
                "icon": "city",
                "description": "Cisza, spokój i przyroda",
                "filters": {"near_forest": True},
                "fallback": {"name": "Białowieża", "region": "Podlasie", "lat": 52.7406, "lng": 24.9970},
            },
        ]

        for region in regions:
            sample = ListingLocation.objects.filter(
                listing__status__in=PUBLIC_SEARCH_STATUSES,
                **region["filters"],
            ).select_related("listing").first()

            if sample:
                data.append(
                    {
                        "name": region["name"],
                        "region": sample.region or "Polska",
                        "lat": sample.point.y,
                        "lng": sample.point.x,
                        "icon": region["icon"],
                        "description": region["description"],
                    }
                )
            else:
                fallback = region["fallback"]
                data.append(
                    {
                        "name": region["name"],
                        "region": fallback["region"],
                        "lat": fallback["lat"],
                        "lng": fallback["lng"],
                        "icon": region["icon"],
                        "description": region["description"],
                    }
                )

        return Response({"data": data})

    @extend_schema(
        summary="Autouzupełnianie wyszukiwania",
        parameters=[OpenApiParameter(name="q", type=str, required=True)],
    )
    @action(detail=False, methods=["get"], url_path="autocomplete")
    def autocomplete(self, request):
        """Dynamiczne podpowiedzi wyszukiwania (miasta, regiony, typy terenu)."""
        q = request.query_params.get("q", "").strip().lower()
        if not q:
            return Response({"data": []})

        from django.db.models import Q

        results = []

        # 1. Specjalne sĹ‚owa kluczowe (typy terenu i typy obiektĂłw)
        keyword_map = {
            "gĂłry": {"field": "near_mountains", "label": "GĂłry", "icon": "city", "desc": "PiÄ™kne widoki i szlaki"},
            "jezioro": {"field": "near_lake", "label": "Jeziora", "icon": "beach", "desc": "Wypoczynek nad wodÄ…"},
            "jeziora": {"field": "near_lake", "label": "Jeziora", "icon": "beach", "desc": "Wypoczynek nad wodÄ…"},
            "morze": {"field": "near_sea", "label": "Morze", "icon": "beach", "desc": "Piaszczyste plaĹĽe i baĹ‚tycki klimat"},
            "baĹ‚tyk": {"field": "near_sea", "label": "Morze", "icon": "beach", "desc": "Piaszczyste plaĹĽe i baĹ‚tycki klimat"},
            "plaĹĽa": {"field": "beach_access", "label": "PlaĹĽe", "icon": "beach", "desc": "SĹ‚oĹ„ce i szum fal"},
            "las": {"field": "near_forest", "label": "Lasy", "icon": "city", "desc": "Cisza, spokĂłj i natura"},
            "narty": {"field": "ski_slopes_nearby", "label": "Narty", "icon": "city", "desc": "Zimowe szaleĹ„stwo na stoku"},
            "domek": {"type_slug": "domek", "label": "Domki", "icon": "city", "desc": "Przytulne domki na wyĹ‚Ä…cznoĹ›Ä‡"},
            "domki": {"type_slug": "domek", "label": "Domki", "icon": "city", "desc": "Przytulne domki na wyĹ‚Ä…cznoĹ›Ä‡"},
            "apartament": {"type_slug": "apartament", "label": "Apartamenty", "icon": "city", "desc": "Komfortowe apartamenty"},
            "apartamenty": {"type_slug": "apartament", "label": "Apartamenty", "icon": "city", "desc": "Komfortowe apartamenty"},
            "chata": {"type_slug": "chata", "label": "Chaty", "icon": "city", "desc": "Drewniane chaty z klimatem"},
            "chaty": {"type_slug": "chata", "label": "Chaty", "icon": "city", "desc": "Drewniane chaty z klimatem"},
        }

        for key, info in keyword_map.items():
            if q in key:
                # Szukamy pierwszej lepszej lokalizacji z tym typem
                lat, lng = (52.23, 21.01) # fallback (centrum Polski)
                
                if "field" in info:
                    sample = ListingLocation.objects.filter(
                        **{info["field"]: True}, 
                        listing__status__in=PUBLIC_SEARCH_STATUSES
                    ).first()
                else:
                    # Szukamy po typie obiektu (JSONField)
                    sample_listing = Listing.objects.filter(
                        listing_type__slug=info["type_slug"],
                        status__in=PUBLIC_SEARCH_STATUSES
                    ).first()
                    sample = sample_listing.location if sample_listing and hasattr(sample_listing, 'location') else None

                if sample:
                    lat, lng = sample.point.y, sample.point.x

                results.append({
                    "name": info["label"],
                    "region": "W caĹ‚ej Polsce",
                    "lat": lat,
                    "lng": lng,
                    "icon": info["icon"],
                    "description": info["desc"],
                    "type": "keyword",
                    "filter_key": info.get("field"),
                    "listing_type": info.get("type_slug")
                })

        # 2. Wyszukiwanie miast
        cities = (
            ListingLocation.objects.filter(
                Q(city__icontains=q) | Q(region__icontains=q),
                listing__status__in=PUBLIC_SEARCH_STATUSES
            )
            .values("city", "region")
            .annotate(count=models.Count("id"))
            .order_by("-count")[:10]
        )

        seen_cities = set()
        for c in cities:
            name = c["city"]
            if not name or name in seen_cities:
                continue
            
            sample = ListingLocation.objects.filter(
                city=name, 
                listing__status__in=PUBLIC_SEARCH_STATUSES
            ).first()
            if sample:
                results.append({
                    "name": name,
                    "region": c["region"] or "Polska",
                    "lat": sample.point.y,
                    "lng": sample.point.x,
                    "icon": "city",
                    "description": f"Odkryj {name}",
                    "type": "city"
                })
                seen_cities.add(name)

        return Response({"data": results[:8]})

