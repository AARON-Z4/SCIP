"""
Auth routes: register, login, get-me.
"""
from fastapi import APIRouter, HTTPException, status, Depends
from database import get_supabase
from schemas import RegisterRequest, LoginRequest, TokenResponse, UserOut
from auth import hash_password, verify_password, create_access_token, get_current_user
from datetime import datetime, timezone

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: RegisterRequest):
    db = get_supabase()

    # Check if email already exists
    existing = db.table("profiles").select("id").eq("email", body.email).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Email already registered")

    # Hash password
    pw_hash = hash_password(body.password)

    # Insert into profiles table
    now = datetime.now(timezone.utc).isoformat()
    result = db.table("profiles").insert({
        "email": body.email,
        "full_name": body.full_name,
        "password_hash": pw_hash,
        "role": "citizen",
        "created_at": now,
        "updated_at": now,
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create user")

    user = result.data[0]
    token = create_access_token(user["id"], user["role"])

    return TokenResponse(
        access_token=token,
        user=UserOut(
            id=user["id"],
            email=user["email"],
            full_name=user["full_name"],
            role=user["role"],
            created_at=user["created_at"],
        ),
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    db = get_supabase()

    result = db.table("profiles").select("*").eq("email", body.email).single().execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = result.data
    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(user["id"], user["role"])

    return TokenResponse(
        access_token=token,
        user=UserOut(
            id=user["id"],
            email=user["email"],
            full_name=user["full_name"],
            role=user["role"],
            created_at=user["created_at"],
        ),
    )


@router.get("/me", response_model=UserOut)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserOut(
        id=current_user["id"],
        email=current_user["email"],
        full_name=current_user["full_name"],
        role=current_user["role"],
        created_at=current_user["created_at"],
    )
