from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from config import get_settings
from routes import auth, complaints, admin

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: could add database checks here
    print("[INFO] Backend is starting up...")
    yield
    # Shutdown
    print("[INFO] Backend is shutting down...")

app = FastAPI(
    title="Smart Complaint Intelligence System API",
    version="2.1.0",
    lifespan=lifespan,
    description="Backend for SCIS with Gemini AI integration",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
# Allow all origins for development to prevent preflight failures
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
