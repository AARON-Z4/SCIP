"""
Authentication utilities: JWT creation/verification, password hashing.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config import get_settings
from database import get_supabase

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# auto_error=False: return 401 instead of 422 when Authorization header is missing
bearer_scheme = HTTPBearer(auto_error=False)


# ─── Password ─────────────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: Optional[str]) -> bool:
    if not hashed:
        return False
    try:
        return pwd_context.verify(plain, hashed)
    except Exception as e:
        print(f"[AUTH] Password verification failed: {e}")
        return False


# ─── JWT ──────────────────────────────────────────────────────────────────────

def create_access_token(user_id: str, role: str) -> str:
    s = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=s.jwt_expire_minutes)
    payload = {"sub": user_id, "role": role, "exp": expire}
    return jwt.encode(payload, s.jwt_secret, algorithm=s.jwt_algorithm)


def decode_token(token: str) -> dict:
    s = get_settings()
    try:
        return jwt.decode(token, s.jwt_secret, algorithms=[s.jwt_algorithm])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


# ─── Dependency: get current user ──────────────────────────────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    # Reject immediately if no Authorization header was sent
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please sign in to continue.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    user_id = None
    
    # 1. Try local JWT decode (standard flow)
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
    except HTTPException:
        # 2. Key Error or Expired -> Try Supabase Auth (Google flow)
        pass
    except Exception:
        pass

    if not user_id:
        try:
            db = get_supabase()
            # Verify via Supabase Auth API
            user_response = db.auth.get_user(token)
            if user_response and user_response.user:
                user_id = user_response.user.id
                print(f"[AUTH] Supabase token validated for user: {user_id}")
        except Exception as e:
            print(f"[AUTH] Supabase token validation failed: {e}")
            pass

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

    db = get_supabase()
    result = db.table("profiles").select("*").eq("id", user_id).single().execute()
    
    if not result.data:
        # Profile missing — this can happen if the DB trigger hasn't fired yet
        # or if this is the first login for a Google OAuth user.
        print(f"[AUTH] Profile missing for {user_id}. Attempting lazy creation...")
        try:
            admin_db = get_supabase()
            auth_user = admin_db.auth.admin.get_user_by_id(user_id)
            if auth_user and auth_user.user:
                u = auth_user.user
                email = u.email or ""
                metadata = u.user_metadata or {}
                full_name = metadata.get("full_name") or metadata.get("name") or email
                now = datetime.now(timezone.utc).isoformat()
                
                admin_db.table("profiles").upsert({
                    "id": user_id,
                    "email": email,
                    "full_name": full_name,
                    "role": "citizen",
                    "password_hash": None,
                    "created_at": now,
                    "updated_at": now
                }, on_conflict="id").execute()
                # Re-fetch the newly created profile
                result = admin_db.table("profiles").select("*").eq("id", user_id).single().execute()
                print(f"[AUTH] Lazy profile created for {email}")
        except Exception as create_err:
            print(f"[AUTH] Lazy profile creation failed: {create_err}")
            pass

    if not result.data:
        raise HTTPException(status_code=401, detail="User profile not found. Please contact support.")

    return result.data


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user
