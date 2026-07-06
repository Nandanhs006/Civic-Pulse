# Civic Pulse - "People's Priorities"
*AI-Powered Constituency Development Planning Platform*

Civic Pulse is a multilingual, production-level platform where citizens can submit development requests via voice, text, or photos, and MP administrators can analyze, rank, and track these priorities alongside demographic context and infrastructure gaps using AI scoring algorithms.

---

## Technical Architecture

* **Frontend**: Vite + React + TypeScript, Leaflet Maps, Lucide-React, glassmorphic UI design system.
* **Backend**: Python FastAPI, SQLAlchemy ORM, SQLite/PostgreSQL, Redis token-bucket rate limiting.
* **Monitoring**: Prometheus (scraping FastAPI requests metrics) and Grafana.

---

## Getting Started (Phase 1: Local Development)

### 1. Running with Docker Compose (Recommended)
Spins up PostgreSQL, Redis, FastAPI, React Frontend, Prometheus, and Grafana:
```bash
docker compose up --build
```
* **Frontend Portal & Dashboard**: [http://localhost:5173](http://localhost:5173) (Or [http://localhost](http://localhost) if loaded via Nginx)
* **FastAPI Swagger API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **Prometheus metrics panel**: [http://localhost:9090](http://localhost:9090)
* **Grafana dashboard panel**: [http://localhost:3000](http://localhost:3000)

### 2. Running Locally (Alternative Manual Setup)

#### A. Backend Setup
1. Navigate to backend: `cd backend`
2. Create and activate a virtual environment: `python3 -m venv venv && source venv/bin/activate`
3. Install dependencies: `pip install -r requirements.txt`
4. Run FastAPI app server: `uvicorn app.main:app --reload`
* *Note*: Falls back to local in-memory dictionaries for rate-limiting and SQLite for databases if Postgres/Redis are down.

#### B. Frontend Setup
1. Navigate to frontend: `cd frontend`
2. Install dependencies: `npm install`
3. Start Vite dev server: `npm run dev`

---

## Administrative Sign-in Credentials
To access the MP Constituency Dashboard:
* **Username**: `admin@civicpulse.gov`
* **Password**: `admin123`

---

## Quality Assurance & Verification Commands

### 1. Backend Testing & Linting
Run commands inside the `backend/` directory:
* **Run Unit Tests**: `pytest`
* **Check Linting**: `flake8 app/ tests/`
* **Code Formatting**: `black app/ tests/`
* **Type checking check**: `mypy app/`

### 2. Frontend Testing & Linting
Run commands inside the `frontend/` directory:
* **Run Component Unit Tests**: `npm run test` (Vitest)
* **Verify TypeScript compiles**: `npm run typecheck`
* **Lint checks**: `npm run lint`
