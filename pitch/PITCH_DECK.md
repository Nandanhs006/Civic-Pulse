# Civic Pulse — Pitch Deck

> Slide-by-slide content for a PPT. Each slide has a **title**, **on-slide bullets**,
> **speaker notes**, and a **suggested image** from [`screenshots/`](screenshots).
> Paste bullets onto slides and drop in the referenced screenshot. 16:9.
>
> Full detail: [FEATURES.md](FEATURES.md) · [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Slide 1 — Title

**Civic Pulse**
*Bharat · People's Priorities*

- India-wide, AI-assisted civic engagement platform
- Report → Route → Resolve → Track — one loop, every channel
- Team · Hack2Skill · [live demo URL]

> **Notes:** One line to say it out loud: "Civic Pulse turns a citizen's complaint
> into an accountable, trackable action — and gives every MP and the PMO the data to act."
> **Image:** `screenshots/portal.png`

---

## Slide 2 — The problem

- **200M+ urban Indians** have no reliable way to report a civic issue and *see it resolved*.
- Complaints vanish into siloed departments; no ID, no status, no accountability.
- Representatives (MPs/MLAs/PMO) lack a **real-time, data-driven** view of what their
  constituents actually need — decisions run on anecdote, not signal.
- Existing tools are single-channel, English-only, and city-specific.

> **Notes:** Frame it as a *two-sided* gap — citizens can't track, governments can't see.

---

## Slide 3 — The solution

**One platform, the full grievance lifecycle:**

1. **Report** — web, mobile, WhatsApp, SMS or voice, in 10+ Indian languages.
2. **Route** — AI categorizes, de-dupes, filters spam, and auto-assigns to the right department.
3. **Resolve** — MPs handle only what needs attention; the rest is auto-triaged.
4. **Track** — every issue gets a public `CP-XXXXXXXX` code and an e-commerce-style timeline.

> **Notes:** Emphasise "AI does the triage, humans do the judgement."
> **Image:** `screenshots/participate-civictimeline.png`

---

## Slide 4 — Live civic map

- India-bounded map of **300+ geolocated grievances** with severity colouring.
- Layers: **Issues · Air Quality (live CPCB) · Safety** — fit-to-hotspot on toggle.
- Parliamentary + Assembly **constituency boundaries**, drill-down detail with photos,
  nearest police station, and AQI history.

> **Notes:** This is the "wow" visual — real Indian coordinates, real open data.
> **Image:** `screenshots/live-map.png`

---

## Slide 5 — Citizen portal

- Submit with **text · voice · photo · GPS/constituency** in one flow.
- Instant **Complaint Reference ID** to track later.
- **AI spam filter** silently drops test/gibberish so dashboards stay clean.
- Multilingual, light/dark, mobile-first.

> **Notes:** Show the reference-ID + timeline appearing right after submit.
> **Image:** `screenshots/portal.png`

---

## Slide 6 — AI pipeline

- **Categorize · Sentiment · Priority (1–100) · Duplicate-detect · Spam-filter · Auto-route.**
- **Deterministic by default** — reproducible and $0 to run; **Gemini-ready** when a key is added.
- Result: **~80% of issues auto-handled**; MPs see only the exceptions.

> **Notes:** Stress reliability — mock mode means the demo never breaks on a rate limit.

---

## Slide 7 — MP / MLA tools

- **Issues Inbox**: "Needs review" vs "All" — AI has pre-triaged and assigned most.
- One-click **approve / reassign** to any of 9 government departments.
- Constituency-scoped, duplicates hidden, per-MP performance dashboard.

> **Notes:** "The MP's job shrinks from 300 tickets to the 20 that actually need a decision."
> **Image:** `screenshots/mp-dashboard.png`

---

## Slide 8 — PMO Command Center

- National view: **total complaints, avg TAT, resolution rate, resolution pipeline**.
- Category distribution + sentiment ratio across the country.
- Representative directory, **governance leaderboard**, per-MP drill-down.

> **Notes:** This is the "government-buyer" slide — top-down accountability.
> **Image:** `screenshots/pmo-analytics.png` (backup: `screenshots/pmo-leaderboard.png`)

---

## Slide 9 — Women-safety SOS

- One-tap SOS (slide-to-confirm + **Call 112**) — Bengaluru pilot.
- **Broadcasts an anonymized alert to nearby users** *and* flags the area for the local MP.
- Response loop: *Acknowledge / Navigate / I'm safe*; community feed with **AI credibility triage**.
- Turns incidents into **data that drives safety investment**.

> **Notes:** Dual value — immediate help + long-term policy signal. Advisory AI never suppresses.

---

## Slide 10 — Participate: 9 civic apps

- **StreetMapper** (GPS reporter) · **CivicFund** (participatory budgeting) · **Aegis AI Redress**
- **CivicTimeline** (tracking) · **Hotspot Tracker** (crisis heatmap) · **Command Dispatch**
- **Ward Directory** · **CityPulse IoT** · **Constituency Mailbox** (policy suggestions)

> **Notes:** One hub, nine focused civic-tech patterns — breadth of the platform.
> **Image:** `screenshots/participate-hub.png`

---

## Slide 11 — Meets citizens where they are

- **Multi-channel intake**: Web · Mobile app · WhatsApp bot · SMS · Voice.
- **Offline-first** mobile with auto-sync on reconnect (idempotent).
- **10+ Indian languages**; feature-phone users included via SMS.

> **Notes:** Digital-inclusion story — not just an app for smartphone owners.
> **Image:** `screenshots/simulator.png`

---

## Slide 12 — Built for mobile

- Fully responsive: hamburger nav, single-column layouts, phone-sized bottom sheets.
- Same experience on a ₹6,000 Android as on desktop.

> **Notes:** Show the phone screenshots side by side.
> **Images:** `screenshots/portal.mobile.png`, `screenshots/live-map.mobile.png`

---

## Slide 13 — Architecture & data

- **One Docker service** on Render: FastAPI serves the React SPA (no CORS) + free Postgres.
- **Self-healing schema** + auto-seed → a live, populated demo on first boot, **no API keys**.
- Open data: **DataMeet** (boundaries), **CPCB** (AQI), **MHA** (police), **MPLADS** (funds).
- FastAPI · SQLAlchemy · React/Vite/TS · Leaflet · 39 backend tests green.

> **Notes:** De-risks adoption — cheap to host, reproducible, open-data-backed.
> **Image:** `screenshots/pmo-mp-detail.png`

---

## Slide 14 — Impact & roadmap

**Today**
- End-to-end lifecycle live; 300+ demo issues; PMO/MP/citizen roles; Bengaluru safety pilot.

**Next**
- Real department integrations (BBMP/BWSSB/BESCOM APIs) · SMS/WhatsApp go-live ·
  vector maps (MapLibre) · production Gemini · expand safety pilot city-by-city.

> **Notes:** Clear line from working demo → pilot → scale.

---

## Slide 15 — Ask / close

- Piloting with **one municipal body / MP office**.
- Looking for: **civic-data partnerships, a pilot constituency, and mentorship**.
- **Civic Pulse — every voice on the map, every issue on the clock.**

> **Notes:** End on the tagline. Return to the live demo URL.
> **Image:** `screenshots/participate-hub.png`

---

### Screenshot index

| File | Page |
|---|---|
| `portal.png` / `.mobile` | Citizen portal |
| `live-map.png` / `.mobile` | Live civic map |
| `simulator.png` / `.mobile` | Mobile/SMS/WhatsApp simulator |
| `participate-hub.png` | Participate hub (9 apps) |
| `participate-streetmapper.png` | StreetMapper GPS reporter |
| `participate-civicfund.png` | Participatory budgeting |
| `participate-aegis-ai.png` | AI redressal |
| `participate-civictimeline.png` / `.mobile` | Issue tracking timeline |
| `participate-hotspot-tracker.png` | Crisis heatmap |
| `participate-command-dispatch.png` | Dispatch console |
| `participate-ward-directory.png` | Ward directory |
| `participate-citypulse-iot.png` | IoT city brain |
| `participate-constituency-mailbox.png` | Policy mailbox |
| `pmo-overview.png` | PMO representative directory |
| `pmo-analytics.png` | PMO analytics dashboard |
| `pmo-leaderboard.png` | Governance leaderboard |
| `pmo-mp-detail.png` | Per-MP drill-down |
| `mp-dashboard.png` | Individual MP dashboard |
| `login.png` | Login |
