from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class UserBase(BaseModel):
    email: str
    full_name: Optional[str] = None
    is_active: Optional[bool] = True
    is_admin: Optional[bool] = True


class UserCreate(UserBase):
    password: str


class UserOut(UserBase):
    id: int
    role: Optional[str] = None
    constituency_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)


# Ward Schemas
class WardBase(BaseModel):
    name: str
    population: int
    area_sq_km: float
    demographics: Optional[dict] = None
    infrastructure_gaps: Optional[dict] = None


class WardOut(WardBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Suggestion Schemas
class SuggestionBase(BaseModel):
    content: Optional[str] = None
    citizen_phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class SuggestionCreate(SuggestionBase):
    language_code: Optional[str] = "en"
    constituency_id: Optional[int] = None


class SuggestionOut(BaseModel):
    id: str
    citizen_phone: Optional[str] = None
    content: str
    english_translation: Optional[str] = None
    language_code: str
    audio_url: Optional[str] = None
    image_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    category: Optional[str] = None
    sentiment: Optional[str] = None
    priority_score: int
    status: str
    ward_id: Optional[int] = None
    constituency_id: Optional[int] = None
    assembly_constituency_id: Optional[int] = None
    assigned_officer_id: Optional[int] = None
    dispatch_status: Optional[str] = "Unassigned"
    # AI Enhancement Fields
    ai_confidence: Optional[float] = None
    ai_reasoning: Optional[str] = None
    image_analysis: Optional[str] = None   # JSON string of vision output
    is_duplicate: bool = False
    duplicate_of_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)



# Public map issue (no citizen phone / PII)
class MapIssueOut(BaseModel):
    id: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    category: Optional[str] = None
    priority_score: int
    status: str
    sentiment: Optional[str] = None
    content: str
    english_translation: Optional[str] = None
    image_url: Optional[str] = None
    constituency_id: Optional[int] = None
    created_at: datetime
    state: Optional[str] = None
    city: Optional[str] = None
    mp: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


# Project Schemas
class ProjectBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: str
    target_ward_id: Optional[int] = None
    constituency_id: Optional[int] = None
    estimated_cost: float
    priority_score: int
    supporting_suggestions_count: int
    ai_justification: Optional[str] = None
    status: str


class ProjectUpdate(BaseModel):
    status: Optional[str] = None
    estimated_cost: Optional[float] = None


class ProjectOut(ProjectBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Analytics/Dashboard Data Response
class AnalyticsSummary(BaseModel):
    total_suggestions: int
    total_projects: int
    category_counts: dict
    sentiment_distribution: dict
    unresolved_percentage: float


# Constituency Schemas
class ConstituencyOut(BaseModel):
    id: int
    name: str
    state: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    model_config = ConfigDict(from_attributes=True)


# MP Schemas (includes computed progress metrics for the PMO command center)
class MPOut(BaseModel):
    id: int
    constituency_id: int
    constituency_name: Optional[str] = None
    name: str
    party: Optional[str] = None
    party_abbr: Optional[str] = None
    state: Optional[str] = None
    photo_url: Optional[str] = None
    email: Optional[str] = None
    wikipedia_url: Optional[str] = None
    # Progress metrics (computed per request, default 0)
    total_suggestions: int = 0
    resolved_suggestions: int = 0
    pending_suggestions: int = 0
    unresolved_percentage: float = 0.0
    sanctioned_projects: int = 0
    model_config = ConfigDict(from_attributes=True)


# Assembly (MLA) tier schemas
class AssemblyConstituencyOut(BaseModel):
    id: int
    name: str
    ac_no: Optional[int] = None
    state: str
    pc_name: Optional[str] = None
    district: Optional[str] = None
    parliamentary_constituency_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)


class MLAOut(BaseModel):
    id: int
    assembly_constituency_id: int
    assembly_constituency_name: Optional[str] = None
    name: str
    party: Optional[str] = None
    party_abbr: Optional[str] = None
    state: Optional[str] = None
    photo_url: Optional[str] = None
    wikipedia_url: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class CivicOfficialOut(BaseModel):
    id: int
    body: str
    zone: Optional[str] = None
    role: str
    name: Optional[str] = None
    contact: Optional[str] = None
    is_placeholder: bool = True
    model_config = ConfigDict(from_attributes=True)


# The full representative hierarchy for a location (the routing tree).
class HierParliamentary(BaseModel):
    constituency: ConstituencyOut
    mp: Optional[MPOut] = None


class HierAssembly(BaseModel):
    assembly_constituency: AssemblyConstituencyOut
    mla: Optional[MLAOut] = None


class HierCivic(BaseModel):
    officials: List[CivicOfficialOut] = []


class HierarchyOut(BaseModel):
    parliamentary: Optional[HierParliamentary] = None
    assembly: Optional[HierAssembly] = None
    civic: Optional[HierCivic] = None


class WardOfficerOut(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    avatar_url: Optional[str] = None
    is_active: bool
    ward_id: int
    active_cases: int = 0
    model_config = ConfigDict(from_attributes=True)


class WardDispatchInput(BaseModel):
    suggestion_id: str
    officer_id: int


# Sync Schemas
class SuggestionSyncIn(BaseModel):
    offline_uuid: str
    content: Optional[str] = None
    citizen_phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    constituency_id: Optional[int] = None
    language_code: Optional[str] = "en"
    created_at_offline: Optional[str] = None


class SuggestionSyncOut(BaseModel):
    offline_uuid: str
    live_id: Optional[str] = None
    status: str  # "synced", "duplicate", "error"

