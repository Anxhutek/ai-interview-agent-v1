from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from models.schemas import (
    InterviewStartRequest,
    InterviewStartResponse,
    InterviewMessageRequest,
    InterviewMessageResponse,
    InterviewFeedbackResponse
)
from core.dependencies import get_db
from core.config import settings
from services.breeth_service import BreethService
from services.curriculum_router import CurriculumRouter
from services.session_service import SessionService

router = APIRouter(prefix='/api/interview', tags=['interview'])

def get_session_service(db: AsyncSession = Depends(get_db)) -> SessionService:
    breeth_service = BreethService(
        api_key=settings.BREETH_API_KEY,
        base_url=settings.BREETH_BASE_URL
    )
    curriculum_router = CurriculumRouter()
    return SessionService(
        db=db,
        breeth_service=breeth_service,
        curriculum_router=curriculum_router
    )

@router.post('/start', response_model=InterviewStartResponse)
async def start_interview(
    data: InterviewStartRequest,
    service: SessionService = Depends(get_session_service)
):
    try:
        return await service.start_interview(data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/message', response_model=InterviewMessageResponse)
async def process_message(
    data: InterviewMessageRequest,
    service: SessionService = Depends(get_session_service)
):
    try:
        return await service.process_message(data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/feedback', response_model=InterviewFeedbackResponse)
async def get_feedback(
    sessionId: str = Query(..., description="Session ID to fetch feedback for"),
    service: SessionService = Depends(get_session_service)
):
    try:
        return await service.get_feedback(sessionId)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
