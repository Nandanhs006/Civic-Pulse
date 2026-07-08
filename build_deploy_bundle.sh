#!/bin/bash
# Civic Pulse - Production Deployment Bundle Builder Script
# This script compiles the frontend and packages the entire application into a standalone folder: ./deploy-bundle/

set -e

PROJECT_ROOT="/Volumes/DiskD/Civicpulse/Civic-Pulse"
BUNDLE_DIR="$PROJECT_ROOT/deploy-bundle"

echo "=== 1. Preparing Deploy Bundle Folder ==="
rm -rf "$BUNDLE_DIR"
mkdir -p "$BUNDLE_DIR"
mkdir -p "$BUNDLE_DIR/backend"
mkdir -p "$BUNDLE_DIR/frontend"

echo "=== 2. Compiling Frontend Production Assets ==="
cd "$PROJECT_ROOT/frontend"

if command -v npm &> /dev/null; then
    echo "[Build] Found npm. Installing frontend packages..."
    npm install
    echo "[Build] Compiling React+TypeScript bundle..."
    npm run build
    echo "[Build] Copying compiled dist/ folder into bundle..."
    cp -r dist "$BUNDLE_DIR/frontend/dist"
else
    echo "⚠️ WARNING: 'npm' command not found on this system."
    echo "Could not build production React bundle. Please install Node.js (https://nodejs.org) and run this script again."
    echo "Creating a mock template folder for now..."
    mkdir -p "$BUNDLE_DIR/frontend/dist"
    echo "<html><body><h1>Civic Pulse Production React SPA (Build Pending npm install)</h1></body></html>" > "$BUNDLE_DIR/frontend/dist/index.html"
fi

echo "=== 3. Packaging Backend Code ==="
cd "$PROJECT_ROOT"
echo "[Build] Copying FastAPI app files..."
cp -r backend/app "$BUNDLE_DIR/backend/app"
cp backend/requirements.txt "$BUNDLE_DIR/backend/requirements.txt"
cp backend/Dockerfile "$BUNDLE_DIR/backend/Dockerfile"

echo "=== 4. Packaging Infrastructure configurations ==="
cp docker-compose.yml "$BUNDLE_DIR/docker-compose.yml"
if [ -f "Civic_Pulse_Pitch_Deck.pptx" ]; then
    cp Civic_Pulse_Pitch_Deck.pptx "$BUNDLE_DIR/Civic_Pulse_Pitch_Deck.pptx"
fi
if [ -f "CIVIC_PULSE_PITCH_DECK.md" ]; then
    cp CIVIC_PULSE_PITCH_DECK.md "$BUNDLE_DIR/CIVIC_PULSE_PITCH_DECK.md"
fi
if [ -d "charts" ]; then
    cp -r charts "$BUNDLE_DIR/charts"
fi
if [ -d "spinnaker" ]; then
    cp -r spinnaker "$BUNDLE_DIR/spinnaker"
fi

# Write standalone deployment guide inside the bundle
cat << 'EOF' > "$BUNDLE_DIR/README_DEPLOY.md"
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

## ⚡ Load Balancing & Request Timeouts
The production configuration enforces strict timeouts to prevent hangs:
* **Load Balancer**: Requests route through Nginx (`frontend/nginx.conf`) upstream pool.
* **TCP Connection Handshake**: Nginx connect timeout is set to **5 seconds**.
* **Request Processing / Read Timeout**: FastAPI middleware and Nginx proxy read timeouts are set to **30 seconds**.
* **Client UI Timeout**: Axios requests time out in **30 seconds**.

## 🧪 Local Launch
If running locally from this standalone directory:
```bash
# 1. Start Postgres database, Redis, and Nginx proxy
docker compose up -d

# 2. Scale backend instances to run with Nginx load balancing
docker compose up -d --scale backend=2
```
EOF

echo "=== 5. Deployment Bundle Assembled Successfully ==="
echo "Bundle path: $BUNDLE_DIR"
echo "You can zip and submit this folder for the hackathon prototype link requirements!"
