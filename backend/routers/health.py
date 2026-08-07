from fastapi import APIRouter
from models.schemas import HealthResponse
from core.config import settings
import time

router = APIRouter()
START_TIME = time.time()

@router.get('/health', response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="ok",
        version=settings.VERSION,
        uptime_seconds=time.time() - START_TIME
    )
