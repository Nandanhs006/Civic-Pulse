# Civic Pulse — Feature Catalog

> *Bharat · People's Priorities* — an India-wide, AI-assisted civic engagement
> platform connecting citizens, MPs/MLAs, and the PMO across the full grievance
> lifecycle: **report → route → resolve → track**.

This document is the complete, current inventory of what the product does. It is
the source material for [PITCH_DECK.md](PITCH_DECK.md).

---

## 1. Citizen intake (multi-channel, multilingual)

| Channel | What it does |
|---|---|
| **Web Portal** (`/`) | Submit a grievance with text, voice recording, photo and GPS/constituency. Returns a **trackable Complaint Reference ID**. |
| **Live Map** (`/map`) | Public India-wide map of all reported issues. |
| **Mobile app (simulated)** (`/simulator`) | Native-app mock with an **offline queue + auto-sync on reconnect** (idempotent by client UUID). |
| **WhatsApp Business bot** (simulated) | Conversational intake via a Dialogflow-style webhook ("report" / "status" / 8-char code lookup). |
| **SMS gateway** (simulated) | Feature-phone users text a shortcode; the gateway POSTs to an `/sms` webhook. |
| **Voice** | Speech-to-text preview (Gemini / mock Whisper) so citizens speak grievances in their own language. |

- **10+ Indian languages** via a custom i18n layer (English source of truth, `t(key)`),
  with Devanagari/Bengali/Tamil/Telugu/Kannada/Malayalam/Gujarati/Gurmukhi/Oriya fonts.
- **Light/dark theme**, fully responsive (phone → desktop).

## 2. AI pipeline (assistive, deterministic-by-default)

- **Categorization** — issue → one of 8 sectors (Water, Roads, Education, Health,
  Sanitation, Public Spaces, Electricity, Safety).
- **Sentiment** — Negative / Neutral / Positive.
- **Priority scoring** — deterministic signal-based score (1–100); optional Gemini.
- **Duplicate detection** — embedding-based clustering so true complaint volume is
  visible and duplicates don't spam dashboards.
- **Spam / test-entry filter** — conservative filter drops obvious test/gibberish
  submissions **before persistence**, so they never reach the map, routing, or analytics.
- **Auto-routing** — routine issues are auto-assigned to the correct government
  department and advanced to *Assigned*; only critical/ambiguous ones wait for MP review.
- Runs in **mock mode by default** (no API key needed) for a zero-cost demo; plugs
  into Gemini when a key is supplied (incl. multi-key rotation fallback).

## 3. Issue lifecycle & tracking

- **E-commerce-style timeline**: Received → Reviewing → Assigned → In Progress → Resolved.
- **Public tracking codes** (`CP-XXXXXXXX`) — anyone can track status without login via a floating **Track** button.
- Stage events are timestamped and monitorable by MPs and local bodies.

## 4. MP / MLA tools

- **Issues Inbox** — "Needs your review" vs "All" tabs. AI has already triaged and
  auto-assigned most issues; the MP only handles exceptions.
- **Approve / reassign** an issue to any of 9 departments (BWSSB, BESCOM, PWD, etc.).
- **Constituency-scoped** views (an MP sees only their constituency; duplicates hidden).
- **Individual MP dashboard** (`/mp`) — grievance mix, AI-prioritized projects, performance.

## 5. PMO Command Center (`/pmo`)

- **Analytics dashboard** — total complaints, avg response latency (TAT), resolution
  rate, resolution pipeline (received→resolved), category distribution, sentiment ratio.
- **Representative Directory** — every constituency's MP + MLA.
- **Performance Index / Leaderboard** (`/pmo/leaderboard`) — governance scores ranked.
- **Per-MP drill-down** (`/pmo/mp/:id`).
- **MPLADS funds** — demand-vs-funds analysis (constituency development-fund utilisation).
- Framed as running over Cloud SQL / BigQuery-style federated analytics ("Live Sync").

## 6. Women-safety SOS (Bengaluru-focused)

- **One-tap SOS** with slide-to-confirm and a direct **Call 112** action (avoids false alarms).
- **Broadcasts an anonymized alert to nearby CivicPulse users** (not just trusted contacts)
  and **flags the area for the local MP** to improve security — data-driven safety governance.
- **Response loop** — nearby users can *Acknowledge / Call 112 / Navigate*; the victim sees
  "N aware / responding" and an **"I'm safe"** control; optional precise-location sharing.
- **Community SOS feed** — incidents with photo + chat; an **AI credibility triage** scores
  real vs spam (advisory badge only — never suppresses a real alert).
- **Bengaluru police-station data + boundaries**, nearest-station routing, "Near me" panel
  (police, garbage points, public help centres, Aadhaar centres). SOS is gated to the city.

## 7. The "Participate" hub — 9 civic sub-apps (`/participate`)

| App | Theme | What it is |
|---|---|---|
| **StreetMapper** | Geospatial | GPS-pin issue reporter (drag-to-locate, voice, **multi-photo**, OTP verification, MediaPipe edge classifier). |
| **CivicFund** | Budgeting | Participatory budgeting — citizens vote on where development funds go. |
| **Aegis AI Redress** | AI Redressal | AI-assisted grievance redressal workflow. |
| **CivicTimeline** | Issue Tracking | SeeClickFix-style ticket list + live per-issue timeline & comments. |
| **Hotspot Tracker** | Crisis Map | Crowdsourced incident locator; heatmaps of active grievances / distress hotspots. |
| **Command Dispatch** | Unified Dispatch | Admin console to review incoming grievances and route accountability to ward officers. |
| **Ward Directory** | Ward Committee Network | Directory of ward committees / local reps. |
| **CityPulse IoT** | IoT Brain | City-brain view for IoT / sensor-driven signals. |
| **Constituency Mailbox** | Mayor Mailbox | Citizens propose long-term policy/structural changes; MP team reviews periodically. |

## 8. Maps & open-data

- **Leaflet + CARTO** raster basemap, **India-bounded** (can't pan/zoom out of India), saffron accent.
- **Constituency boundaries** — Parliamentary (PC) + per-state Assembly (AC), toggleable.
- **Layers control** — Issues / Air quality / Safety, with fit-to-hotspots on toggle.
- **Live AQI** from CPCB (data.gov.in) with graceful fallback; hotspot detail shows
  area, constituency, nearest police station, and a realistic history trend.
- **Data sources**: DataMeet (boundaries), MHA (police points), CPCB (AQI),
  MPLADS, locally-bundled issue photos.

## 9. Platform / engineering

- **One-service deploy** — a single Docker image (`Dockerfile.render`) builds the SPA and
  serves it from FastAPI (same-origin, no CORS), plus a free managed Postgres — no API keys required.
- **Self-healing schema** — idempotent boot-time migrations add new columns on start, so a
  persistent deploy DB never drifts.
- **Auto-seed on first boot** — admin/PMO/MP users, wards, MPs/MLAs, and ~300 demo issues
  across India for an instant live demo.
- **Rate limiting**, request-timeout middleware, JWT auth with role scoping.
- **39 backend tests** green; typed React frontend (`tsc` clean).
