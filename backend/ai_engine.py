"""
AI Engine: Gemini-powered duplicate detection using text embeddings + location heuristics.

Flow:
1. Generate embedding for new complaint (title + description + category + location)
2. Fetch all existing complaint embeddings from DB
3. Compute cosine similarity for each
4. Also compute location similarity score  
5. Combine both with weighted average
6. If combined score > threshold → flag as duplicate
"""
import numpy as np
import json
import re
import google.generativeai as genai
from config import get_settings
from typing import Optional

# Configure Gemini once at module load
_settings = get_settings()
genai.configure(api_key=_settings.gemini_api_key)


# ─── Embedding ────────────────────────────────────────────────────────────────

def generate_embedding(text: str) -> list[float]:
    """
    Generate a semantic embedding vector using Gemini text-embedding-004.
    Returns a list of 768 floats.
    """
    result = genai.embed_content(
        model="models/text-embedding-004",
        content=text,
        task_type="RETRIEVAL_DOCUMENT",
    )
    return result["embedding"]


def complaint_text(title: str, description: str, category: str, location: str) -> str:
    """Concatenate fields into a single string for embedding."""
    return f"Category: {category}. Location: {location}. Title: {title}. Description: {description}"


# ─── Cosine Similarity ────────────────────────────────────────────────────────

def cosine_similarity(a: list[float], b: list[float]) -> float:
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    dot = np.dot(va, vb)
    norm = np.linalg.norm(va) * np.linalg.norm(vb)
    if norm == 0:
        return 0.0
    return float(dot / norm)


# ─── Location Similarity ──────────────────────────────────────────────────────

def _normalize_location(loc: str) -> str:
    return re.sub(r"[^a-z0-9 ]", "", loc.lower().strip())


def location_similarity(loc_a: str, loc_b: str) -> float:
    """
    Simple word-overlap based location similarity.
    Returns 0.0–1.0.
    """
    a_words = set(_normalize_location(loc_a).split())
    b_words = set(_normalize_location(loc_b).split())
    if not a_words or not b_words:
        return 0.0
    overlap = a_words & b_words
    return len(overlap) / max(len(a_words), len(b_words))


# ─── Combined Score ───────────────────────────────────────────────────────────

def combined_score(
    text_sim: float,
    loc_sim: float,
    category_match: bool,
) -> float:
    """
    Weighted combination:
    - Text similarity: 60%
    - Location similarity: 30%
    - Category match bonus: 10%
    """
    cat_score = 1.0 if category_match else 0.0
    return (text_sim * 0.60) + (loc_sim * 0.30) + (cat_score * 0.10)


def factor_scores(
    text_sim: float,
    loc_sim: float,
    category_match: bool,
) -> dict:
    return {
        "text_similarity": round(text_sim * 100, 1),
        "location_match": round(loc_sim * 100, 1),
        "category_match": 100.0 if category_match else 0.0,
    }


# ─── Reasoning Message ────────────────────────────────────────────────────────

def build_reasoning(
    score: float,
    text_sim: float,
    loc_sim: float,
    category_match: bool,
    new_location: str,
    existing_location: str,
    new_category: str,
    existing_category: str,
) -> str:
    parts = []
    if text_sim >= 0.7:
        parts.append(f"The complaint description and title are highly similar ({round(text_sim*100)}% text overlap).")
    elif text_sim >= 0.5:
        parts.append(f"The complaint description shares notable similarity ({round(text_sim*100)}%).")
    if loc_sim >= 0.6:
        parts.append(f"Both complaints reference the same location area ({existing_location}).")
    elif loc_sim >= 0.3:
        parts.append(f"Locations appear to be nearby ({new_location} vs {existing_location}).")
    if category_match:
        parts.append(f"Both complaints are categorized under '{new_category}'.")
    if not parts:
        parts.append(f"Overall similarity score of {round(score*100)}% exceeds the duplicate threshold.")
    return " ".join(parts)


# ─── Main Duplicate Check ─────────────────────────────────────────────────────

async def check_duplicate(
    new_title: str,
    new_description: str,
    new_category: str,
    new_location: str,
    existing_complaints: list[dict],
    threshold: float = 0.75,
) -> Optional[dict]:
    """
    Check if the new complaint is a duplicate of any existing complaint.

    Args:
        existing_complaints: list of dicts with keys:
            id, reference_id, title, description, category, location,
            status, created_at, embedding (list[float] or None)
    
    Returns:
        Best matching complaint dict with similarity metadata, or None.
    """
    if not existing_complaints:
        return None

    # Generate embedding for the new complaint
    new_text = complaint_text(new_title, new_description, new_category, new_location)
    new_embedding = generate_embedding(new_text)

    best_score = 0.0
    best_match = None

    for comp in existing_complaints:
        # Skip complaints without embeddings
        stored_embedding = comp.get("embedding")
        if not stored_embedding:
            continue

        # Parse if stored as JSON string
        if isinstance(stored_embedding, str):
            try:
                stored_embedding = json.loads(stored_embedding)
            except Exception:
                continue

        # Compute scores
        text_sim = cosine_similarity(new_embedding, stored_embedding)
        loc_sim = location_similarity(new_location, comp.get("location", ""))
        cat_match = new_category.strip().lower() == comp.get("category", "").strip().lower()

        score = combined_score(text_sim, loc_sim, cat_match)

        if score > best_score:
            best_score = score
            best_match = {
                "complaint": comp,
                "similarity_score": round(score, 4),
                "text_similarity": round(text_sim, 4),
                "location_similarity": round(loc_sim, 4),
                "category_match": cat_match,
                "factor_scores": factor_scores(text_sim, loc_sim, cat_match),
                "reasoning": build_reasoning(
                    score, text_sim, loc_sim, cat_match,
                    new_location, comp.get("location", ""),
                    new_category, comp.get("category", ""),
                ),
            }

    if best_match and best_match["similarity_score"] >= threshold:
        return best_match

    return None
