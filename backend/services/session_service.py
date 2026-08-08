from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from datetime import datetime
import logging

from models.database import InterviewSession, InterviewTurn
from models.schemas import (
    InterviewStartRequest,
    InterviewStartResponse,
    InterviewMessageRequest,
    InterviewMessageResponse,
    InterviewFeedbackResponse
)
from services.breeth_service import BreethService
from services.curriculum_router import CurriculumRouter

logger = logging.getLogger(__name__)

class SessionService:
    def __init__(self, db: AsyncSession, breeth_service: BreethService, curriculum_router: CurriculumRouter):
        self.db = db
        self.breeth_service = breeth_service
        self.router = curriculum_router

    async def start_interview(self, data: InterviewStartRequest) -> InterviewStartResponse:
        first_q = self.router.get_initial_question()
        
        session = InterviewSession(
            candidate_id=data.candidateId,
            candidate_name=data.candidateName,
            role="Backend Developer",
            domain="Systems & Architecture",
            difficulty="medium",
            status="active",
            turn_count=0,
            current_question=first_q,
            is_finished=False
        )
        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)
        
        logger.info(f"Started interview session {session.id} for candidate {data.candidateName}")
        return InterviewStartResponse(
            sessionId=session.id,
            firstQuestion=first_q
        )

    async def process_message(self, data: InterviewMessageRequest) -> InterviewMessageResponse:
        stmt = select(InterviewSession).where(InterviewSession.id == data.sessionId)
        result = await self.db.execute(stmt)
        session = result.scalar_one_or_none()
        
        if not session:
            raise ValueError(f"Session '{data.sessionId}' not found")
        
        if session.is_finished:
            return InterviewMessageResponse(
                reply="This interview session is already completed. Please check your feedback!",
                isFinished=True
            )

        # 1. Ingest turn to Breeth memory layer
        group_id = f"candidate_{session.candidate_id}"
        episode_content = (
            f"Candidate ({session.candidate_name}) answered question about "
            f"'{session.current_question}': '{data.message}'"
        )
        ingest_res = await self.breeth_service.ingest_episode(
            content=episode_content,
            group_id=group_id,
            source_description="interview_turn",
            extract_intent=True
        )
        episode_id = ingest_res.get("uuid") or ingest_res.get("id")

        # 2. Record Turn in local DB
        turn = InterviewTurn(
            session_id=session.id,
            turn_index=session.turn_count,
            question_text=session.current_question or "",
            answer_text=data.message,
            breeth_episode_id=str(episode_id) if episode_id else None
        )
        self.db.add(turn)

        # 3. Query Breeth hybrid search for candidate context
        search_res = await self.breeth_service.search_memory(
            query=f"What are {session.candidate_name}'s backend preferences?",
            group_id=group_id,
            limit=3
        )
        search_results = search_res.get("results", [])

        # 4. Route next question or finish via CurriculumRouter
        reply, is_finished = self.router.process_turn(
            turn_index=session.turn_count,
            candidate_message=data.message,
            breeth_search_results=search_results
        )

        # 5. Update session state
        session.turn_count += 1
        session.current_question = reply
        session.is_finished = is_finished
        if is_finished:
            session.status = "completed"

        await self.db.commit()

        return InterviewMessageResponse(
            reply=reply,
            isFinished=is_finished
        )

    async def get_feedback(self, session_id: str) -> InterviewFeedbackResponse:
        stmt = select(InterviewSession).where(InterviewSession.id == session_id)
        result = await self.db.execute(stmt)
        session = result.scalar_one_or_none()

        if not session:
            raise ValueError(f"Session '{session_id}' not found")

        node_name = session.candidate_name or "Candidate"
        node_details = await self.breeth_service.get_node_details(node_name)

        feedback_text, score, distilled_profile = self.router.generate_feedback_report(
            candidate_name=node_name,
            turn_count=session.turn_count,
            breeth_node_details=node_details
        )

        return InterviewFeedbackResponse(
            feedback=feedback_text,
            score=score,
            distilledProfile=distilled_profile
        )
