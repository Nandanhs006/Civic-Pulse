from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
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
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Project Schemas
class ProjectBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: str
    target_ward_id: int
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
