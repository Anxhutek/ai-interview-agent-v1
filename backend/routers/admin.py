from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from models.schemas import (
    PaginatedCandidatesResponse,
    AdminSessionDetailResponse,
    AdminAnalyticsResponse
)
from models.database import User
from core.dependencies import get_db, get_current_admin, require_admin_2fa
from core.config import settings
from services.admin_service import AdminService
from services.breeth_service import BreethService
from services.curriculum_router import CurriculumRouter

router = APIRouter(prefix='/api/admin', tags=['admin'])

def get_admin_service(db: AsyncSession = Depends(get_db)) -> AdminService:
    breeth_service = BreethService(
        api_key=settings.BREETH_API_KEY,
        base_url=settings.BREETH_BASE_URL
    )
    curriculum_router = CurriculumRouter()
    return AdminService(
        db=db,
        breeth_service=breeth_service,
        curriculum_router=curriculum_router
    )

@router.get('/candidates', response_model=PaginatedCandidatesResponse)
async def get_candidates(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    admin: User = Depends(require_admin_2fa),
    service: AdminService = Depends(get_admin_service)
):
    return await service.get_candidates(page=page, limit=limit)

@router.get('/sessions/{session_id}', response_model=AdminSessionDetailResponse)
async def get_session_detail(
    session_id: str,
    admin: User = Depends(require_admin_2fa),
    service: AdminService = Depends(get_admin_service)
):
    return await service.get_session_detail(session_id)

@router.get('/analytics', response_model=AdminAnalyticsResponse)
async def get_analytics(
    admin: User = Depends(require_admin_2fa),
    service: AdminService = Depends(get_admin_service)
):
    return await service.get_analytics()

