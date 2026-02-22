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
def get_stats(_: dict = Depends(require_admin)):
    """
    Compute aggregated admin statistics for complaints and duplicate links.
    
    Builds totals and distributions from the complaints table and counts duplicate link records. Computed fields include total complaints, number resolved, number pending (registered or verified), number in progress (assigned or in_progress), count of duplicate links, average resolution time in days for resolved complaints (rounded to 1 decimal, or `None` if unavailable), and breakdowns by category and priority.
    
    Returns:
        AdminStats: Summary object with the following fields:
            - total: total number of complaints.
            - resolved: number of complaints with status "resolved".
            - pending: number of complaints with status "registered" or "verified".
            - in_progress: number of complaints with status "assigned" or "in_progress".
            - duplicates_caught: count of entries in the duplicate_links table.
            - avg_resolution_days: average days between creation and resolution for resolved complaints, or `None` if not computable.
            - by_category: mapping of category name to complaint count.
            - by_priority: mapping of priority level to complaint count.
    """
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
                c_at = c["created_at"].replace("Z", "+00:00")
                u_at = c["updated_at"].replace("Z", "+00:00")
                if "+" not in c_at: c_at += "+00:00"
                if "+" not in u_at: u_at += "+00:00"
                created = datetime.fromisoformat(c_at)
                updated = datetime.fromisoformat(u_at)
                total_days += (updated - created).days
                count += 1
            except Exception as e:
                print(f"[ERROR] Failed Date math for {c.get('id')}: {e}")
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
def list_complaints(
    status: str = Query(None),
    priority: str = Query(None),
    category: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    _: dict = Depends(require_admin),
):
    """
    List complaint summaries with optional filters and pagination.
    
    Parameters:
        status (str | None): Filter results to complaints with this status.
        priority (str | None): Filter results to complaints with this priority.
        category (str | None): Filter results to complaints in this category.
        page (int): 1-based page number of results to return.
        limit (int): Maximum number of items per page (1–100).
    
    Returns:
        list: A list of complaint summary objects containing the fields
        `id`, `reference_id`, `title`, `category`, `location`, `priority`,
        `status`, `created_at`, and `updated_at`. Returns an empty list when no
        complaints match the query.
    """
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
def get_complaint(complaint_id: str, _: dict = Depends(require_admin)):
    """
    Retrieve a complaint record by its ID.
    
    Parameters:
        complaint_id (str): The UUID of the complaint to retrieve.
    
    Returns:
        dict: The complaint record data.
    
    Raises:
        HTTPException: 404 if no complaint with the given ID exists.
    """
    db = get_supabase()
    result = db.table("complaints").select("*").eq("id", complaint_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return result.data


# ─── Update Status ────────────────────────────────────────────────────────────

@router.patch("/complaints/{complaint_id}/status")
def update_status(
    complaint_id: str,
    body: StatusUpdate,
    current_user: dict = Depends(require_admin),
):
    """
    Update a complaint's status and create an automatic system comment recording the change.
    
    Parameters:
        complaint_id (str): ID of the complaint to update.
        body (StatusUpdate): New status and optional note to attach as a comment.
        
    Raises:
        HTTPException: 404 if the complaint with `complaint_id` does not exist.
    
    Returns:
        dict: A confirmation object with a `message` string describing the new status.
    """
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
def add_comment(
    complaint_id: str,
    body: CommentCreate,
    current_user: dict = Depends(get_current_user),
):
    """
    Create a new comment for the specified complaint and return the created comment record.
    
    Parameters:
    	complaint_id (str): The ID of the complaint to attach the comment to.
    	body (CommentCreate): Payload containing the comment content.
    
    Returns:
    	CommentOut: The newly created comment including id, complaint_id, author metadata (id, name, role), content, and created_at timestamp.
    
    Raises:
    	HTTPException: Raised with status code 500 if inserting the comment into the database fails.
    """
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
def list_duplicates(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    _: dict = Depends(require_admin),
):
    """
    List duplicate link records with pagination.
    
    Parameters:
    	page (int): 1-based page number.
    	limit (int): Maximum number of records to return per page (1–100).
    
    Returns:
    	duplicates (list[dict]): List of duplicate link records; empty list if none.
    """
    db = get_supabase()
    result = db.table("duplicate_links")\
        .select("*")\
        .order("created_at", desc=True)\
        .range((page - 1) * limit, page * limit - 1)\
        .execute()
    return result.data or []