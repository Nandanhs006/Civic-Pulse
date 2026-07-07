"""Ingest Karnataka MLAs (16th Assembly, 2023) + the local civic tier.

Sources:
- Assembly constituencies (224/225) + parent PC + district from the bundled
  karnataka_ac.geojson (produced by convert_ac_shapefile.py).
- MLA name + party from each AC's Wikipedia article infobox
  ("<AC> Assembly constituency", fields `| mla =` / `| party =`).

Seeds AssemblyConstituency, MLA, and a role-based CivicOfficial per AC
(BBMP / Greater Bengaluru Authority for Bengaluru urban ACs; generic elsewhere).
Idempotent. Run:  python -m app.scripts.ingest_mlas
"""
import csv
import json
import os
import re
import time
from typing import Dict, List, Optional

import httpx

from app.db.base import Base  # noqa: F401 (registers models)
from app.db.session import engine, SessionLocal
from app.db.models.constituency import Constituency
from app.db.models.assembly_constituency import AssemblyConstituency
from app.db.models.mla import MLA
from app.db.models.civic_official import CivicOfficial

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
GEOJSON = os.path.join(DATA_DIR, "karnataka_ac.geojson")
CSV_PATH = os.path.join(DATA_DIR, "karnataka_mlas.csv")
WIKI_API = "https://en.wikipedia.org/w/api.php"
USER_AGENT = "CivicPulse-MLA-Ingest/1.0 (educational hackathon project)"
STATE = "Karnataka"

PARTY_ABBR = {
    "Indian National Congress": "INC",
    "Bharatiya Janata Party": "BJP",
    "Janata Dal (Secular)": "JD(S)",
    "Kalyana Rajya Pragathi Paksha": "KRPP",
    "Sarvodaya Karnataka Paksha": "SKP",
    "Independent": "IND",
}


def norm(s: Optional[str]) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower()) if s else ""


def abbr_for(party: Optional[str]) -> Optional[str]:
    if not party:
        return None
    if party in PARTY_ABBR:
        return PARTY_ABBR[party]
    words = re.findall(r"[A-Za-z]+", party)
    skip = {"of", "the", "and"}
    return ("".join(w[0].upper() for w in words if w.lower() not in skip)[:6]) or None


def clean_ac_name(raw: str) -> str:
    """Strip reservation suffix: 'Anekal (SC)' -> 'Anekal'."""
    return re.sub(r"\s*\((SC|ST)\)\s*$", "", raw).strip()


def clean_wikilink(val: str) -> str:
    val = re.sub(r"<ref.*?</ref>", "", val, flags=re.DOTALL)
    val = re.sub(r"<ref[^>]*/>", "", val)
    m = re.search(r"\[\[([^\]]+)\]\]", val)
    if m:
        return m.group(1).split("|")[-1].strip()
    val = re.sub(r"\{\{[^}]*\}\}", "", val)
    return val.strip().strip("'").strip()


def load_acs() -> List[Dict]:
    data = json.load(open(GEOJSON, encoding="utf-8"))
    acs = []
    for f in data["features"]:
        p = f["properties"]
        raw = p.get("ac_name", "")
        acs.append(
            {
                "ac_no": p.get("ac_no"),
                "raw_name": raw,
                "name": clean_ac_name(raw),
                "pc_name": p.get("pc_name", ""),
                "district": p.get("dist_name", ""),
            }
        )
    return acs


def fetch_mla_map(names: List[str]) -> Dict[str, Dict[str, str]]:
    """title-name -> {mla, party} parsed from AC article infoboxes."""
    result: Dict[str, Dict[str, str]] = {}
    titles = [f"{n} Assembly constituency" for n in names]
    mla_re = re.compile(r"^\s*\|\s*mla\s*=\s*(.+)$", re.IGNORECASE | re.MULTILINE)
    party_re = re.compile(r"^\s*\|\s*party\s*=\s*(.+)$", re.IGNORECASE | re.MULTILINE)
    with httpx.Client(headers={"User-Agent": USER_AGENT}, timeout=60) as client:
        for i in range(0, len(titles), 40):
            batch = titles[i : i + 40]
            params = {
                "action": "query",
                "prop": "revisions",
                "rvprop": "content",
                "rvslots": "main",
                "format": "json",
                "formatversion": "2",
                "redirects": "1",
                "titles": "|".join(batch),
            }
            for attempt in range(4):
                try:
                    r = client.get(WIKI_API, params=params)
                    r.raise_for_status()
                    data = r.json()
                    break
                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 429 and attempt < 3:
                        time.sleep(3 * (attempt + 1))
                        continue
                    print(f"[mla] batch {i} failed: {e}")
                    data = None
                    break
                except Exception as e:  # noqa: BLE001
                    print(f"[mla] batch {i} failed: {e}")
                    data = None
                    break
            if not data:
                continue
            for page in data.get("query", {}).get("pages", []):
                title = page.get("title", "")
                key = norm(re.sub(r"\s*Assembly constituency\s*$", "", title, flags=re.I))
                try:
                    content = page["revisions"][0]["slots"]["main"]["content"]
                except (KeyError, IndexError):
                    continue
                mm = mla_re.search(content)
                pm = party_re.search(content)
                if mm:
                    result[key] = {
                        "mla": clean_wikilink(mm.group(1)),
                        "party": clean_wikilink(pm.group(1)) if pm else "",
                    }
            time.sleep(0.6)
    print(f"[mla] resolved {len(result)} AC infoboxes")
    return result


def save_csv(rows: List[Dict]) -> None:
    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(
            f, fieldnames=["ac_no", "name", "pc_name", "district", "mla", "party"]
        )
        w.writeheader()
        w.writerows(rows)
    print(f"[cache] wrote {len(rows)} rows -> {CSV_PATH}")


def civic_for(ac_name: str, district: str) -> Dict[str, Optional[str]]:
    if norm(district) == norm("BANGALORE"):
        return {
            "body": "BBMP · Greater Bengaluru Authority (GBA)",
            "zone": "Bengaluru Urban",
            "role": "Assistant Executive Engineer (Ward Works)",
        }
    dist = district.title() if district else "District"
    return {
        "body": f"{dist} Urban / Rural Local Body",
        "zone": dist,
        "role": "Local Civic Engineer (PWD / Panchayat)",
    }


def ingest(rows: List[Dict]) -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    created_ac = created_mla = created_civic = 0
    matched_pc = 0
    try:
        # Cache PC name -> id for parent linkage.
        pc_map = {norm(c.name): c.id for c in db.query(Constituency).all()}
        for row in rows:
            name = row["name"].strip()
            existing_ac = (
                db.query(AssemblyConstituency)
                .filter(
                    AssemblyConstituency.name == name,
                    AssemblyConstituency.state == STATE,
                )
                .first()
            )
            pc_id = pc_map.get(norm(row.get("pc_name", "")))
            if pc_id:
                matched_pc += 1
            if not existing_ac:
                existing_ac = AssemblyConstituency(
                    name=name,
                    ac_no=row.get("ac_no"),
                    state=STATE,
                    pc_name=(row.get("pc_name") or "").title(),
                    district=(row.get("district") or "").title(),
                    parliamentary_constituency_id=pc_id,
                )
                db.add(existing_ac)
                db.flush()
                created_ac += 1

            mla_name = (row.get("mla") or "").strip()
            if mla_name and not db.query(MLA).filter(
                MLA.assembly_constituency_id == existing_ac.id
            ).first():
                party = (row.get("party") or "").strip() or None
                db.add(
                    MLA(
                        assembly_constituency_id=existing_ac.id,
                        name=mla_name,
                        party=party,
                        party_abbr=abbr_for(party),
                        state=STATE,
                        wikipedia_url=(
                            f"https://en.wikipedia.org/wiki/{mla_name.replace(' ', '_')}"
                        ),
                    )
                )
                created_mla += 1

            if not db.query(CivicOfficial).filter(
                CivicOfficial.assembly_constituency_id == existing_ac.id
            ).first():
                c = civic_for(name, row.get("district", ""))
                db.add(
                    CivicOfficial(
                        assembly_constituency_id=existing_ac.id,
                        body=c["body"],
                        zone=c["zone"],
                        role=c["role"],
                        name=None,
                        is_placeholder=True,
                    )
                )
                created_civic += 1

        db.commit()
        print(
            f"[done] +{created_ac} ACs, +{created_mla} MLAs, +{created_civic} civic nodes. "
            f"{matched_pc}/{len(rows)} ACs linked to a parent PC."
        )
    except Exception as e:  # noqa: BLE001
        db.rollback()
        print(f"[error] {e}")
        raise
    finally:
        db.close()


def main() -> None:
    acs = load_acs()
    print(f"[geo] {len(acs)} Karnataka ACs loaded")
    try:
        mla_map = fetch_mla_map([a["name"] for a in acs])
    except Exception as e:  # noqa: BLE001
        print(f"[mla] fetch failed ({e}); MLAs will be blank")
        mla_map = {}
    rows = []
    for a in acs:
        info = mla_map.get(norm(a["name"]), {})
        rows.append(
            {
                "ac_no": a["ac_no"],
                "name": a["name"],
                "pc_name": a["pc_name"],
                "district": a["district"],
                "mla": info.get("mla", ""),
                "party": info.get("party", ""),
            }
        )
    save_csv(rows)
    ingest(rows)


if __name__ == "__main__":
    main()
