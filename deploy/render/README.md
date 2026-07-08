# Free demo deploy on Render

Deploys Civic Pulse as **one free web service** (FastAPI serves the built React
SPA) plus a **free managed Postgres** — one URL, no CORS, **no credit card, no
API keys** (this branch uses Leaflet/OpenStreetMap maps and the mock AI
pipeline, so nothing paid is required).

## Deploy (Blueprint)

1. Push this branch to your GitHub fork.
2. Go to <https://dashboard.render.com> → **New +** → **Blueprint**.
3. Pick your repo. Render reads `render.yaml` and provisions:
   - `civic-pulse-db` — free Postgres
   - `civic-pulse` — free Docker web service (built from `Dockerfile.render`)
4. Click **Apply**. First build takes ~5–8 min (it builds the frontend, then
   the backend image).
5. Open the service URL: `https://civic-pulse.onrender.com` (exact name may get
   a suffix). That's your demo link.

The default admin login is seeded automatically: **admin@civicpulse.gov /
admin123**.

## Load full demo data (map issues, MPs, MLAs)

Startup only seeds an admin, wards, and a few sample issues. For a rich demo
(≈300 geolocated issues, MP/MLA hierarchy), run the seed once from the service's
**Shell** tab in the Render dashboard:

```bash
python -m app.scripts.seed_all
```

It's safe to run on the live Postgres and only needs to be done once.

## Notes & caveats

- **Free tier sleeps:** the web service spins down after ~15 min idle; the first
  request then takes ~50s to wake. Fine for a demo — just load it a minute before
  presenting.
- **Free Postgres expires in 90 days.** For a longer-lived demo, point
  `POSTGRES_*` at a persistent free Postgres like [Neon](https://neon.tech).
- **Uploads are ephemeral:** citizen audio/photos are written to the container
  disk and lost on restart. Acceptable for a demo; use GCS/S3 for persistence.
- **No API keys needed here.** If you later deploy the `feature/google-cloud-migration`
  branch, you'd add `GEMINI_API_KEY` / `VITE_GOOGLE_MAPS_API_KEY`.
