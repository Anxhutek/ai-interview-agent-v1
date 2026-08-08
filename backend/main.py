import contextlib
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from models.database import create_all_tables
from routers import health, interview

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
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

app.include_router(health.router)
app.include_router(interview.router)

@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.APP_NAME} API (Pure Breeth-Driven Architecture)",
        "docs": "/docs",
        "health": "/health"
    }
