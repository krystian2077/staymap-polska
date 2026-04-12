from __future__ import annotations

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from apps.ai_assistant.models import AiFilterInterpretation, AiRecommendation, AiTravelSession
from apps.ai_assistant.serializers import AiSearchCreateSerializer
from apps.ai_assistant.services import AISearchService
from apps.common.throttles import AISearchThrottle
from apps.search.serializers import ListingSearchSerializer


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
        "conversation": [],
        "assistant_reply": "",
        "follow_up_suggestions": [],
        "created_at": session.created_at.isoformat(),
        "expires_at": session.expires_at.isoformat(),
        "tokens_used": session.total_tokens_used,
        "cost_usd": float(session.total_cost_usd),
        "model_used": session.model_used or None,
        "error_message": session.error_message or None,
        "filters": None,
        "results": [],
    }

    recent_prompts = session.prompts.order_by("-created_at")[:6]
    for p in reversed(list(recent_prompts)):
        data["conversation"].append(
            {
                "role": "user",
                "text": p.raw_text,
                "created_at": p.created_at.isoformat(),
            }
        )
        p_interp = AiFilterInterpretation.objects.filter(prompt=p).first()
        if p_interp and p_interp.summary_pl:
            data["conversation"].append(
                {
                    "role": "assistant",
                    "text": p_interp.summary_pl,
                    "created_at": p_interp.created_at.isoformat(),
                }
            )

    if interp:
        raw = interp.raw_llm_json or {}
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
        data["assistant_reply"] = interp.summary_pl or "Przygotowałem dopasowane propozycje."
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

        recs = (
            AiRecommendation.objects.filter(interpretation=interp)
            .select_related(
                "listing",
                "listing__location",
                "listing__listing_type",
            )
            .prefetch_related("listing__images")
            .order_by("rank", "id")[:24]
        )

        results = []
        for r in recs:
            # Używamy ListingSearchSerializer do podstawowych danych
            ser = ListingSearchSerializer(r.listing, context={"request": request})
            base_data = ser.data

            # Rozszerzamy o pola AIResult
            results.append({
                **base_data,
                "listing_id": str(r.listing_id),
                "match_score": 100 - (r.rank * 2),  # Heurystyka dla UI
                "match_reasons": [
                    f"Idealne dla trybu {data['filters']['travel_mode']}" if data["filters"]["travel_mode"] else "Pasuje do Twoich wymagań"
                ],
            })
        data["results"] = results

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
        responses={201: dict},
    )
    def create(self, request):
        ser = AiSearchCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        prompt = ser.validated_data["prompt"]
        session = AISearchService.run_sync(
            request.user,
            prompt,
            session_id=ser.validated_data.get("session_id"),
        )
        return Response(
            {"data": {"session_id": str(session.id), "status": session.status}},
            status=201,
        )

    @extend_schema(summary="AI search — wynik sesji")
    def retrieve(self, request, pk=None):
        session = get_object_or_404(
            AiTravelSession.objects.filter(user=request.user),
            pk=pk,
        )
        return Response({"data": _session_payload(session, request), "meta": {}})
