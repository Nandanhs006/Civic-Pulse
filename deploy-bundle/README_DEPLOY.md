# Civic Pulse - Standalone Production Deploy Bundle

This folder contains the complete, packageable production distribution of Civic Pulse, ready to be deployed to Google Cloud or a staging Kubernetes cluster.

## 🚀 Deployed Prototype Links & Google Cloud Run Setup

To deploy the backend and static frontend quickly using Google Cloud Run:

### 1. Build and push image to Google Artifact Registry
```bash
# Set your GCP Project ID
export PROJECT_ID="your-google-cloud-project-id"

# Configure Docker Authentication for Google Cloud
gcloud auth configure-docker us-central1-docker.pkg.dev

# Create an Artifact Registry Repository
gcloud artifacts repositories create civic-pulse-repo \
    --repository-format=docker \
    --location=us-central1

# Build the Production Container
docker build -t us-central1-docker.pkg.dev/$PROJECT_ID/civic-pulse-repo/backend:latest ./backend

# Push to Google Cloud Registry
docker push us-central1-docker.pkg.dev/$PROJECT_ID/civic-pulse-repo/backend:latest
```

### 2. Launch on Google Cloud Run
Run the container as a serverless instance. Inject your Google Cloud SQL database settings and Gemini API key as environment variables:
```bash
gcloud run deploy civic-pulse-backend \
    --image=us-central1-docker.pkg.dev/$PROJECT_ID/civic-pulse-repo/backend:latest \
    --platform=managed \
    --region=us-central1 \
    --allow-unauthenticated \
    --set-env-vars="GEMINI_API_KEY=AIzaSyYourKeyHere,POSTGRES_SERVER=your_cloud_sql_ip,POSTGRES_USER=postgres,POSTGRES_PASSWORD=your_db_password,POSTGRES_DB=civic_pulse"
```

Once the deploy completes, Google Cloud will output a live **Service URL** (e.g. `https://civic-pulse-backend-12345.a.run.app`). This is your **Deployed Prototype Link** to submit!

## 🧪 Local Launch
If running locally from this standalone directory:
```bash
# 1. Start Postgres database and Redis services
docker compose up -d postgres redis

# 2. Run backend (runs SQLite if Postgres env is omitted)
POSTGRES_PASSWORD="" PYTHONPATH=backend python3 -m uvicorn app.main:app --port 8001 --reload
```
