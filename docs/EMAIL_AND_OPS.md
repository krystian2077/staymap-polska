# E-mail (Gmail), Sentry, Celery Beat — kroki wdrożenia

## 1. Wysyłka e-maili (Gmail SMTP)

1. W koncie Google włącz **weryfikację dwuetapową**.
2. Utwórz **hasło aplikacji** (Hasła aplikacji / App passwords) — 16 znaków.
3. W `.env` ustaw:

```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=twoj@gmail.com
EMAIL_HOST_PASSWORD=xxxx-xxxx-xxxx-xxxx
EMAIL_FROM=StayMap <twoj@gmail.com>
FRONTEND_URL=https://twoja-domena.pl
```

4. Szablony HTML/TXT: `backend/templates/emails/` — m.in. potwierdzenie rezerwacji (`booking_confirmed_guest`, `booking_confirmed_host`), przypomnienie o recenzji (`review_reminder_guest`).
5. Logika wysyłki: `apps.common.email_service.EmailService`, wywołania z `apps.bookings.tasks.send_booking_confirmation_email` i `apps.reviews.tasks.send_review_reminder_emails`.

## 2. Sentry

1. Utwórz projekt na [sentry.io](https://sentry.io), skopiuj **DSN**.
2. Produkcja: `requirements/production.txt` zawiera `sentry-sdk`.
3. W `.env` produkcyjnym:

```env
SENTRY_DSN=https://...@....ingest.sentry.io/...
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

4. Inicjalizacja jest w `config/settings/production.py` (import `sentry_sdk`).

## 3. Celery Beat + harmonogram

1. Worker: `celery -A config worker -l info`
2. Beat (harmonogram z `CELERY_BEAT_SCHEDULE` w `config/settings/base.py`): `celery -A config beat -l info`
3. Docker: `docker compose --profile celery up -d` (serwisy `celery_worker`, `celery_beat`).
4. **django-celery-beat**: migracje tworzą tabele pod ewentualne zadania z panelu admin; harmonogram domyślny jest w kodzie (`CELERY_BEAT_SCHEDULE`).

Zadania m.in.: anulowanie porzuconych rezerwacji, odrzucenie prośby po czasie, `refresh_stale_poi_caches`, `cleanup_expired_ai_sessions`, `send_review_reminder_emails` (codziennie 10:00), `monthly_ai_cost_report` (1. dzień miesiąca).

## 4. Audyt (`AuditLog`)

- Model: `apps.common.models.AuditLog` — rejestracja m.in. rejestracji użytkownika, utworzenia rezerwacji, zmian statusu.
- Podgląd: Django Admin (`AuditLog`).

## 5. Profil użytkownika (`UserProfile`)

- Model: `apps.users.models.UserProfile` — bio, język, kraj, avatar (plik).
- API: `GET/PATCH /api/v1/auth/me/` oraz `/api/v1/profile/` (alias).
- Frontend: `/account` — edycja profilu, skróty do rezerwacji i listy życzeń.

## 6. Testy E2E (Playwright)

```bash
cd frontend
npm install
npx playwright install chromium
# W kontenerze Dockera (obraz `node:20-bookworm`) — biblioteki systemowe dla Chromium:
npx playwright install-deps chromium
npm run test:e2e
```

Domyślnie `playwright.config.ts` uruchamia `npm run dev` na porcie 3000. Aby użyć już działającego serwera (np. `docker compose` frontend):

`PLAYWRIGHT_NO_SERVER=1` (Unix) / `set PLAYWRIGHT_NO_SERVER=1` (Windows) przed `npm run test:e2e`.

**Wymagane w `.env` frontendu:** `JWT_SECRET` (zgodny z `SECRET_KEY` Django) — inaczej middleware Next.js może zwracać 500 przy starcie.

## 7. Migracje po aktualizacji

```bash
docker compose exec backend python manage.py migrate
```
