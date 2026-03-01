"""
AI Engine: Groq-powered duplicate detection using LLM semantic reasoning.

Flow:
1. Take the new complaint fields (title, description, category, location)
2. Compare against up to 10 most recent existing complaints via Groq LLM
3. LLM returns a structured JSON: { is_duplicate, similarity_score, reasoning, factor_scores }
4. If similarity_score >= threshold → flag as duplicate
"""
import json
import re
import concurrent.futures
from groq import Groq
from config import get_settings
from typing import Optional
from fastapi import HTTPException

# Lazily-initialized client
_client: Groq | None = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        s = get_settings()
        _client = Groq(api_key=s.groq_api_key)
    return _client


# ─── Helpers ──────────────────────────────────────────────────────────────────

def complaint_text(title: str, description: str, category: str, location: str) -> str:
    """Concatenate fields into a single string for comparison."""
    return f"Category: {category}. Location: {location}. Title: {title}. Description: {description}"


def _format_complaint(c: dict) -> str:
    return (
        f"- ID: {c.get('id','')}\n"
        f"  Title: {c.get('title','')}\n"
        f"  Description: {c.get('description','')[:200]}\n"
        f"  Category: {c.get('category','')}\n"
        f"  Location: {c.get('location','')}"
    )


# ─── Core LLM Duplicate Check ──────────────────────────────────────────────────

def _llm_duplicate_check(
    new_complaint: dict,
    candidates: list[dict],
) -> Optional[dict]:
    """
    Use Groq LLM to determine if new_complaint is a duplicate of any candidate.
    Returns best match dict or None.
    """
    if not candidates:
        return None

    candidates_text = "\n".join(_format_complaint(c) for c in candidates[:10])

    prompt = f"""You are an AI assistant for a government grievance management system.
Your job is to determine if a newly submitted complaint is a duplicate of any existing ones.

NEW COMPLAINT:
Title: {new_complaint['title']}
Description: {new_complaint['description']}
Category: {new_complaint['category']}
Location: {new_complaint['location']}

EXISTING COMPLAINTS:
{candidates_text}

Analyze semantic similarity, location overlap, and category match.

Respond ONLY with a valid JSON object in this exact format (no markdown, no extra text):
{{
  "is_duplicate": true or false,
  "duplicate_id": "<id of the matching complaint, or null>",
  "similarity_score": <float from 0.0 to 1.0>,
  "reasoning": "<1-2 sentence explanation>",
  "factor_scores": {{
    "semantic_similarity": <float 0-1>,
    "location_overlap": <float 0-1>,
    "category_match": <float 0-1>
  }}
}}"""

    def _call():
        client = _get_client()
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=400,
        )
        return response.choices[0].message.content

    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(_call)
        try:
            raw = future.result(timeout=25)
        except concurrent.futures.TimeoutError:
            raise HTTPException(
                status_code=503,
                detail="AI analysis timed out. Please try again shortly."
            )

    # Parse JSON out of response (handle markdown code block wrapping)
    try:
        # Strip markdown if present
        clean = re.sub(r"```(?:json)?|```", "", raw).strip()
        result = json.loads(clean)
    except json.JSONDecodeError:
        print(f"[AI] Could not parse LLM response as JSON: {raw}")
        return None

    if not result.get("is_duplicate"):
        return None

    # Find the matching complaint from candidates
    dup_id = result.get("duplicate_id")
    matched = next((c for c in candidates if c.get("id") == dup_id), None)
    if not matched:
        # LLM said duplicate but gave bad ID — trust score threshold instead
        if result.get("similarity_score", 0) < 0.75:
            return None
        matched = candidates[0]  # fallback to first candidate

    return {
        "complaint": matched,
        "similarity_score": float(result.get("similarity_score", 0)),
        "reasoning": result.get("reasoning", ""),
        "factor_scores": result.get("factor_scores", {}),
    }


# ─── Public API ────────────────────────────────────────────────────────────────

def check_duplicate(
    new_title: str,
    new_description: str,
    new_category: str,
    new_location: str,
    existing_complaints: list[dict],
    threshold: float = 0.75,
) -> Optional[dict]:
    """
    Check if the new complaint is semantically duplicate of any existing one.

    Returns best matching complaint dict with similarity metadata, or None.
    """
    if not existing_complaints:
        return None

    new_complaint = {
        "title": new_title,
        "description": new_description,
        "category": new_category,
        "location": new_location,
    }

    # Filter to same-category complaints first for efficiency,
    # fall back to all if none match
    same_cat = [
        c for c in existing_complaints
        if c.get("category", "").strip().lower() == new_category.strip().lower()
    ]
    candidates = same_cat[:10] if same_cat else existing_complaints[:10]

    result = _llm_duplicate_check(new_complaint, candidates)

    if result and result["similarity_score"] >= threshold:
        return result

    return None


# ─── Stub: kept for API compatibility ─────────────────────────────────────────

def generate_embedding(text: str) -> list:
    """No longer used. Groq does not provide an embedding endpoint."""
    return []
