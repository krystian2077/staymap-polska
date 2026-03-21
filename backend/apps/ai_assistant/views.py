from __future__ import annotations

from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.viewsets import ViewSet

from apps.ai_assistant.models import AiFilterInterpretation, AiRecommendation, AiTravelSession
from apps.ai_assistant.serializers import AiSearchCreateSerializer
from apps.ai_assistant.services import AISearchService


class AISearchUserThrottle(UserRateThrottle):
    scope = "ai_search"


def _session_payload(session: AiTravelSession) -> dict:
    prompt = session.prompts.order_by("-created_at").first()
    interp = (
        AiFilterInterpretation.objects.filter(prompt=prompt).first()
        if prompt
        else None
    )
    expired = timezone.now() > session.expires_at
    data = {
        "id": str(session.id),
        "status": session.status,
        "expires_at": session.expires_at.isoformat(),
        "is_expired": expired,
        "model_used": session.model_used,
        "total_tokens_used": session.total_tokens_used,
        "total_cost_usd": str(session.total_cost_usd),
        "error_message": session.error_message or None,
        "prompt": prompt.raw_text if prompt else None,
        "interpretation": None,
        "listing_ids": session.result_listing_ids or [],
        "result_total_count": session.result_total_count,
    }
    if interp:
        data["interpretation"] = {
            "summary_pl": interp.summary_pl or None,
            "normalized_params": interp.normalized_params or {},
        }
        recs = (
            AiRecommendation.objects.filter(interpretation=interp)
            .select_related("listing")
            .order_by("rank", "id")[:24]
        )
        data["recommendations"] = [
            {
                "listing_id": str(r.listing_id),
                "slug": r.listing.slug,
                "title": r.listing.title,
                "rank": r.rank,
            }
            for r in recs
        ]
    else:
        data["recommendations"] = []
    return data


class AiSearchViewSet(ViewSet):
    permission_classes = [IsAuthenticated]

    def get_throttles(self):
        if getattr(self, "action", None) == "create":
            return [AISearchUserThrottle()]
        return super().get_throttles()

    @extend_schema(
        summary="AI search — start",
        request=AiSearchCreateSerializer,
        responses={201: dict},
    )
    def create(self, request):
        ser = AiSearchCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        prompt = ser.validated_data["prompt"]
        session = AISearchService.run_sync(request.user, prompt)
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
        return Response({"data": _session_payload(session), "meta": {}})
