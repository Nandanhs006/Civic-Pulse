"""MPLADS (MP Local Area Development Scheme) funds vs citizen demand.

The core Civic-Pulse thesis: align MP fund utilisation with real, unmet public
demand. This service exposes, per constituency, the MPLADS money picture
(allocated / released / utilised / unspent) alongside the volume of *unresolved*
citizen requests — so an MP or the PMO can see "money sitting idle while N
requests are open."

Fund figures are a deterministic, clearly-labelled SAMPLE (real per-constituency
MPLADS data on data.gov.in / mplads.gov.in is periodic; swap this generator for
a cached fetch once a resource id + DATA_GOV_API_KEY are configured). The demand
side is REAL — computed from the Suggestion table.
"""

from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models.constituency import Constituency
from app.db.models.suggestion import Suggestion

# MPLADS entitlement is ₹5 crore/MP/year; figures below are cumulative ₹ lakh.
_RESOLVED_STATUSES = {"Approved", "Rejected", "Reviewed"}


def _rand01(cid: int, salt: int) -> float:
    """Stable pseudo-random in [0,1) from a constituency id (reproducible)."""
    h = (cid * 2654435761 + salt * 40503) & 0xFFFFFFFF
    return (h % 10000) / 10000.0


def _sample_funds(cid: int) -> dict:
    allocated = round(1000 + _rand01(cid, 1) * 1500)          # ₹10–25 cr cumulative
    released = round(allocated * (0.72 + _rand01(cid, 2) * 0.23))
    utilised = round(released * (0.40 + _rand01(cid, 3) * 0.52))
    works_completed = int(30 + _rand01(cid, 4) * 120)
    works_recommended = works_completed + int(6 + _rand01(cid, 5) * 45)
    return {
        "allocated_lakh": allocated,
        "released_lakh": released,
        "utilised_lakh": utilised,
        "unspent_lakh": max(0, allocated - utilised),
        "pct_utilised": round(utilised / allocated * 100, 1) if allocated else 0.0,
        "works_completed": works_completed,
        "works_recommended": works_recommended,
        "source": "sample",
    }


def _insight(unspent_cr: float, pct: float, unresolved: int, top_cat: Optional[str]) -> str:
    if unresolved and pct < 65:
        cat = f", especially on {top_cat}," if top_cat else ""
        return (
            f"₹{unspent_cr:.2f} cr of MPLADS funds are still unspent while "
            f"{unresolved} citizen requests{cat} remain open — a strong case to "
            f"allocate funds to real demand."
        )
    if pct >= 90:
        return f"Funds are well utilised ({pct:.0f}%). {unresolved} requests still open."
    if not unresolved:
        return f"₹{unspent_cr:.2f} cr unspent; no open citizen requests on record."
    return f"₹{unspent_cr:.2f} cr unspent against {unresolved} open citizen requests."


def constituency_mplads(db: Session, cid: int) -> Optional[dict]:
    c = db.query(Constituency).filter(Constituency.id == cid).first()
    if not c:
        return None

    funds = _sample_funds(cid)

    # Real demand: unresolved suggestions + top categories for this constituency.
    rows = (
        db.query(Suggestion.category, Suggestion.status, func.count(Suggestion.id))
        .filter(Suggestion.constituency_id == cid)
        .group_by(Suggestion.category, Suggestion.status)
        .all()
    )
    total = 0
    unresolved = 0
    cat_open: dict = {}
    for cat, status, n in rows:
        total += int(n)
        if status not in _RESOLVED_STATUSES:
            unresolved += int(n)
            if cat:
                cat_open[cat] = cat_open.get(cat, 0) + int(n)
    top = sorted(cat_open.items(), key=lambda kv: kv[1], reverse=True)
    top_cat = top[0][0] if top else None

    unspent_cr = funds["unspent_lakh"] / 100.0
    return {
        "constituency_id": cid,
        "constituency": c.name,
        "state": c.state,
        **funds,
        "demand": {
            "total_requests": total,
            "unresolved_requests": unresolved,
            "top_open_categories": [{"category": k, "count": v} for k, v in top[:3]],
        },
        "insight": _insight(unspent_cr, funds["pct_utilised"], unresolved, top_cat),
    }
