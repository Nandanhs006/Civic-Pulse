#!/usr/bin/env bash
#
# Civic Pulse — one-command local setup.
# Provisions Postgres + Redis (Docker), the backend venv, seeds ALL data,
# and installs frontend deps. Idempotent — safe to re-run.
#
# Usage:  ./setup.sh              # seed with the default ~300 demo issues
#         ./setup.sh 500          # seed with 500 demo issues
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

log()  { printf "\n\033[1;36m==> %s\033[0m\n" "$1"; }
warn() { printf "\033[1;33m[warn]\033[0m %s\n" "$1"; }
die()  { printf "\033[1;31m[error]\033[0m %s\n" "$1"; exit 1; }

# --- 0. prerequisites -------------------------------------------------------
command -v docker  >/dev/null 2>&1 || die "docker not found — install Docker Desktop and re-run."
command -v python3 >/dev/null 2>&1 || die "python3 not found — install Python 3.12+ and re-run."
HAVE_NPM=1
command -v npm >/dev/null 2>&1 || { HAVE_NPM=0; warn "npm not found — frontend install will be skipped."; }

# --- 1. docker daemon -------------------------------------------------------
log "Checking Docker daemon"
if ! docker info >/dev/null 2>&1; then
  if [ "$(uname)" = "Darwin" ]; then
    warn "Docker daemon not running — trying to start Docker Desktop…"
    open -a Docker >/dev/null 2>&1 || true
    for _ in $(seq 1 60); do
      if docker info >/dev/null 2>&1; then break; fi
      sleep 2
    done
  fi
  docker info >/dev/null 2>&1 || die "Docker daemon is not running. Start Docker and re-run."
fi

# --- 2. Postgres + Redis (creds match backend defaults) ---------------------
log "Starting Postgres + Redis containers"
if docker ps -a --format '{{.Names}}' | grep -qx civic_pg; then
  docker start civic_pg >/dev/null
else
  docker run -d --name civic_pg \
    -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=civic_pulse \
    -p 5432:5432 postgres:15-alpine >/dev/null
fi
if docker ps -a --format '{{.Names}}' | grep -qx civic_redis; then
  docker start civic_redis >/dev/null
else
  docker run -d --name civic_redis -p 6379:6379 redis:7-alpine >/dev/null
fi

log "Waiting for Postgres to accept connections"
PG_READY=0
for _ in $(seq 1 45); do
  if docker exec civic_pg pg_isready -U postgres >/dev/null 2>&1; then PG_READY=1; break; fi
  sleep 1
done
[ "$PG_READY" = "1" ] || die "Postgres did not become ready in time."

# --- 3. backend virtualenv + dependencies -----------------------------------
log "Setting up backend virtualenv + dependencies"
cd "$ROOT/backend"
[ -d venv ] || python3 -m venv venv
./venv/bin/pip install -q --upgrade pip
./venv/bin/pip install -q -r requirements.txt

# --- 4. seed all data (tables + MPs + Karnataka MLAs + demo issues) ---------
log "Seeding data (this fetches MP/MLA data online; falls back to bundled cache)"
./venv/bin/python -m app.scripts.seed_all "$@"

# --- 5. frontend dependencies -----------------------------------------------
if [ "$HAVE_NPM" = "1" ]; then
  log "Installing frontend dependencies"
  cd "$ROOT/frontend"
  npm install
fi

# --- done -------------------------------------------------------------------
cat <<'DONE'

============================================================
  ✅ Civic Pulse setup complete.

  Start the app (two terminals):

    # backend  (seeds wards + admin@civicpulse.gov on first start)
    cd backend && ./venv/bin/uvicorn app.main:app --port 8000

    # frontend
    cd frontend && npm run dev        # http://localhost:5173

  Logins:
    PMO : pmo@civicpulse.gov / pmo@india
    MP  : mp.<constituency>@civicpulse.gov / mp@123   (e.g. mp.wayanad@…)

  Live map: http://localhost:5173/map     API docs: http://localhost:8000/docs
============================================================
DONE
