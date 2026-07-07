# Implementation Plan: Civic Pulse - "People's Priorities"
*AI-Powered Constituency Development Planning Platform*

This plan outlines a production-level architecture, database schemas, directory structures, and service boundaries for the Civic Pulse platform, broken down into developmental phases.

---

## User Review Required

Please review the phased execution milestones and Spinnaker CD integration:
> [!IMPORTANT]
> **Phase 1 - Local Core Platform MVP**: Focuses on local containerized development. The backend uses a modular FastAPI layout (Core, DB, API, Services, Utils, custom Swagger specs). The frontend uses a Vite + React + TypeScript feature-based structure with local mock AI integrations.
> 
> **Phase 2 - CI/CD & Production Cloud Deployment**: Integrates automated testing via **GitHub Actions (CI)** and multi-cloud container deployment orchestrated by **Spinnaker (CD)** to a target Kubernetes cluster.
> 
> Running Spinnaker requires a dedicated control plane (typically Kubernetes). We will structure Helm charts for Civic Pulse so Spinnaker can manage rolling updates, manual judgments, and automated rollbacks.

---

## Proposed System Architecture (Phase 1 & Phase 2)

The following diagram illustrates the deployment flow from the developer pushing code to the live environment using GitHub Actions and Spinnaker:

```mermaid
graph TD
    Developer[Developer] -->|Git Push| GitHub[GitHub Repo]
    
    subgraph GitHub Actions CI
        GitHub -->|Trigger| CI[CI: Lint, Test & Type Check]
        CI -->|Build Docker Image| Register[Build & Push to GHCR]
    end
    
    subgraph Spinnaker CD Control Plane (Phase 2)
        Register -->|Image Push Event Trigger| Spinnaker[Spinnaker Pipeline]
        Spinnaker -->|1. Deploy to Staging K8s| Staging[Staging Cluster]
        Spinnaker -->|2. Manual Approval Gate| Gate{Approve Deploy?}
        Gate -->|Approved| ProdDeploy[3. Canary/Blue-Green Deploy]
    end
    
    subgraph Production K8s Cluster (Phase 2)
        ProdDeploy -->|Update ReplicaSets| ProdCluster[React Web & FastAPI API Pods]
    end
```

---

## Phase 1: Core Local Platform MVP

This phase establishes the baseline platform running locally in docker-compose.

### Directory Structure
```
Civic-Pulse/
├── README.md                  # Project overview and run instructions
├── docker-compose.yml         # Dev services (Postgres, Redis, Prometheus, Grafana)
├── backend/                   # FastAPI Backend
│   ├── app/
│   │   ├── main.py            # FastAPI app app init, routes, and custom Swagger setup
│   │   ├── core/              # Application core configuration (config.py, security.py)
│   │   ├── db/                # Database models (ward, suggestion, project, user)
│   │   ├── api/               # endpoints (auth, suggestions, projects, analytics)
│   │   ├── services/          # Business logic (ai_service, file_service, suggestion_service)
│   │   └── utils/             # Helpers and exceptions
│   ├── tests/                 # Unit and integration test suites
│   │   ├── conftest.py        # Pytest database fixtures and HTTP client setups
│   │   ├── test_auth.py
│   │   ├── test_suggestions.py
│   │   └── test_projects.py
│   └── requirements.txt
└── frontend/                  # Vite + React + TypeScript Frontend
    ├── index.html             # Vite mounting point
    ├── vite.config.ts
    ├── tsconfig.json
    └── src/
        ├── main.tsx           # React entry point
        ├── App.tsx            # Main layout & router
        ├── styles/            # CSS Glassmorphism color variables & micro-animations
        ├── context/           # AuthContext, ThemeContext
        ├── hooks/             # useAudioRecorder, useDebounce
        ├── services/          # Axios HTTP clients (suggestions, projects)
        └── components/        # Reusable UI (common, layouts, features)
```

### Technical Specifications
1. **Database Schema**: Managed via SQLAlchemy and Alembic migrations.
2. **OpenAPI & Swagger UI**: Configured at `/docs` with custom tags (`Auth`, `Suggestions`, `Projects`, `Analytics`) and Bearer JWT authentication testing capabilities.
3. **AI Pipeline & Weighting**:
   Whisper transcription and NLP tagging for multi-language suggestions. Priorities ($P$) computed via:
   \[
   P = w_1 \cdot \text{Suggestion Density} + w_2 \cdot \text{Infrastructure Gap Index} + w_3 \cdot \text{Population Deficiency Score}
   \]
4. **Rate Limiting & Monitoring**: Redis token bucket checks combined with Prometheus FastAPI metrics collection.

---

## Phase 2: CI/CD & Production Cloud Deployment

We split the pipeline into **Continuous Integration (GitHub Actions)** and **Continuous Delivery (Spinnaker)** to leverage advanced delivery strategies.

### 1. Continuous Integration (GitHub Actions CI)
Triggers on every `pull_request` and `push` to `main`:
* **Linting & Formatting**: Runs `black` and `flake8` for Python, and `ESLint` + `Prettier` for React.
- **TypeScript Type Check**: Runs `tsc --noEmit` to verify type safety.
- **Automated Tests**: Runs FastAPI `pytest` suites and React frontend unit tests.
- **Image Compilation**: Compiles release-tagged Docker containers and pushes them to **GitHub Container Registry (GHCR)** (or Docker Hub / AWS ECR).

### 2. Continuous Delivery (Spinnaker CD)
Spinnaker will run as our open-source, multi-cloud delivery orchestrator. We will configure it to connect to our container registry (GHCR/ECR) and deploy to a target Kubernetes cluster.

#### Infrastructure Components for Phase 2:
- **Helm Charts**: We will add a `/charts` directory to store Kubernetes manifests (`charts/backend`, `charts/frontend`) defining deployments, service definitions, ingress, and configmaps.
- **Spinnaker Halyard/Operator**: Configured with a Kubernetes Cloud Provider account.

#### Spinnaker CD Pipeline Workflow:
1. **Registry Trigger**: Spinnaker listens for new image tag events from the container registry (e.g., `civic-pulse-backend:latest`).
2. **Deploy to Staging Stage**: Spinnaker updates the staging environment in our Kubernetes cluster, pulling the latest built image.
3. **Automated Verification Stage**: Runs smoke tests against the staging endpoint.
4. **Manual Judgment Stage**: Pause pipeline execution in the Spinnaker UI, requiring administrative verification before deploying to production.
5. **Production Deploy Stage (Red/Black or Canary)**:
   - **Red/Black (Blue/Green)**: Spinnaker provisions a new ReplicaSet containing the updated application version. Once health checks pass, Spinnaker redirects service traffic to the new ReplicaSet and disables the old one, keeping it intact in case a quick rollback is triggered.
   - **Rollback**: If error rate metrics spike in Prometheus, Spinnaker automatically reverts traffic to the previous healthy ReplicaSet.

---

## Quality Control & Testing Specifications

To ensure high-grade production stability, we implement automated gates for code cleanliness, formatting consistency, static type safety, and logical testing.

### 1. Python Backend Quality Gates
* **Formatting (`black`)**: Automatically enforces uniform PEP 8 styling.
  - Command: `black app/ tests/`
* **Linting (`flake8`)**: Detects syntax errors, unused imports, and circular dependencies.
  - Configuration: Bound to `.flake8` (setting line length limits to 88 characters, matching Black).
  - Command: `flake8 app/ tests/`
* **Static Type Safety (`mypy`)**: Checks python dynamic annotations.
  - Command: `mypy app/`
* **Unit & Integration Testing (`pytest`)**:
  - Uses `backend/tests/conftest.py` to bootstrap a temporary SQLite (in-memory) or isolated Postgres test DB container, and sets up a mock database connection pool.
  - Uses `httpx.AsyncClient` to mock API queries against FastAPI routers to test core route response codes and validation schemas.
  - Command: `pytest --cov=app tests/`

### 2. Frontend React + TypeScript Quality Gates
* **Formatting (`prettier`)**: Formats visual CSS tokens and TSX blocks.
  - Command: `npm run format` (or `npx prettier --write src/`)
* **Linting (`eslint`)**: Configured with rules for React Hooks and strict TypeScript guidelines (`@typescript-eslint/parser`).
  - Command: `npm run lint` (or `eslint src/ --ext .ts,.tsx`)
* **TypeScript Safety Checking (`tsc`)**: Compiles code checks without writing outputs to verify correct prop parameters, interface signatures, and API payloads.
  - Command: `npm run typecheck` (or `npx tsc --noEmit`)
* **Unit Testing (`vitest` + `React Testing Library`)**:
  - Targets React component rendering, DOM layout events (e.g. entering details, clicking submit on feedback form), custom hooks tracking (e.g. voice recorder captures), and mock state propagation.
  - Command: `npm run test` (or `npx vitest run`)

---

## Verification Plan (Phase 1 & Phase 2)

### Automated Verification
1. **CI Runners**: Check that GitHub Actions pipelines run green.
2. **Quality Checks Execution**: Run local hooks:
   - Backend verification: `black app/ && flake8 app/ && mypy app/ && pytest`
   - Frontend verification: `npm run format && npm run lint && npm run typecheck && npm run test`
3. **Spinnaker Pipeline Checks**: Verify pipeline execution completes Staging deploy and waits for approval.

### Manual Verification
1. **Spinnaker Dashboard**: Access the Spinnaker UI (Deck) to verify service registry accounts and verify pipeline status.
2. **Live Inspection**: Test that production updates roll out with zero downtime.

---

## Hackathon Requirements Alignment & Google Cloud Integration

This section details how the current codebase aligns with the Google Hackathon parameters, and provides a blueprint for integrating Google Cloud Platform (GCP) services to achieve production-grade scale.

### 1. Gap Analysis & Proposed Tech Upgrades

| Hackathon Parameter | Current Code Status | Proposed GCP Upgrade |
| :--- | :--- | :--- |
| **AI/ML & Generative AI** | Mock text classification and scoring in `ai_service.py`. | **Gemini 1.5 Flash API**: Replace mock text analysis with direct prompts to categorize issues, translate to English, assess sentiment, and output a structured JSON priority score. |
| **Multimodal Vision** | Simple photo uploading without analysis. | **Gemini Multimodal Vision**: Pass citizen-uploaded photos of infrastructure issues directly to Gemini to analyze damage, detect severity, and classify category automatically. |
| **Language & Voice** | Mock transcription logic. | **Google Cloud Speech-to-Text API**: Natively convert uploaded citizen audio recordings (.wav/webm) to English-translated transcripts. |
| **Geospatial & Mapping** | Leaflet open-source mapping. | **Google Maps Platform**: Integrate Javascript API Heatmap layers for hotspot density visualization in the MP Dashboard. |
| **Storage & Data** | PostgreSQL & local `/uploads` directory. | **Google Cloud SQL (Postgres)** for DB, and **Google Cloud Storage (GCS)** buckets for media file uploads in `FileService`. |
| **Deployability** | Local Docker Compose. | **Google Cloud Run**: Package backend/frontend into serverless containers for scalable hosting. |

---

### 2. Code Implementation Blueprint (GCP Swaps)

#### A. Multimodal Gemini Integration (`backend/app/services/ai_service.py`)
Replace the mock analyzer with a wrapper calling the `google-generativeai` SDK:
```python
import google.generativeai as genai

class AIService:
    def __init__(self):
        genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
        self.model = genai.GenerativeModel('gemini-1.5-flash')

    def analyze_text(self, text: str, lang: str) -> dict:
        prompt = f"Analyze the following civic issue: '{text}'. Translate to English if needed. Output JSON with fields: english_translation, category (Roads/Water/Education/Health/Sanitation/Electricity/Safety/General), sentiment (Positive/Neutral/Negative), priority_score (1-100)."
        response = self.model.generate_content(prompt)
        return json.loads(response.text)

    def analyze_image(self, image_bytes: bytes) -> dict:
        # Multimodal Vision Analysis
        prompt = "Analyze this image showing a public infrastructure issue. Describe the issue, classify the category, and rate the severity from 1-100."
        response = self.model.generate_content([prompt, {"mime_type": "image/jpeg", "data": image_bytes}])
        return json.loads(response.text)
```

#### B. Cloud Run & GCS Storage Setup (`backend/app/services/file_service.py`)
Swap local file writing with Google Cloud Storage bucket uploads:
```python
from google.cloud import storage

class FileService:
    def __init__(self):
        self.client = storage.Client()
        self.bucket = self.client.bucket(os.environ.get("GCS_BUCKET_NAME"))

    def save_file(self, upload_file, subfolder: str) -> str:
        blob = self.bucket.blob(f"{subfolder}/{uuid.uuid4()}_{upload_file.filename}")
        blob.upload_from_file(upload_file.file)
        return blob.public_url
```

---

### 3. Deployed Prototype Link (Bundle & Build Strategy)

To generate a clean, standalone build folder ready for hosting or deployment:
1. **Frontend Production Build**:
   * Run `npm run build` inside `frontend/` to generate optimized production assets in `frontend/dist/`.
2. **Build Distribution Bundle**:
   * Create a folder `/deploy-bundle`.
   * Copy `backend/` into `deploy-bundle/backend/`.
   * Copy `frontend/dist/` into `deploy-bundle/frontend/dist/` (configured to be served as static files by the backend or via Nginx).
   * Bundle `docker-compose.yml` and a deploy script `deploy.sh` that pushes images to Google Artifact Registry and launches them on Google Cloud Run.
