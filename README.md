# Civic Pulse - "People's Priorities"
*AI-Powered Constituency Development Planning & Sentiment Mapping Platform*

Civic Pulse is an enterprise-ready, multilingual civic engagement and decision-support platform. It empowers citizens to submit localized infrastructure and community developmental requests via voice recordings, text, or photos, while providing Members of Parliament (MPs) and local administrators with an AI-prioritized mapping dashboard to align funding (e.g., MPLADS) with real-world public demand.

---

## Key Features

* **Multilingual Input Ingestion**: Supports voice recording captures directly from the web client, piping audio requests to an AI Whisper transcription and translation interface.
* **Geographic Sentiment Heatmaps**: Integrates Leaflet GIS coordinate markers color-coded by urgency to visualize demand hotspots in real time.
* **Algorithmic Work Prioritization**: Ranks constituency project proposals using a multi-factor priority index.
* **Local Developer Fallbacks**: Gracefully degrades to local in-memory dictionaries for rate-limiting and SQLite schemas when Redis or PostgreSQL servers are down.
* **Full Prometheus Instrumentor**: Exposes endpoint durations, request speeds, and response logs, pre-configured for Grafana visualization.

---

## System Architecture (MVP Flow)

The following diagram illustrates how the Phase 1 local MVP orchestrates requests and runs priorities:

```mermaid
graph TD
    Citizen[Citizen Web Client] -->|1. Submit Voice/Text/Photo| FastAPI[FastAPI Backend app.main]
    FastAPI -->|2. Redis Rate Check / Local Fallback| RateLimit[Rate Limit Middleware]
    FastAPI -->|3. Audio / Text Analysis| AIService[AI Processing Service]
    FastAPI -->|4. Save Uploaded Files| FileService[File Upload Service]
    FastAPI -->|5. Dynamic Priority Ranking| ProjectService[Project Ranking Service]
    
    FastAPI -->|6. Data Persistency| DB[(PostgreSQL / SQLite fallback)]
    FastAPI -->|7. Export Metrics| Prometheus[Prometheus Exporter]
    
    Admin[MP/Admin Dashboard] -->|8. Query Map & Analytics| FastAPI
    Prometheus -->|9. Scrape Metrics| Grafana[Grafana Dashboard]
```

---

## Phase 1: Architecture & Directory Structure

```
Civic-Pulse/
├── README.md                  # Project overview and run instructions
├── docker-compose.yml         # Dev services (Postgres, Redis, Prometheus, Grafana)
├── backend/                   # FastAPI Python Backend
│   ├── app/
│   │   ├── main.py            # API boot entrypoint, CORS, Static routes, and DB seeding
│   │   ├── core/              # Config settings, logging, and security hashes
│   │   ├── db/                # SQLAlchemy session setup and models (User, Ward, Suggestion, Project)
│   │   ├── api/               # API Router v1 endpoints and Dependency Injection (deps.py)
│   │   ├── services/          # Pure business logic (ai_service, file_service, suggestion_service, project_service)
│   │   └── middleware/        # Redis token-bucket rate limiter
│   └── tests/                 # Integration test suites (Pytest)
└── frontend/                  # Vite + React + TypeScript Frontend
    ├── index.html             # Vite SPA HTML template mounting frame
    ├── nginx.conf             # Production container Nginx SPA router & API proxy reverse rules
    └── src/
        ├── App.tsx            # Auth router and layout wrapper
        ├── styles/            # HSL layout variables, Glassmorphism, and micro-animations
        ├── context/           # Global AuthContext provider
        ├── hooks/             # useAudioRecorder wrapper utilizing Web MediaRecorder API
        ├── components/        # Sidebar structure, MapView, Analytics, and ProjectPrioritizer cards
        └── types/             # Shared TypeScript type signatures
```

---

## Technical Specifications

### The AI Priority Score Algorithm
The prioritization score ($P$) is computed dynamically inside `project_service.py` to evaluate public priority values for wards on a scale of 1 to 100:

\[
P = w_1 \cdot \text{Suggestion Density} + w_2 \cdot \text{Infrastructure Gap Index} + w_3 \cdot \text{Population Deficiency Score}
\]

Where:
* **Suggestion Density** ($w_1 = 0.4$): $\frac{\text{Active unresolved suggestions in Ward}}{\text{Ward Area in sq. km}}$
* **Infrastructure Gap Index** ($w_2 = 0.4$): Multi-sector deficiency score (0-10) pulled from demographic ward indexes.
* **Population Deficiency Score** ($w_3 = 0.2$): Normalized ward size weights to balance representation.

---

## Running the Platform (Phase 1 Local Setup)

### Option A: Running with Docker Compose (Recommended)
This boots up the complete stack, including DB, cache, API services, client panels, and tracking tools:
```bash
docker compose up --build
```
* **Vite React Frontend SPA**: [http://localhost:5173](http://localhost:5173) (Or [http://localhost](http://localhost) Nginx proxy)
* **FastAPI Swagger API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **Prometheus Metrics Panel**: [http://localhost:9090](http://localhost:9090)
* **Grafana Dashboard Panel**: [http://localhost:3000](http://localhost:3000)

### Option B: Manual Local Setup (Without Docker)

#### 1. Backend Service Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
*Note: Automatically falls back to an in-memory SQLite database (`sqlite:///./civic_pulse.db`) and localized memory cache for rate-limiting if PostgreSQL and Redis instances are unreachable.*

#### 2. Frontend React Setup
```bash
cd frontend
npm install
npm run dev
```

---

## Dashboard Authentication Credentials
Administrative features on the MP dashboard are locked behind JWT verification. Seed credentials populated on first boot:
* **Email User**: `admin@civicpulse.gov`
* **Password**: `admin123`

---

## Quality Control & Verification Commands

To maintain code standards, execute these validation commands in your local workspace:

### 1. Python Backend Quality Checks
Run inside the `backend/` directory:
* **Format verification**: `black --check app/ tests/` (Run `black app/ tests/` to auto-format)
* **Style lint check**: `flake8 app/ tests/`
* **Static type verify**: `mypy app/`
* **Execute Test Suite**: `pytest`

### 2. Frontend React + TS Quality Checks
Run inside the `frontend/` directory:
* **Run Unit Tests**: `npm run test` (Vitest engine)
* **TypeScript compile validation**: `npm run typecheck` (tsc validation)
* **Run ESLint checks**: `npm run lint`
