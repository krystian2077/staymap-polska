from __future__ import annotations

import json
import logging
import re
from decimal import Decimal
from typing import Any
from uuid import UUID

from django.conf import settings
from django.db import transaction
from openai import OpenAI

from apps.ai_assistant.interpretation import (
    json_safe_normalized_params,
    normalized_search_params_from_llm,
)
from apps.ai_assistant.models import (
    AiFilterInterpretation,
    AiRecommendation,
    AiTravelPrompt,
    AiTravelSession,
)
from apps.listings.models import Listing
from rest_framework.exceptions import ValidationError as DRFValidationError

from apps.common.exceptions import AIServiceError
from apps.search.nominatim import geocode_poland
from apps.search.services import SearchOrchestrator

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Jesteś asystentem wyszukiwania noclegów w Polsce (StayMap).
Na podstawie zapytania użytkownika zwróć WYŁĄCZNIE jeden obiekt JSON (bez markdown), klucze:
- location: string lub null (miasto/region, np. "Zakopane", "Mazury")
- latitude, longitude: liczby lub null (tylko jeśli użytkownik podaje współrzędne)
- radius_km: liczba lub null (1-500, domyślnie null — backend użyje sensownego promienia przy geokodowaniu)
- guests: liczba całkowita lub null
- travel_mode: jeden z: romantic, family, pet, workation, slow, outdoor, lake, mountains, wellness — lub null
- min_price, max_price: liczby (PLN) lub null
- date_from, date_to: string ISO YYYY-MM-DD lub null
- booking_mode: "instant", "request" lub null
- ordering: "recommended", "price_asc", "price_desc", "newest" (domyślnie recommended)
- summary_pl: krótkie (1-2 zdania) podsumowanie filtrów po polsku

Nie dodawaj innych kluczy. Jeśli czegoś nie wiesz, użyj null."""

_MAX_PROMPT_LEN = 4000


def _strip_json_fence(text: str) -> str:
    s = text.strip()
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*", "", s, flags=re.IGNORECASE)
        s = re.sub(r"\s*```\s*$", "", s)
    return s.strip()


def _parse_llm_json(content: str) -> dict[str, Any]:
    raw = _strip_json_fence(content)
    data = json.loads(raw)
    if not isinstance(data, dict):
        raise ValueError("Odpowiedź modelu nie jest obiektem JSON")
    return data


def _geocode_if_needed(params: dict[str, Any]) -> dict[str, Any]:
    out = dict(params)
    if out.get("location") and (
        out.get("latitude") is None or out.get("longitude") is None
    ):
        hit = geocode_poland(out["location"])
        if hit:
            out["latitude"] = hit["lat"]
            out["longitude"] = hit["lng"]
    if out.get("latitude") is not None and out.get("longitude") is not None:
        out.setdefault("radius_km", 50.0)
    return out


def _usage_tokens(usage: Any) -> int:
    if usage is None:
        return 0
    pt = getattr(usage, "prompt_tokens", None) or 0
    ct = getattr(usage, "completion_tokens", None) or 0
    try:
        return int(pt) + int(ct)
    except (TypeError, ValueError):
        return 0


def _usage_cost_usd(usage: Any) -> Decimal:
    """OpenAI zwraca usage; Groq często 0 — zostawiamy 0."""
    if usage is None:
        return Decimal("0")
    # Opcjonalnie: szczegóły billing w przyszłości
    return Decimal("0")


class AISearchService:
    @staticmethod
    def _require_api_key() -> None:
        key = (getattr(settings, "OPENAI_API_KEY", "") or "").strip()
        if not key:
            raise AIServiceError("Brak skonfigurowanego klucza API modelu (OPENAI_API_KEY).")

    @staticmethod
    def _client() -> OpenAI:
        AISearchService._require_api_key()
        key = (getattr(settings, "OPENAI_API_KEY", "") or "").strip()
        base = (getattr(settings, "OPENAI_BASE_URL", None) or "").strip()
        kwargs: dict[str, Any] = {"api_key": key}
        if base:
            kwargs["base_url"] = base
        return OpenAI(**kwargs)

    @staticmethod
    def _call_llm(prompt: str) -> tuple[dict[str, Any], int, Decimal]:
        model = getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")
        max_tokens = getattr(settings, "OPENAI_MAX_TOKENS", 800)
        client = AISearchService._client()
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=max_tokens,
                temperature=0.2,
                response_format={"type": "json_object"},
            )
        except Exception:
            logger.exception("LLM chat.completions failed")
            raise AIServiceError("Usługa modelu językowego jest chwilowo niedostępna.") from None

        choice = resp.choices[0] if resp.choices else None
        if not choice or not choice.message or not choice.message.content:
            raise AIServiceError("Pusta odpowiedź modelu językowego.")

        content = choice.message.content
        try:
            parsed = _parse_llm_json(content)
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning("LLM JSON parse error: %s", e)
            raise AIServiceError("Nie udało się zinterpretować odpowiedzi AI.") from e

        tokens = _usage_tokens(getattr(resp, "usage", None))
        cost = _usage_cost_usd(getattr(resp, "usage", None))
        return parsed, tokens, cost

    @classmethod
    def run_sync(cls, user, raw_prompt: str) -> AiTravelSession:
        """
        Tworzy sesję, woła LLM, uruchamia SearchOrchestrator, zapisuje wyniki.
        Wywołanie synchroniczne (bez kolejki) — wystarczy na dev i małe obciążenie.
        """
        text = (raw_prompt or "").strip()
        if not text:
            raise DRFValidationError("Pole prompt nie może być puste.")
        if len(text) > _MAX_PROMPT_LEN:
            raise DRFValidationError(f"Prompt jest za długi (max {_MAX_PROMPT_LEN} znaków).")

        cls._require_api_key()

        with transaction.atomic():
            session = AiTravelSession.objects.create(
                user=user,
                status=AiTravelSession.Status.PROCESSING,
            )
            prompt_row = AiTravelPrompt.objects.create(session=session, raw_text=text)

        model_name = getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")

        try:
            llm_payload, tokens, cost_part = cls._call_llm(text)
        except AIServiceError as e:
            msg = e.detail if isinstance(e.detail, str) else str(e.detail)
            AiTravelSession.objects.filter(pk=session.pk).update(
                status=AiTravelSession.Status.FAILED,
                error_message=msg,
                model_used=model_name[:80],
            )
            session.refresh_from_db()
            return session

        summary_pl = ""
        if isinstance(llm_payload.get("summary_pl"), str):
            summary_pl = llm_payload["summary_pl"].strip()[:2000]

        filter_part = {k: v for k, v in llm_payload.items() if k != "summary_pl"}
        params, errs = normalized_search_params_from_llm(filter_part)
        if errs:
            msg = "; ".join(errs)
            with transaction.atomic():
                s = AiTravelSession.objects.select_for_update().get(pk=session.pk)
                s.status = AiTravelSession.Status.FAILED
                s.error_message = msg
                s.model_used = model_name[:80]
                s.total_tokens_used = tokens
                s.total_cost_usd = cost_part
                s.save()
            session.refresh_from_db()
            return session

        params = _geocode_if_needed(params)
        try:
            ordered_ids = SearchOrchestrator.get_ordered_ids(params)
        except Exception:
            logger.exception("SearchOrchestrator failed after AI interpret")
            with transaction.atomic():
                s = AiTravelSession.objects.select_for_update().get(pk=session.pk)
                s.status = AiTravelSession.Status.FAILED
                s.error_message = "Błąd wyszukiwania po interpretacji AI."
                s.model_used = model_name[:80]
                s.total_tokens_used = tokens
                s.total_cost_usd = cost_part
                s.save()
            session.refresh_from_db()
            return session

        max_store = getattr(settings, "AI_MAX_LISTING_IDS_PER_SESSION", 500)
        id_strings = [str(u) for u in ordered_ids[:max_store]]
        total = len(ordered_ids)

        safe_params = json_safe_normalized_params(params)

        with transaction.atomic():
            s = AiTravelSession.objects.select_for_update().get(pk=session.pk)
            s.status = AiTravelSession.Status.COMPLETE
            s.model_used = model_name[:80]
            s.total_tokens_used = tokens
            s.total_cost_usd = cost_part
            s.result_listing_ids = id_strings
            s.result_total_count = total
            s.error_message = ""
            s.save()

            interp = AiFilterInterpretation.objects.create(
                prompt=prompt_row,
                raw_llm_json=llm_payload,
                normalized_params=safe_params,
                summary_pl=summary_pl,
            )
            rec_rows: list[AiRecommendation] = []
            for rank, lid_str in enumerate(id_strings[:50]):
                try:
                    lid = UUID(str(lid_str))
                except (ValueError, TypeError):
                    continue
                if not Listing.objects.filter(
                    pk=lid, status=Listing.Status.APPROVED
                ).exists():
                    continue
                rec_rows.append(
                    AiRecommendation(
                        interpretation=interp,
                        listing_id=lid,
                        rank=rank,
                    )
                )
            if rec_rows:
                AiRecommendation.objects.bulk_create(rec_rows, ignore_conflicts=True)

        session.refresh_from_db()
        return session
