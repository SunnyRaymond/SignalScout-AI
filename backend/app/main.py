import csv
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import and_
from sqlalchemy.orm import Session

from .agent import build_slack_digest, dump_json, load_json_list, run_agent
from .database import Base, engine, get_db
from .integrations import fetch_adzuna_jobs, fetch_muse_jobs, send_slack_webhook
from .models import JobPosting, LeadSignal, OfferProfile
from .schemas import AgentRunRequest, FetchJobsRequest, JobPostingIn, JobPostingOut, LeadSignalOut, OfferProfileIn, OfferProfileOut

load_dotenv()

app = FastAPI(title="SignalScout AI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    try:
        seed_default_offers(db)
    finally:
        db.close()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/status")
def status(db: Session = Depends(get_db)) -> dict[str, Any]:
    return {
        "status": "ok",
        "database": "connected",
        "counts": {
            "offers": db.query(OfferProfile).count(),
            "jobs": db.query(JobPosting).count(),
            "leads": db.query(LeadSignal).count(),
        },
        "integrations": {
            "openai": bool(os.getenv("OPENAI_API_KEY")),
            "adzuna": bool(os.getenv("ADZUNA_APP_ID") and os.getenv("ADZUNA_APP_KEY")),
            "slack": bool(os.getenv("SLACK_WEBHOOK_URL")),
        },
    }


@app.get("/api/offers", response_model=list[OfferProfileOut])
def list_offers(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    return [serialize_offer(offer) for offer in db.query(OfferProfile).order_by(OfferProfile.id).all()]


@app.post("/api/offers", response_model=OfferProfileOut)
def create_offer(payload: OfferProfileIn, db: Session = Depends(get_db)) -> dict[str, Any]:
    existing = db.query(OfferProfile).filter(OfferProfile.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=409, detail="Offer name already exists.")
    offer = OfferProfile(**offer_values(payload))
    db.add(offer)
    db.commit()
    db.refresh(offer)
    return serialize_offer(offer)


@app.get("/api/offers/{offer_id}", response_model=OfferProfileOut)
def get_offer(offer_id: int, db: Session = Depends(get_db)) -> dict[str, Any]:
    return serialize_offer(require_offer(db, offer_id))


@app.put("/api/offers/{offer_id}", response_model=OfferProfileOut)
def update_offer(offer_id: int, payload: OfferProfileIn, db: Session = Depends(get_db)) -> dict[str, Any]:
    offer = require_offer(db, offer_id)
    for key, value in offer_values(payload).items():
        setattr(offer, key, value)
    db.commit()
    db.refresh(offer)
    return serialize_offer(offer)


@app.delete("/api/offers/{offer_id}")
def delete_offer(offer_id: int, db: Session = Depends(get_db)) -> dict[str, str]:
    offer = require_offer(db, offer_id)
    db.query(LeadSignal).filter(LeadSignal.matched_offer_id == offer.id).delete(synchronize_session=False)
    db.delete(offer)
    db.commit()
    return {"status": "deleted"}


@app.get("/api/jobs", response_model=list[JobPostingOut])
def list_jobs(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    return [serialize_job(job) for job in db.query(JobPosting).order_by(JobPosting.posted_at.desc(), JobPosting.id.desc()).all()]


@app.post("/api/jobs", response_model=JobPostingOut)
def create_job(payload: JobPostingIn, db: Session = Depends(get_db)) -> dict[str, Any]:
    job = upsert_job(db, payload.model_dump())
    db.commit()
    db.refresh(job)
    return serialize_job(job)


@app.get("/api/jobs/{job_id}", response_model=JobPostingOut)
def get_job(job_id: int, db: Session = Depends(get_db)) -> dict[str, Any]:
    return serialize_job(require_job(db, job_id))


@app.put("/api/jobs/{job_id}", response_model=JobPostingOut)
def update_job(job_id: int, payload: JobPostingIn, db: Session = Depends(get_db)) -> dict[str, Any]:
    job = require_job(db, job_id)
    values = payload.model_dump()
    values["raw_json"] = dump_json(values.get("raw_json") or {})
    for key, value in values.items():
        setattr(job, key, value)
    db.commit()
    db.refresh(job)
    return serialize_job(job)


@app.delete("/api/jobs/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db)) -> dict[str, str]:
    job = require_job(db, job_id)
    db.delete(job)
    db.commit()
    return {"status": "deleted"}


@app.post("/api/jobs/load-sample")
def load_sample_jobs(db: Session = Depends(get_db)) -> dict[str, Any]:
    path = Path(__file__).resolve().parents[1] / "data" / "sample_jobs.csv"
    added = 0
    updated = 0
    with path.open("r", encoding="utf-8", newline="") as file:
        for row in csv.DictReader(file):
            payload = {
                "source": row["source"],
                "external_id": row["external_id"],
                "title": row["title"],
                "company": row["company"],
                "location": row["location"],
                "description": row["description"],
                "url": row["url"],
                "posted_at": datetime.fromisoformat(row["posted_at"]),
                "raw_json": json.loads(row["raw_json"] or "{}"),
            }
            existing = find_job(db, payload["source"], payload["external_id"])
            upsert_job(db, payload)
            if existing:
                updated += 1
            else:
                added += 1
    db.commit()
    return {"status": "loaded", "added": added, "updated": updated, "total": db.query(JobPosting).count()}


@app.post("/api/jobs/fetch")
def fetch_jobs(payload: FetchJobsRequest, db: Session = Depends(get_db)) -> dict[str, Any]:
    try:
        if payload.source.lower() == "adzuna":
            jobs, message = fetch_adzuna_jobs(payload.query, payload.location, payload.limit)
        else:
            jobs, message = fetch_muse_jobs(payload.query, payload.location, payload.limit)
    except Exception as exc:
        return {"status": "error", "message": str(exc), "added": 0, "jobs": []}
    added = 0
    for job in jobs:
        existing = find_job(db, job["source"], job["external_id"])
        upsert_job(db, job)
        if not existing:
            added += 1
    db.commit()
    return {"status": "ok", "message": message, "added": added, "jobs": jobs}


@app.get("/api/leads", response_model=list[LeadSignalOut])
def list_leads(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    return [serialize_lead(lead) for lead in db.query(LeadSignal).order_by(LeadSignal.score.desc(), LeadSignal.created_at.desc()).all()]


@app.get("/api/leads/{lead_id}", response_model=LeadSignalOut)
def get_lead(lead_id: int, db: Session = Depends(get_db)) -> dict[str, Any]:
    return serialize_lead(require_lead(db, lead_id))


@app.delete("/api/leads/{lead_id}")
def delete_lead(lead_id: int, db: Session = Depends(get_db)) -> dict[str, str]:
    lead = require_lead(db, lead_id)
    db.delete(lead)
    db.commit()
    return {"status": "deleted"}


@app.delete("/api/leads")
def clear_leads(db: Session = Depends(get_db)) -> dict[str, str]:
    db.query(LeadSignal).delete(synchronize_session=False)
    db.commit()
    return {"status": "deleted"}


@app.post("/api/agent/run")
def agent_run(payload: AgentRunRequest, db: Session = Depends(get_db)) -> dict[str, Any]:
    leads = run_agent(db, payload.offer_id, payload.clear_existing)
    return {"status": "ok", "created": len(leads), "leads": [serialize_lead(lead) for lead in leads]}


@app.get("/api/slack/preview")
def slack_preview(db: Session = Depends(get_db)) -> dict[str, Any]:
    leads = db.query(LeadSignal).order_by(LeadSignal.score.desc(), LeadSignal.created_at.desc()).limit(5).all()
    digest = build_slack_digest(leads)
    return {
        "has_webhook": bool(os.getenv("SLACK_WEBHOOK_URL")),
        "demo_mode": not bool(os.getenv("SLACK_WEBHOOK_URL")),
        "text": digest["text"],
        "blocks": digest["blocks"],
        "leads": [serialize_lead(lead) for lead in digest["leads"]],
    }


@app.post("/api/slack/send")
def slack_send(db: Session = Depends(get_db)) -> dict[str, Any]:
    leads = db.query(LeadSignal).order_by(LeadSignal.score.desc(), LeadSignal.created_at.desc()).limit(5).all()
    digest = build_slack_digest(leads)
    sent, message = send_slack_webhook({"text": digest["text"], "blocks": digest["blocks"]})
    return {"sent": sent, "message": message, "preview": digest["text"]}


def seed_default_offers(db: Session) -> None:
    if db.query(OfferProfile).count() > 0:
        return
    defaults = [
        OfferProfileIn(
            name="Data Dashboard Agency",
            seller_description="Sells Tableau dashboards, SQL pipelines, and executive reporting.",
            target_customers="BI, Data, Analytics, RevOps, and Tableau teams.",
            keywords=["Tableau", "Power BI", "BI Analyst", "Data Engineer", "Analytics Engineer", "SQL", "Dashboard", "Reporting", "RevOps"],
            negative_keywords=["intern", "student", "unpaid"],
        ),
        OfferProfileIn(
            name="Cloud Infrastructure Consultancy",
            seller_description="Helps companies modernize cloud platforms, DevOps workflows, SRE practices, and Kubernetes operations.",
            target_customers="Cloud, DevOps, SRE, platform engineering, and infrastructure leaders.",
            keywords=["Cloud", "DevOps", "SRE", "Platform", "Infrastructure", "Kubernetes", "AWS", "Azure"],
            negative_keywords=["intern", "student", "unpaid"],
        ),
        OfferProfileIn(
            name="Cyber Risk Studio",
            seller_description="Supports security operations, compliance readiness, IAM projects, and SOC modernization.",
            target_customers="Security, SOC, compliance, risk, and identity teams.",
            keywords=["SOC", "Security", "Compliance", "IAM", "Risk", "Incident", "Identity"],
            negative_keywords=["intern", "student", "unpaid"],
        ),
    ]
    for payload in defaults:
        db.add(OfferProfile(**offer_values(payload)))
    db.commit()


def offer_values(payload: OfferProfileIn) -> dict[str, Any]:
    return {
        "name": payload.name,
        "seller_description": payload.seller_description,
        "target_customers": payload.target_customers,
        "keywords": dump_json(payload.keywords),
        "negative_keywords": dump_json(payload.negative_keywords),
    }


def upsert_job(db: Session, payload: dict[str, Any]) -> JobPosting:
    job = find_job(db, payload["source"], payload["external_id"])
    values = dict(payload)
    values["raw_json"] = dump_json(values.get("raw_json") or {})
    if job:
        for key, value in values.items():
            setattr(job, key, value)
        return job
    job = JobPosting(**values)
    db.add(job)
    return job


def find_job(db: Session, source: str, external_id: str) -> JobPosting | None:
    return db.query(JobPosting).filter(and_(JobPosting.source == source, JobPosting.external_id == external_id)).first()


def require_offer(db: Session, offer_id: int) -> OfferProfile:
    offer = db.query(OfferProfile).filter(OfferProfile.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found.")
    return offer


def require_job(db: Session, job_id: int) -> JobPosting:
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job


def require_lead(db: Session, lead_id: int) -> LeadSignal:
    lead = db.query(LeadSignal).filter(LeadSignal.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found.")
    return lead


def serialize_offer(offer: OfferProfile) -> dict[str, Any]:
    return {
        "id": offer.id,
        "name": offer.name,
        "seller_description": offer.seller_description,
        "target_customers": offer.target_customers,
        "keywords": load_json_list(offer.keywords),
        "negative_keywords": load_json_list(offer.negative_keywords),
        "created_at": offer.created_at,
        "updated_at": offer.updated_at,
    }


def serialize_job(job: JobPosting) -> dict[str, Any]:
    return {
        "id": job.id,
        "source": job.source,
        "external_id": job.external_id,
        "title": job.title,
        "company": job.company,
        "location": job.location,
        "description": job.description,
        "url": job.url,
        "posted_at": job.posted_at,
        "raw_json": json.loads(job.raw_json or "{}"),
        "created_at": job.created_at,
    }


def serialize_lead(lead: LeadSignal) -> dict[str, Any]:
    return {
        "id": lead.id,
        "company": lead.company,
        "matched_offer_id": lead.matched_offer_id,
        "signal_summary": lead.signal_summary,
        "inferred_pain": lead.inferred_pain,
        "evidence_jobs_json": json.loads(lead.evidence_jobs_json or "[]"),
        "score": lead.score,
        "urgency_score": lead.urgency_score,
        "relevance_score": lead.relevance_score,
        "confidence_score": lead.confidence_score,
        "outreach_subject": lead.outreach_subject,
        "outreach_body": lead.outreach_body,
        "created_at": lead.created_at,
    }
