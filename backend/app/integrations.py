from datetime import datetime, timezone
import json
import os
from typing import Any

import requests


def fetch_adzuna_jobs(query: str, location: str, limit: int) -> tuple[list[dict[str, Any]], str]:
    app_id = os.getenv("ADZUNA_APP_ID")
    app_key = os.getenv("ADZUNA_APP_KEY")
    if not app_id or not app_key:
        return [], "Adzuna credentials are not configured."
    url = "https://api.adzuna.com/v1/api/jobs/us/search/1"
    response = requests.get(
        url,
        params={"app_id": app_id, "app_key": app_key, "what": query, "where": location, "results_per_page": limit},
        timeout=15,
    )
    response.raise_for_status()
    jobs = []
    for item in response.json().get("results", []):
        jobs.append(
            {
                "source": "adzuna",
                "external_id": str(item.get("id")),
                "title": item.get("title") or "Untitled role",
                "company": (item.get("company") or {}).get("display_name") or "Unknown company",
                "location": (item.get("location") or {}).get("display_name") or location,
                "description": item.get("description") or "",
                "url": item.get("redirect_url") or "https://www.adzuna.com",
                "posted_at": parse_datetime(item.get("created")),
                "raw_json": item,
            }
        )
    return jobs, f"Fetched {len(jobs)} jobs from Adzuna."


def fetch_muse_jobs(query: str, location: str, limit: int) -> tuple[list[dict[str, Any]], str]:
    response = requests.get(
        "https://www.themuse.com/api/public/jobs",
        params={"page": 1, "descending": "true", "location": location},
        timeout=15,
    )
    response.raise_for_status()
    jobs = []
    query_lower = query.lower()
    for item in response.json().get("results", []):
        contents = " ".join(
            [
                item.get("name") or "",
                item.get("contents") or "",
                " ".join(category.get("name", "") for category in item.get("categories", [])),
            ]
        )
        if query_lower and query_lower not in contents.lower():
            continue
        company = (item.get("company") or {}).get("name") or "Unknown company"
        locations = ", ".join(place.get("name", "") for place in item.get("locations", [])) or location
        jobs.append(
            {
                "source": "muse",
                "external_id": str(item.get("id")),
                "title": item.get("name") or "Untitled role",
                "company": company,
                "location": locations,
                "description": strip_html(item.get("contents") or ""),
                "url": item.get("refs", {}).get("landing_page") or "https://www.themuse.com",
                "posted_at": parse_datetime(item.get("publication_date")),
                "raw_json": item,
            }
        )
        if len(jobs) >= limit:
            break
    return jobs, f"Fetched {len(jobs)} jobs from The Muse."


def parse_datetime(value: str | None) -> datetime:
    if not value:
        return datetime.now(timezone.utc)
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed
    except ValueError:
        return datetime.now(timezone.utc)


def strip_html(value: str) -> str:
    text = value.replace("<br>", " ").replace("<br/>", " ").replace("<br />", " ")
    for token in ["<p>", "</p>", "<li>", "</li>", "<ul>", "</ul>", "<strong>", "</strong>", "<em>", "</em>"]:
        text = text.replace(token, " ")
    return " ".join(text.split())


def send_slack_webhook(payload: dict[str, Any]) -> tuple[bool, str]:
    webhook = os.getenv("SLACK_WEBHOOK_URL")
    if not webhook:
        return False, "Slack webhook is not configured. Demo preview is available."
    response = requests.post(webhook, data=json.dumps(payload), headers={"Content-Type": "application/json"}, timeout=12)
    response.raise_for_status()
    return True, "Slack digest sent."
