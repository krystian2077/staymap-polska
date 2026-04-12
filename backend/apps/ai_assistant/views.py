from __future__ import annotations

from django.conf import settings
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from apps.ai_assistant.models import AiFilterInterpretation, AiRecommendation, AiTravelSession
from apps.ai_assistant.serializers import AiSearchCreateSerializer
from apps.ai_assistant.services import AISearchService
from apps.common.throttles import AISearchThrottle
from apps.listings.models import Listing
from apps.search.serializers import ListingSearchSerializer


def _serialize_ai_results(rows, filters: dict | None, request=None) -> list[dict]:
    out: list[dict] = []
    mode = (filters or {}).get("travel_mode") if isinstance(filters, dict) else None
    for rank, listing in enumerate(rows):
        ser = ListingSearchSerializer(listing, context={"request": request})
        base_data = ser.data
        out.append(
            {
                **base_data,
                "listing_id": str(listing.id),
                "match_score": max(60, 100 - (rank * 2)),
                "match_reasons": [
                    f"Idealne dla trybu {mode}" if mode else "Pasuje do Twoich wymagań"
                ],
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
        suggestions: list[str] = []
        if data["filters"].get("travel_mode"):
            suggestions.append("Pokaż bardziej luksusowe opcje")
        if not data["filters"].get("near_lake"):
            suggestions.append("Dodaj miejsca blisko jeziora")
        if data["filters"].get("sauna"):
            suggestions.append("Tylko opcje z prywatnym jacuzzi")
        else:
            suggestions.append("Dodaj saunę lub jacuzzi")
        suggestions.append("Pokaż najtańsze warianty")
        data["follow_up_suggestions"] = suggestions[:4]

        recs = list(
            AiRecommendation.objects.filter(interpretation=interp)
            .select_related(
                "listing",
                "listing__location",
            )
            .prefetch_related("listing__images")
            .order_by("rank", "id")[:24]
        )

        if recs:
            data["results"] = _serialize_ai_results(
                [r.listing for r in recs],
                data["filters"],
                request=request,
            )
        elif session.result_listing_ids:
            # Fallback: when recommendations were not persisted, render top listings from session ids.
            id_list = list(session.result_listing_ids)[:24]
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

    # Bezpieczny fallback: nawet bez interpretacji oddaj wyniki zapisane w sesji.
    if not data["results"] and session.result_listing_ids:
        id_list = list(session.result_listing_ids)[:24]
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
        AISearchService._require_api_key()
        async_enabled = bool(
            getattr(settings, "AI_SEARCH_ASYNC_ENABLED", not bool(getattr(settings, "DEBUG", False)))
        )
        if async_enabled:
            session = AISearchService.queue_async(
                request.user,
                prompt,
                ser.validated_data.get("session_id"),
            )
        else:
            session = AISearchService.run_sync(
                request.user,
                prompt,
                ser.validated_data.get("session_id"),
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
