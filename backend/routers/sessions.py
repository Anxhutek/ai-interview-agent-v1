from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from models.schemas import SessionCreate, SessionResponse, AnswerSubmit, EvaluationResponse, SessionResultsResponse
from core.dependencies import get_db
from core.config import settings
from services.ai_service import AIService
from services.breeth_service import BreethService
from services.session_service import SessionService

router = APIRouter(prefix='/api/v1/sessions', tags=['sessions'])

def get_session_service(db: AsyncSession = Depends(get_db)):
    ai_service = AIService(api_key=settings.GEMINI_API_KEY)
    breeth_service = BreethService(api_key=settings.BREETH_API_KEY, base_url=settings.BREETH_BASE_URL)
    return SessionService(db=db, ai_service=ai_service, breeth_service=breeth_service)

@router.post('/', response_model=SessionResponse)
async def create_session(data: SessionCreate, service: SessionService = Depends(get_session_service)):
    try:
        return await service.create_session(data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/{session_id}', response_model=SessionResponse)
async def get_session(session_id: str, service: SessionService = Depends(get_session_service)):
    try:
        return await service.get_session(session_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/{session_id}/answer', response_model=EvaluationResponse)
async def submit_answer(session_id: str, data: AnswerSubmit, service: SessionService = Depends(get_session_service)):
    try:
        return await service.submit_answer(session_id, data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/{session_id}/results', response_model=SessionResultsResponse)
async def get_results(session_id: str, service: SessionService = Depends(get_session_service)):
    try:
        return await service.get_results(session_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
