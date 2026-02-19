"""
Pydantic schemas for request/response validation.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ─── Enums ────────────────────────────────────────────────────────────────────

class UserRole(str, Enum):
    citizen = "citizen"
    admin = "admin"


class Priority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class ComplaintStatus(str, Enum):
    registered = "registered"
    verified = "verified"
    assigned = "assigned"
    in_progress = "in_progress"
    resolved = "resolved"
    rejected = "rejected"


# ─── Auth Schemas ──────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: UserRole
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Complaint Schemas ─────────────────────────────────────────────────────────

class ComplaintCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=200)
    description: str = Field(..., min_length=30, max_length=5000)
    category: str = Field(..., min_length=2, max_length=100)
    location: str = Field(..., min_length=3, max_length=200)
    priority: Priority = Priority.medium
    # image URLs come after upload (separate endpoint)
    image_urls: Optional[List[str]] = []


class ComplaintOut(BaseModel):
    id: str
    reference_id: str
    title: str
    description: str
    category: str
    location: str
    priority: Priority
    status: ComplaintStatus
    image_urls: List[str]
    user_id: str
    submitter_name: Optional[str] = None
    submitter_email: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ComplaintListOut(BaseModel):
    id: str
    reference_id: str
    title: str
    category: str
    location: str
    priority: Priority
    status: ComplaintStatus
    created_at: datetime
    updated_at: datetime


# ─── Duplicate Detection Schemas ───────────────────────────────────────────────

class DuplicateMatch(BaseModel):
    complaint_id: str
    reference_id: str
    title: str
    category: str
    location: str
    status: ComplaintStatus
    created_at: datetime
    similarity_score: float
    reasoning: str
    factor_scores: dict


class AnalysisResult(BaseModel):
    is_duplicate: bool
    message: str
    complaint: Optional[ComplaintOut] = None          # set if registered
    duplicate_match: Optional[DuplicateMatch] = None  # set if duplicate


# ─── Comment Schemas ──────────────────────────────────────────────────────────

class CommentCreate(BaseModel):
    content: str = Field(..., min_length=3, max_length=2000)


class CommentOut(BaseModel):
    id: str
    complaint_id: str
    author_id: str
    author_name: str
    author_role: UserRole
    content: str
    created_at: datetime


# ─── Status Update (Admin) ────────────────────────────────────────────────────

class StatusUpdate(BaseModel):
    status: ComplaintStatus
    note: Optional[str] = None


# ─── Admin Stats ──────────────────────────────────────────────────────────────

class AdminStats(BaseModel):
    total: int
    resolved: int
    pending: int
    in_progress: int
    duplicates_caught: int
    avg_resolution_days: Optional[float] = None
    by_category: dict
    by_priority: dict


# ─── Image Upload ─────────────────────────────────────────────────────────────

class ImageUploadResponse(BaseModel):
    url: str
    path: str
