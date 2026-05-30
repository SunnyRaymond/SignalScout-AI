from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from .database import Base


class OfferProfile(Base):
    __tablename__ = "offer_profiles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, unique=True, index=True)
    seller_description = Column(Text, nullable=False)
    target_customers = Column(Text, nullable=False)
    keywords = Column(Text, nullable=False, default="[]")
    negative_keywords = Column(Text, nullable=False, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class JobPosting(Base):
    __tablename__ = "job_postings"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(80), nullable=False, index=True)
    external_id = Column(String(200), nullable=False, index=True)
    title = Column(String(240), nullable=False, index=True)
    company = Column(String(200), nullable=False, index=True)
    location = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    url = Column(Text, nullable=False)
    posted_at = Column(DateTime, nullable=False)
    raw_json = Column(Text, nullable=False, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class LeadSignal(Base):
    __tablename__ = "lead_signals"

    id = Column(Integer, primary_key=True, index=True)
    company = Column(String(200), nullable=False, index=True)
    matched_offer_id = Column(Integer, ForeignKey("offer_profiles.id"), nullable=False, index=True)
    signal_summary = Column(Text, nullable=False)
    inferred_pain = Column(Text, nullable=False)
    evidence_jobs_json = Column(Text, nullable=False, default="[]")
    score = Column(Integer, nullable=False)
    urgency_score = Column(Integer, nullable=False)
    relevance_score = Column(Integer, nullable=False)
    confidence_score = Column(Integer, nullable=False)
    outreach_subject = Column(String(240), nullable=False)
    outreach_body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
