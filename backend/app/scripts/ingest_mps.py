"""Ingest the real 543 members of the 18th Lok Sabha (2024-2029) into the DB.

Primary source: the English Wikipedia page
"List of members of the 18th Lok Sabha" (structured per-state wikitables).
Photos: best-effort via the MediaWiki `pageimages` API (leaves null if none).

Successful online runs cache the parsed dataset to
`app/scripts/data/lok_sabha_18_members.csv` so later runs work fully offline.

Run:  python -m app.scripts.ingest_mps
It is idempotent - existing constituencies/MPs/users are skipped.
"""

import csv
import os
import re
import sys
import time
from typing import Dict, List, Optional

import httpx

from app.db.base import Base  # noqa: F401 (registers all models)
from app.db.session import engine, SessionLocal
from app.db.models.constituency import Constituency
from app.db.models.mp import MP
from app.db.models.user import User
from app.core.security import get_password_hash

WIKI_API = "https://en.wikipedia.org/w/api.php"
WIKI_PAGE = "List of members of the 18th Lok Sabha"
USER_AGENT = "CivicPulse-MP-Ingest/1.0 (educational hackathon project)"
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
CSV_PATH = os.path.join(DATA_DIR, "lok_sabha_18_members.csv")

MP_DEFAULT_PASSWORD = "mp@123"
PMO_EMAIL = "pmo@civicpulse.gov"
PMO_PASSWORD = "pmo@india"

# Common party full-name -> abbreviation (extend as needed).
PARTY_ABBR = {
    "Bharatiya Janata Party": "BJP",
    "Indian National Congress": "INC",
    "All India Trinamool Congress": "AITC",
    "Dravida Munnetra Kazhagam": "DMK",
    "Samajwadi Party": "SP",
    "Telugu Desam Party": "TDP",
    "Janata Dal (United)": "JD(U)",
    "Nationalist Congress Party – Sharadchandra Pawar": "NCP(SP)",
    "Nationalist Congress Party": "NCP",
    "Shiv Sena (Uddhav Balasaheb Thackeray)": "SS(UBT)",
    "Shiv Sena": "SHS",
    "Rashtriya Janata Dal": "RJD",
    "Communist Party of India (Marxist)": "CPI(M)",
    "Communist Party of India": "CPI",
    "Aam Aadmi Party": "AAP",
    "Yuvajana Sramika Rythu Congress Party": "YSRCP",
    "YSR Congress Party": "YSRCP",
    "Jharkhand Mukti Morcha": "JMM",
    "Indian Union Muslim League": "IUML",
    "Telangana Rashtra Samithi": "BRS",
    "Bharat Rashtra Samithi": "BRS",
    "Janata Dal (Secular)": "JD(S)",
    "Lok Janshakti Party (Ram Vilas)": "LJP(RV)",
    "Jammu & Kashmir National Conference": "JKNC",
    "Communist Party of India (Marxist–Leninist) Liberation": "CPI(ML)L",
    "Rashtriya Lok Dal": "RLD",
    "Apna Dal (Soneylal)": "AD(S)",
    "Bahujan Samaj Party": "BSP",
    "Biju Janata Dal": "BJD",
    "Independent": "IND",
}


def abbr_for(party: Optional[str]) -> Optional[str]:
    if not party:
        return None
    if party in PARTY_ABBR:
        return PARTY_ABBR[party]
    # Build initials from significant words as a fallback.
    words = re.findall(r"[A-Za-z]+", party)
    skip = {"of", "the", "and", "with", "for"}
    initials = "".join(w[0].upper() for w in words if w.lower() not in skip)
    return initials[:6] or None


def slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s or "seat"


LINK_RE = re.compile(r"\[\[([^\]]+)\]\]")
PARTY_TPL_RE = re.compile(
    r"\{\{(?:Full party name with colou?r|Party name with colou?r)\|([^}|]+?)(?:\|[^}]*)?\}\}",
    re.IGNORECASE,
)
ROWSPAN_RE = re.compile(r"rowspan\s*=\s*\"?(\d+)", re.IGNORECASE)
HEADER_RE = re.compile(
    r"==\s*\[\[2024 Indian general election in [^|\]]*\|([^\]]+)\]\]\s*=="
)


def fetch_wikitext() -> str:
    params = {
        "action": "parse",
        "page": WIKI_PAGE,
        "prop": "wikitext",
        "format": "json",
        "formatversion": "2",
    }
    with httpx.Client(headers={"User-Agent": USER_AGENT}, timeout=60) as client:
        r = client.get(WIKI_API, params=params)
        r.raise_for_status()
        return r.json()["parse"]["wikitext"]


def parse_members(wikitext: str) -> List[Dict]:
    """Parse per-state wikitables into member dicts, honouring party rowspans."""
    members: List[Dict] = []
    parts = HEADER_RE.split(wikitext)
    # parts = [preamble, state1, chunk1, state2, chunk2, ...]
    for i in range(1, len(parts), 2):
        state = parts[i].strip()
        chunk = parts[i + 1]
        pending_party: Optional[str] = None
        pending_rows = 0
        for rowtext in chunk.split("|-"):
            if "Lok Sabha constituency" not in rowtext:
                continue
            links = LINK_RE.findall(rowtext)
            constituency = None
            name = None
            name_title = None
            for lk in links:
                target = lk.split("|")[0].strip()
                label = lk.split("|")[-1].strip()
                if "Lok Sabha constituency" in target and constituency is None:
                    constituency = label
                elif (
                    "File:" not in target
                    and "constituency" not in target.lower()
                    and name is None
                ):
                    name = label
                    name_title = target
            if not (constituency and name):
                continue

            pm = PARTY_TPL_RE.search(rowtext)
            if pm:
                party = pm.group(1).strip()
                span_m = ROWSPAN_RE.search(rowtext)
                span = int(span_m.group(1)) if span_m else 1
                pending_party = party
                pending_rows = span - 1
            elif pending_rows > 0:
                party = pending_party
                pending_rows -= 1
            else:
                party = None

            members.append(
                {
                    "state": state,
                    "constituency": constituency,
                    "name": name,
                    "name_title": name_title or name,
                    "party": party,
                    "photo_url": "",
                }
            )
    return members


def fetch_photos(members: List[Dict]) -> None:
    """Populate photo_url in-place via MediaWiki pageimages (best-effort)."""
    titles = [m["name_title"] for m in members if m.get("name_title")]
    by_title: Dict[str, str] = {}
    with httpx.Client(headers={"User-Agent": USER_AGENT}, timeout=60) as client:
        for i in range(0, len(titles), 50):
            batch = titles[i : i + 50]
            params = {
                "action": "query",
                "prop": "pageimages",
                "piprop": "thumbnail",
                "pithumbsize": "400",
                "titles": "|".join(batch),
                "format": "json",
                "formatversion": "2",
                "redirects": "1",
            }
            data = None
            for attempt in range(4):  # retry with backoff on rate limits
                try:
                    r = client.get(WIKI_API, params=params)
                    r.raise_for_status()
                    data = r.json()
                    break
                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 429 and attempt < 3:
                        wait = 3 * (attempt + 1)
                        print(f"[photos] batch {i} rate-limited, retrying in {wait}s")
                        time.sleep(wait)
                        continue
                    print(f"[photos] batch {i} failed: {e}")
                    break
                except Exception as e:  # noqa: BLE001
                    print(f"[photos] batch {i} failed: {e}")
                    break
            if data is None:
                continue
            time.sleep(0.8)  # be polite to the API between batches
            # Map back through any redirects so titles line up.
            norm = {
                n["from"]: n["to"] for n in data.get("query", {}).get("redirects", [])
            }
            for page in data.get("query", {}).get("pages", []):
                thumb = page.get("thumbnail", {}).get("source")
                if thumb:
                    by_title[page.get("title")] = thumb
            for m in members:
                t = m["name_title"]
                resolved = norm.get(t, t)
                if not m["photo_url"] and resolved in by_title:
                    m["photo_url"] = by_title[resolved]
    got = sum(1 for m in members if m["photo_url"])
    print(f"[photos] resolved {got}/{len(members)} MP photos")


def save_csv(members: List[Dict]) -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(
            f,
            fieldnames=[
                "state",
                "constituency",
                "name",
                "name_title",
                "party",
                "photo_url",
            ],
        )
        w.writeheader()
        for m in members:
            w.writerow(m)
    print(f"[cache] wrote {len(members)} rows -> {CSV_PATH}")


def load_csv() -> List[Dict]:
    if not os.path.exists(CSV_PATH):
        return []
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    print(f"[cache] loaded {len(rows)} rows from {CSV_PATH}")
    return rows


def get_members() -> List[Dict]:
    try:
        print("[fetch] downloading member list from Wikipedia...")
        wt = fetch_wikitext()
        members = parse_members(wt)
        print(
            f"[parse] parsed {len(members)} members across "
            f"{len(set(m['state'] for m in members))} states/UTs"
        )
        if len(members) < 400:
            raise RuntimeError(f"parsed too few members ({len(members)}); using cache")
        fetch_photos(members)
        save_csv(members)
        return members
    except Exception as e:  # noqa: BLE001
        print(f"[fetch] online ingestion failed ({e}); falling back to CSV cache")
        members = load_csv()
        if not members:
            print("[fatal] no cached data available. Aborting.")
            sys.exit(1)
        return members


def ingest(members: List[Dict]) -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    created_c = created_m = created_u = 0
    used_emails = set(e[0] for e in db.query(User.email).all())
    try:
        for m in members:
            cname = m["constituency"].strip()
            state = m["state"].strip()
            constituency = (
                db.query(Constituency).filter(Constituency.name == cname).first()
            )
            if not constituency:
                constituency = Constituency(name=cname, state=state)
                db.add(constituency)
                db.flush()  # assign id
                created_c += 1

            mp = db.query(MP).filter(MP.constituency_id == constituency.id).first()
            party = (m.get("party") or "").strip() or None
            photo = (m.get("photo_url") or "").strip() or None
            wiki_url = (
                f"https://en.wikipedia.org/wiki/"
                f"{m.get('name_title', m['name']).replace(' ', '_')}"
            )
            if not mp:
                mp = MP(
                    constituency_id=constituency.id,
                    name=m["name"].strip(),
                    party=party,
                    party_abbr=abbr_for(party),
                    state=state,
                    photo_url=photo,
                    wikipedia_url=wiki_url,
                )
                db.add(mp)
                created_m += 1
            elif photo and not mp.photo_url:
                # Backfill a photo that was missing on a previous run.
                mp.photo_url = photo

            # One pre-seeded login per constituency (idempotent by constituency).
            existing_mp_user = (
                db.query(User)
                .filter(User.constituency_id == constituency.id, User.role == "mp")
                .first()
            )
            if not existing_mp_user:
                email = f"mp.{slugify(cname)}@civicpulse.gov"
                if email in used_emails:
                    email = f"mp.{slugify(cname)}-{constituency.id}@civicpulse.gov"
                user = User(
                    full_name=m["name"].strip(),
                    email=email,
                    hashed_password=get_password_hash(MP_DEFAULT_PASSWORD),
                    is_active=True,
                    is_admin=False,
                    role="mp",
                    constituency_id=constituency.id,
                )
                db.add(user)
                used_emails.add(email)
                created_u += 1

        # PMO super-admin.
        if not db.query(User).filter(User.email == PMO_EMAIL).first():
            db.add(
                User(
                    full_name="Prime Minister's Office (Super Admin)",
                    email=PMO_EMAIL,
                    hashed_password=get_password_hash(PMO_PASSWORD),
                    is_active=True,
                    is_admin=True,
                    role="pmo",
                    constituency_id=None,
                )
            )
            created_u += 1
        # Promote the legacy seed admin to PMO role too.
        legacy = db.query(User).filter(User.email == "admin@civicpulse.gov").first()
        if legacy:
            legacy.role = "pmo"

        db.commit()
        total_photos = db.query(MP).filter(MP.photo_url.isnot(None)).count()
        total_mps = db.query(MP).count()
        print(
            f"[done] +{created_c} constituencies, +{created_m} MPs, "
            f"+{created_u} users. Photos on {total_photos}/{total_mps} MPs."
        )
    except Exception as e:  # noqa: BLE001
        db.rollback()
        print(f"[error] ingestion failed: {e}")
        raise
    finally:
        db.close()


def main() -> None:
    if os.path.exists(CSV_PATH):
        print(f"[cache] loading cached Lok Sabha members from {CSV_PATH}...")
        members = load_csv()
        ingest(members)
        return
    members = get_members()
    ingest(members)


if __name__ == "__main__":
    main()
