from __future__ import annotations

import hashlib
import json
import logging
import re
from difflib import SequenceMatcher
from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Optional
from uuid import UUID

from django.conf import settings
from django.db import models, transaction
from django.db.models import Count, Q
from django.utils import timezone
from openai import OpenAI

from apps.ai_assistant.interpretation import (
    json_safe_normalized_params,
    normalized_search_params_from_llm,
    normalized_search_params_from_llm_lenient,
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
from apps.pricing.polish_holidays import pricing_peak_day_name
from apps.pricing.seasonality_defaults import default_seasonal_multiplier
from apps.search.nominatim import geocode_poland
from apps.search.services import SearchOrchestrator

logger = logging.getLogger(__name__)

AI_RECOMMENDATION_LIMIT = 6

EXPLANATION_SYSTEM_PROMPT = """Tworzysz premium uzasadnienia dopasowania ofert dla StayMap AI.
Masz korzystać WYŁĄCZNIE z dostarczonych faktów JSON dla każdej oferty.
Nie wolno dopowiadać brakujących danych ani zgadywać.
Styl: polski, 2-3 zdania, pewny ton eksperta od podróży, konkret i elegancja (bez emoji).
Wspomnij 2-4 najmocniejsze fakty zgodne z preferencjami użytkownika.

Zwróć WYŁĄCZNIE JSON:
{
  "items": [
    {
      "listing_id": "uuid",
      "explanation": "2-3 zdania po polsku.",
      "highlights": ["fakt 1", "fakt 2", "fakt 3"]
    }
  ]
}
"""

SYSTEM_PROMPT = """Jesteś StayMap AI — inteligentnym asystentem wyszukiwania na platformie StayMap Polska z wyjątkowymi noclegami blisko natury (domki, glampingi, pensjonaty).
Twoje zadanie: jak najlepiej zrozumieć intencję gościa i przekuć ją w precyzyjne parametry wyszukiwania oraz krótkie, premium podsumowanie (summary_pl).

W sekcji „katalog” dostajesz prawdziwe statystyki i próbkę ofert z bazy — traktuj je jako orientację co jest dostępne w projekcie. Nie wymyślaj nazw obiektów ani cen; summary_pl ma brzmieć jak odpowiedź StayMap AI: konkretnie i spokojnie.

Priorytet: ostatnia wiadomość użytkownika jest źródłem prawdy. Jeśli nowa wiadomość zmienia region, budżet, liczbę osób lub styl wyjazdu względem wcześniejszej rozmowy, ZASTĄP stare kryteria nowymi — nie łącz sprzecznych intencji (np. Mazury z poprzedniego pytania nie obowiązują, gdy użytkownik teraz pisze wyłącznie o Bałtyku).

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
 4. Terminy: date_from, date_to (format ISO). Rozpoznawaj też długie weekendy w Polsce (majówka, Boże Ciało, 15 sierpnia, listopadowe mosty, Wigilia, Boże Narodzenie, Nowy Rok, Sylwester) i sezonowość cenową także poza świętami ustawowymi.
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
  "summary_pl": "1-2 zdania po polsku w tonie StayMap AI: pewnie i konkretnie względem intencji (region, klimat wyjazdu). Styl naturalny i przyjazny; możesz użyć maks. jednego emoji tylko jeśli pasuje do kontekstu. Unikaj sztampy i powtórzeń."
}

Przykłady:
U: "Szukam taniego domku dla 4 osób na Mazurach w sierpniu"
AI: {"location": "Mazury", "guests": 4, "date_from": "2026-08-01", "date_to": "2026-08-08", "ordering": "price_asc", "summary_pl": "Znalazłem najtańsze domki na Mazurach dla 4 osób w sierpniu."}

U: "Gdzie pojadę z psem w góry, żeby było cicho?"
AI: {"location": "góry", "travel_mode": "pet", "near_mountains": true, "quiet_score_min": 8, "ordering": "recommended", "summary_pl": "Przygotowałem listę cichych miejsc w górach, gdzie Twój pupil będzie mile widziany."}

Bądź precyzyjny. Stosuj tylko informacje wynikające z zapytania i kontekstu platformy. Nie dodawaj komentarzy poza JSONem."""

_MAX_PROMPT_LEN = 4000

_PL_MONTHS = {
    "stycz": 1,
    "lut": 2,
    "mar": 3,
    "kwiec": 4,
    "kwi": 4,
    "maj": 5,
    "czerw": 6,
    "lip": 7,
    "sierp": 8,
    "wrze": 9,
    "paz": 10,
    "paź": 10,
    "list": 11,
    "grud": 12,
}

_POLISH_STOPWORDS = frozenset(
    {
        "dla",
        "jest",
        "jak",
        "nie",
        "tak",
        "czy",
        "tylko",
        "bardzo",
        "sobie",
        "mnie",
        "między",
        "też",
        "albo",
        "oraz",
        "przy",
        "jako",
        "po",
        "na",
        "w",
        "z",
        "do",
        "od",
        "za",
        "że",
        "co",
        "ten",
        "ta",
        "to",
        "te",
        "się",
        "już",
        "jeszcze",
        "bardziej",
        "mniej",
        "jakie",
        "jaki",
        "jaką",
        "gdzie",
        "kiedy",
        "czemu",
        "proszę",
        "chcę",
        "chce",
        "szukam",
        "nocleg",
        "noclegi",
        "miejsce",
        "ofert",
        "oferta",
        "chciałbym",
        "chcialbym",
        "potrzebuję",
        "potrzebuje",
        "prosz",
        "tutaj",
        "tam",
        "tego",
        "tym",
        "które",
        "ktore",
        "jakaś",
        "jakas",
    }
)


def _extract_meaningful_tokens(text: str, *, max_tokens: int = 7) -> list[str]:
    s = (text or "").lower()
    raw = re.findall(r"[a-ząćęłńóśźż]{3,}", s)
    out: list[str] = []
    for w in raw:
        if w in _POLISH_STOPWORDS:
            continue
        if w not in out:
            out.append(w)
        if len(out) >= max_tokens:
            break
    return out


def _listing_text_blob(listing: Listing) -> str:
    loc = getattr(listing, "location", None)
    parts = [
        str(getattr(listing, "title", "") or ""),
        str(getattr(listing, "short_description", "") or ""),
        str(getattr(listing, "description", "") or ""),
        str(getattr(loc, "city", "") or ""),
        str(getattr(loc, "region", "") or ""),
    ]
    return " ".join(parts).lower()


def _format_listing_digest_line(listing: Listing) -> str:
    loc = getattr(listing, "location", None)
    city = getattr(loc, "city", "") if loc else ""
    region = getattr(loc, "region", "") if loc else ""
    lt = listing.listing_type if isinstance(listing.listing_type, dict) else {}
    type_name = str(lt.get("name") or "").strip() or "nocleg"
    short = (listing.short_description or "").strip()[:130]
    pet = "tak" if listing.is_pet_friendly else "nie"
    base = (
        f"{listing.title[:88]} | {type_name} | {city}, {region} | od {listing.base_price} {listing.currency} | "
        f"goście≤{listing.max_guests} | zwierzęta:{pet}"
    )
    if short:
        base += f" | {short}"
    return base


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


def _month_from_polish_text(text: str) -> Optional[int]:
    src = (text or "").strip().lower()
    for token, month_no in _PL_MONTHS.items():
        if token in src:
            return month_no
    return None


def _safe_date(y: int, m: int, d: int) -> Optional[date]:
    try:
        return date(y, m, d)
    except ValueError:
        return None


def _resolve_year_for_month_day(month_no: int, day_no: int, today: date) -> int:
    candidate = _safe_date(today.year, month_no, day_no)
    if candidate is not None and candidate >= today:
        return today.year
    return today.year + 1


def _next_weekend_range(today: date) -> tuple[date, date]:
    # Weekend: piątek -> niedziela (check-out w poniedziałek).
    wd = today.weekday()  # 0=pon ... 6=niedz
    days_until_friday = (4 - wd) % 7
    if days_until_friday == 0:
        days_until_friday = 7
    start = today + timedelta(days=days_until_friday)
    end = start + timedelta(days=3)
    return start, end


def _next_long_weekend_range(today: date, *, horizon_days: int = 240) -> tuple[date, date]:
    """Najbliższy długi weekend oparty o dzień podwyższonego popytu / święto."""
    for offset in range(horizon_days + 1):
        anchor = today + timedelta(days=offset)
        if not pricing_peak_day_name(anchor):
            continue

        wd = anchor.weekday()
        if wd == 0:
            return anchor - timedelta(days=3), anchor + timedelta(days=1)
        if wd == 1:
            return anchor - timedelta(days=2), anchor + timedelta(days=2)
        if wd == 2:
            return anchor - timedelta(days=1), anchor + timedelta(days=4)
        if wd == 3:
            return anchor, anchor + timedelta(days=4)
        if wd == 4:
            return anchor, anchor + timedelta(days=3)
        if wd == 5:
            return anchor, anchor + timedelta(days=2)
        return anchor, anchor + timedelta(days=1)

    return _next_weekend_range(today)


def _special_polish_period_hints(text: str, *, today: date) -> dict[str, Any]:
    """Deterministyczne mapowanie nazwanych polskich okresów na zakres dat."""
    src = re.sub(r"\s+", " ", (text or "").lower())
    out: dict[str, Any] = {}

    # Majówka
    if "majów" in src or "majow" in src:
        y = _resolve_year_for_month_day(5, 1, today)
        out["date_from"] = date(y, 5, 1)
        out["date_to"] = date(y, 5, 5)
        return out

    # Boże Ciało / okolice czwartku i piątku po
    if "boże cia" in src or "boze cial" in src or "boże cial" in src or "boze cia" in src:
        y = _resolve_year_for_month_day(6, 4, today)
        corpus = date(y, 6, 4)
        out["date_from"] = corpus - timedelta(days=1)
        out["date_to"] = corpus + timedelta(days=4)
        return out

    # 15 sierpnia / długi sierpniowy weekend
    if "15 sierp" in src or "sierpniow" in src or "długi weekend sierp" in src or "dlugi weekend sierp" in src:
        y = _resolve_year_for_month_day(8, 15, today)
        anchor = date(y, 8, 15)
        out["date_from"] = anchor - timedelta(days=1)
        out["date_to"] = anchor + timedelta(days=3)
        return out

    # Listopadowy most: 1 listopada / 11 listopada
    if "listopadow" in src or "1 listop" in src or "11 listop" in src or "zaduszk" in src or "niepodleg" in src:
        candidates = []
        for month, day in ((11, 1), (11, 11)):
            y = _resolve_year_for_month_day(month, day, today)
            candidates.append(date(y, month, day))
        anchor = min((d for d in candidates if d >= today), default=min(candidates))
        out["date_from"] = anchor - timedelta(days=2)
        out["date_to"] = anchor + timedelta(days=2)
        return out

    # Boże Narodzenie / Wigilia / Nowy Rok
    if "boż" in src or "boze narodz" in src or "wigili" in src or "święta" in src or "swieta" in src or "nowy rok" in src:
        y = _resolve_year_for_month_day(12, 24, today)
        out["date_from"] = date(y, 12, 24)
        out["date_to"] = date(y + 1, 1, 2)
        return out

    return out


def _extract_natural_date_hints(text: str, *, today: date) -> dict[str, Any]:
    src = (text or "").lower()
    compact = re.sub(r"\s+", " ", src)
    out: dict[str, Any] = {}

    # ISO daty wpisane bezpośrednio: od YYYY-MM-DD do YYYY-MM-DD
    m_iso = re.search(r"od\s*(\d{4}-\d{2}-\d{2})\s*(?:do|-)\s*(\d{4}-\d{2}-\d{2})", compact)
    if m_iso:
        try:
            df = date.fromisoformat(m_iso.group(1))
            dt = date.fromisoformat(m_iso.group(2))
            if dt > df:
                out["date_from"] = df
                out["date_to"] = dt
                return out
        except ValueError:
            pass

    # „od 3 do 8 czerwca”, „3-8 czerwca”
    m_range = re.search(
        r"(?:od\s*)?(\d{1,2})\s*(?:do|[-–])\s*(\d{1,2})\s+([a-ząćęłńóśźż]+)",
        compact,
    )
    if m_range:
        d1 = int(m_range.group(1))
        d2 = int(m_range.group(2))
        month_no = _month_from_polish_text(m_range.group(3))
        if month_no is not None and 1 <= d1 <= 31 and 1 <= d2 <= 31:
            y = _resolve_year_for_month_day(month_no, min(d1, d2), today)
            start = _safe_date(y, month_no, min(d1, d2))
            end_inclusive = _safe_date(y, month_no, max(d1, d2))
            if start and end_inclusive and end_inclusive >= start:
                out["date_from"] = start
                out["date_to"] = end_inclusive + timedelta(days=1)
                return out

    special = _special_polish_period_hints(compact, today=today)
    if special:
        return special

    # „majówka”
    if "majow" in compact or "majów" in compact:
        y = _resolve_year_for_month_day(5, 1, today)
        out["date_from"] = date(y, 5, 1)
        out["date_to"] = date(y, 5, 5)
        return out

    # „wakacje”
    if "wakacj" in compact:
        start_md = getattr(settings, "DEFAULT_SEASONAL_SUMMER_START", (6, 1))
        end_md = getattr(settings, "DEFAULT_SEASONAL_SUMMER_END", (9, 15))
        start_m, start_d = int(start_md[0]), int(start_md[1])
        end_m, end_d = int(end_md[0]), int(end_md[1])
        y = _resolve_year_for_month_day(start_m, start_d, today)
        start = _safe_date(y, start_m, start_d)
        end = _safe_date(y, end_m, end_d)
        if start and end:
            out["date_from"] = start
            out["date_to"] = end + timedelta(days=1)
            return out

    # „sylwester”
    if "sylwest" in compact:
        y = _resolve_year_for_month_day(12, 31, today)
        out["date_from"] = date(y, 12, 31)
        out["date_to"] = date(y + 1, 1, 2)
        return out

    # „długi weekend” bez daty
    if "długi weekend" in compact or "dlugi weekend" in compact:
        start, end = _next_long_weekend_range(today)
        out["date_from"] = start
        out["date_to"] = end
        return out

    # „weekend” bez daty
    if "weekend" in compact and "date_from" not in out and "date_to" not in out:
        start, end = _next_weekend_range(today)
        out["date_from"] = start
        out["date_to"] = end

    return out


def _seasonality_note_for_params(params: dict[str, Any]) -> Optional[str]:
    df = params.get("date_from")
    dt = params.get("date_to")
    if not isinstance(df, date) or not isinstance(dt, date) or dt <= df:
        return None

    peak_names: list[str] = []
    seasonal_days = 0
    days = 0
    cur = df
    while cur < dt and days < 45:
        peak = pricing_peak_day_name(cur)
        if peak and peak not in peak_names:
            peak_names.append(peak)
        if default_seasonal_multiplier(cur) > Decimal("1"):
            seasonal_days += 1
        cur += timedelta(days=1)
        days += 1

    if peak_names:
        top = ", ".join(peak_names[:2])
        if seasonal_days > 0:
            return (
                f"W tym terminie wypada okres podwyższonego popytu ({top}) i część dni jest w wysokim sezonie w Polsce, "
                "więc ceny mogą być wyższe."
            )
        return f"W tym terminie wypada okres podwyższonego popytu ({top}), więc ceny mogą być wyższe."
    if seasonal_days >= max(2, int(days * 0.5)):
        return "To termin wysokiego sezonu w Polsce (także poza świętami ustawowymi), więc ceny i obłożenie mogą być wyższe."
    if seasonal_days > 0:
        return "Część tego terminu wypada w sezonie podwyższonego popytu poza świętami ustawowymi, więc ceny mogą być wyższe."
    return None


def _format_premium_summary(raw_summary: str, params: dict[str, Any]) -> str:
    """
    Formatuje podsumowanie AI na premium look z emojis i strukturą.
    Wejście: surowy tekst z LLM
    Wyjście: sformatowany premium tekst z emojis
    """
    mode = str((params or {}).get("travel_mode") or "").strip().lower()

    def _prefix_emoji(src: str) -> str:
        if not getattr(settings, "AI_CHAT_EMOJI_ENABLED", True):
            return src
        try:
            rate = float(getattr(settings, "AI_CHAT_EMOJI_RATE", 0.30) or 0.0)
        except (TypeError, ValueError):
            rate = 0.0
        rate = max(0.0, min(rate, 1.0))
        if rate <= 0:
            return src
        if re.match(r"^[✨💑🏔️🌲🌊🧖🐕💻]", src):
            return src
        seed = f"{mode}\u241f{src}"
        bucket = int(hashlib.sha256(seed.encode("utf-8")).hexdigest(), 16) % 100
        if bucket >= int(rate * 100):
            return src
        by_mode = {
            "romantic": "💑",
            "family": "👨‍👩‍👧",
            "pet": "🐕",
            "workation": "💻",
            "slow": "🌲",
            "outdoor": "🥾",
            "lake": "🌊",
            "mountains": "🏔️",
            "wellness": "🧖",
        }
        return f"{by_mode.get(mode, '✨')} {src}"

    if not raw_summary:
        fallback_pool = [
            "Przygotowuję dla Ciebie najlepiej dopasowane propozycje noclegów.",
            "Sprawdzam oferty i wybieram opcje najbardziej zgodne z Twoimi kryteriami.",
            "Dobieram propozycje, które najlepiej pasują do Twojego stylu wyjazdu.",
        ]
        idx = int(hashlib.sha256((mode or "staymap").encode("utf-8")).hexdigest(), 16) % len(fallback_pool)
        return _prefix_emoji(fallback_pool[idx])

    summary = re.sub(r"\s+", " ", raw_summary).strip()
    summary = re.sub(r"^[✨💑🐕🧖💻🏔️🌊🏖️🌲🔥🛁🛏️💰🆕]\s*", "", summary)
    if not summary:
        return "Jasne, przygotowuję dla Ciebie dopasowane propozycje noclegów."

    first = summary[0].upper()
    summary = f"{first}{summary[1:]}" if len(summary) > 1 else first
    if summary[-1] not in ".!?":
        summary += "."

    return _prefix_emoji(summary)


def _score_to_text(val: Any) -> Optional[str]:
    try:
        n = float(val)
    except (TypeError, ValueError):
        return None
    return f"{n:.1f}/10"


def _safe_text_list(values: Any, *, max_items: int = 3) -> list[str]:
    if not isinstance(values, list):
        return []
    out: list[str] = []
    for item in values:
        s = str(item or "").strip()
        if not s:
            continue
        out.append(s[:80])
        if len(out) >= max_items:
            break
    return out


def _first_sentence(text: str) -> str:
    src = (text or "").strip()
    if not src:
        return ""
    parts = re.split(r"(?<=[.!?])\s+", src)
    return (parts[0] if parts else src)[:220]


def _extract_listing_facts(listing: Listing, params: dict[str, Any], rank: int) -> dict[str, Any]:
    amenities = listing.amenities if isinstance(listing.amenities, list) else []
    amenity_tokens = [str(a.get("id") or a.get("name") or "").lower() if isinstance(a, dict) else str(a).lower() for a in amenities]
    has_sauna = any(tok in {"sauna", "private_sauna"} for tok in amenity_tokens)
    has_jacuzzi = any(tok in {"jacuzzi", "hot_tub"} for tok in amenity_tokens)

    loc = getattr(listing, "location", None)
    scores = listing.destination_score_cache if isinstance(listing.destination_score_cache, dict) else {}
    travel_mode = str(params.get("travel_mode") or "").strip().lower()
    score_key = {
        "romantic": "romantic",
        "family": "family",
        "pet": "nature",
        "workation": "workation",
        "slow": "quiet",
        "outdoor": "outdoor",
        "lake": "nature",
        "mountains": "nature",
        "wellness": "wellness",
    }.get(travel_mode)

    host = getattr(listing, "host", None)
    response_rate = getattr(host, "response_rate", None)
    response_rate_pct = None
    if response_rate is not None:
        try:
            response_rate_pct = int(round(float(response_rate) * 100))
        except (TypeError, ValueError):
            response_rate_pct = None

    return {
        "listing_id": str(listing.id),
        "title": listing.title,
        "rank": rank,
        "base_price": float(listing.base_price),
        "currency": listing.currency,
        "max_guests": int(listing.max_guests or 0),
        "booking_mode": listing.booking_mode,
        "average_rating": float(listing.average_rating) if listing.average_rating is not None else None,
        "review_count": int(listing.review_count or 0),
        "is_pet_friendly": bool(listing.is_pet_friendly),
        "response_rate_pct": response_rate_pct,
        "location": {
            "city": getattr(loc, "city", "") if loc else "",
            "region": getattr(loc, "region", "") if loc else "",
            "near_lake": bool(getattr(loc, "near_lake", False)) if loc else False,
            "near_mountains": bool(getattr(loc, "near_mountains", False)) if loc else False,
            "near_forest": bool(getattr(loc, "near_forest", False)) if loc else False,
            "quiet_rural": bool(getattr(loc, "quiet_rural", False)) if loc else False,
        },
        "amenities": {
            "sauna": has_sauna,
            "jacuzzi": has_jacuzzi,
        },
        "scores": {
            "quiet": scores.get("quiet"),
            "wellness": scores.get("wellness"),
            "travel_fit": scores.get(score_key) if score_key else None,
            "travel_fit_key": score_key,
        },
    }


def _rule_based_match_explanation(facts: dict[str, Any], params: dict[str, Any]) -> tuple[str, list[str]]:
    highlights: list[str] = []
    loc = facts.get("location") or {}
    scores = facts.get("scores") or {}
    amenities = facts.get("amenities") or {}

    if params.get("quiet_score_min") is not None:
        q = _score_to_text(scores.get("quiet"))
        if q:
            highlights.append(f"cisza {q}")
        elif loc.get("quiet_rural"):
            highlights.append("spokojna, wiejska okolica")

    if params.get("near_forest") and loc.get("near_forest"):
        highlights.append("blisko lasu")
    if params.get("near_lake") and loc.get("near_lake"):
        highlights.append("blisko jeziora")
    if params.get("near_mountains") and loc.get("near_mountains"):
        highlights.append("w pobliżu gór")

    if params.get("sauna") and amenities.get("sauna"):
        highlights.append("prywatna sauna")
    if amenities.get("jacuzzi"):
        highlights.append("jacuzzi")

    if params.get("guests") and facts.get("max_guests"):
        try:
            if int(facts["max_guests"]) >= int(params["guests"]):
                highlights.append(f"dla {int(params['guests'])} gości")
        except (TypeError, ValueError):
            pass

    travel_fit = _score_to_text(scores.get("travel_fit"))
    if travel_fit:
        highlights.append(f"wysoki wynik {facts.get('scores', {}).get('travel_fit_key') or 'dopasowania'} {travel_fit}")

    if facts.get("average_rating") and facts.get("review_count"):
        highlights.append(f"ocena {facts['average_rating']:.1f} ({facts['review_count']} opinii)")

    if facts.get("response_rate_pct"):
        highlights.append(f"host odpowiada na {facts['response_rate_pct']}% zapytań")

    unique_h = []
    for h in highlights:
        if h not in unique_h:
            unique_h.append(h)
    unique_h = unique_h[:3]

    place = ", ".join([x for x in [loc.get("city"), loc.get("region")] if x]) or "tej lokalizacji"
    sent1 = f"Ta oferta pasuje do Twoich preferencji i dobrze wypada na tle innych opcji w {place}."
    if unique_h:
        sent2 = f"Najmocniejsze argumenty: {', '.join(unique_h)}."
    else:
        sent2 = "Najmocniejsze argumenty: lokalizacja blisko natury i parametry spójne z Twoim zapytaniem."
    sent3 = f"Cena startuje od {facts.get('base_price')} {facts.get('currency')}/noc, więc łatwo porównać ją z pozostałymi propozycjami."
    return " ".join([sent1, sent2, sent3]), unique_h


class AISearchService:
    @staticmethod
    def _call_match_explanations_llm(prompt: str) -> tuple[dict[str, Any], int, Decimal]:
        model = getattr(settings, "OPENAI_MODEL_CHEAP", "") or getattr(
            settings,
            "OPENAI_MODEL",
            "gpt-4o-mini",
        )
        max_tokens = getattr(settings, "OPENAI_MATCH_EXPLANATIONS_MAX_TOKENS", 1400)
        client = AISearchService._client()
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": EXPLANATION_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=max_tokens,
                temperature=0.25,
                response_format={"type": "json_object"},
            )
        except Exception as e:
            if hasattr(e, "status_code") and getattr(e, "status_code") == 429:
                raise AIServiceError("Limit zapytań AI dla uzasadnień został chwilowo przekroczony.") from None
            raise AIServiceError("Nie udało się wygenerować uzasadnień dopasowania.") from None

        choice = resp.choices[0] if resp.choices else None
        if not choice or not choice.message or not choice.message.content:
            raise AIServiceError("Pusta odpowiedź modelu dla uzasadnień dopasowania.")

        parsed = _parse_llm_json(choice.message.content)
        return parsed, _usage_tokens(getattr(resp, "usage", None)), _usage_cost_usd(getattr(resp, "usage", None))

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

    @classmethod
    def _generate_match_explanations(
        cls,
        *,
        user_prompt: str,
        llm_summary: str,
        params: dict[str, Any],
        listings: list[Listing],
    ) -> tuple[dict[str, dict[str, Any]], int, Decimal]:
        base: dict[str, dict[str, Any]] = {}
        facts_rows: list[dict[str, Any]] = []
        for rank, listing in enumerate(listings):
            facts = _extract_listing_facts(listing, params, rank)
            fallback_text, fallback_highlights = _rule_based_match_explanation(facts, params)
            base[str(listing.id)] = {
                "match_explanation": fallback_text,
                "match_highlights": fallback_highlights,
                "explanation_source": "rule",
            }
            facts_rows.append(facts)

        if not listings:
            return base, 0, Decimal("0")

        use_llm = bool(getattr(settings, "AI_MATCH_EXPLANATION_USE_LLM", True))
        if not use_llm:
            return base, 0, Decimal("0")

        payload = {
            "user_prompt": user_prompt[:500],
            "assistant_summary": _first_sentence(llm_summary),
            "normalized_preferences": params,
            "listings": facts_rows,
            "instructions": {
                "language": "pl",
                "sentences": "2-3",
                "no_hallucinations": True,
            },
        }

        try:
            parsed, tokens, cost = cls._call_match_explanations_llm(json.dumps(payload, ensure_ascii=False))
        except Exception:
            logger.exception("LLM match explanations failed; using rule-based fallback")
            return base, 0, Decimal("0")

        items = parsed.get("items") if isinstance(parsed, dict) else None
        if not isinstance(items, list):
            return base, 0, Decimal("0")

        for item in items:
            if not isinstance(item, dict):
                continue
            lid = str(item.get("listing_id") or "").strip()
            if not lid or lid not in base:
                continue
            text = str(item.get("explanation") or "").strip()
            if len(text) < 40:
                continue
            base[lid] = {
                "match_explanation": text[:560],
                "match_highlights": _safe_text_list(item.get("highlights"), max_items=3),
                "explanation_source": "llm",
            }

        return base, int(tokens or 0), cost or Decimal("0")

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
                temperature=0.35,
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
    def _catalog_stats_lines() -> list[str]:
        approved = Listing.objects.filter(status=Listing.Status.APPROVED)
        n = approved.count()
        agg = approved.aggregate(
            mn=models.Min("base_price"),
            mx=models.Max("base_price"),
        )
        top_regs = (
            approved.values("location__region")
            .exclude(location__region="")
            .annotate(c=Count("id"))
            .order_by("-c")[:8]
        )
        lines: list[str] = [f"Łącznie zatwierdzonych ofert w katalogu: {n}."]
        if agg.get("mn") is not None and agg.get("mx") is not None:
            lines.append(
                f"Widełki cen startowych w bazie: {agg['mn']}–{agg['mx']} PLN za noc."
            )
        reg_bits = [
            f"{row['location__region']}: ok. {row['c']} ofert"
            for row in top_regs
            if row.get("location__region")
        ]
        if reg_bits:
            lines.append("Największa dostępność wg regionów: " + "; ".join(reg_bits))
        return lines

    @staticmethod
    def _retrieval_listings_for_prompt(
        user_text: str,
        *,
        params: Optional[dict] = None,
        limit: int = 22,
    ) -> list[Listing]:
        try:
            tokens = _extract_meaningful_tokens(user_text)
            base = (
                Listing.objects.filter(status=Listing.Status.APPROVED)
                .select_related("location")
                .defer("description")
            )
            p = params or {}
            if p.get("travel_mode"):
                try:
                    base = SearchOrchestrator.build_queryset(dict(p))
                except Exception:
                    logger.exception("AI retrieval: build_queryset with params failed, fallback to base")

            # Twarde sygnały intencji dla puli kandydatów.
            if p.get("near_mountains"):
                base = base.filter(location__near_mountains=True)
            if p.get("near_lake"):
                base = base.filter(location__near_lake=True)
            if p.get("near_forest"):
                base = base.filter(location__near_forest=True)

            if p.get("min_price") is not None:
                base = base.filter(base_price__gte=p["min_price"])
            if p.get("max_price") is not None:
                base = base.filter(base_price__lte=p["max_price"])

            if not tokens:
                return list(base.order_by("-average_rating", "-review_count", "-created_at")[:limit])
            q = Q()
            for t in tokens:
                q |= (
                    Q(title__icontains=t)
                    | Q(short_description__icontains=t)
                    | Q(location__city__icontains=t)
                    | Q(location__region__icontains=t)
                )
            qs = base.filter(q).order_by("-average_rating", "-review_count", "-created_at").distinct()
            rows = list(qs[:limit])
            if len(rows) < min(14, limit):
                seen = {r.id for r in rows}
                extra = list(
                    base.exclude(pk__in=seen).order_by(
                        "-average_rating", "-review_count", "-created_at"
                    )[: limit - len(rows)]
                )
                rows.extend(extra)
            return rows[:limit]
        except Exception:
            logger.exception("AI retrieval listing context failed; using rating fallback")
            return list(
                Listing.objects.filter(status=Listing.Status.APPROVED)
                .select_related("location")
                .defer("description")
                .order_by("-average_rating", "-review_count", "-created_at")[:limit]
            )

    @staticmethod
    def _build_contextual_prompt(
        session: AiTravelSession,
        current_prompt: str,
        current_prompt_id,
    ) -> str:
        """RAG-light: statystyki + oferty trafione słowami z zapytania — model „widzi” realny katalog."""
        domain = AISearchService._build_domain_dictionary()
        digest_listings = AISearchService._retrieval_listings_for_prompt(current_prompt)
        stats_lines = AISearchService._catalog_stats_lines()
        tok_preview = _extract_meaningful_tokens(current_prompt)
        tok_note = ", ".join(tok_preview) if tok_preview else "(ogólne zapytanie — dobrane najwyżej oceniane oferty)"

        prev_prompts = (
            AiTravelPrompt.objects.filter(session=session)
            .exclude(pk=current_prompt_id)
            .order_by("-created_at")[:6]
        )

        lines: list[str] = [
            "=== Katalog StayMap — dane rzeczywiste (nie halucynuj nazw obiektów spoza tej listy) ===",
            *stats_lines,
            "",
            "=== Dozwolone wartości filtrów ===",
            "travel_mode=romantic|family|pet|workation|slow|outdoor|lake|mountains|wellness",
            "ordering=recommended|price_asc|price_desc|newest",
            "summary_pl ma opisywać intencję i zakres zgodny z realnymi regionami/typami z tego kontekstu.",
            "",
            "=== Słownik domenowy (przykładowe wartości z ofert) ===",
            (
                f"regiony={', '.join(domain.get('regions', [])[:14]) or 'brak'}, "
                f"miasta={', '.join(domain.get('cities', [])[:14]) or 'brak'}, "
                f"typy={', '.join(domain.get('listing_types', [])[:10]) or 'brak'}"
            ),
            "",
            f"=== Oferty powiązane z zapytaniem (słowa kluczowe: {tok_note}) ===",
            "Poniższe linie to prawdziwe rekordy z bazy — możesz nawiązać do typu doświadczenia lub regionu w summary_pl, jeśli pasuje do intencji użytkownika.",
        ]
        for idx, listing in enumerate(digest_listings, start=1):
            lines.append(f"{idx}. {_format_listing_digest_line(listing)}")

        lines.append("")
        lines.append("=== Historia tej sesji (najpierw najnowsze pytania) ===")
        if not prev_prompts:
            lines.append("Brak wcześniejszych wiadomości w tej sesji.")
        for i, p in enumerate(prev_prompts, start=1):
            lines.append(f"{i}. U: {p.raw_text[:300]}")
            interp = AiFilterInterpretation.objects.filter(prompt=p).first()
            if interp and isinstance(interp.normalized_params, dict) and interp.normalized_params:
                lines.append(
                    f"   A: {interp.summary_pl[:300] if interp.summary_pl else json.dumps(interp.normalized_params, ensure_ascii=False)}"
                )

        lines.append("")
        lines.append("Nowa wiadomość użytkownika (główne kryterium wyszukiwania):")
        lines.append(current_prompt)
        lines.append(f"Bieżąca data serwera: {timezone.localdate().isoformat()}")
        lines.append(
            "Zinterpretuj tę wiadomość jako aktualne zapytanie. "
            "Historia służy tylko do doprecyzowania; przy sprzeczności wygrywa nowa wiadomość. "
            "Zwróć poprawny JSON + summary_pl w stylu StayMap AI."
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
    def _score_listing_relevance(
        cls,
        listing: Listing,
        *,
        prompt_tokens: list[str],
        params: dict[str, Any],
    ) -> float:
        score = 0.0
        text_blob = _listing_text_blob(listing)
        loc = getattr(listing, "location", None)
        amenities = listing.amenities if isinstance(getattr(listing, "amenities", None), list) else []
        amenity_tokens = {
            (str(item.get("id") or item.get("name") or "") if isinstance(item, dict) else str(item)).lower()
            for item in amenities
        }

        # Treść promptu kontra tekst oferty
        token_hits = 0
        for tok in prompt_tokens:
            if tok in text_blob:
                token_hits += 1
        score += token_hits * 4.0

        location_hint = str(params.get("location") or "").strip().lower()
        if location_hint and location_hint in text_blob:
            score += 10.0
        elif location_hint:
            score -= 12.0

        if params.get("near_mountains"):
            score += 24.0 if bool(getattr(loc, "near_mountains", False)) else -22.0
        if params.get("near_lake"):
            score += 24.0 if bool(getattr(loc, "near_lake", False)) else -22.0
        if params.get("near_forest"):
            score += 14.0 if bool(getattr(loc, "near_forest", False)) else -10.0

        mode = str(params.get("travel_mode") or "").strip().lower()
        max_guests = int(getattr(listing, "max_guests", 0) or 0)
        if mode == "romantic":
            if max_guests == 2:
                score += 10.0
            if any(tok in amenity_tokens for tok in ("jacuzzi", "jacuzzi_int", "jacuzzi_ext", "hot_tub")):
                score += 8.0
            if "kominek" in amenity_tokens:
                score += 6.0
            if any(tok in amenity_tokens for tok in ("sauna", "private_sauna", "sauna_fin", "sauna_infra")):
                score += 4.0
        elif mode == "family":
            if max_guests >= 4:
                score += 8.0
        elif mode == "mountains":
            if bool(getattr(loc, "near_mountains", False)):
                score += 10.0
        elif mode == "lake":
            if bool(getattr(loc, "near_lake", False)):
                score += 10.0

        min_price = params.get("min_price")
        max_price = params.get("max_price")
        try:
            p = float(getattr(listing, "base_price", 0) or 0)
            if min_price is not None or max_price is not None:
                if min_price is not None and p < float(min_price):
                    score -= 6.0
                if max_price is not None and p > float(max_price):
                    score -= 6.0
                if (min_price is None or p >= float(min_price)) and (max_price is None or p <= float(max_price)):
                    score += 6.0
        except (TypeError, ValueError):
            pass

        try:
            rating = float(getattr(listing, "average_rating", 0) or 0)
            score += min(max(rating, 0.0), 5.0)
        except (TypeError, ValueError):
            pass

        return score

    @classmethod
    def _merge_candidate_ids_with_prompt_retrieval(
        cls,
        ordered_ids: list[Any],
        *,
        prompt_text: str,
        params: Optional[dict] = None,
        pool_limit: int,
    ) -> list[Any]:
        """Łączy ranking search z retrieval promptowym, aby uniknąć stałej szóstki przy różnych zapytaniach."""
        merged: list[Any] = []
        seen: set[str] = set()

        try:
            retrieval_rows = cls._retrieval_listings_for_prompt(
                prompt_text,
                params=params,
                limit=max(24, int(pool_limit)),
            )
        except Exception:
            retrieval_rows = []

        for row in retrieval_rows:
            pk = getattr(row, "id", None)
            if pk is None:
                continue
            k = str(pk)
            if k in seen:
                continue
            seen.add(k)
            merged.append(pk)
            if len(merged) >= pool_limit:
                return merged

        for pk in ordered_ids:
            k = str(pk)
            if k in seen:
                continue
            seen.add(k)
            merged.append(pk)
            if len(merged) >= pool_limit:
                break
        return merged

    @classmethod
    def _rerank_listings_by_prompt_relevance(
        cls,
        listings: list[Listing],
        *,
        prompt_text: str,
        params: dict[str, Any],
        limit: int,
    ) -> list[Listing]:
        if not listings:
            return []
        prompt_tokens = _extract_meaningful_tokens(prompt_text, max_tokens=10)
        scored: list[tuple[float, int, Listing]] = []
        for idx, row in enumerate(listings):
            s = cls._score_listing_relevance(row, prompt_tokens=prompt_tokens, params=params)
            scored.append((s, -idx, row))
        scored.sort(key=lambda x: (x[0], x[1]), reverse=True)
        return [row for _, _, row in scored[: max(1, int(limit or 1))]]

    @classmethod
    def _rule_based_hints(cls, text: str) -> dict[str, Any]:
        """Deterministyczne podpowiedzi dla potocznych i niepełnych zapytań."""
        src = (text or "").strip().lower()
        compact = re.sub(r"\s+", " ", src)
        hints: dict[str, Any] = {}

        cheap_tokens = ("tanio", "tanie", "najtans", "najtań", "budzet", "budżet")
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

        date_hints = _extract_natural_date_hints(compact, today=timezone.localdate())
        if isinstance(date_hints.get("date_from"), date):
            hints.setdefault("date_from", date_hints["date_from"])
        if isinstance(date_hints.get("date_to"), date):
            hints.setdefault("date_to", date_hints["date_to"])

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
    def _relaxation_candidates(
        params: dict[str, Any],
        *,
        prompt_fingerprint: str = "",
    ) -> list[tuple[str, dict[str, Any]]]:
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
        ):
            soft_prefs.pop(key, None)
        out.append(("soft_preferences", soft_prefs))

        wide_radius = dict(soft_prefs)
        if wide_radius.get("latitude") is not None and wide_radius.get("longitude") is not None:
            wide_radius["radius_km"] = max(float(wide_radius.get("radius_km") or 0), 120.0)
        out.append(("wide_radius", wide_radius))

        # Inny klucz cache / kolejność niż surowe {} — przy różnych zapytaniach widać inne oferty z katalogu.
        order_variants = ("recommended", "newest", "price_asc")
        h = int(
            hashlib.sha256((prompt_fingerprint or "staymap").encode("utf-8")).hexdigest(),
            16,
        )
        out.append(("global_fallback", {"ordering": order_variants[h % len(order_variants)]}))
        return out

    @classmethod
    def _ordered_ids_with_fallback(
        cls,
        params: dict[str, Any],
        *,
        prompt_fingerprint: str = "",
    ) -> tuple[list[Any], str]:
        has_explicit_constraints = any(
            params.get(key) not in (None, "", [], False)
            for key in (
                "location",
                "travel_mode",
                "guests",
                "min_price",
                "max_price",
                "booking_mode",
                "near_mountains",
                "near_lake",
                "near_forest",
                "quiet_rural",
                "amenities",
                "is_pet_friendly",
            )
        )
        for level, candidate in cls._relaxation_candidates(params, prompt_fingerprint=prompt_fingerprint):
            if level == "global_fallback" and has_explicit_constraints:
                continue
            # Bez cache Redis — inaczej każde podobne zapytanie dostaje identyczną listę ID z Redis.
            ids = SearchOrchestrator.get_ordered_ids(candidate, use_cache=False)  # type: ignore[call-arg]
            if ids:
                return ids, level

        if has_explicit_constraints:
            # Nie pokazuj globalnie tych samych ofert, gdy użytkownik podał konkretne kryteria.
            return [], "no_results"

        # Ostateczny fallback: jeśli orchestrator nic nie zwrócił, pokaż najlepsze globalne oferty.
        backup_ids = list(
            Listing.objects.filter(status=Listing.Status.APPROVED)
            .order_by("-average_rating", "-review_count", "-created_at")
            .values_list("id", flat=True)[:120]
        )
        return backup_ids, "global_catalog"

    @staticmethod
    def _permute_ordered_ids_for_prompt(
        ids: list[Any],
        prompt_text: str,
        session_id: str,
    ) -> list[Any]:
        """Ta sama pula wyników wyszukiwania → inna kolejność startu dla różnych zapytań/sesji."""
        if not ids or len(ids) < 2:
            return ids
        seed = f"{prompt_text}\u241f{session_id}"
        h = int(hashlib.sha256(seed.encode("utf-8")).hexdigest(), 16)
        offset = h % len(ids)
        if offset == 0:
            return ids
        return ids[offset:] + ids[:offset]

    @classmethod
    def _travel_quality_threshold(cls, params: dict[str, Any]) -> int:
        base = int(getattr(settings, "AI_TRAVEL_SCORE_MIN", 30) or 30)
        by_mode_raw = getattr(settings, "AI_TRAVEL_SCORE_MIN_BY_MODE", {})
        by_mode = by_mode_raw if isinstance(by_mode_raw, dict) else {}
        mode = str(params.get("travel_mode") or "").strip().lower()

        def _read_threshold(key: str) -> Optional[int]:
            val = by_mode.get(key)
            if val is None:
                return None
            try:
                return int(val)
            except (TypeError, ValueError):
                return None

        if mode == "romantic" and params.get("near_mountains"):
            combo = _read_threshold("romantic_mountains")
            if combo is not None:
                return max(base, combo)

        mode_val = _read_threshold(mode)
        if mode_val is not None:
            return max(base, mode_val)
        return base

    @classmethod
    def _apply_travel_quality_gate(
        cls,
        ordered_ids: list[Any],
        params: dict[str, Any],
    ) -> tuple[list[Any], int, Optional[int]]:
        if not ordered_ids:
            return ordered_ids, 0, None
        mode = str(params.get("travel_mode") or "").strip().lower()
        if not mode:
            return ordered_ids, 0, None

        threshold = cls._travel_quality_threshold(params)
        try:
            qs = SearchOrchestrator.build_queryset(dict(params))
            score_rows = qs.filter(id__in=ordered_ids).values_list("id", "travel_score")
            score_by_id = {str(pk): float(score or 0) for pk, score in score_rows}
        except Exception:
            logger.exception("AI quality gate skipped due to scoring error")
            return ordered_ids, 0, threshold

        gated_ids = [pk for pk in ordered_ids if float(score_by_id.get(str(pk), 0.0)) >= float(threshold)]
        removed = max(0, len(ordered_ids) - len(gated_ids))
        return gated_ids, removed, threshold

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
        normalization_warnings: list[str] = []

        summary_pl = ""
        if isinstance(llm_payload.get("summary_pl"), str):
            raw_summary = llm_payload["summary_pl"].strip()[:2000]
            summary_pl = _format_premium_summary(raw_summary, search_params)
        if errs:
            repaired_params, normalization_warnings = normalized_search_params_from_llm_lenient(filter_part)
            if repaired_params:
                search_params = repaired_params
            else:
                msg = "; ".join(errs)
                cls._mark_session_failed(session.pk, model_name, int(tokens or 0), cost_part or Decimal("0"), msg)
                session.refresh_from_db()
                return session

        seasonality_note = _seasonality_note_for_params(search_params)
        if seasonality_note and seasonality_note not in summary_pl:
            summary_pl = (summary_pl + " " + seasonality_note).strip() if summary_pl else seasonality_note

        search_params = _geocode_if_needed(search_params)
        relax_level = "strict"
        try:
            ordered_ids, relax_level = cls._ordered_ids_with_fallback(
                search_params,
                prompt_fingerprint=text,
            )
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

        ordered_ids = list(ordered_ids)
        ordered_ids, quality_removed, quality_threshold = cls._apply_travel_quality_gate(ordered_ids, search_params)
        if not ordered_ids and quality_removed > 0:
            relax_level = "no_results"

        if relax_level != "strict":
            extra = (
                "\n✨ Rozszerzyłem część kryteriów (np. budżet lub preferencje), "
                "żeby pokazać najlepsze dostępne oferty."
            )
            summary_pl = (summary_pl or "✨ Pokazuję najlepsze dostępne opcje.") + extra

        if relax_level == "no_results":
            summary_pl = (
                (summary_pl or "")
                + "\nNie znalazłem ofert spełniających wszystkie podane kryteria. "
                "Mogę zaproponować alternatywy po lekkim rozszerzeniu budżetu, lokalizacji albo udogodnień."
            ).strip()

        candidate_pool_limit = max(36, AI_RECOMMENDATION_LIMIT * 14)
        candidate_ids = cls._merge_candidate_ids_with_prompt_retrieval(
            ordered_ids,
            prompt_text=text,
            params=search_params,
            pool_limit=candidate_pool_limit,
        )

        stored_ids: list[UUID] = []
        for lid_str in candidate_ids:
            try:
                stored_ids.append(UUID(str(lid_str)))
            except (TypeError, ValueError):
                continue

        approved_qs = Listing.objects.filter(pk__in=stored_ids, status=Listing.Status.APPROVED).select_related(
            "location",
            "host",
        )
        listing_by_id = {str(row.id): row for row in approved_qs}
        ordered_candidates = [listing_by_id[str(pk)] for pk in stored_ids if str(pk) in listing_by_id]
        ordered_listings = cls._rerank_listings_by_prompt_relevance(
            ordered_candidates,
            prompt_text=text,
            params=search_params,
            limit=AI_RECOMMENDATION_LIMIT,
        )

        id_strings = [str(listing.id) for listing in ordered_listings]
        total = len(ordered_listings)

        payload_with_meta = dict(llm_payload)
        payload_with_meta["_matching_strategy"] = relax_level
        payload_with_meta["_result_count"] = total
        if quality_threshold is not None:
            payload_with_meta["_quality_gate_threshold"] = int(quality_threshold)
            payload_with_meta["_quality_gate_removed"] = int(quality_removed)
        if normalization_warnings:
            payload_with_meta["_normalization_warnings"] = normalization_warnings
        if errs:
            payload_with_meta["_strict_validation_errors"] = errs

        explanation_map, extra_tokens, extra_cost = cls._generate_match_explanations(
            user_prompt=text,
            llm_summary=summary_pl,
            params=search_params,
            listings=ordered_listings[:AI_RECOMMENDATION_LIMIT],
        )
        tokens = int(tokens or 0) + int(extra_tokens or 0)
        cost_part = (cost_part or Decimal("0")) + (extra_cost or Decimal("0"))

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
            for rank, listing_obj in enumerate(ordered_listings[:AI_RECOMMENDATION_LIMIT]):
                exp = explanation_map.get(str(listing_obj.id), {})
                rec_rows.append(
                    AiRecommendation(
                        interpretation=interp,
                        listing=listing_obj,
                        rank=rank,
                        match_explanation=str(exp.get("match_explanation") or ""),
                        match_highlights=exp.get("match_highlights") if isinstance(exp.get("match_highlights"), list) else [],
                        explanation_source=str(exp.get("explanation_source") or "rule")[:16],
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

