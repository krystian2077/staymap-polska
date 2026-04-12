from urllib.parse import urlencode

from django.db import models
from django.contrib.gis.db.models.functions import Distance
from django.db.models import Prefetch
from django.contrib.gis.geos import Point
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from apps.listings.models import Listing, ListingImage, ListingLocation
from apps.search.cursors import decode_offset, encode_offset
from apps.search.schemas import parse_search_params
from apps.search.serializers import ListingSearchSerializer
from apps.search.services import MAX_MAP_PINS, SearchOrchestrator


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
        for row in qs:
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
                    "slug": row.slug,
                    "title": row.title,
                    "city": loc.city or "",
                    "average_rating": float(row.average_rating) if row.average_rating is not None else None,
                    "listing_type": row.listing_type or {},
                }
            )
        return Response({"data": pins, "meta": {"count": len(pins)}})

    @extend_schema(summary="Sugerowane kierunki na podstawie ofert")
    @action(detail=False, methods=["get"], url_path="suggested-destinations")
    def suggested_destinations(self, request):
        """Pobiera 8 topowych lokalizacji z bazy danych z aktywnymi ofertami."""
        # W celach sugestii dopuszczamy wszystkie "widoczne" statusy (Draft w dev, Pending, Approved)
        # Aby zapewnić premium feel nawet przy pustej bazie, mamy listę fallback.
        data = []
        
        # Pobieramy miasta z największą liczbą ofert (dowolny status poza zarchiwizowanym)
        top_cities = (
            ListingLocation.objects.filter(listing__status__in=[
                Listing.Status.APPROVED, Listing.Status.PENDING, Listing.Status.DRAFT
            ])
            .values("city", "region", "country")
            .annotate(listing_count=models.Count("listing"))
            .order_by("-listing_count", "city")[:12]
        )

        for item in top_cities:
            city = item["city"]
            if not city:
                continue
            
            sample_loc = ListingLocation.objects.filter(
                city=city, 
                listing__status__in=[Listing.Status.APPROVED, Listing.Status.PENDING, Listing.Status.DRAFT]
            ).first()
            if not sample_loc:
                continue

            icon = "city"
            description = f"Odkryj uroki {city}"
            
            if sample_loc.near_sea or sample_loc.beach_access:
                icon = "beach"
                description = f"Wypoczynek nad morzem"
            elif sample_loc.near_mountains:
                icon = "city"
                description = f"Górskie wędrówki i widoki"
            elif sample_loc.near_lake:
                icon = "beach"
                description = f"Relaks nad jeziorem"

            data.append({
                "name": city,
                "region": item["region"] or (item["country"] if item["country"] != "PL" else "Polska"),
                "lat": sample_loc.point.y,
                "lng": sample_loc.point.x,
                "icon": icon,
                "description": description
            })

        # --- FALLBACK DO POPULARNYCH MIEJSC W POLSCE ---
        if len(data) < 4:
            fallbacks = [
                {"name": "Warszawa", "region": "Mazowsze", "lat": 52.2297, "lng": 21.0122, "icon": "city", "description": "Serce Polski"},
                {"name": "Kraków", "region": "Małopolska", "lat": 50.0647, "lng": 19.9450, "icon": "city", "description": "Dawna stolica królów"},
                {"name": "Gdańsk", "region": "Pomorskie", "lat": 54.3520, "lng": 18.6466, "icon": "beach", "description": "Bałtycka perła"},
                {"name": "Wrocław", "region": "Dolny Śląsk", "lat": 51.1079, "lng": 17.0385, "icon": "city", "description": "Miasto stu mostów"},
                {"name": "Zakopane", "region": "Podhale", "lat": 49.2992, "lng": 19.9495, "icon": "city", "description": "Zimowa stolica Polski"},
                {"name": "Poznań", "region": "Wielkopolska", "lat": 52.4064, "lng": 16.9252, "icon": "city", "description": "Historia i kultura"},
                {"name": "Gdynia", "region": "Pomorskie", "lat": 54.5189, "lng": 18.5305, "icon": "beach", "description": "Nowoczesność nad morzem"},
                {"name": "Białystok", "region": "Podlasie", "lat": 53.1325, "lng": 23.1688, "icon": "city", "description": "Brama na wschód"},
            ]
            for fb in fallbacks:
                if len(data) >= 8: break
                if not any(d["name"].lower() == fb["name"].lower() for d in data):
                    data.append(fb)

        return Response({"data": data[:8]})

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

        # 1. Specjalne słowa kluczowe (typy terenu i typy obiektów)
        keyword_map = {
            "góry": {"field": "near_mountains", "label": "Góry", "icon": "city", "desc": "Piękne widoki i szlaki"},
            "jezioro": {"field": "near_lake", "label": "Jeziora", "icon": "beach", "desc": "Wypoczynek nad wodą"},
            "jeziora": {"field": "near_lake", "label": "Jeziora", "icon": "beach", "desc": "Wypoczynek nad wodą"},
            "morze": {"field": "near_sea", "label": "Morze", "icon": "beach", "desc": "Piaszczyste plaże i bałtycki klimat"},
            "bałtyk": {"field": "near_sea", "label": "Morze", "icon": "beach", "desc": "Piaszczyste plaże i bałtycki klimat"},
            "plaża": {"field": "beach_access", "label": "Plaże", "icon": "beach", "desc": "Słońce i szum fal"},
            "las": {"field": "near_forest", "label": "Lasy", "icon": "city", "desc": "Cisza, spokój i natura"},
            "narty": {"field": "ski_slopes_nearby", "label": "Narty", "icon": "city", "desc": "Zimowe szaleństwo na stoku"},
            "domek": {"type_slug": "domek", "label": "Domki", "icon": "city", "desc": "Przytulne domki na wyłączność"},
            "domki": {"type_slug": "domek", "label": "Domki", "icon": "city", "desc": "Przytulne domki na wyłączność"},
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
                        listing__status__in=[Listing.Status.APPROVED, Listing.Status.PENDING, Listing.Status.DRAFT]
                    ).first()
                else:
                    # Szukamy po typie obiektu (JSONField)
                    sample_listing = Listing.objects.filter(
                        listing_type__slug=info["type_slug"],
                        status__in=[Listing.Status.APPROVED, Listing.Status.PENDING, Listing.Status.DRAFT]
                    ).first()
                    sample = sample_listing.location if sample_listing and hasattr(sample_listing, 'location') else None

                if sample:
                    lat, lng = sample.point.y, sample.point.x

                results.append({
                    "name": info["label"],
                    "region": "W całej Polsce",
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
                listing__status__in=[Listing.Status.APPROVED, Listing.Status.PENDING, Listing.Status.DRAFT]
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
                listing__status__in=[Listing.Status.APPROVED, Listing.Status.PENDING, Listing.Status.DRAFT]
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
