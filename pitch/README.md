# Civic Pulse — Pitch Kit

Everything needed to build the pitch deck for **Civic Pulse** (*Bharat · People's Priorities*).

## Contents

| File | What it is |
|---|---|
| [PITCH_DECK.md](PITCH_DECK.md) | **Slide-by-slide deck** — titles, bullets, speaker notes, image refs. Start here. |
| [FEATURES.md](FEATURES.md) | Complete feature catalog (source material for slides). |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Technical architecture, stack, data sources, deploy, demo creds. |
| [screenshots/](screenshots) | 19 desktop + 4 mobile PNGs of every page (see index in PITCH_DECK.md). |

## How to turn this into a PPT

**Fastest** — paste into an AI slide generator (Gamma, Tome, Canva Docs-to-Deck,
or "Copilot in PowerPoint"): upload/paste `PITCH_DECK.md`; it already has one
`## Slide N` per slide with bullets + notes. Then drop in the matching screenshot
from `screenshots/` named in each slide's **Image:** line.

**Manual** — one PowerPoint slide per `## Slide N`:
- Slide title = the heading, subtitle = the italic line.
- Body = the bullets. Speaker notes = the `> Notes:` block.
- Insert the referenced `screenshots/*.png`.

**Scriptable** — the Markdown works with `pandoc`, `Marp`, or `reveal-md` for a
Markdown → slides export if you prefer code-driven decks.

## Screenshots

Captured from the app running on localhost (desktop 1440×900 full-page, mobile
390×844), including the auth-gated PMO and MP pages. To re-capture after UI changes,
re-run the local app and the capture script (Chrome headless via puppeteer-core).

## Note on demo issue images

Map issue photos are bundled in `frontend/public/issue-images/` and served
same-origin so they always load. Currently populated: **Water, Roads,
Electricity, Health, Education, Safety** (6/8). To finish, drop files named
`<slug>_<n>.jpg` into that folder for the last two categories and list them in
`backend/app/scripts/seed_demo_issues.py` (`LOCAL_CATEGORY_IMAGES`):
**sanitation, publicspace**.
