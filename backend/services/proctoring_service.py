from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from fastapi import HTTPException, status
import logging

from models.database import InterviewSession, ProctoringLog
from models.schemas import ProctorEventRequest, ProctorEventResponse

logger = logging.getLogger(__name__)

class ProctoringService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log_proctor_event(self, data: ProctorEventRequest) -> ProctorEventResponse:
        stmt = select(InterviewSession).where(InterviewSession.id == data.session_id)
        res = await self.db.execute(stmt)
        session = res.scalar_one_or_none()

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Interview session '{data.session_id}' not found"
            )

        # Create log
        log_entry = ProctoringLog(
            session_id=session.id,
            event_type=data.event_type,
            severity=data.severity.lower()
        )
        self.db.add(log_entry)

        # Calculate score drop
        deduction = 15.0 if data.severity.lower() == "critical" else 5.0
        session.proctoring_score = max(0.0, session.proctoring_score - deduction)

        # Count total events for this session
        count_stmt = select(func.count(ProctoringLog.id)).where(ProctoringLog.session_id == session.id)
        count_res = await self.db.execute(count_stmt)
        total_events = (count_res.scalar() or 0) + 1  # including this current new log

        # If > 3 warnings or score dropped significantly/critical, flag session
        if total_events > 3 or data.severity.lower() == "critical" or session.proctoring_score < 70.0:
            session.integrity_status = "flagged"

        await self.db.commit()
        await self.db.refresh(log_entry)
        await self.db.refresh(session)

        return ProctorEventResponse(
            id=log_entry.id,
            session_id=session.id,
            event_type=log_entry.event_type,
            severity=log_entry.severity,
            timestamp=log_entry.timestamp,
            proctoring_score=session.proctoring_score,
            integrity_status=session.integrity_status
        )
