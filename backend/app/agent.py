import json
import os
import re
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

import requests
from sqlalchemy.orm import Session

from .models import JobPosting, LeadSignal, OfferProfile


def load_json_list(value: str) -> list[str]:
    try:
        parsed = json.loads(value or "[]")
        if isinstance(parsed, list):
            return [str(item) for item in parsed]
    except json.JSONDecodeError:
        return []
    return []


def dump_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


def normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value.lower()).strip()


def score_job(job: JobPosting, offer: OfferProfile) -> dict[str, Any]:
    text = normalize(f"{job.title} {job.company} {job.location} {job.description}")
    title = normalize(job.title)
    keywords = load_json_list(offer.keywords)
    negatives = load_json_list(offer.negative_keywords)
    matched = []
    points = 0
    for keyword in keywords:
        term = normalize(keyword)
        if not term:
            continue
        if term in title:
            points += 22
            matched.append(keyword)
        elif term in text:
            points += 12
            matched.append(keyword)
    negative_hits = [term for term in negatives if normalize(term) in text]
    if negative_hits:
        points -= 35
    role_bonus = domain_role_bonus(title, keywords)
    score = max(0, min(100, points + role_bonus))
    return {"score": score, "matched_keywords": sorted(set(matched)), "negative_hits": negative_hits}


def domain_role_bonus(title: str, keywords: list[str]) -> int:
    keyword_text = normalize(" ".join(keywords))
    data_terms = ["tableau", "power bi", "bi analyst", "analytics engineer", "data engineer", "sql", "dashboard", "reporting", "revops"]
    cloud_terms = ["cloud", "devops", "sre", "platform", "kubernetes", "infrastructure"]
    cyber_terms = ["soc", "security", "compliance", "iam", "risk", "incident"]
    if any(term in keyword_text for term in data_terms) and any(term in title for term in data_terms):
        return 26
    if any(term in keyword_text for term in cloud_terms) and any(term in title for term in cloud_terms):
        return 26
    if any(term in keyword_text for term in cyber_terms) and any(term in title for term in cyber_terms):
        return 26
    return 0


def run_agent(db: Session, offer_id: int | None = None, clear_existing: bool = True) -> list[LeadSignal]:
    offers = db.query(OfferProfile).all()
    if offer_id is not None:
        offers = [offer for offer in offers if offer.id == offer_id]
    if not offers:
        return []
    if clear_existing:
        query = db.query(LeadSignal)
        if offer_id is not None:
            query = query.filter(LeadSignal.matched_offer_id == offer_id)
        query.delete(synchronize_session=False)
        db.commit()
    jobs = db.query(JobPosting).order_by(JobPosting.posted_at.desc()).all()
    created = []
    for offer in offers:
        grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for job in jobs:
            job_result = score_job(job, offer)
            if job_result["score"] >= 25:
                grouped[job.company].append({"job": job, **job_result})
        for company, matches in grouped.items():
            lead = build_lead(company, offer, matches)
            db.add(lead)
            created.append(lead)
    db.commit()
    for lead in created:
        db.refresh(lead)
    return sorted(created, key=lambda item: item.score, reverse=True)


def build_lead(company: str, offer: OfferProfile, matches: list[dict[str, Any]]) -> LeadSignal:
    ranked = sorted(matches, key=lambda item: item["score"], reverse=True)
    evidence = [evidence_payload(item) for item in ranked[:5]]
    relevance = calculate_relevance(ranked)
    urgency = calculate_urgency(ranked)
    confidence = calculate_confidence(ranked)
    total = round((0.45 * relevance) + (0.35 * urgency) + (0.20 * confidence))
    roles = [item["job"].title for item in ranked[:3]]
    locations = sorted({item["job"].location for item in ranked[:3]})
    signal_summary = f"{company} is hiring for {', '.join(roles)} across {', '.join(locations)}, suggesting an active buying window tied to {offer.name.lower()}."
    inferred_pain = infer_pain(offer, ranked)
    subject = f"{company} hiring signals around {short_offer_angle(offer)}"
    body = build_outreach_body(company, offer, ranked, signal_summary, inferred_pain)
    llm_patch = enrich_with_llm(offer, company, signal_summary, inferred_pain, subject, body, evidence)
    if llm_patch:
        signal_summary = llm_patch.get("signal_summary", signal_summary)
        inferred_pain = llm_patch.get("inferred_pain", inferred_pain)
        subject = llm_patch.get("outreach_subject", subject)
        body = llm_patch.get("outreach_body", body)
    return LeadSignal(
        company=company,
        matched_offer_id=offer.id,
        signal_summary=signal_summary,
        inferred_pain=inferred_pain,
        evidence_jobs_json=dump_json(evidence),
        score=max(0, min(100, total)),
        urgency_score=urgency,
        relevance_score=relevance,
        confidence_score=confidence,
        outreach_subject=subject,
        outreach_body=body,
    )


def evidence_payload(item: dict[str, Any]) -> dict[str, Any]:
    job = item["job"]
    return {
        "title": job.title,
        "company": job.company,
        "location": job.location,
        "url": job.url,
        "posted_at": job.posted_at.isoformat(),
        "matched_keywords": item["matched_keywords"],
        "job_match_score": item["score"],
    }


def calculate_relevance(matches: list[dict[str, Any]]) -> int:
    best = max(item["score"] for item in matches)
    average = sum(item["score"] for item in matches) / len(matches)
    return round(min(100, (best * 0.68) + (average * 0.32)))


def calculate_urgency(matches: list[dict[str, Any]]) -> int:
    now = datetime.now(timezone.utc)
    recent = 0
    for item in matches:
        posted_at = item["job"].posted_at
        if posted_at.tzinfo is None:
            posted_at = posted_at.replace(tzinfo=timezone.utc)
        if (now - posted_at).days <= 21:
            recent += 1
    unique_roles = len({item["job"].title for item in matches})
    return round(min(100, 34 + (len(matches) * 13) + (unique_roles * 5) + (recent * 6)))


def calculate_confidence(matches: list[dict[str, Any]]) -> int:
    keyword_hits = sum(len(item["matched_keywords"]) for item in matches)
    negative_hits = sum(len(item["negative_hits"]) for item in matches)
    return round(max(0, min(100, 42 + (keyword_hits * 8) + (len(matches) * 5) - (negative_hits * 20))))


def infer_pain(offer: OfferProfile, matches: list[dict[str, Any]]) -> str:
    keywords = normalize(" ".join(load_json_list(offer.keywords)))
    role_text = normalize(" ".join(item["job"].title for item in matches))
    if any(term in keywords for term in ["tableau", "dashboard", "reporting", "analytics", "revops", "power bi"]):
        return "They likely need faster executive reporting, dashboard delivery, and clean SQL pipelines while the data team scales."
    if any(term in keywords for term in ["cloud", "devops", "platform", "sre"]):
        return "They likely need infrastructure delivery capacity, cloud reliability support, and senior implementation help around platform work."
    if any(term in keywords for term in ["security", "soc", "compliance", "iam"]):
        return "They likely need help reducing security operations load, tightening access controls, and meeting compliance deadlines."
    if "automation" in role_text:
        return "They appear to be investing in operational automation and may need implementation partners who can move faster than hiring alone."
    return "They are expanding roles that map to this offer, which points to budget, urgency, and an internal team seeking outside leverage."


def short_offer_angle(offer: OfferProfile) -> str:
    keywords = normalize(" ".join(load_json_list(offer.keywords)))
    if "tableau" in keywords or "dashboard" in keywords:
        return "dashboards and reporting"
    if "cloud" in keywords or "devops" in keywords:
        return "cloud delivery"
    if "security" in keywords or "soc" in keywords or "iam" in keywords:
        return "security operations"
    return offer.name.lower()


def build_outreach_body(company: str, offer: OfferProfile, matches: list[dict[str, Any]], signal: str, pain: str) -> str:
    top_jobs = ", ".join(item["job"].title for item in matches[:3])
    return (
        f"Hi {{first_name}},\n\n"
        f"I noticed {company} is hiring for {top_jobs}. {signal}\n\n"
        f"{pain} {offer.name} helps teams like this add execution capacity without waiting for every hire to land.\n\n"
        f"Would it be worth comparing notes on what the team is trying to ship this quarter?"
    )


def enrich_with_llm(offer: OfferProfile, company: str, signal: str, pain: str, subject: str, body: str, evidence: list[dict[str, Any]]) -> dict[str, str] | None:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    prompt = {
        "offer": offer.name,
        "seller_description": offer.seller_description,
        "company": company,
        "draft_signal": signal,
        "draft_pain": pain,
        "draft_subject": subject,
        "draft_body": body,
        "evidence": evidence,
    }
    try:
        response = requests.post(
            f"{base_url}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": model,
                "temperature": 0.2,
                "messages": [
                    {"role": "system", "content": "Return compact JSON with signal_summary, inferred_pain, outreach_subject, outreach_body for B2B sales outreach. Do not invent evidence."},
                    {"role": "user", "content": json.dumps(prompt)},
                ],
                "response_format": {"type": "json_object"},
            },
            timeout=12,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        if isinstance(parsed, dict):
            return {key: str(value) for key, value in parsed.items()}
    except Exception:
        return None
    return None


def build_slack_digest(leads: list[LeadSignal]) -> dict[str, Any]:
    top = sorted(leads, key=lambda item: item.score, reverse=True)[:5]
    if not top:
        text = "SignalScout AI digest: no lead signals yet. Load sample jobs and run the agent."
    else:
        lines = ["SignalScout AI buying-signal digest", ""]
        for index, lead in enumerate(top, 1):
            lines.append(f"{index}. {lead.company} — {lead.score}/100")
            lines.append(f"   {lead.signal_summary}")
            lines.append(f"   Pain: {lead.inferred_pain}")
        text = "\n".join(lines)
    blocks = [
        {"type": "header", "text": {"type": "plain_text", "text": "SignalScout AI Digest"}},
        {"type": "section", "text": {"type": "mrkdwn", "text": text}},
    ]
    return {"text": text, "blocks": blocks, "leads": top}
