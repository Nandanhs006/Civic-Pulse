# Deploy: Firebase Hosting (frontend + auth) + Render (backend) + Neon/Supabase (DB)

This is the **hybrid, all-free** setup:

```
┌─ Firebase Hosting (free, global CDN) ─┐        ┌─ Render (free web service) ─┐
│  React SPA  +  Firebase Phone Auth    │  ──►   │  FastAPI backend  /api/**   │
│  civic-pulse-7af0f.web.app            │  CORS  │  civic-pulse-j8nk.onrender  │
└───────────────────────────────────────┘        └──────────────┬──────────────┘
                                                                 ▼
                                              ┌─ Neon / Supabase (free Postgres) ─┐
                                              └────────────────────────────────────┘
```

- **Frontend + phone OTP auth** → Firebase Hosting (Spark plan, no card).
- **Backend API** → stays on Render (free, no card). *Firebase Hosting can't proxy
  to Render*, so the SPA calls Render **cross-origin** — CORS is already allowed for
  the `*.web.app` / `*.firebaseapp.com` domains in `backend/app/core/config.py`.
- **Database** → a free external Postgres (Neon or Supabase). No free SQL exists on
  Firebase/GCP, so we point Render's backend at Neon/Supabase.

---

## 1. One-time setup

```bash
npm install -g firebase-tools        # Firebase CLI
firebase login                       # log into the Google account that owns the project
```

The repo already has `.firebaserc` (project `civic-pulse-7af0f`) and `firebase.json`
(serves `frontend/dist`, SPA rewrites, asset caching).

**Firebase console → Authentication:**
- **Sign-in method → Phone → Enable.**
- **Settings → SMS region policy →** allow **India (+91)** (this fixes
  `auth/operation-not-allowed / SMS unable to be sent`).
- **Settings → Authorized domains →** `civic-pulse-7af0f.web.app` is added
  automatically; also add any custom domain and `localhost` for dev.

**Firebase web config** (client) must be in `frontend/.env` (gitignored) so Auth
works on the deployed site — see `frontend/.env.example`.

## 2. Build & deploy the frontend

```bash
cd frontend
npm run build:firebase        # bakes in the Render API URL + Firebase web config
cd ..
firebase deploy --only hosting
```

`build:firebase` sets `VITE_API_URL=https://civic-pulse-j8nk.onrender.com` so the SPA
calls the Render backend; `VITE_FIREBASE_*` come from `frontend/.env`. Live at
**https://civic-pulse-7af0f.web.app**.

> If your Render backend URL differs, change it in `frontend/package.json`
> (`build:firebase` script) before building.

## 3. Backend (Render) — env to set

In the Render service → **Environment**:

| Var | Value |
|---|---|
| `POSTGRES_SERVER` / `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | your **Neon/Supabase** connection details |
| `FIREBASE_SERVICE_ACCOUNT` | the Firebase **service-account JSON** (contents or a path) — needed to *verify* real OTP tokens |
| `BACKEND_CORS_ORIGINS` | *(only if using a custom Hosting domain)* comma-separated, e.g. `https://your-domain.com` |
| `SECRET_KEY` | a strong random string |

The `*.web.app` / `*.firebaseapp.com` origins are allowed by default, so no CORS
change is needed for the standard Firebase URL.

## 4. Database — free Postgres (Neon or Supabase)

1. Create a free project at **neon.tech** or **supabase.com**.
2. Copy the Postgres connection details into the Render env vars above.
3. On first boot the backend auto-creates tables, runs the idempotent column
   migrations, and seeds demo data (admin/PMO/MP users + ~300 issues).

## 5. Redeploy after changes

- **Frontend:** `cd frontend && npm run build:firebase && cd .. && firebase deploy --only hosting`
- **Backend:** push to the Render-connected branch (Render auto-deploys).

## Notes

- **Same code, two hosts.** Nothing forks the app — this branch only adds the
  Firebase config + a build script + CORS origins. The existing single-service
  Render deploy still works unchanged.
- **Demo mode still works.** With no `FIREBASE_SERVICE_ACCOUNT` on the backend and
  no `frontend/.env`, OTP falls back to demo code `123456`.
- **Issue photos** are bundled into the SPA (`/issue-images/*`) and served by
  Firebase Hosting, so the map images load same-origin with the frontend.
