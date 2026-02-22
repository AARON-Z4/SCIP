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
    """
    Generate a human-readable complaint reference identifier.
    
    Returns:
        reference_id (str): A string in the format "GRV-{year}-{8_HEX_CHARS}" where {year} is the current UTC year and {8_HEX_CHARS} is an uppercase, 8-character hexadecimal segment derived from a random UUID.
    """
    year = datetime.now(timezone.utc).year
    short = uuid.uuid4().hex[:8].upper()
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
def submit_complaint(
    body: ComplaintCreate,
    current_user: dict = Depends(get_current_user),
):
    """
    Process a complaint submission by checking for duplicates and saving a new complaint when appropriate.
    
    If an existing similar complaint is found, a duplicate link is recorded and an AnalysisResult with is_duplicate=True and a DuplicateMatch is returned. If no duplicate is detected, an embedding is generated and a new complaint record is inserted; the insertion will be retried up to 3 times to handle ID/reference collisions before failing.
    
    Parameters:
        body (ComplaintCreate): The complaint data submitted by the user.
    
    Returns:
        AnalysisResult: When a duplicate is detected, contains is_duplicate=True and a `duplicate_match` describing the matched complaint and similarity metrics; when saved successfully, contains is_duplicate=False and the saved complaint as a ComplaintOut.
    
    Raises:
        HTTPException: Status 500 if a database error occurs during insertion, or if saving fails after retrying due to ID/reference collisions.
    """
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
    duplicate = check_duplicate(
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
    
    saved = None
    for _ in range(3):
        try:
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
            if result.data:
                saved = result.data[0]
                break
        except Exception as e:
            if "duplicate key" in str(e).lower() or "unique constraint" in str(e).lower():
                continue
            raise HTTPException(status_code=500, detail=f"Database error: {e}")

    if not saved:
        raise HTTPException(status_code=500, detail="Failed to save complaint due to ID collision. Please try again.")

    return AnalysisResult(
        is_duplicate=False,
        message="Complaint registered successfully.",
        complaint=_row_to_out(saved),
    )


# ─── Track by Reference ID ────────────────────────────────────────────────────

@router.get("/track/{reference_id}", response_model=ComplaintOut)
def track_complaint(reference_id: str):
    """
    Retrieve a complaint by its reference ID.
    
    Parameters:
        reference_id (str): The complaint reference ID (lookup is case-insensitive; the value is uppercased before querying).
    
    Returns:
        ComplaintOut: The complaint record matching the provided reference ID.
    
    Raises:
        HTTPException: 404 if no complaint with the given reference ID is found.
    """
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
def my_complaints(current_user: dict = Depends(get_current_user)):
    """
    Retrieve the current user's complaints ordered by newest first.
    
    Returns:
        A list of complaint records, each with the fields `id`, `reference_id`, `title`, `category`, `location`, `priority`, `status`, `created_at`, and `updated_at`; returns an empty list if the user has no complaints.
    """
    db = get_supabase()
    result = db.table("complaints")\
        .select("id, reference_id, title, category, location, priority, status, created_at, updated_at")\
        .eq("user_id", current_user["id"])\
        .order("created_at", desc=True)\
        .execute()

    return result.data or []


# ─── Get comments for a complaint ──────────────────────────────────────────────

@router.get("/{complaint_id}/comments")
def get_comments(complaint_id: str):
    """
    Retrieve and normalize comments for a complaint, ordered from oldest to newest.
    
    Parameters:
        complaint_id (str): Identifier of the complaint whose comments will be fetched.
    
    Returns:
        list[dict]: A list of comment dictionaries with keys:
            - id: comment id
            - complaint_id: associated complaint id
            - author_id: id of the comment author
            - author_name: author's full name (defaults to "Unknown" if missing)
            - author_role: author's role (defaults to "citizen" if missing)
            - content: comment text
            - created_at: timestamp when the comment was created
    """
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