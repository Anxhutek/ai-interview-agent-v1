import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from datetime import datetime
from typing import Optional, Dict, Any, List
import logging

from models.database import InterviewSession, InterviewTurn, AnswerEvaluation
from models.schemas import (
    InterviewStartRequest,
    InterviewStartResponse,
    InterviewMessageRequest,
    InterviewMessageResponse,
    InterviewFeedbackResponse,
    AnswerSubmissionResponse,
    EvaluationStatusResponse,
    EvaluationResultSchema
)
from services.breeth_service import BreethService
from services.curriculum_router import CurriculumRouter
from services.evaluation_service import InterviewEvaluationService

logger = logging.getLogger(__name__)

class SessionService:
    def __init__(
        self,
        db: AsyncSession,
        breeth_service: BreethService,
        curriculum_router: CurriculumRouter,
        eval_service: Optional[InterviewEvaluationService] = None
    ):
        self.db = db
        self.breeth_service = breeth_service
        self.router = curriculum_router
        self.eval_service = eval_service

    async def start_interview(self, data: InterviewStartRequest) -> InterviewStartResponse:
        first_q = self.router.get_initial_question()
        
        user_id = data.userId or data.candidateId
        session = InterviewSession(
            user_id=user_id,
            candidate_id=data.candidateId,
            candidate_name=data.candidateName,
            role="Backend Developer",
            domain="Systems & Architecture",
            difficulty="medium",
            status="active",
            turn_count=0,
            current_question=first_q,
            is_finished=False,
            adaptive_state=json.dumps({
                "current_topic": "System & Architecture Fundamentals",
                "difficulty": "medium",
                "strengths": [],
                "weaknesses": [],
                "topics_covered": [],
                "topics_missing": []
            })
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
        stmt = select(InterviewSession).options(
            selectinload(InterviewSession.turns).selectinload(InterviewTurn.evaluation),
            selectinload(InterviewSession.evaluations)
        ).where(InterviewSession.id == data.sessionId)
        
        result = await self.db.execute(stmt)
        session = result.scalar_one_or_none()
        
        if not session:
            raise ValueError(f"Session '{data.sessionId}' not found")
        
        if session.is_finished:
            return InterviewMessageResponse(
                reply="This interview session is already completed. Please check your feedback!",
                isFinished=True
            )

        # Reconstruct historical turn evaluations for this specific session from DB
        historical_evaluations = []
        for t in sorted(session.turns, key=lambda x: x.turn_index):
            if t.evaluation and t.evaluation.overall_score is not None:
                historical_evaluations.append({
                    "score": t.evaluation.overall_score,
                    "topic": self.router.curriculum[t.turn_index]["topic"] if t.turn_index < len(self.router.curriculum) else "Technical Module",
                    "feedback": t.evaluation.technical_feedback or "",
                    "strengths": json.loads(t.evaluation.strengths or "[]"),
                    "improvements": json.loads(t.evaluation.weaknesses or "[]")
                })
            elif t.score is not None:
                historical_evaluations.append({
                    "score": t.score,
                    "topic": self.router.curriculum[t.turn_index]["topic"] if t.turn_index < len(self.router.curriculum) else "Technical Module",
                    "feedback": f"Turn {t.turn_index+1} evaluation",
                    "strengths": [],
                    "improvements": []
                })

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

        # 2. Query Breeth hybrid search for candidate context
        search_res = await self.breeth_service.search_memory(
            query=f"What are {session.candidate_name}'s backend preferences?",
            group_id=group_id,
            limit=3
        )
        search_results = search_res.get("results", [])

        # 3. Route next question & evaluate answer via CurriculumRouter
        reply, is_finished, evaluation = self.router.process_turn(
            turn_index=session.turn_count,
            candidate_message=data.message,
            breeth_search_results=search_results,
            historical_evaluations=historical_evaluations
        )

        turn_score = evaluation.get("score", 70.0)

        # 4. Record Turn in DB with turn_score
        turn = InterviewTurn(
            session_id=session.id,
            turn_index=session.turn_count,
            question_text=session.current_question or "",
            answer_text=data.message,
            score=turn_score,
            breeth_episode_id=str(episode_id) if episode_id else None
        )
        self.db.add(turn)
        await self.db.flush()

        # 5. Create AnswerEvaluation DB record for detailed session tracking
        eval_record = AnswerEvaluation(
            session_id=session.id,
            turn_id=turn.id,
            question_id=f"q_{turn.turn_index}",
            answer_id=turn.id,
            provider="breeth",
            model="curriculum_v1",
            overall_score=turn_score,
            verdict="strong" if turn_score >= 75 else "satisfactory" if turn_score >= 50 else "needs_improvement",
            strengths=json.dumps(evaluation.get("strengths", [])),
            weaknesses=json.dumps(evaluation.get("improvements", [])),
            technical_feedback=evaluation.get("feedback", ""),
            evaluation_status="completed"
        )
        self.db.add(eval_record)

        # 6. Update session state
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

    async def submit_answer_by_id(self, session_id: str, answer_text: str) -> AnswerSubmissionResponse:
        stmt = select(InterviewSession).where(InterviewSession.id == session_id)
        result = await self.db.execute(stmt)
        session = result.scalar_one_or_none()

        if not session:
            raise ValueError(f"Session '{session_id}' not found")

        # 1. ALWAYS persist answer to DB FIRST
        turn = InterviewTurn(
            session_id=session.id,
            turn_index=session.turn_count,
            question_text=session.current_question or "Technical Interview Question",
            answer_text=answer_text
        )
        self.db.add(turn)
        await self.db.commit()
        await self.db.refresh(turn)

        # 2. Create pending evaluation entry
        eval_record = AnswerEvaluation(
            session_id=session.id,
            turn_id=turn.id,
            question_id=f"q_{turn.turn_index}",
            answer_id=turn.id,
            provider="breeth",
            model="curriculum_v1",
            evaluation_status="processing"
        )
        self.db.add(eval_record)
        await self.db.commit()
        await self.db.refresh(eval_record)

        # 3. Perform evaluation
        evaluation = self.router.evaluate_answer(turn.turn_index, answer_text)
        turn_score = evaluation.get("score", 70.0)

        turn.score = turn_score
        eval_record.overall_score = turn_score
        eval_record.verdict = "strong" if turn_score >= 75 else "satisfactory" if turn_score >= 50 else "needs_improvement"
        eval_record.strengths = json.dumps(evaluation.get("strengths", []))
        eval_record.weaknesses = json.dumps(evaluation.get("improvements", []))
        eval_record.technical_feedback = evaluation.get("feedback", "")
        eval_record.evaluation_status = "completed"

        session.turn_count += 1
        await self.db.commit()

        return AnswerSubmissionResponse(
            success=True,
            answer_id=turn.id,
            evaluation_status=eval_record.evaluation_status
        )

    async def get_session_evaluation(self, session_id: str) -> EvaluationStatusResponse:
        stmt = select(AnswerEvaluation).where(AnswerEvaluation.session_id == session_id).order_by(AnswerEvaluation.created_at.desc())
        res = await self.db.execute(stmt)
        eval_record = res.scalars().first()

        if not eval_record:
            return EvaluationStatusResponse(status="pending", evaluation=None)

        if eval_record.evaluation_status != "completed":
            return EvaluationStatusResponse(status=eval_record.evaluation_status, evaluation=None)

        eval_dict = {
            "scores": json.loads(eval_record.scores or "{}"),
            "overall_score": eval_record.overall_score,
            "verdict": eval_record.verdict or "satisfactory",
            "strengths": json.loads(eval_record.strengths or "[]"),
            "weaknesses": json.loads(eval_record.weaknesses or "[]"),
            "missing_points": json.loads(eval_record.missing_points or "[]"),
            "technical_feedback": eval_record.technical_feedback or "",
            "communication_feedback": eval_record.communication_feedback or "",
            "improvement_suggestions": json.loads(eval_record.improvement_suggestions or "[]")
        }
        validated = EvaluationResultSchema.model_validate(eval_dict)
        return EvaluationStatusResponse(status="completed", evaluation=validated)

    async def get_session_evaluation_status(self, session_id: str) -> Dict[str, str]:
        stmt = select(AnswerEvaluation.evaluation_status).where(AnswerEvaluation.session_id == session_id).order_by(AnswerEvaluation.created_at.desc())
        res = await self.db.execute(stmt)
        status_val = res.scalar() or "pending"
        return {"status": status_val}

    async def complete_interview(self, session_id: str) -> Dict[str, Any]:
        stmt = select(InterviewSession).options(selectinload(InterviewSession.turns)).where(InterviewSession.id == session_id)
        res = await self.db.execute(stmt)
        session = res.scalar_one_or_none()

        if not session:
            raise ValueError(f"Session '{session_id}' not found")

        session.is_finished = True
        session.status = "completed"

        turns_data = [{"turn_index": t.turn_index, "question_text": t.question_text, "answer_text": t.answer_text} for t in session.turns]

        final_report = {}
        if self.eval_service:
            final_report = await self.eval_service.generate_final_report(
                candidate_name=session.candidate_name or "Candidate",
                role=session.role or "Software Engineer",
                turns=turns_data
            )
            session.final_evaluation = json.dumps(final_report)

        await self.db.commit()

        return {
            "success": True,
            "session_id": session.id,
            "status": "completed",
            "final_evaluation": final_report
        }

    async def get_feedback(self, session_id: str) -> InterviewFeedbackResponse:
        stmt = select(InterviewSession).options(
            selectinload(InterviewSession.turns).selectinload(InterviewTurn.evaluation),
            selectinload(InterviewSession.evaluations)
        ).where(InterviewSession.id == session_id)
        result = await self.db.execute(stmt)
        session = result.scalar_one_or_none()

        if not session:
            raise ValueError(f"Session '{session_id}' not found")

        # Extract historical turn evaluations from DB for this session
        historical_evaluations = []
        for t in sorted(session.turns, key=lambda x: x.turn_index):
            if t.evaluation and t.evaluation.overall_score is not None:
                historical_evaluations.append({
                    "score": t.evaluation.overall_score,
                    "topic": self.router.curriculum[t.turn_index]["topic"] if t.turn_index < len(self.router.curriculum) else "Technical Module",
                    "feedback": t.evaluation.technical_feedback or "",
                    "strengths": json.loads(t.evaluation.strengths or "[]"),
                    "improvements": json.loads(t.evaluation.weaknesses or "[]")
                })
            elif t.score is not None:
                historical_evaluations.append({
                    "score": t.score,
                    "topic": self.router.curriculum[t.turn_index]["topic"] if t.turn_index < len(self.router.curriculum) else "Technical Module",
                    "feedback": f"Turn {t.turn_index+1} evaluation",
                    "strengths": [],
                    "improvements": []
                })

        node_name = session.candidate_name or "Candidate"
        node_details = await self.breeth_service.get_node_details(node_name)

        feedback_text, score, distilled_profile = self.router.generate_feedback_report(
            candidate_name=node_name,
            turn_count=session.turn_count,
            breeth_node_details=node_details,
            historical_evaluations=historical_evaluations
        )

        return InterviewFeedbackResponse(
            feedback=feedback_text,
            score=score,
            distilledProfile=distilled_profile
        )
