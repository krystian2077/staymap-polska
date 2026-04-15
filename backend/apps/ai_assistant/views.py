from __future__ import annotations

import hashlib
from typing import Optional

from django.conf import settings
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ViewSet

from apps.ai_assistant.models import AiFilterInterpretation, AiRecommendation, AiTravelSession
from apps.ai_assistant.serializers import AiSearchCreateSerializer
from apps.ai_assistant.services import AISearchService
from apps.common.throttles import AISearchThrottle
from apps.listings.models import Listing
from apps.search.serializers import ListingSearchSerializer


def _fallback_match_explanation(listing: Listing, filters: Optional[dict]) -> tuple[str, list[str]]:
    f = filters if isinstance(filters, dict) else {}
    loc = getattr(listing, "location", None)
    highlights: list[str] = []
    if f.get("near_forest") and getattr(loc, "near_forest", False):
        highlights.append("blisko lasu")
    if f.get("near_lake") and getattr(loc, "near_lake", False):
        highlights.append("blisko jeziora")
    if f.get("near_mountains") and getattr(loc, "near_mountains", False):
        highlights.append("blisko gór")
    if f.get("sauna"):
        amenities = listing.amenities if isinstance(listing.amenities, list) else []
        amenity_tokens = {
            (str(item.get("id") or item.get("name") or "") if isinstance(item, dict) else str(item)).lower()
            for item in amenities
        }
        if "sauna" in amenity_tokens or "private_sauna" in amenity_tokens:
            highlights.append("prywatna sauna")
    if listing.average_rating:
        highlights.append(f"ocena {float(listing.average_rating):.1f}")
    highlights = highlights[:3]
    if highlights:
        return (
            f"Ta oferta pasuje do Twojego zapytania. Najmocniejsze argumenty: {', '.join(highlights)}.",
            highlights,
        )
    return (
        "Ta oferta pasuje do Twoich preferencji i profilu wyjazdu. Sprawdza się pod kątem lokalizacji oraz parametrów pobytu.",
        [],
    )


def _serialize_ai_results(rows, filters: Optional[dict], request=None, rec_by_listing_id: Optional[dict] = None) -> list[dict]:
    out: list[dict] = []
    mode = (filters or {}).get("travel_mode") if isinstance(filters, dict) else None
    for rank, listing in enumerate(rows):
        ser = ListingSearchSerializer(listing, context={"request": request})
        base_data = ser.data
        rec = (rec_by_listing_id or {}).get(str(listing.id)) if isinstance(rec_by_listing_id, dict) else None
        explanation = ""
        highlights: list[str] = []
        if rec is not None:
            explanation = str(getattr(rec, "match_explanation", "") or "")
            raw_highlights = getattr(rec, "match_highlights", [])
            if isinstance(raw_highlights, list):
                highlights = [str(x) for x in raw_highlights if str(x).strip()][:3]
        if not explanation:
            explanation, fallback_highlights = _fallback_match_explanation(listing, filters)
            if not highlights:
                highlights = fallback_highlights
        out.append(
            {
                **base_data,
                "listing_id": str(listing.id),
                "match_score": max(60, 100 - (rank * 2)),
                "match_reasons": [
                    f"Idealne dla trybu {mode}" if mode else "Pasuje do Twoich wymagań"
                ],
                "match_explanation": explanation,
                "match_highlights": highlights,
            }
        )
    return out


def _session_payload(session: AiTravelSession, request=None) -> dict:
    prompt = session.prompts.order_by("-created_at").first()
    interp = (
        AiFilterInterpretation.objects.filter(prompt=prompt).first()
        if prompt
        else None
    )
    data = {
        "session_id": str(session.id),
        "status": session.status,
        "prompt": prompt.raw_text if prompt else None,
        "messages": [],
        "conversation": [],
        "latest_response": "",
        "assistant_reply": "",
        "follow_up_suggestions": [],
        "created_at": session.created_at.isoformat(),
        "expires_at": session.expires_at.isoformat(),
        "tokens_used": session.total_tokens_used,
        "cost_usd": float(session.total_cost_usd),
        "model_used": session.model_used or None,
        "error_message": session.error_message or None,
        "matching_strategy": None,
        "filters": None,
        "search_params": None,
        "results": [],
    }

    recent_prompts = session.prompts.order_by("-created_at")[:6]
    for p in reversed(list(recent_prompts)):
        data["messages"].append(
            {
                "role": "user",
                "text": p.raw_text,
                "created_at": p.created_at.isoformat(),
            }
        )
        p_interp = AiFilterInterpretation.objects.filter(prompt=p).first()
        if p_interp and p_interp.summary_pl:
            data["messages"].append(
                {
                    "role": "assistant",
                    "text": p_interp.summary_pl,
                    "created_at": p_interp.created_at.isoformat(),
                }
            )

    # Backward-compat alias for older UI clients.
    data["conversation"] = list(data["messages"])

    if interp:
        raw = interp.raw_llm_json or {}
        data["matching_strategy"] = raw.get("_matching_strategy")
        data["search_params"] = interp.normalized_params if isinstance(interp.normalized_params, dict) else None
        # Frontend spodziewa się obiektu AIFilterInterpretation
        data["filters"] = {
            "summary_pl": interp.summary_pl or "",
            "location": raw.get("location"),
            "travel_mode": raw.get("travel_mode"),
            "sauna": bool(raw.get("sauna")),
            "near_mountains": bool(raw.get("near_mountains")),
            "near_lake": bool(raw.get("near_lake")),
            "near_forest": bool(raw.get("near_forest")),
            "max_price": raw.get("max_price"),
            "min_guests": raw.get("guests"),
            "max_guests": raw.get("guests"),
            "quiet_score_min": raw.get("quiet_score_min"),
            "custom_tags": [],
        }
        data["latest_response"] = interp.summary_pl or "Przygotowałem dopasowane propozycje."
        data["assistant_reply"] = data["latest_response"]
        mode = str(data["filters"].get("travel_mode") or "").strip().lower()
        mode_suggestions = {
            "romantic": ["Pokaż bardziej kameralne i romantyczne opcje", "Dodaj oferty z kominkiem i jacuzzi"],
            "family": ["Pokaż opcje bardziej przyjazne rodzinie", "Dodaj miejsca z dużą przestrzenią dla dzieci"],
            "workation": ["Pokaż opcje z bardzo szybkim WiFi", "Dodaj miejsca z wygodnym biurkiem do pracy"],
            "wellness": ["Pokaż mocniejsze opcje wellness", "Dodaj tylko obiekty z sauną i spa"],
            "mountains": ["Pokaż tylko oferty z widokiem na góry", "Dodaj miejsca blisko szlaków"],
            "lake": ["Pokaż tylko oferty blisko jeziora", "Dodaj miejsca z pomostem lub plażą"],
        }

        suggestions: list[str] = []
        suggestions.extend(mode_suggestions.get(mode, []))
        suggestions.append("Pokaż bardziej luksusowe opcje")
        if not data["filters"].get("near_lake"):
            suggestions.append("Dodaj miejsca blisko jeziora")
        if data["filters"].get("sauna"):
            suggestions.append("Tylko opcje z prywatnym jacuzzi")
        else:
            suggestions.append("Dodaj saunę lub jacuzzi")
        suggestions.append("Pokaż najtańsze warianty")

        unique: list[str] = []
        for s in suggestions:
            if s and s not in unique:
                unique.append(s)
        if unique:
            shift = int(hashlib.sha256(str(session.id).encode("utf-8")).hexdigest(), 16) % len(unique)
            unique = unique[shift:] + unique[:shift]
        data["follow_up_suggestions"] = unique[:4]

        recs = list(
            AiRecommendation.objects.filter(interpretation=interp)
            .select_related(
                "listing",
                "listing__location",
            )
            .prefetch_related("listing__images")
            .order_by("rank", "id")[:6]
        )

        if recs:
            rec_by_listing_id = {str(r.listing_id): r for r in recs}
            data["results"] = _serialize_ai_results(
                [r.listing for r in recs],
                data["filters"],
                request=request,
                rec_by_listing_id=rec_by_listing_id,
            )
        elif session.result_listing_ids:
            # Fallback: when recommendations were not persisted, render top listings from session ids.
            id_list = list(session.result_listing_ids)[:6]
            qs = (
                Listing.objects.filter(
                    pk__in=id_list,
                    status=Listing.Status.APPROVED,
                )
                .select_related("location")
                .prefetch_related("images")
            )
            by_id = {str(row.id): row for row in qs}
            ordered_rows = [by_id[str(pk)] for pk in id_list if str(pk) in by_id]
            data["results"] = _serialize_ai_results(ordered_rows, data["filters"], request=request)

    # Nie pokazuj starych wyników w trakcie przetwarzania follow-up (pending/processing),
    # bo użytkownik oczekuje nowych ofert pod nowe kryteria.
    if (
        not data["results"]
        and session.result_listing_ids
        and session.status == AiTravelSession.Status.COMPLETE
    ):
        id_list = list(session.result_listing_ids)[:6]
        qs = (
            Listing.objects.filter(pk__in=id_list, status=Listing.Status.APPROVED)
            .select_related("location")
            .prefetch_related("images")
        )
        by_id = {str(row.id): row for row in qs}
        ordered_rows = [by_id[str(pk)] for pk in id_list if str(pk) in by_id]
        data["results"] = _serialize_ai_results(ordered_rows, data.get("filters"), request=request)

    if not data["latest_response"]:
        for msg in reversed(data["messages"]):
            if msg.get("role") == "assistant" and msg.get("text"):
                data["latest_response"] = msg["text"]
                break

    if session.status == AiTravelSession.Status.COMPLETE and not data["latest_response"]:
        data["latest_response"] = "✨ Przygotowałem dopasowane propozycje na podstawie Twojego zapytania."

    # Backward-compat alias for older UI clients.
    data["assistant_reply"] = data["latest_response"]

    return data


class AiSearchViewSet(ViewSet):
    permission_classes = [IsAuthenticated]

    def get_throttles(self):
        if getattr(self, "action", None) == "create":
            return [AISearchThrottle()]
        return []

    @extend_schema(
        summary="AI search — start",
        request=AiSearchCreateSerializer,
        responses={202: dict},
    )
    def create(self, request):
        ser = AiSearchCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        prompt = ser.validated_data["prompt"]
        session_id = ser.validated_data["session_id"] if "session_id" in ser.validated_data else None
        AISearchService._require_api_key()
        async_enabled = bool(
            getattr(settings, "AI_SEARCH_ASYNC_ENABLED", not bool(getattr(settings, "DEBUG", False)))
        )
        if async_enabled:
            session = AISearchService.queue_async(
                request.user,
                prompt,
                session_id,
            )
        else:
            session = AISearchService.run_sync(
                request.user,
                prompt,
                session_id,
            )
        session.refresh_from_db()
        return Response(
            {"data": _session_payload(session, request), "meta": {}},
            status=202 if async_enabled else 201,
        )

    @extend_schema(summary="AI search — wynik sesji")
    def retrieve(self, request, pk=None):
        session = get_object_or_404(
            AiTravelSession.objects.filter(user=request.user),
            pk=pk,
        )
        return Response({"data": _session_payload(session, request), "meta": {}})


class AiSessionHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sessions = (
            AiTravelSession.objects.filter(
                user=request.user,
                status=AiTravelSession.Status.COMPLETE,
            )
            .order_by("-created_at")[:20]
        )
        result = []
        for session in sessions:
            prompt = session.prompts.order_by("-created_at").first()
            interp = None
            if prompt:
                interp = AiFilterInterpretation.objects.filter(prompt=prompt).first()
            prompt_text = (prompt.raw_text[:200] if prompt and prompt.raw_text else "") or ""
            summary = (interp.summary_pl[:300] if interp and interp.summary_pl else "") or ""
            result.append(
                {
                    "session_id": str(session.id),
                    "prompt": prompt_text,
                    "summary_pl": summary,
                    "result_count": int(session.result_total_count or 0),
                    "created_at": session.created_at.isoformat(),
                }
            )
        return Response({"results": result})
