from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from models.schemas import ProctorEventRequest, ProctorEventResponse
from core.dependencies import get_db
from services.proctoring_service import ProctoringService

router = APIRouter(prefix='/api/interview', tags=['proctoring'])

def get_proctoring_service(db: AsyncSession = Depends(get_db)) -> ProctoringService:
    return ProctoringService(db)

@router.post('/proctor-event', response_model=ProctorEventResponse)
async def log_proctor_event(
    data: ProctorEventRequest,
    service: ProctoringService = Depends(get_proctoring_service)
):
    return await service.log_proctor_event(data)
