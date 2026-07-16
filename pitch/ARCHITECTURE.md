# Civic Pulse — Architecture

## Stack at a glance

```
┌──────────────────────── One Render service (one URL, no CORS) ────────────────────────┐
│                                                                                        │
│   React + Vite + TypeScript SPA  ──build──►  served as static files by FastAPI         │
│        │  react-leaflet · lucide · custom i18n · Context (Auth/Theme/Lang)             │
│        ▼ (relative /api)                                                               │
│   FastAPI (Python 3.12)                                                                │
│        │  JWT auth · role scoping · rate-limit + timeout middleware                    │
│        │  routers: suggestions, safety, mps, mplads, analytics, airquality,            │
│        │           constituencies, hierarchy, projects, ward, civic, dialogflow        │
│        ▼                                                                               │
│   SQLAlchemy ORM  ──►  PostgreSQL (managed, free tier)   [SQLite for tests/local]      │
│                                                                                        │
│   Services: ai_service · spam_filter · issue_timeline · geo_service · safety_ai ·      │
│             air_quality · mplads · embedding · project · suggestion · stt/tts/translate │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

## Frontend

- **React + Vite + TypeScript**, `react-router` SPA. Build = `tsc && vite build`.
- **Maps**: `react-leaflet` + Leaflet + CARTO raster tiles. India `maxBounds` + `minZoom`
  keep the view inside the country. (Vector/MapLibre is a documented future upgrade.)
- **State**: React Context — `AuthContext` (JWT in `localStorage`, hydrates via `/auth/me`),
  `ThemeContext` (`data-theme` on `<html>` + CSS variables), `LanguageContext` (i18n).
- **Theming**: CSS custom properties in `src/styles/index.css`; light + dark, theme-inverting
  overlay tokens so subtle surfaces stay visible in both modes.
- **Responsiveness**: `useIsMobile()` hook + auto-fit grids; hamburger nav under 768px.

## Backend

- **FastAPI + SQLAlchemy + Pydantic**, `uvicorn`. Postgres in prod, SQLite for tests.
- **Auth**: JWT (OAuth2 password flow), roles `citizen | mp | mla | pmo`; `RequireRole` on
  the frontend, dependency scoping on the backend.
- **Schema management**: `Base.metadata.create_all()` on boot **creates missing tables**;
  idempotent `ALTER TABLE … ADD COLUMN IF NOT EXISTS` migrations run at startup to add
  newer columns to a persistent DB (self-healing — the fix that made the live map work).
- **Middleware**: sliding-window IP rate-limit (Redis + in-memory fallback), request timeout.

## AI pipeline

- **Deterministic by default** (`MOCK_AI_PIPELINE=True`): rule/signal-based categorization,
  sentiment, and priority — reproducible and free. No API key required to run the whole demo.
- **Gemini-ready**: set `GEMINI_API_KEY` to enable LLM categorization, STT, spam judgement,
  and credibility triage (with multi-key rotation fallback).
- **Stages**: spam filter → categorize → sentiment → priority → duplicate-detect (embeddings)
  → auto-route to department → timeline events.

## Data sources (open data)

| Source | Used for |
|---|---|
| **DataMeet** | Parliamentary + Assembly constituency GeoJSON boundaries |
| **MHA / india-geodata** | Police-station points (Bengaluru safety) |
| **CPCB via data.gov.in** | Live air-quality index (with fallback) |
| **MPLADS** | Constituency development-fund demand-vs-utilisation |
| **Wikimedia Commons / bundled** | Category-relevant issue photos (served same-origin) |

## Deployment (Render)

- **`Dockerfile.render`** — multi-stage: build the SPA, then a Python image that installs the
  backend and serves `frontend_dist` — **one image, one service, one URL, no CORS**.
- **`render.yaml`** blueprint — free web service + free managed Postgres; `SECRET_KEY` generated;
  no external API keys required (Leaflet/OSM maps + mock AI).
- **First boot** auto-seeds admin/PMO/MP users, wards, MPs/MLAs, and ~300 demo issues.
- Health check: `/health`.

## Demo accounts

Seeded demo logins exist for each role (PMO super-admin `pmo@civicpulse.gov`,
per-constituency MPs `mp.<constituency>@civicpulse.gov`, and a legacy admin).
**Passwords are not listed here** — see the seed scripts
(`backend/app/scripts/ingest_mps.py`, `backend/app/main.py`) or ask the team for
the demo login. Rotate these before any real deployment.

## Repo layout (key paths)

```
backend/app/
  api/v1/        FastAPI routers (suggestions, safety, mplads, analytics, …)
  services/      business logic + AI (ai_service, spam_filter, issue_timeline, …)
  db/models/     SQLAlchemy models
  scripts/       seed_all, seed_demo_issues, ingest_mps/mlas, migrations
frontend/src/
  pages/         Portal, LiveMap, Participate, AppSimulator, Pmo*, Login
  components/     features/{map,dashboard,pmo,safety}, common, layouts
  context/       Auth, Theme, Language
  i18n/          locale tables
frontend/public/issue-images/   bundled, same-origin issue photos
pitch/           this pitch kit (docs + screenshots)
```
