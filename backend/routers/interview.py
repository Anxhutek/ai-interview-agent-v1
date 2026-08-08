from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession

from models.schemas import (
    InterviewStartRequest,
    InterviewStartResponse,
    InterviewMessageRequest,
    InterviewMessageResponse,
    InterviewFeedbackResponse,
    AnswerSubmissionRequest,
    AnswerSubmissionResponse,
    EvaluationStatusResponse,
    APIErrorResponse,
    APIErrorDetail
)
from core.dependencies import get_db, get_evaluation_service
from core.config import settings
from services.breeth_service import BreethService
from services.curriculum_router import CurriculumRouter
from services.session_service import SessionService
from services.evaluation_service import InterviewEvaluationService

router = APIRouter(tags=['interview'])

def get_session_service(
    db: AsyncSession = Depends(get_db),
    eval_service: InterviewEvaluationService = Depends(get_evaluation_service)
) -> SessionService:
    breeth_service = BreethService(
        api_key=settings.BREETH_API_KEY,
        base_url=settings.BREETH_BASE_URL
    )
    curriculum_router = CurriculumRouter()
    return SessionService(
        db=db,
        breeth_service=breeth_service,
        curriculum_router=curriculum_router,
        eval_service=eval_service
    )

# Legacy & standard interview control endpoints under /api/interview
@router.post('/api/interview/start', response_model=InterviewStartResponse)
async def start_interview(
    data: InterviewStartRequest,
    service: SessionService = Depends(get_session_service)
):
    try:
        return await service.start_interview(data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/api/interview/message', response_model=InterviewMessageResponse)
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

@router.get('/api/interview/feedback', response_model=InterviewFeedbackResponse)
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

# Upgrade evaluation endpoints under /api/interviews/{id}/...
@router.post('/api/interviews/{id}/answer', response_model=AnswerSubmissionResponse)
async def submit_interview_answer(
    id: str = Path(..., description="Interview Session ID"),
    body: AnswerSubmissionRequest = ...,
    service: SessionService = Depends(get_session_service)
):
    try:
        return await service.submit_answer_by_id(id, body.answer_text)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail={"success": False, "error": {"code": "AI_TEMPORARILY_UNAVAILABLE", "message": "AI evaluation is temporarily unavailable."}}
        )

@router.get('/api/interviews/{id}/evaluation', response_model=EvaluationStatusResponse)
async def get_interview_evaluation(
    id: str = Path(..., description="Interview Session ID"),
    service: SessionService = Depends(get_session_service)
):
    try:
        return await service.get_session_evaluation(id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/api/interviews/{id}/evaluation/status')
async def get_interview_evaluation_status(
    id: str = Path(..., description="Interview Session ID"),
    service: SessionService = Depends(get_session_service)
):
    try:
        return await service.get_session_evaluation_status(id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/api/interviews/{id}/complete')
async def complete_interview(
    id: str = Path(..., description="Interview Session ID"),
    service: SessionService = Depends(get_session_service)
):
    try:
        return await service.complete_interview(id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
