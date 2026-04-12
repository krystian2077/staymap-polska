from __future__ import annotations

import json
import logging
import re
from difflib import SequenceMatcher
from decimal import Decimal
from typing import Any, Optional
from uuid import UUID

from django.conf import settings
from django.db import models, transaction
from django.utils import timezone
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

SYSTEM_PROMPT = """Jesteś eksperckim asystentem wyszukiwania w StayMap Polska, platformie oferującej wyjątkowe noclegi blisko natury w Polsce (domki, glampingi, pensjonaty).
Twoim zadaniem jest profesjonalna interpretacja zapytań użytkowników i przekształcenie ich w parametry wyszukiwania.

Zasady interpretacji:
1. Lokalizacja: Rozpoznaj polskie miasta, regiony (Mazury, Podlasie, Tatry, Bieszczady) oraz krainy geograficzne.
2. Charakter wyjazdu (travel_mode):
   - 'romantic': dla par, rocznice, randki, wyjazd we dwoje.
   - 'family': z dziećmi, place zabaw, bezpieczne dla dzieci, duże rodziny.
   - 'pet': wyjazd z psem/kotem, "z pupilem".
   - 'workation': szybki internet, biurko, praca zdalna, spokój do pracy.
   - 'slow': spokój, cisza, joga, las, ucieczka od zgiełku.
   - 'outdoor': kajaki, rowery, wędrówki, aktywnie.
   - 'lake': nad jeziorem, blisko wody.
   - 'mountains': w górach, widok na góry.
   - 'wellness': sauna, bania, spa, jacuzzi, basen.
3. Budżet: min_price i max_price (w PLN). Jeśli użytkownik mówi "tanie", ustaw ordering: "price_asc".
4. Terminy: date_from, date_to (format ISO). Dzisiaj jest 2026-04-12.
5. Goście: liczba osób (guests).
6. Atrybuty dodatkowe (boolean): sauna, near_mountains, near_lake, near_forest.
7. Cisza: quiet_score_min (0-10) - jeśli użytkownik szuka spokoju/ciszy (np. "cisza" -> 8, "bardzo cicho" -> 10).

Zwróć WYŁĄCZNIE obiekt JSON wg schematu:
{
  "location": string | null,
  "latitude": float | null,
  "longitude": float | null,
  "radius_km": float | null,
  "guests": int | null,
  "travel_mode": "romantic"|"family"|"pet"|"workation"|"slow"|"outdoor"|"lake"|"mountains"|"wellness" | null,
  "sauna": boolean | null,
  "near_mountains": boolean | null,
  "near_lake": boolean | null,
  "near_forest": boolean | null,
  "quiet_score_min": int | null,
  "min_price": float | null,
  "max_price": float | null,
  "date_from": "YYYY-MM-DD" | null,
  "date_to": "YYYY-MM-DD" | null,
  "booking_mode": "instant"|"request" | null,
  "ordering": "recommended"|"price_asc"|"price_desc"|"newest",
  "summary_pl": "Profesjonalne podsumowanie po polsku (np. 'Szukam dla Ciebie idealnych domków na Mazurach z sauną...')"
}

Przykłady:
U: "Szukam taniego domku dla 4 osób na Mazurach w sierpniu"
AI: {"location": "Mazury", "guests": 4, "date_from": "2026-08-01", "date_to": "2026-08-08", "ordering": "price_asc", "summary_pl": "Znalazłem najtańsze domki na Mazurach dla 4 osób w sierpniu."}

U: "Gdzie pojadę z psem w góry, żeby było cicho?"
AI: {"location": "góry", "travel_mode": "pet", "near_mountains": true, "quiet_score_min": 8, "ordering": "recommended", "summary_pl": "Przygotowałem listę cichych miejsc w górach, gdzie Twój pupil będzie mile widziany."}

Bądź precyzyjny. Nie dodawaj komentarzy poza JSONem."""

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


def _format_premium_summary(raw_summary: str, params: dict[str, Any]) -> str:
    """
    Formatuje podsumowanie AI na premium look z emojis i strukturą.
    Wejście: surowy tekst z LLM
    Wyjście: sformatowany premium tekst z emojis
    """
    if not raw_summary:
        return "✨ Przygotowałem dla Ciebie dopasowane propozycje noclegów."

    # Dodaj emoji na początek jeśli go brakuje
    emoji_map = {
        "románt": "💑",
        "rodzin": "👨‍👩‍👧",
        "pies": "🐕",
        "wellness": "🧖",
        "workation": "💻",
        "gór": "🏔️",
        "jezioro": "🌊",
        "morz": "🏖️",
        "las": "🌲",
        "sauną": "🔥",
        "jacuzzi": "🛁",
        "pokój": "🛏️",
        "luksus": "✨",
        "tani": "💰",
        "nowe": "🆕",
    }

    summary = raw_summary
    # Szukaj klucza by dodać odpowiedni emoji
    for key, emoji in emoji_map.items():
        if key.lower() in summary.lower() and not summary.startswith(emoji):
            summary = f"{emoji} {summary}"
            break
    else:
        # Jeśli nie znaleźliśmy pasującego emoji, dodaj ogólny
        if not summary.startswith(("✨", "💑", "🐕", "🧖", "💻", "🏔️", "🌊")):
            summary = f"✨ {summary}"

    # Dodaj informacje o liczbie wyników na koniec
    if "travel_mode" in params:
        summary += f"\n📍 Szukam opcji idealnych dla Ciebie — czekaj na wyniki!"

    return summary


class AISearchService:
    @staticmethod
    def _build_domain_dictionary() -> dict[str, Any]:
        approved_qs = Listing.objects.filter(status=Listing.Status.APPROVED)
        regions = [r for r in approved_qs.values_list("location__region", flat=True).exclude(location__region="")[:200] if r]
        cities = [c for c in approved_qs.values_list("location__city", flat=True).exclude(location__city="")[:200] if c]

        listing_types: list[str] = []
        for lt in approved_qs.values_list("listing_type", flat=True)[:200]:
            if isinstance(lt, dict):
                name = str(lt.get("name") or "").strip()
                slug = str(lt.get("slug") or "").strip()
                if name:
                    listing_types.append(name)
                if slug:
                    listing_types.append(slug)

        return {
            "regions": sorted(set(regions))[:80],
            "cities": sorted(set(cities))[:120],
            "listing_types": sorted(set(listing_types))[:80],
        }

    @staticmethod
    def _best_fuzzy_match(text: str, candidates: list[str], min_score: float = 0.78) -> Optional[str]:
        probe = (text or "").strip().lower()
        if not probe:
            return None
        best: Optional[str] = None
        best_score = min_score
        for candidate in candidates:
            cand = (candidate or "").strip()
            if not cand:
                continue
            score = SequenceMatcher(None, probe, cand.lower()).ratio()
            if score >= best_score:
                best = cand
                best_score = score
        return best

    @staticmethod
    def _require_api_key() -> None:
        key = getattr(settings, "OPENAI_API_KEY", None)
        if not key:
            raise AIServiceError("Brak skonfigurowanego klucza API modelu (OPENAI_API_KEY).")

    @staticmethod
    def _client() -> OpenAI:
        AISearchService._require_api_key()
        key = getattr(settings, "OPENAI_API_KEY", None) or ""
        base = (getattr(settings, "OPENAI_BASE_URL", None) or "").strip()
        kwargs: dict[str, Any] = {"api_key": key}
        if base:
            kwargs["base_url"] = base
        return OpenAI(**kwargs)

    @staticmethod
    def _call_llm(prompt: str) -> tuple[dict[str, Any], int, Decimal]:
        model = getattr(settings, "OPENAI_MODEL_CHEAP", "") or getattr(
            settings,
            "OPENAI_MODEL",
            "gpt-4o-mini",
        )
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
        except Exception as e:
            if hasattr(e, "status_code") and getattr(e, "status_code") == 429:
                logger.warning("OpenAI Rate Limit (429) hit: %s", e)
                raise AIServiceError("Przekroczono limit zapytań u dostawcy AI (OpenAI). Spróbuj ponownie za minutę.") from None
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

    @staticmethod
    def _build_contextual_prompt(
        session: AiTravelSession,
        current_prompt: str,
        current_prompt_id,
    ) -> str:
        # Krótki snapshot danych projektu pomaga modelowi lepiej dopasować parametry do realnej oferty.
        approved_qs = Listing.objects.filter(status=Listing.Status.APPROVED)
        agg = approved_qs.aggregate(min_price=models.Min("base_price"), max_price=models.Max("base_price"))
        top_regions = list(
            approved_qs.values_list("location__region", flat=True)
            .exclude(location__region="")
            .order_by("location__region")[:12]
        )
        domain = AISearchService._build_domain_dictionary()

        prev_prompts = (
            AiTravelPrompt.objects.filter(session=session)
            .exclude(pk=current_prompt_id)
            .order_by("-created_at")[:6]
        )

        lines = [
            "Kontekst poprzednich wiadomości użytkownika (najpierw najnowsza):",
            (
                "Kontekst danych platformy: "
                f"oferty_approved={approved_qs.count()}, "
                f"zakres_cen={agg.get('min_price')}..{agg.get('max_price')} PLN, "
                f"regiony_przykladowe={', '.join([r for r in top_regions if r][:8]) or 'brak danych'}"
            ),
            (
                "Słownik domenowy projektu: "
                f"regiony={', '.join(domain.get('regions', [])[:12]) or 'brak'}, "
                f"miasta={', '.join(domain.get('cities', [])[:12]) or 'brak'}, "
                f"typy_ofert={', '.join(domain.get('listing_types', [])[:8]) or 'brak'}"
            ),
        ]
        if not prev_prompts:
            lines.append("Brak wcześniejszych wiadomości w tej sesji.")
        for i, p in enumerate(prev_prompts, start=1):
            lines.append(f"{i}. U: {p.raw_text[:300]}")
            interp = AiFilterInterpretation.objects.filter(prompt=p).first()
            if interp and isinstance(interp.normalized_params, dict) and interp.normalized_params:
                lines.append(
                    f"   A: {interp.summary_pl[:300] if interp.summary_pl else json.dumps(interp.normalized_params, ensure_ascii=False)}"
                )

        lines.append("Nowa wiadomość użytkownika:")
        lines.append(current_prompt)
        lines.append(
            "Zinterpretuj nową wiadomość, uwzględniając kontekst i preferencje z historii."
        )
        return "\n".join(lines)

    @staticmethod
    def _extract_price_value(raw: Optional[str]) -> Optional[float]:
        if not raw:
            return None
        cleaned = re.sub(r"[^\d]", "", raw)
        if not cleaned:
            return None
        try:
            return float(cleaned)
        except (TypeError, ValueError):
            return None

    @classmethod
    def _rule_based_hints(cls, text: str) -> dict[str, Any]:
        """Deterministyczne podpowiedzi dla potocznych i niepełnych zapytań."""
        src = (text or "").strip().lower()
        compact = re.sub(r"\s+", " ", src)
        hints: dict[str, Any] = {}

        cheap_tokens = ("tanio", "najtans", "najtań", "budzet", "budżet")
        if any(tok in compact for tok in cheap_tokens):
            hints["ordering"] = "price_asc"

        if any(tok in compact for tok in ("luksus", "premium", "drogo", "najdroz", "najdroż")):
            hints.setdefault("ordering", "price_desc")

        m_range = re.search(r"(\d[\d\s]*)\s*[-–]\s*(\d[\d\s]*)\s*(?:zl|zł|pln)?", compact)
        if m_range:
            p1 = cls._extract_price_value(m_range.group(1))
            p2 = cls._extract_price_value(m_range.group(2))
            if p1 is not None and p2 is not None:
                hints["min_price"] = min(p1, p2)
                hints["max_price"] = max(p1, p2)

        m_max = re.search(r"(?:do|maks|max|ponizej|poniżej)\s*(\d[\d\s]*)\s*(?:zl|zł|pln)?", compact)
        if m_max:
            max_price = cls._extract_price_value(m_max.group(1))
            if max_price is not None:
                hints["max_price"] = max_price

        m_min = re.search(r"(?:od|min|minimum)\s*(\d[\d\s]*)\s*(?:zl|zł|pln)?", compact)
        if m_min:
            min_price = cls._extract_price_value(m_min.group(1))
            if min_price is not None:
                hints["min_price"] = min_price

        m_guests = re.search(r"(\d{1,2})\s*(?:osob|osoby|osoba|gości|gosci)", compact)
        if m_guests:
            hints["guests"] = int(m_guests.group(1))
        elif any(tok in compact for tok in ("dla pary", "we dwoje", "dla dwojga")):
            hints["guests"] = 2

        if any(tok in compact for tok in ("cisza", "cicho", "spokoj")):
            hints["quiet_score_min"] = 10 if "bardzo" in compact else 8

        if re.search(r"bez\s+saun", compact):
            hints["sauna"] = False
        elif "saun" in compact:
            hints["sauna"] = True

        location_tokens = {
            "gor": "Tatry",
            "gór": "Tatry",
            "tatry": "Tatry",
            "bieszcz": "Bieszczady",
            "mazur": "Mazury",
            "podlasi": "Podlasie",
            "baltyk": "Bałtyk",
            "bałtyk": "Bałtyk",
        }
        for token, canonical in location_tokens.items():
            if token in compact:
                hints.setdefault("location", canonical)
                break

        if "location" not in hints:
            try:
                domain = cls._build_domain_dictionary()
            except Exception:
                domain = {"regions": [], "cities": []}
            words = re.findall(r"[a-ząćęłńóśźż]{3,}", compact)
            phrases = words[:]
            phrases.extend([f"{words[i]} {words[i + 1]}" for i in range(len(words) - 1)])
            region_hit = None
            city_hit = None
            for probe in phrases[:24]:
                if not region_hit:
                    region_hit = cls._best_fuzzy_match(probe, domain.get("regions", []), min_score=0.82)
                if not city_hit:
                    city_hit = cls._best_fuzzy_match(probe, domain.get("cities", []), min_score=0.84)
                if region_hit or city_hit:
                    break
            if city_hit:
                hints["location"] = city_hit
            elif region_hit:
                hints["location"] = region_hit

        if any(tok in compact for tok in ("gor", "gór", "tatry", "bieszcz")):
            hints["near_mountains"] = True
        if any(tok in compact for tok in ("jezior", "mazur")):
            hints["near_lake"] = True
        if any(tok in compact for tok in ("las", "puszcz", "bor")):
            hints["near_forest"] = True

        mode_tokens = {
            "romantic": ("romant", "randk", "rocznic", "we dwoje"),
            "family": ("rodzin", "dziec", "dzieci"),
            "pet": ("pies", "psem", "kot", "pupil", "zwierzak"),
            "workation": ("workation", "zdaln", "internet", "wifi", "wi-fi"),
            "slow": ("slow", "spokoj", "cisza", "reset", "relaks"),
            "outdoor": ("kajak", "rower", "wędr", "wedr", "trek", "szlak"),
            "lake": ("jezior", "mazur"),
            "mountains": ("gór", "gor", "tatry", "bieszcz"),
            "wellness": ("saun", "spa", "jacuzzi", "bania"),
        }
        for mode, tokens in mode_tokens.items():
            if any(tok in compact for tok in tokens):
                hints.setdefault("travel_mode", mode)
                break

        return hints

    @classmethod
    def _merge_llm_with_hints(cls, llm_payload: dict[str, Any], text: str) -> dict[str, Any]:
        merged = dict(llm_payload or {})
        hints = cls._rule_based_hints(text)
        for key, value in hints.items():
            current = merged.get(key)
            if key == "ordering" and value == "price_asc":
                merged[key] = value
                continue
            if current in (None, ""):
                merged[key] = value

        min_p = merged.get("min_price")
        max_p = merged.get("max_price")
        try:
            if min_p is not None and max_p is not None and float(min_p) > float(max_p):
                merged["min_price"], merged["max_price"] = max_p, min_p
        except (TypeError, ValueError):
            pass
        return merged

    @staticmethod
    def _mark_session_failed(
        session_pk,
        model_name: str,
        tokens: int,
        cost_part: Decimal,
        message: str,
    ) -> None:
        with transaction.atomic():
            s = AiTravelSession.objects.select_for_update().get(pk=session_pk)
            s.status = AiTravelSession.Status.FAILED
            s.error_message = message
            s.model_used = model_name[:80]
            s.total_tokens_used = int(s.total_tokens_used or 0) + int(tokens or 0)
            s.total_cost_usd = (s.total_cost_usd or Decimal("0")) + (cost_part or Decimal("0"))
            s.save()

    @staticmethod
    def _relaxation_candidates(params: dict[str, Any]) -> list[tuple[str, dict[str, Any]]]:
        """Kolejne próby wyszukiwania: od ścisłych filtrów po bezpieczny fallback globalny."""
        base = dict(params)
        out: list[tuple[str, dict[str, Any]]] = [("strict", base)]

        no_budget = dict(base)
        no_budget.pop("min_price", None)
        no_budget.pop("max_price", None)
        out.append(("no_budget", no_budget))

        soft_prefs = dict(no_budget)
        for key in (
            "quiet_score_min",
            "sauna",
            "near_mountains",
            "near_lake",
            "near_forest",
            "travel_mode",
        ):
            soft_prefs.pop(key, None)
        out.append(("soft_preferences", soft_prefs))

        wide_radius = dict(soft_prefs)
        if wide_radius.get("latitude") is not None and wide_radius.get("longitude") is not None:
            wide_radius["radius_km"] = max(float(wide_radius.get("radius_km") or 0), 120.0)
        out.append(("wide_radius", wide_radius))

        out.append(("global_fallback", {}))
        return out

    @classmethod
    def _ordered_ids_with_fallback(cls, params: dict[str, Any]) -> tuple[list[Any], str]:
        for level, candidate in cls._relaxation_candidates(params):
            ids = SearchOrchestrator.get_ordered_ids(candidate)
            if ids:
                return ids, level

        # Ostateczny fallback: jeśli orchestrator nic nie zwrócił, pokaż najlepsze globalne oferty.
        backup_ids = list(
            Listing.objects.filter(status=Listing.Status.APPROVED)
            .order_by("-average_rating", "-review_count", "-created_at")
            .values_list("id", flat=True)[:120]
        )
        return backup_ids, "global_catalog"

    @classmethod
    def _process_prompt(cls, session: AiTravelSession, prompt_row: AiTravelPrompt, text: str) -> AiTravelSession:
        model_name = getattr(settings, "OPENAI_MODEL_CHEAP", "") or getattr(
            settings,
            "OPENAI_MODEL",
            "gpt-4o-mini",
        )
        search_params: dict[str, Any] = {}

        llm_prompt = cls._build_contextual_prompt(session, text, prompt_row.pk)

        try:
            llm_payload, tokens, cost_part = cls._call_llm(llm_prompt)
        except AIServiceError as e:
            msg = e.detail if isinstance(e.detail, str) else str(e.detail)
            cls._mark_session_failed(session.pk, model_name, 0, Decimal("0"), msg)
            session.refresh_from_db()
            return session

        llm_payload = cls._merge_llm_with_hints(llm_payload, text)
        filter_part = {k: v for k, v in llm_payload.items() if k != "summary_pl"}
        _parsed = normalized_search_params_from_llm(filter_part)
        search_params = _parsed[0]
        errs = _parsed[1]

        summary_pl = ""
        if isinstance(llm_payload.get("summary_pl"), str):
            raw_summary = llm_payload["summary_pl"].strip()[:2000]
            summary_pl = _format_premium_summary(raw_summary, search_params)
        if errs:
            msg = "; ".join(errs)
            cls._mark_session_failed(session.pk, model_name, int(tokens or 0), cost_part or Decimal("0"), msg)
            session.refresh_from_db()
            return session

        search_params = _geocode_if_needed(search_params)
        relax_level = "strict"
        try:
            ordered_ids, relax_level = cls._ordered_ids_with_fallback(search_params)
        except Exception:
            logger.exception("SearchOrchestrator failed after AI interpret")
            cls._mark_session_failed(
                session.pk,
                model_name,
                int(tokens or 0),
                cost_part or Decimal("0"),
                "Błąd wyszukiwania po interpretacji AI.",
            )
            session.refresh_from_db()
            return session

        if relax_level != "strict":
            extra = (
                "\n✨ Rozszerzyłem część kryteriów (np. budżet lub preferencje), "
                "żeby pokazać najlepsze dostępne oferty."
            )
            summary_pl = (summary_pl or "✨ Pokazuję najlepsze dostępne opcje.") + extra

        payload_with_meta = dict(llm_payload)
        payload_with_meta["_matching_strategy"] = relax_level
        payload_with_meta["_result_count"] = len(ordered_ids)

        max_store = getattr(settings, "AI_MAX_LISTING_IDS_PER_SESSION", 500)
        id_strings = [str(u) for u in ordered_ids[:max_store]]
        total = len(ordered_ids)

        safe_params = json_safe_normalized_params(search_params)

        with transaction.atomic():
            s = AiTravelSession.objects.select_for_update().get(pk=session.pk)
            s.status = AiTravelSession.Status.COMPLETE
            s.model_used = model_name[:80]
            s.total_tokens_used = int(s.total_tokens_used or 0) + int(tokens or 0)
            s.total_cost_usd = (s.total_cost_usd or Decimal("0")) + (cost_part or Decimal("0"))
            s.result_listing_ids = id_strings
            s.result_total_count = total
            s.error_message = ""
            s.save()

            interp = AiFilterInterpretation.objects.create(
                prompt=prompt_row,
                raw_llm_json=payload_with_meta,
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

    @classmethod
    def _prepare_session_and_prompt(
        cls,
        user,
        text: str,
        session_id=None,
        *,
        initial_status: str,
    ) -> tuple[AiTravelSession, AiTravelPrompt]:
        with transaction.atomic():
            if session_id:
                session = (
                    AiTravelSession.objects.select_for_update()
                    .filter(pk=session_id, user=user)
                    .first()
                )
                if not session:
                    raise DRFValidationError("Nie znaleziono wskazanej sesji AI.")
                if timezone.now() > session.expires_at:
                    raise DRFValidationError("Sesja AI wygasła. Rozpocznij nowe wyszukiwanie.")
                session.status = initial_status
                session.error_message = ""
                session.save(update_fields=["status", "error_message", "updated_at"])
            else:
                session = AiTravelSession.objects.create(
                    user=user,
                    status=initial_status,
                )
            prompt_row = AiTravelPrompt.objects.create(session=session, raw_text=text)
        return session, prompt_row

    @classmethod
    def process_existing_prompt(cls, session_id, prompt_id) -> AiTravelSession:
        prompt_row = (
            AiTravelPrompt.objects.select_related("session")
            .filter(pk=prompt_id, session_id=session_id)
            .first()
        )
        if not prompt_row:
            raise DRFValidationError("Nie znaleziono wskazanego promptu AI.")

        session = prompt_row.session
        if timezone.now() > session.expires_at:
            raise DRFValidationError("Sesja AI wygasła. Rozpocznij nowe wyszukiwanie.")

        existing_interp = AiFilterInterpretation.objects.filter(prompt=prompt_row).first()
        if existing_interp:
            session.refresh_from_db()
            return session

        with transaction.atomic():
            s = AiTravelSession.objects.select_for_update().get(pk=session.pk)
            s.status = AiTravelSession.Status.PROCESSING
            s.error_message = ""
            s.save(update_fields=["status", "error_message", "updated_at"])

        session.refresh_from_db()
        return cls._process_prompt(session, prompt_row, prompt_row.raw_text)

    @classmethod
    def queue_async(cls, user, raw_prompt: str, session_id=None) -> AiTravelSession:
        text = (raw_prompt or "").strip()
        if not text:
            raise DRFValidationError("Pole prompt nie może być puste.")
        if len(text) > _MAX_PROMPT_LEN:
            raise DRFValidationError(f"Prompt jest za długi (max {_MAX_PROMPT_LEN} znaków).")

        cls._require_api_key()

        session, prompt_row = cls._prepare_session_and_prompt(
            user,
            text,
            session_id=session_id,
            initial_status=AiTravelSession.Status.PENDING,
        )

        from apps.ai_assistant.tasks import process_ai_search

        transaction.on_commit(
            lambda: process_ai_search.delay(str(session.pk), str(prompt_row.pk))
        )
        return session

    @classmethod
    def run_sync(cls, user, raw_prompt: str, session_id=None) -> AiTravelSession:
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
        session, prompt_row = cls._prepare_session_and_prompt(
            user,
            text,
            session_id=session_id,
            initial_status=AiTravelSession.Status.PROCESSING,
        )
        return cls._process_prompt(session, prompt_row, text)

