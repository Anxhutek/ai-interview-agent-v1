from datetime import datetime
from fastapi import APIRouter, Depends
from models.schemas import AIHealthResponse
from models.database import User
from core.dependencies import get_current_admin, require_admin_2fa, get_ai_orchestrator
from services.ai.ai_orchestrator import AIOrchestrator

router = APIRouter(prefix='/api/admin/ai', tags=['admin-ai'])

@router.get('/health', response_model=AIHealthResponse)
async def get_ai_health(
    admin: User = Depends(require_admin_2fa),
    orchestrator: AIOrchestrator = Depends(get_ai_orchestrator)
):
    health_info = await orchestrator.get_system_health()
    return AIHealthResponse(
        providers=health_info["providers"],
        models=health_info["models"],
        timestamp=datetime.utcnow()
    )

@router.get('/models')
async def get_ai_models(
    admin: User = Depends(require_admin_2fa),
    orchestrator: AIOrchestrator = Depends(get_ai_orchestrator)
):
    models = await orchestrator.registry.discover_models()
    return {"models": models}

@router.post('/models/refresh')
async def refresh_ai_models(
    admin: User = Depends(require_admin_2fa),
    orchestrator: AIOrchestrator = Depends(get_ai_orchestrator)
):

    refreshed_models = await orchestrator.registry.refresh_models()
    return {
        "success": True,
        "message": "AI model registry refreshed successfully",
        "models": refreshed_models
    }
