# Walkthrough: Phase 2 Implementation Complete
*Continuous Integration & Spinnaker Continuous Delivery*

We have successfully implemented and verified **Phase 2: CI/CD & Production Cloud Deployment** for the Civic Pulse project directly inside your VS Code workspace directory `/Volumes/DiskD/Civicpulse/Civic-Pulse/`.

This setup implements automated linting, type safety compilation checks, and test suites triggered by GitHub Actions, combined with Helm-packaged Kubernetes templates designed for Spinnaker CD pipelines. All python tests and linting check metrics compile green on the host machine.

---

## Technical Troubleshooting & Fixes Applied

To ensure compatibility with modern environments (including Python 3.14 on macOS), several critical fixes were resolved and implemented:
1. **Passlib & Bcrypt Version Compatibility**:
   - *Problem*: Modern `bcrypt >= 4.0.0` packages throw a `ValueError` on passwords exceeding 72 bytes, which crashes the older `passlib` context setup during internal startup checks.
   - *Solution*: Wrote a custom monkeypatch in [security.py](file:///Volumes/DiskD/Civicpulse/Civic-Pulse/backend/app/core/security.py) to intercept `bcrypt.hashpw`, truncate passwords to 72 bytes if necessary, and mock the deprecated `bcrypt.__about__` versions.
2. **SQLAlchemy & Python 3.14**:
   - *Problem*: `sqlalchemy==2.0.30` raises a `TypeError` when evaluating symbol line numbers on Python 3.14.
   - *Solution*: Upgraded dependency targets in [requirements.txt](file:///Volumes/DiskD/Civicpulse/Civic-Pulse/backend/requirements.txt) to `sqlalchemy==2.0.51`.
3. **psycopg2-binary Build Error**:
   - *Problem*: `psycopg2-binary==2.9.9` lacks pre-compiled wheels for Python 3.14 on Apple Silicon, requiring pg_config compilations that fail locally.
   - *Solution*: Upgraded package requirement targets to `psycopg2-binary==2.9.12` which supports macOS Python 3.14 wheels natively.

---

## What Was Implemented

### 1. Continuous Integration (GitHub Actions CI)
We created a workflow file [.github/workflows/ci.yml](file:///Volumes/DiskD/Civicpulse/Civic-Pulse/.github/workflows/ci.yml) that triggers automatically on every push or pull request to the `main` branch. It executes:
* **Backend Quality Checks**:
  - Python Environment setup (cached dependencies).
  - Code formatting check with `black`.
  - Style guide compliance check with `flake8` (using black-compatible rules in [.flake8](file:///Volumes/DiskD/Civicpulse/Civic-Pulse/.flake8)).
  - Static type safety verification with `mypy`.
  - Executes API and logic tests with `pytest`.
* **Frontend Quality Checks**:
  - Node.js environment setup (cached packages).
  - Web compliance check with `eslint`.
  - TypeScript compilation check with `tsc --noEmit`.
  - Executes unit component tests with `vitest` (configured template in [App.test.tsx](file:///Volumes/DiskD/Civicpulse/Civic-Pulse/frontend/src/App.test.tsx)).

### 2. Continuous Delivery (GitHub Actions CD)
We created a deployment workflow [.github/workflows/cd.yml](file:///Volumes/DiskD/Civicpulse/Civic-Pulse/.github/workflows/cd.yml) that triggers on every merge/push to `main` (after CI succeeds):
* Log in securely to **GitHub Container Registry (GHCR)** (`ghcr.io`) using the action's automatic repository tokens.
* Compile and tag Docker images for both backend (`civic-pulse-backend`) and frontend (`civic-pulse-frontend`).
* Assign labels and tag variants (`latest` and the short git commit SHA).
* Push release images to GHCR to trigger the Spinnaker delivery pipeline.

### 3. Spinnaker Deployment Orchestration
We created a pipeline definition template [spinnaker/pipeline.json](file:///Volumes/DiskD/Civicpulse/Civic-Pulse/spinnaker/pipeline.json):
* **Docker Registry Trigger**: Pipeline fires automatically when a new container tag `latest` is published to GHCR.
* **Stage 1 (Deploy Staging)**: Deploys the container to the `staging` namespace inside a target Kubernetes cluster using the specified manifest.
* **Stage 2 (Manual Judgment)**: Pauses execution and asks administrator to manually verify endpoint health inside the Spinnaker Deck console.
* **Stage 3 (Deploy Production)**: Uses a **Red/Black (Blue/Green)** rollout strategy. It launches the new application ReplicaSet, checks readiness probes, swaps service traffic to it, and disables the old version (with auto-rollback if container probes fail).

### 4. Helm-Packaged Kubernetes Manifests
We created a modular Helm chart layout inside `/charts/civic-pulse`:
* [Chart.yaml](file:///Volumes/DiskD/Civicpulse/Civic-Pulse/charts/civic-pulse/Chart.yaml): Establishes chart details and versions.
* [values.yaml](file:///Volumes/DiskD/Civicpulse/Civic-Pulse/charts/civic-pulse/values.yaml): Consolidates replica limits, image URLs, secret keys, databases, and Ingress hosts (`civicpulse.gov`).
* [backend-deployment.yaml](file:///Volumes/DiskD/Civicpulse/Civic-Pulse/charts/civic-pulse/templates/backend-deployment.yaml) & [backend-service.yaml](file:///Volumes/DiskD/Civicpulse/Civic-Pulse/charts/civic-pulse/templates/backend-service.yaml): Configures backend containers, readiness/liveness health checks, and database config bindings.
* [frontend-deployment.yaml](file:///Volumes/DiskD/Civicpulse/Civic-Pulse/charts/civic-pulse/templates/frontend-deployment.yaml) & [frontend-service.yaml](file:///Volumes/DiskD/Civicpulse/Civic-Pulse/charts/civic-pulse/templates/frontend-service.yaml): Configures Nginx-served frontend SPA container deployments.

---

## Running Verification Locally

### 1. Execute Backend Tests
Ensure your python virtual environment is initialized at the root folder level, then run pytest:
```bash
POSTGRES_PASSWORD="" PYTHONPATH=backend ./venv/bin/pytest backend/tests
```
*(Runs SQLite in-memory, passing all checks).*

### 2. Verify Linting and Typing
```bash
./venv/bin/black --check backend/app backend/tests
./venv/bin/flake8 backend/app backend/tests
./venv/bin/mypy backend/app --ignore-missing-imports
```
*(Successfully completes checks with zero warnings).*

---

## Google Cloud Integration & Build Bundle Upgrades (Hackathon Phase)

Following the official Google Cloud Hackathon requirements, we have integrated active Google Cloud resources into the application and created a compiler script to assemble a deployable package for submission.

### 1. Google Cloud Integrations Added

* **Gemini 1.5 Flash API**:
  * Integrated inside [ai_service.py](file:///Volumes/DiskD/Civicpulse/Civic-Pulse/backend/app/services/ai_service.py) using the official `google-generativeai` SDK.
  * Translates multi-language grievances, tags categories, tracks sentiment, and scores priority levels dynamically from 1 to 100 based on urgency.
  * Retains a heuristic rule fallback if no key is present to guarantee offline local test suites pass.
* **Google Cloud Storage (GCS)**:
  * Integrated inside [file_service.py](file:///Volumes/DiskD/Civicpulse/Civic-Pulse/backend/app/services/file_service.py) using the official `google-cloud-storage` SDK.
  * Saves citizen media files (uploaded audio and photos) directly to GCS buckets when configured, with automatic fallback to local directory saving for dev.

### 2. Python 3.12 Virtual Environment
* Rebuilt the local virtual environment (`venv`) to run on **Python 3.12.13** (matching the production container base image).
* Ran all pytest suites and static typing checks, ensuring 100% test compatibility and stability.

### 3. Production Compilation & Assembled Build Bundle
* Created [build_deploy_bundle.sh](file:///Volumes/DiskD/Civicpulse/Civic-Pulse/build_deploy_bundle.sh), which automates compiling React frontend assets (`npm run build`) and packaging the backend + frontend files into a standalone `/deploy-bundle/` folder.
* Generated a copy-pasteable guide [README_DEPLOY.md](file:///Volumes/DiskD/Civicpulse/Civic-Pulse/deploy-bundle/README_DEPLOY.md) inside the bundle mapping how to deploy the container to **Google Artifact Registry** and **Google Cloud Run**.
