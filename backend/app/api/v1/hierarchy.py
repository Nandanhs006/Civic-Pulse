from typing import Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api import deps
from app.schemas import (
    HierarchyOut,
    HierParliamentary,
    HierAssembly,
    HierCivic,
)
from app.services.geo_service import GeoService
from app.db.models.constituency import Constituency
from app.db.models.mp import MP
from app.db.models.assembly_constituency import AssemblyConstituency
from app.db.models.mla import MLA
from app.db.models.civic_official import CivicOfficial

router = APIRouter()


@router.get("/locate", response_model=HierarchyOut)
def locate_hierarchy(lat: float, lng: float, db: Session = Depends(deps.get_db)) -> Any:
    """Resolve GPS to the full representative hierarchy (the routing tree)."""
    geo = GeoService(db)
    out: dict = {}

    pc_id = geo.locate_constituency_id(lat, lng)
    if pc_id:
        constituency = db.query(Constituency).filter(Constituency.id == pc_id).first()
        mp = db.query(MP).filter(MP.constituency_id == pc_id).first()
        if constituency:
            out["parliamentary"] = HierParliamentary(constituency=constituency, mp=mp)

    ac_id = geo.locate_assembly_constituency_id(lat, lng)
    if ac_id:
        ac = (
            db.query(AssemblyConstituency)
            .filter(AssemblyConstituency.id == ac_id)
            .first()
        )
        mla = db.query(MLA).filter(MLA.assembly_constituency_id == ac_id).first()
        if ac:
            out["assembly"] = HierAssembly(assembly_constituency=ac, mla=mla)
        officials = (
            db.query(CivicOfficial)
            .filter(CivicOfficial.assembly_constituency_id == ac_id)
            .all()
        )
        if officials:
            out["civic"] = HierCivic(officials=officials)  # type: ignore

    return out


@router.get("/pc/{constituency_id}", response_model=List[HierAssembly])
def assembly_under_pc(constituency_id: int, db: Session = Depends(deps.get_db)) -> Any:
    """List the assembly constituencies (+ MLAs) inside a parliamentary seat."""
    acs = (
        db.query(AssemblyConstituency)
        .filter(AssemblyConstituency.parliamentary_constituency_id == constituency_id)
        .order_by(AssemblyConstituency.name)
        .all()
    )
    result = []
    for ac in acs:
        mla = db.query(MLA).filter(MLA.assembly_constituency_id == ac.id).first()
        result.append(HierAssembly(assembly_constituency=ac, mla=mla))
    return result
