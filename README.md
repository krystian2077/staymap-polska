<p align="center">
  <img src="docs/staymap-main.png" alt="StayMap Polska - ekran glowny" width="100%" />
</p>

<h1 align="center">StayMap Polska 🗺️✨</h1>

<p align="center">
  Nowoczesna platforma rezerwacji noclegow w Polsce: <b>map-first UX</b>, <b>AI po polsku</b>, <b>dynamiczny pricing</b> i <b>real-time chat</b>.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-gotowe%20do%20wdrozenia-16a34a" alt="status" />
  <img src="https://img.shields.io/badge/backend-Django%205%20%2B%20DRF-0ea5e9" alt="backend" />
  <img src="https://img.shields.io/badge/frontend-Next.js%2014-111827" alt="frontend" />
  <img src="https://img.shields.io/badge/GIS-PostGIS%203.4-2563eb" alt="gis" />
  <img src="https://img.shields.io/badge/realtime-WebSocket%20%2B%20Channels-7c3aed" alt="realtime" />
  <img src="https://img.shields.io/badge/async-Celery%20%2B%20Redis-f97316" alt="async" />
</p>

<p align="center">
  <a href="#-quick-start"><b>Quick Start</b></a> •
  <a href="#-podglad-produktu"><b>Podglad produktu</b></a> •
  <a href="#-architektura"><b>Architektura</b></a> •
  <a href="#-api-w-skrocie"><b>API</b></a> •
  <a href="#-dokumentacja"><b>Dokumentacja</b></a>
</p>

---

## ✨ Dlaczego StayMap

StayMap to platforma noclegowa zbudowana od podstaw pod polski rynek turystyczny.
Gosc szuka noclegu na mapie, porownuje oferty, rezerwuje, rozmawia z hostem i korzysta z AI w jednym spojnym flow.

### 🧭 Core value

- **Map-first UX** - mapa to glowny interfejs odkrywania ofert.
- **Dynamiczny cennik** - sezonowosc, swieta, reguly hosta i long-stay.
- **AI assistant** - naturalne zapytania po polsku (OpenAI / kompatybilne API).
- **WebSocket chat** - komunikacja gosc-host w czasie rzeczywistym.
- **Blind release reviews** - uczciwe recenzje bez efektu odwetu.
- **Location intelligence** - POI + destination scoring.

### 📊 W liczbach

| Wskaznik | Wartosc |
|---|---:|
| Moduly backend | 12 aplikacji Django |
| Widoki frontend | 44 strony Next.js |
| Pliki testowe | 25 |
| Tryby podrozy | 9 |
| Rynek docelowy | Polska |
| Waluta | PLN |

---

## 🖼️ Podglad produktu

<table>
  <tr>
    <td width="50%"><img src="docs/staymap_wyszukaj.png" alt="Wyszukiwanie mapowe" width="100%" /></td>
    <td width="50%"><img src="docs/staymap_porownaj.png" alt="Porownywarka ofert" width="100%" /></td>
  </tr>
  <tr>
    <td align="center"><b>🔎 Wyszukiwanie mapowe</b></td>
    <td align="center"><b>⚖️ Porownywarka</b></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/staymap_ai.png" alt="Asystent AI" width="100%" /></td>
    <td width="50%"><img src="docs/staymap_host.png" alt="Panel gospodarza" width="100%" /></td>
  </tr>
  <tr>
    <td align="center"><b>🤖 Asystent AI</b></td>
    <td align="center"><b>🏠 Panel hosta</b></td>
  </tr>
</table>

<p align="center">
  <img src="docs/staymap_oferta.png" alt="Karta oferty" width="82%" />
</p>

<p align="center"><b>🛏️ Karta oferty - pelny widok szczegolow rezerwacji</b></p>

---

## 🏗️ Architektura

```text
Przegladarka / Mobile Web
        <-> HTTPS
Next.js 14 (SSR + CSR + App Router)
BFF proxy: /api/v1/[...path]
        <-> HTTP REST                 <-> WebSocket
             Daphne ASGI
     Django REST Framework      Django Channels
        <-> ORM/PostGIS  <-> Redis channel layer/cache/queue
      PostgreSQL 16 + PostGIS 3.4      Celery Worker + Beat
        <-> Integracje zewnetrzne
Nominatim | Overpass API | OpenAI/Groq | Google OAuth | SMTP
```

### ⚙️ Warstwy systemu

- **Frontend (Next.js 14)** - SSR/CSR, BFF proxy, nowoczesny UI.
- **API (Django + DRF)** - endpointy REST, JWT, throttling.
- **Realtime (Channels + Daphne)** - WebSocket dla czatu.
- **Async (Celery + Redis)** - e-maile, harmonogramy, automatyzacje.
- **Geo (GeoDjango + PostGIS)** - zapytania przestrzenne i ranking lokalizacji.

---

## 🧰 Stack

### Backend

- Python 3.12
- Django 5.1.x + DRF
- GeoDjango + PostGIS
- SimpleJWT + Google OAuth
- Django Channels + Daphne
- Celery + django-celery-beat
- Redis (cache, broker, channels)
- drf-spectacular (OpenAPI/Swagger)
- pytest + pytest-django + Faker
- ruff

### Frontend

- Next.js 14 (App Router), React 18, TypeScript
- Tailwind CSS, Radix UI
- Leaflet + react-leaflet + markercluster
- react-hook-form + zod
- Zustand, framer-motion
- Playwright (E2E)

### Infra

- Docker Compose
- Makefile
- GitHub Actions

---

## 🚀 Quick Start

> [!TIP]
> Najszybciej wystartujesz przez Docker + Makefile.

### Wymagania

- Docker Desktop
- `.env` w katalogu glownym (na bazie `.env.example`)

### Uruchomienie

```bash
make dev
```

Po starcie:

- Frontend: `http://localhost:3000`
- API: `http://localhost:8000`
- Swagger: `http://localhost:8000/api/schema/swagger-ui/`
- Admin: `http://localhost:8000/admin/`

### Pierwsza konfiguracja

```bash
make migrate
make superuser
make seed
```

### Profil Celery (opcjonalnie)

```bash
docker compose --profile celery up -d
```

---

## 🧪 Komendy developerskie

```bash
make dev
make down
make migrate
make migrations
make superuser
make seed
make test
make test-fast
make lint
```

---

## 🔌 API w skrocie

Prefiks: `/api/v1/`

| Obszar | Metody | Endpoint |
|---|---|---|
| Auth | `POST` | `auth/register/`, `auth/token/`, `auth/token/refresh/`, `auth/google/` |
| Profil | `GET`, `PATCH` | `auth/me/` |
| Listings | `GET` | `listings/search/`, `listings/{slug}/`, `listings/{slug}/price-calendar/` |
| Bookings | `POST`, `GET`, `DELETE` | `bookings/quote/`, `bookings/`, `bookings/me/`, `bookings/{uuid}/` |
| Host | `POST`, `GET`, `PATCH`, `DELETE` | `host/onboarding/start/`, `host/listings/`, `host/bookings/{uuid}/status/` |
| Moderacja | `GET`, `POST` | `admin/moderation/listings/`, `{uuid}/approve/`, `{uuid}/reject/` |
| Reviews | `POST`, `PATCH` | `reviews/`, `reviews/{uuid}/host-response/` |
| Messaging | `GET`, `POST` | `conversations/`, `conversations/{uuid}/messages/` |
| Discovery | `GET`, `POST` | `discovery/`, `compare/`, `compare/listings/` |
| AI | `POST`, `GET` | `ai/search/`, `ai/search/{session_id}/`, `ai/search/{session_id}/prompt/` |

WebSocket:

- `ws://localhost:8000/ws/conversations/{uuid}/?token=<JWT>`

---

## 🔐 Bezpieczenstwo i jakosc

- JWT w HTTP-only cookies + rotacja refresh tokenow.
- Role i permissiony: `IsAuthenticated`, `IsHost`, `IsAdmin`.
- Soft delete + UUID jako PK.
- AuditLog dla kluczowych zdarzen.
- MIME validation uploadow (Pillow + python-magic).
- Throttling dla auth/upload/AI.
- Monitoring przez Sentry.
- CI: ruff + pytest + Playwright.

> [!WARNING]
> `JWT_SECRET` po stronie Next.js musi byc zgodny z Django `SECRET_KEY`.

---

## 🛣️ Roadmap

- 🤖 **AI "Kiedy jechac?"** - rekomendacja najlepszego terminu.
- 🕒 **"W X godzin" (izochrony)** - wyszukiwanie po czasie dojazdu.
- 📸 **Pamietnik z podrozy** - zdjecia gosci po pobycie.
- 🎁 **Karty podarunkowe** - vouchery i realizacja w rezerwacji.
- 🗺️ **Mapa wspomnien** - historia podrozy usera na mapie.

---

## 📚 Dokumentacja

- `docs/StayMap_Dokumentacja_Biznesowa_v2.md`
- `docs/StayMap_Dokumentacja_Biznesowa_v2.pdf`
- `docs/StayMap_Dokumentacja_Biznesowa_v2.docx`

<details>
  <summary><b>Pokaz strukture monorepo</b></summary>

```text
staymap-polska/
├─ backend/
├─ frontend/
├─ docs/
├─ docker/
├─ docker-compose.yml
└─ Makefile
```

</details>

---

## 📄 Licencja

Aktualnie brak pliku licencji w repozytorium.
Jesli planujesz publikacje open source, dodaj `LICENSE` (np. MIT).

---

<p align="center">
  <b>StayMap Polska</b><br/>
  Mapa w centrum. AI po polsku. Uczciwe recenzje. Produkcyjna architektura.
</p>
