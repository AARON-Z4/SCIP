"""
Complaint routes: submit (with AI duplicate check), track, list.
"""
import json
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Query
from database import get_supabase
from schemas import (
    ComplaintCreate, ComplaintOut, ComplaintListOut,
    AnalysisResult, DuplicateMatch, ComplaintStatus
)
from auth import get_current_user
from ai_engine import (
    generate_embedding, complaint_text, check_duplicate
)
from config import get_settings

router = APIRouter(prefix="/complaints", tags=["Complaints"])


def _make_reference_id() -> str:
    year = datetime.now(timezone.utc).year
    short = str(uuid.uuid4().int)[:5]
    return f"GRV-{year}-{short}"


def _row_to_out(row: dict) -> ComplaintOut:
    return ComplaintOut(
        id=row["id"],
        reference_id=row["reference_id"],
        title=row["title"],
        description=row["description"],
        category=row["category"],
        location=row["location"],
        priority=row["priority"],
        status=row["status"],
        image_urls=row.get("image_urls") or [],
        user_id=row["user_id"],
        submitter_name=row.get("submitter_name"),
        submitter_email=row.get("submitter_email"),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


# ─── Submit Complaint (Main endpoint with AI analysis) ─────────────────────────

@router.post("/submit", response_model=AnalysisResult, status_code=201)
async def submit_complaint(
    body: ComplaintCreate,
    current_user: dict = Depends(get_current_user),
):
    db = get_supabase()
    settings = get_settings()

    # 1. Fetch all existing resolved/active complaints for comparison
    existing_result = db.table("complaints")\
        .select("id, reference_id, title, description, category, location, status, created_at, embedding")\
        .neq("status", "rejected")\
        .limit(500)\
        .execute()
    existing = existing_result.data or []

    # 2. Run AI duplicate detection
    duplicate = await check_duplicate(
        new_title=body.title,
        new_description=body.description,
        new_category=body.category,
        new_location=body.location,
        existing_complaints=existing,
        threshold=settings.duplicate_threshold,
    )

    if duplicate:
        # ── DUPLICATE DETECTED ──
        comp = duplicate["complaint"]

        # Log the duplicate link
        db.table("duplicate_links").insert({
            "original_complaint_id": comp["id"],
            "attempted_title": body.title,
            "attempted_description": body.description,
            "attempted_by": current_user["id"],
            "similarity_score": duplicate["similarity_score"],
            "factor_scores": json.dumps(duplicate["factor_scores"]),
            "reasoning": duplicate["reasoning"],
            "created_at": datetime.now(timezone.utc).isoformat(),
        }).execute()

        return AnalysisResult(
            is_duplicate=True,
            message="A similar complaint already exists in the system.",
            duplicate_match=DuplicateMatch(
                complaint_id=comp["id"],
                reference_id=comp["reference_id"],
                title=comp["title"],
                category=comp["category"],
                location=comp["location"],
                status=comp["status"],
                created_at=comp["created_at"],
                similarity_score=round(duplicate["similarity_score"] * 100, 1),
                reasoning=duplicate["reasoning"],
                factor_scores=duplicate["factor_scores"],
            ),
        )

    # 3. Not a duplicate — register the complaint
    # Generate embedding for the new complaint
    emb_text = complaint_text(body.title, body.description, body.category, body.location)
    embedding = generate_embedding(emb_text)

    now = datetime.now(timezone.utc).isoformat()
    ref_id = _make_reference_id()

    new_complaint = {
        "id": str(uuid.uuid4()),
        "reference_id": ref_id,
        "title": body.title,
        "description": body.description,
        "category": body.category,
        "location": body.location,
        "priority": body.priority.value,
        "status": "registered",
        "image_urls": body.image_urls or [],
        "user_id": current_user["id"],
        "submitter_name": current_user.get("full_name"),
        "submitter_email": current_user.get("email"),
        "embedding": json.dumps(embedding),
        "created_at": now,
        "updated_at": now,
    }

    result = db.table("complaints").insert(new_complaint).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save complaint")

    saved = result.data[0]

    return AnalysisResult(
        is_duplicate=False,
        message="Complaint registered successfully.",
        complaint=_row_to_out(saved),
    )


# ─── Track by Reference ID ────────────────────────────────────────────────────

@router.get("/track/{reference_id}", response_model=ComplaintOut)
async def track_complaint(reference_id: str):
    db = get_supabase()
    result = db.table("complaints")\
        .select("*")\
        .eq("reference_id", reference_id.upper())\
        .single()\
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Complaint not found")

    return _row_to_out(result.data)


# ─── Get my complaints ────────────────────────────────────────────────────────

@router.get("/my", response_model=list[ComplaintListOut])
async def my_complaints(current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    result = db.table("complaints")\
        .select("id, reference_id, title, category, location, priority, status, created_at, updated_at")\
        .eq("user_id", current_user["id"])\
        .order("created_at", desc=True)\
        .execute()

    return result.data or []


# ─── Get comments for a complaint ──────────────────────────────────────────────

@router.get("/{complaint_id}/comments")
async def get_comments(complaint_id: str):
    db = get_supabase()
    result = db.table("complaint_comments")\
        .select("*, profiles(full_name, role)")\
        .eq("complaint_id", complaint_id)\
        .order("created_at", desc=False)\
        .execute()

    comments = []
    for row in (result.data or []):
        profile = row.get("profiles") or {}
        comments.append({
            "id": row["id"],
            "complaint_id": row["complaint_id"],
            "author_id": row["author_id"],
            "author_name": profile.get("full_name", "Unknown"),
            "author_role": profile.get("role", "citizen"),
            "content": row["content"],
            "created_at": row["created_at"],
        })
    return comments
