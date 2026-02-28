import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from config import get_settings
from routes import auth, complaints, admin

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[INFO] Backend is starting up...")
    try:
        get_settings()  # Validate all env vars on startup
        print("[INFO] All environment variables loaded successfully.")
    except Exception as e:
        print(f"[ERROR] Missing environment variables: {e}")
        raise
    yield
    print("[INFO] Backend is shutting down...")

app = FastAPI(
    title="Smart Complaint Intelligence System API",
    version="2.1.0",
    lifespan=lifespan,
    description="Backend for SCIS with Gemini AI integration",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
# allow_origins=["*"] + allow_credentials=True is rejected by browsers.
# Use explicit origin list from env var. Set FRONTEND_URL on Railway & Vercel.
_settings = get_settings()
_frontend_url = _settings.frontend_url

# Support comma-separated list for multi-origin setups (e.g. preview URLs)
_extra_origins = os.getenv("CORS_ORIGINS", "")
_extra_list = [o.strip() for o in _extra_origins.split(",") if o.strip()]

CORS_ORIGINS = list({
    _frontend_url,
    "http://localhost:8080",
    "http://localhost:5173",
    *_extra_list,
})

print(f"[INFO] CORS allowed origins: {CORS_ORIGINS}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ─── Include Routers ──────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(complaints.router)
app.include_router(admin.router)

@app.get("/")
async def root():
    return {
        "message": "Smart Complaint Intelligence System API is running",
        "docs": "/docs",
        "version": "2.1.0"
    }
