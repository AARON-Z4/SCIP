"""
Admin routes: list all complaints, update status, add comments, stats dashboard.
"""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Query
from database import get_supabase
from schemas import (
    ComplaintOut, ComplaintListOut, StatusUpdate,
    CommentCreate, CommentOut, AdminStats
)
from auth import require_admin, get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])


# ─── Stats Dashboard ──────────────────────────────────────────────────────────

@router.get("/stats", response_model=AdminStats)
async def get_stats(_: dict = Depends(require_admin)):
    db = get_supabase()

    # All complaints
    all_result = db.table("complaints").select("id, status, priority, category, created_at, updated_at").execute()
    all_complaints = all_result.data or []

    # Duplicate links count
    dup_result = db.table("duplicate_links").select("id", count="exact").execute()
    dup_count = dup_result.count or 0

    total = len(all_complaints)
    resolved = sum(1 for c in all_complaints if c["status"] == "resolved")
    pending = sum(1 for c in all_complaints if c["status"] in ("registered", "verified"))
    in_progress = sum(1 for c in all_complaints if c["status"] in ("assigned", "in_progress"))

    # Category distribution
    by_category: dict[str, int] = {}
    for c in all_complaints:
        cat = c.get("category", "Other")
        by_category[cat] = by_category.get(cat, 0) + 1

    # Priority distribution
    by_priority: dict[str, int] = {}
    for c in all_complaints:
        p = c.get("priority", "medium")
        by_priority[p] = by_priority.get(p, 0) + 1

    # Average resolution time (days) for resolved complaints
    avg_days = None
    resolved_complaints = [c for c in all_complaints if c["status"] == "resolved" and c.get("updated_at")]
    if resolved_complaints:
        total_days = 0
        count = 0
        for c in resolved_complaints:
            try:
                created = datetime.fromisoformat(c["created_at"].replace("Z", "+00:00"))
                updated = datetime.fromisoformat(c["updated_at"].replace("Z", "+00:00"))
                total_days += (updated - created).days
                count += 1
            except Exception:
                pass
        avg_days = round(total_days / count, 1) if count else None

    return AdminStats(
        total=total,
        resolved=resolved,
        pending=pending,
        in_progress=in_progress,
        duplicates_caught=dup_count,
        avg_resolution_days=avg_days,
        by_category=by_category,
        by_priority=by_priority,
    )


# ─── List All Complaints ──────────────────────────────────────────────────────

@router.get("/complaints", response_model=list[ComplaintListOut])
async def list_complaints(
    status: str = Query(None),
    priority: str = Query(None),
    category: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    _: dict = Depends(require_admin),
):
    db = get_supabase()
    query = db.table("complaints")\
        .select("id, reference_id, title, category, location, priority, status, created_at, updated_at")\
        .order("created_at", desc=True)\
        .range((page - 1) * limit, page * limit - 1)

    if status:
        query = query.eq("status", status)
    if priority:
        query = query.eq("priority", priority)
    if category:
        query = query.eq("category", category)

    result = query.execute()
    return result.data or []


# ─── Get Single Complaint (Admin) ─────────────────────────────────────────────

@router.get("/complaints/{complaint_id}")
async def get_complaint(complaint_id: str, _: dict = Depends(require_admin)):
    db = get_supabase()
    result = db.table("complaints").select("*").eq("id", complaint_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return result.data


# ─── Update Status ────────────────────────────────────────────────────────────

@router.patch("/complaints/{complaint_id}/status")
async def update_status(
    complaint_id: str,
    body: StatusUpdate,
    current_user: dict = Depends(require_admin),
):
    db = get_supabase()

    # Verify complaint exists
    check = db.table("complaints").select("id").eq("id", complaint_id).single().execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Complaint not found")

    now = datetime.now(timezone.utc).isoformat()
    db.table("complaints").update({
        "status": body.status.value,
        "updated_at": now,
    }).eq("id", complaint_id).execute()

    # Add an automatic system comment about status change
    note = body.note or f"Status changed to '{body.status.value}' by admin."
    db.table("complaint_comments").insert({
        "id": str(uuid.uuid4()),
        "complaint_id": complaint_id,
        "author_id": current_user["id"],
        "content": note,
        "created_at": now,
    }).execute()

    return {"message": f"Status updated to {body.status.value}"}


# ─── Add Comment ──────────────────────────────────────────────────────────────

@router.post("/complaints/{complaint_id}/comments", response_model=CommentOut)
async def add_comment(
    complaint_id: str,
    body: CommentCreate,
    current_user: dict = Depends(get_current_user),
):
    db = get_supabase()
    now = datetime.now(timezone.utc).isoformat()
    comment_id = str(uuid.uuid4())

    result = db.table("complaint_comments").insert({
        "id": comment_id,
        "complaint_id": complaint_id,
        "author_id": current_user["id"],
        "content": body.content,
        "created_at": now,
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to add comment")

    return CommentOut(
        id=comment_id,
        complaint_id=complaint_id,
        author_id=current_user["id"],
        author_name=current_user.get("full_name", ""),
        author_role=current_user.get("role", "citizen"),
        content=body.content,
        created_at=now,
    )


# ─── List Duplicate Links ──────────────────────────────────────────────────────

@router.get("/duplicates")
async def list_duplicates(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    _: dict = Depends(require_admin),
):
    db = get_supabase()
    result = db.table("duplicate_links")\
        .select("*")\
        .order("created_at", desc=True)\
        .range((page - 1) * limit, page * limit - 1)\
        .execute()
    return result.data or []
