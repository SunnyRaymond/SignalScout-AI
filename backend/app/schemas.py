from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class OfferProfileIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    seller_description: str = Field(min_length=1)
    target_customers: str = Field(min_length=1)
    keywords: list[str] = Field(default_factory=list)
    negative_keywords: list[str] = Field(default_factory=list)


class OfferProfileOut(OfferProfileIn):
    id: int
    created_at: datetime
    updated_at: datetime


class JobPostingIn(BaseModel):
    source: str = Field(min_length=1, max_length=80)
    external_id: str = Field(min_length=1, max_length=200)
    title: str = Field(min_length=1, max_length=240)
    company: str = Field(min_length=1, max_length=200)
    location: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    url: str = Field(min_length=1)
    posted_at: datetime
    raw_json: dict[str, Any] = Field(default_factory=dict)


class JobPostingOut(JobPostingIn):
    id: int
    created_at: datetime


class LeadSignalOut(BaseModel):
    id: int
    company: str
    matched_offer_id: int
    signal_summary: str
    inferred_pain: str
    evidence_jobs_json: list[dict[str, Any]]
    score: int
    urgency_score: int
    relevance_score: int
    confidence_score: int
    outreach_subject: str
    outreach_body: str
    created_at: datetime


class AgentRunRequest(BaseModel):
    offer_id: int | None = None
    clear_existing: bool = True


class FetchJobsRequest(BaseModel):
    source: str = "muse"
    query: str = "analytics"
    location: str = "United States"
    limit: int = Field(default=20, ge=1, le=50)
