import os
import contextlib
from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from core.config import settings
from models.database import create_all_tables
from routers import health, interview, auth, profile, proctoring, admin, admin_ai, admin_2fa

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "avatars"), exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "resumes"), exist_ok=True)
    await create_all_tables()
    yield
    # Shutdown

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for uploads
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "avatars"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "resumes"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

app.include_router(health.router)
app.include_router(interview.router)
app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(proctoring.router)
app.include_router(admin.router)
app.include_router(admin_ai.router)
app.include_router(admin_2fa.router)




@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.APP_NAME} API (Pure Breeth-Driven Architecture)",
        "docs": "/docs",
        "health": "/health"
    }
