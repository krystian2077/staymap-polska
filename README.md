# StayMap Polska

Monorepo: **Django 5 + GeoDjango (PostGIS)** + **Next.js 14**. **Etap 1 — zamknięty** (auth JWT, CRUD + soft-delete ofert z geo, zdjęcia, podstawowy frontend, CI).

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

## Produkcja (build obrazu)

Obraz dev instaluje `requirements/development.txt`. Na produkcji użyj **`requirements/production.txt`** (Gunicorn + WhiteNoise + zależności z `base.txt`) i `DJANGO_SETTINGS_MODULE=config.settings.production`.

## Etap 1 — checklist (zgodnie z §08)

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

**Uwaga:** Pełny `docker-compose` z Celery + Daphne jest w dokumentacji (§7.2) — wejdą przy późniejszych etapach; obecny stack wystarcza pod Etap 1.

Szczegóły domeny: `docs/StayMap_Dokumentacja_Profesjonalna.md`.
