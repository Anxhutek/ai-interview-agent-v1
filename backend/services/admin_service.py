from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, or_
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
import logging
from typing import Optional, List

from models.database import User, InterviewSession, InterviewTurn, ProctoringLog
from models.schemas import (
    CandidateSummary,
    PaginatedCandidatesResponse,
    AdminSessionDetailResponse,
    AdminAnalyticsResponse,
    TurnSchema,
    ProctoringLogSchema
)
from services.breeth_service import BreethService
from services.curriculum_router import CurriculumRouter

logger = logging.getLogger(__name__)

class AdminService:
    def __init__(self, db: AsyncSession, breeth_service: Optional[BreethService] = None, curriculum_router: Optional[CurriculumRouter] = None):
        self.db = db
        self.breeth_service = breeth_service
        self.curriculum_router = curriculum_router

    async def get_candidates(self, page: int = 1, limit: int = 10) -> PaginatedCandidatesResponse:
        page = max(1, page)
        limit = max(1, min(100, limit))
        skip = (page - 1) * limit

        # Total count of candidate users
        count_stmt = select(func.count(User.id)).where(User.role == "candidate")
        total_res = await self.db.execute(count_stmt)
        total_candidates = total_res.scalar() or 0

        # Query candidates
        stmt = select(User).where(User.role == "candidate").order_by(User.created_at.desc()).offset(skip).limit(limit)
        res = await self.db.execute(stmt)
        candidates_db = res.scalars().all()

        candidate_summaries: List[CandidateSummary] = []
        for user in candidates_db:
            # Aggregate session metrics for user
            session_stmt = select(InterviewSession).where(
                or_(InterviewSession.user_id == user.id, InterviewSession.candidate_id == user.id)
            )
            session_res = await self.db.execute(session_stmt)
            sessions = session_res.scalars().all()

            total_sessions = len(sessions)
            if total_sessions > 0:
                avg_score = round(sum(s.proctoring_score for s in sessions) / total_sessions, 2)
                integrity_status = "flagged" if any(s.integrity_status == "flagged" for s in sessions) else "clean"
            else:
                avg_score = 100.0
                integrity_status = "clean"

            candidate_summaries.append(
                CandidateSummary(
                    id=user.id,
                    email=user.email,
                    full_name=user.full_name,
                    target_role=user.target_role,
                    profile_picture_url=user.profile_picture_url,
                    resume_url=user.resume_url,
                    created_at=user.created_at,
                    total_sessions=total_sessions,
                    avg_score=avg_score,
                    integrity_status=integrity_status
                )
            )

        return PaginatedCandidatesResponse(
            candidates=candidate_summaries,
            total=total_candidates,
            page=page,
            limit=limit
        )

    async def get_session_detail(self, session_id: str) -> AdminSessionDetailResponse:
        stmt = select(InterviewSession).options(
            selectinload(InterviewSession.turns),
            selectinload(InterviewSession.proctoring_logs)
        ).where(InterviewSession.id == session_id)
        
        res = await self.db.execute(stmt)
        session = res.scalar_one_or_none()

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Interview session '{session_id}' not found"
            )

        # Get distilled profile & feedback report if BreethService is attached
        distilled_profile = None
        score_breakdown = None
        if self.breeth_service and self.curriculum_router and session.candidate_name:
            try:
                node_details = await self.breeth_service.get_node_details(session.candidate_name)
                feedback_text, score, distilled = self.curriculum_router.generate_feedback_report(
                    candidate_name=session.candidate_name,
                    turn_count=session.turn_count,
                    breeth_node_details=node_details
                )
                distilled_profile = distilled
                score_breakdown = {
                    "overall_score": score,
                    "proctoring_score": session.proctoring_score,
                    "feedback": feedback_text
                }
            except Exception as e:
                logger.warning(f"Failed to fetch Breeth details for session {session_id}: {e}")

        sorted_turns = sorted(session.turns, key=lambda t: t.turn_index)
        turns_schema = [TurnSchema.model_validate(t) for t in sorted_turns]
        logs_schema = [ProctoringLogSchema.model_validate(l) for l in session.proctoring_logs]

        return AdminSessionDetailResponse(
            id=session.id,
            user_id=session.user_id,
            candidate_name=session.candidate_name,
            role=session.role,
            status=session.status,
            proctoring_score=session.proctoring_score,
            integrity_status=session.integrity_status,
            created_at=session.created_at,
            turns=turns_schema,
            score_breakdown=score_breakdown,
            distilled_profile=distilled_profile,
            proctoring_logs=logs_schema
        )

    async def get_analytics(self) -> AdminAnalyticsResponse:
        # Total candidates
        candidate_stmt = select(func.count(User.id)).where(User.role == "candidate")
        cand_res = await self.db.execute(candidate_stmt)
        total_candidates = cand_res.scalar() or 0

        # Total interviews completed
        completed_stmt = select(func.count(InterviewSession.id)).where(
            or_(InterviewSession.status == "completed", InterviewSession.is_finished == True)
        )
        comp_res = await self.db.execute(completed_stmt)
        total_interviews_completed = comp_res.scalar() or 0

        # Average system proctoring score
        avg_stmt = select(func.avg(InterviewSession.proctoring_score))
        avg_res = await self.db.execute(avg_stmt)
        average_system_score = float(round(avg_res.scalar() or 100.0, 2))

        # Flagged sessions count
        flagged_stmt = select(func.count(InterviewSession.id)).where(InterviewSession.integrity_status == "flagged")
        flag_res = await self.db.execute(flagged_stmt)
        flagged_sessions_count = flag_res.scalar() or 0

        return AdminAnalyticsResponse(
            total_candidates=total_candidates,
            total_interviews_completed=total_interviews_completed,
            average_system_score=average_system_score,
            flagged_sessions_count=flagged_sessions_count
        )
