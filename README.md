# StayMap Polska

Monorepo: **Django 5 + GeoDjango (PostGIS)** + **Next.js 14**. Backend: **Daphne** (HTTP + WebSocket), **Celery** (profile), **Redis** (cache, kanały).

## Wymagania

- Docker Desktop
- Skopiuj środowisko: `cp .env.example .env` i ustaw `SECRET_KEY` (np. `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` w kontenerze backendu).

## Start (dev)

```bash
make dev
```

- Frontend: http://localhost:3000  
- API: http://localhost:8000  
- Swagger: http://localhost:8000/api/schema/swagger-ui/  
- Admin: http://localhost:8000/admin/  

Pierwsza migracja (jeśli baza pusta):

```bash
make migrate
```

Superuser:

```bash
make superuser
```

Dane demo:

```bash
make seed
```

## Panel gospodarza i moderacja (frontend)

- **Panel gospodarza:** http://localhost:3000/host/panel — po zalogowaniu: aktywacja profilu hosta (`POST /api/v1/host/onboarding/start/`), lista ofert i rezerwacji z perspektywy hosta. Użytkownicy z `is_admin` widzą zakładkę **Moderacja** (kolejka ofert `pending`).
- **Onboarding (info):** http://localhost:3000/host/onboarding  
- Linki w nawigacji: „Panel gospodarza” (gdy konto ma `is_host`), „Zostań gospodarzem”.

## API — Etap 6 (skrót)

| Obszar | Metody | Ścieżka (prefiks `/api/v1/`) |
|--------|--------|------------------------------|
| Host | `POST` | `host/onboarding/start/` |
| Host | `GET`, `POST` | `host/listings/` |
| Host | `GET`, `PATCH`, `DELETE` | `host/listings/{uuid}/` |
| Host | `POST` | `host/listings/{uuid}/images/` |
| Host | `POST` | `host/listings/{uuid}/submit-for-review/` |
| Host | `GET` | `host/bookings/` |
| Host | `PATCH` | `host/bookings/{uuid}/status/` — body: `{"status":"confirmed"\|"rejected"}` |
| Moderacja (admin) | `GET` | `admin/moderation/listings/` |
| Moderacja | `POST` | `admin/moderation/listings/{uuid}/approve/` |
| Moderacja | `POST` | `admin/moderation/listings/{uuid}/reject/` — body: `{"comment":"..."}` |
| Recenzje | `POST` | `reviews/` — m.in. `booking_id`, `reviewer_role`, `overall_rating`, `content` |
| Recenzje | `PATCH` | `reviews/{uuid}/host-response/` — jedna odpowiedź hosta |
| Czat (REST) | `GET`, `POST` | `conversations/` — `listing_id`; host podaje `guest_id` |
| Czat | `GET`, `POST` | `conversations/{uuid}/messages/` |
| WebSocket | — | `ws://localhost:8000/ws/conversations/{uuid}/?token=<JWT>` — zdarzenia `message.new` |

Szczegóły domeny i kontrakty: `docs/StayMap_Dokumentacja_Profesjonalna.md`.

## Testy (backend)

```bash
docker compose exec backend pytest
```

Testy API m.in.: `apps/host/tests/`, `apps/moderation/tests/`, `apps/reviews/tests/`, `apps/messaging/tests/` (plus istniejące moduły). W `config.settings.testing` jest m.in. `CHANNEL_LAYERS` w pamięci i `CELERY_TASK_ALWAYS_EAGER`.

## Produkcja (build obrazu)

Obraz dev instaluje `requirements/development.txt`. Na produkcji użyj **`requirements/production.txt`** (Gunicorn + WhiteNoise + zależności z `base.txt`) i `DJANGO_SETTINGS_MODULE=config.settings.production`.

## Etap 1 — checklist (zgodnie z §08 dokumentacji)

| Obszar | Stan |
|--------|------|
| Custom `User`, `UserManager`, soft delete pól | ✅ |
| `BaseModel`, `HostProfile`, `Listing`, `ListingLocation` + GiST | ✅ |
| Globalny handler błędów + `VALIDATION_ERROR` / kody StayMap | ✅ |
| JWT + throttle login/rejestracja | ✅ |
| `GET/PATCH` `/api/v1/auth/me/` **oraz** `/api/v1/profile/` (alias z §13) | ✅ |
| **CRUD** ofert: w tym `DELETE` → **soft delete** + `ListingService` | ✅ |
| Docker Compose, Makefile, `.env.example` | ✅ |
| `requirements/production.txt` | ✅ |
| Upload zdjęć + S3 (`USE_S3`) | ✅ |
| `seed_db` | ✅ |
| CI: ruff + pytest | ✅ |
| Testy API: rejestracja, walidacja, profil, login, listing + delete | ✅ |

---

**Etap 6 (host, moderacja, recenzje, messaging):** endpointy w tabeli powyżej; panel `/host/panel`; testy w `apps/*/tests/`. Stack dev: **Daphne** w `docker-compose` zamiast samego `runserver`, aby obsłużyć WebSockety.

## E-mail (Gmail), Sentry, Celery Beat, konto użytkownika

- **Szablony e-maili** (HTML + TXT) i **Gmail SMTP**: opis w [`docs/EMAIL_AND_OPS.md`](docs/EMAIL_AND_OPS.md).
- **Konto gościa** (profil, avatar, język, kraj): `UserProfile` + strona **`/account`** (`GET/PATCH /api/v1/auth/me/`).
- **Audyt** (`AuditLog` w adminie), **Sentry** (produkcja), **rozszerzony harmonogram Celery** (`CELERY_BEAT_SCHEDULE`, m.in. przypomnienia o recenzji).
- **E2E:** w katalogu `frontend/` — `npm install`, `npx playwright install`, `npm run test:e2e` (patrz `playwright.config.ts`).
