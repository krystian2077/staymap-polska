# AI Search Premium — Dokumentacja testowania

## Status implementacji

✅ Backend AI Search — wdrożony end-to-end
✅ Frontend UI — zaktualizowany z panelem czatu premium
✅ Testy API — aktualizowane z nowym kontraktem
✅ Linting — przechodzenie (frontend: 0 errors w AI Search)

## Architektura

### Backend pipeline
```
User prompt
  ↓
AISearchViewSet.create()
  ↓
AISearchService.run_sync(
  user, 
  prompt, 
  session_id=None  # kontynuacja sesji
)
  ↓
1. Buduj kontekstowy prompt (historia konwersacji)
2. Wywoła _call_llm() → gpt-4o-mini (tani model)
3. Parse JSON → normalized params
4. Geocode lokalizacji
5. SearchOrchestrator.get_ordered_ids()
   - filtry: near_mountains, near_lake, quiet_rural, travel_mode, etc.
   - ranking: odległość, travel_score, created_at
6. Utwórz AiRecommendation (top 50 wyników)
7. Zwróć AiTravelSession z status=COMPLETE
  ↓
Session zawiera:
- status: "complete" / "failed" / "processing"
- assistant_reply: podsumowanie AI
- follow_up_suggestions: lista 4 sugestii
- conversation: historia promptów + odpowiedzi
- model_used: model AI
- results: lista 24 ofert
- filters: zinterpretowane filtry
```

### Frontend flow
```
/ai page
  ↓
Input: textarea + "Szukaj" button + quick prompts
  ↓
AI input → POST /api/v1/ai/search/
  (opcjonalnie: session_id dla kontynuacji)
  ↓
Polling GET /api/v1/ai/search/{session_id}/
  (status: processing → complete / failed)
  ↓
Complete:
- AIProcessingState znika
- Sekcja wyników pojawia się
- AIChatPanel (historia, sugestie, follow-up)
- Grid 24 karty z wynikami (AI Pick, dopasowanie %)
  ↓
Follow-up suggestion:
- Klik na chip
- Wysłanie w tej samej sesji
- Historia rozmowy rozszerza się
```

## Testy funkcjonalne do prześledzenia

### 1. **Uruchamianie aplikacji w dockerze**
```bash
docker-compose up backend frontend
```

### 2. **Test 1: Podstawowy prompt AI Search**
- Przejdź: http://localhost:3000/ai
- Wpisz: "Domek z sauną dla dwojga na Mazurach"
- Klik: "Szukaj"
- **Oczekiwane:**
  - Status zmieni się z "pending" → "processing" → "complete"
  - Pojawi się 24+ wyniki z filtrami: location=Mazury, travel_mode=romantic, sauna=True
  - assistant_reply: "Przygotowałem romantyczne domki na Mazurach z sauną..."
  - follow_up_suggestions: ["Pokaż bardziej luksusowe opcje", "Dodaj miejsca blisko jeziora", ...]
  - Każdy wynik ma "AI Pick" badge + dopasowanie %

### 3. **Test 2: Follow-up w tej samej sesji**
- (po Test 1 — sesja już istnieje)
- Klik na sugestię: "Pokaż bardziej luksusowe opcje"
- **Oczekiwane:**
  - session_id pozostaje ten sam
  - Nowy prompt zostaje wysłany
  - conversation[] rozszerza się o nowy user message + AI response
  - filters mogą się zmienić (np. wyższa cena)
  - results refreshuje się

### 4. **Test 3: Filtry booleańskie z AI**
- Wpisz: "Spokojny domek w lesie dla rodziny, z WiFi"
- **Oczekiwane:**
  - travel_mode="family" (z parametru)
  - near_forest=True
  - quiet_rural=True (jeśli quiet_score_min >= 7)
  - Wyniki filtrują się odpowiednio

### 5. **Test 4: Rate limit kontrola**
- Wyślij 25 promptów w ciągu 1 minuty
- **Oczekiwane:**
  - Po 20 zapytaniach: throttle 429
  - Frontend: "Przekroczono limit zapytań..."

### 6. **Test 5: Model tani**
- Przejrzyj response payload: `model_used: "gpt-4o-mini"`
- **Oczekiwane:**
  - model_used zawsze = "gpt-4o-mini" (z OPENAI_MODEL_CHEAP)
  - Koszt ~0.00005 USD per request (zamiast 0.0003 za gpt-4o)

## Konfiguracja (`.env`)

```dotenv
OPENAI_API_KEY=sk-proj-...          # Nowy klucz (UNIEWAŻNIJ stary!)
OPENAI_MODEL_CHEAP=gpt-4o-mini      # Tani model
OPENAI_MODEL=gpt-4o-mini            # Fallback
AI_SESSION_TTL_HOURS=24             # TTL sesji AI
```

## Throttle settings (`config/settings/base.py`)

```python
"ai_search": "20/min",              # 20 requestów/min per user
```

## Znane problemy / TODO

1. **GDAL/PostGIS lokalnie** — pytest nie uruchomi się na Windows bez instalacji GDAL.
   - Workaround: Użyj docker-compose do testów.

2. **Wycieknięty klucz OpenAI** — KONIECZNIE unieważnij na platformie OpenAI i ustaw nowy w `.env`.

3. **Optymalizacja rankingu** — Obecny ranking bazuje na:
   - Odległość geograficzna (jeśli location + lat/lng)
   - travel_score (z TravelModeRanker)
   - created_at (najnowsze pierwsze w tiebreaker)
   
   W przyszłości: RAG embedding + semantic search.

## Quick start lokalny (bez Dockera)

Jeśli masz PostgreSQL + PostGIS:

```bash
# Terminal 1 — Backend
cd backend
export DJANGO_SETTINGS_MODULE=config.settings.development
python manage.py runserver

# Terminal 2 — Frontend
cd frontend
npm run dev

# Otwórz: http://localhost:3000/ai
```

## Metryki do monitorowania

- **Tokens used** — suma tokenów per sesja
- **Cost USD** — szacunkowy koszt (0 teraz, ale struktura gotowa)
- **Model used** — potwierdzenie modelu "gpt-4o-mini"
- **Session TTL** — wygaśnięcie po 24h
- **Throttle status** — liczba zapytań per minuta

## Commit checkpoint

Wszystko zmienione i gotowe do commitowania:

```bash
git add -A
git commit -m "feat: implement AI Search premium with contextual chat, follow-ups, and cheap model

- Backend: session-aware AI interpretation with conversation history
- Frontend: premium StayMap AI panel with follow-up suggestions
- Model: gpt-4o-mini (cost ~5x cheaper than gpt-4o)
- Throttle: 20 requests/min per user
- Filters: improved mapping (quiet_rural, travel_mode → is_pet_friendly, etc.)
- Tests: updated API contract + session continuation test"
```

---
**Ostatnia aktualizacja:** 2026-04-12  
**Status:** MVP READY FOR TESTING

