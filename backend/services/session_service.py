import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from datetime import datetime
from models.database import InterviewSession, Question, Answer
from models.schemas import SessionCreate, SessionResponse, AnswerSubmit, EvaluationResponse, SessionResultsResponse
from services.ai_service import AIService
from services.breeth_service import BreethService
import logging

logger = logging.getLogger(__name__)

class SessionService:
    def __init__(self, db: AsyncSession, ai_service: AIService, breeth_service: BreethService):
        self.db = db
        self.ai_service = ai_service
        self.breeth_service = breeth_service

    async def create_session(self, data: SessionCreate) -> SessionResponse:
        db_session = InterviewSession(
            role=data.role,
            domain=data.domain,
            difficulty=data.difficulty,
            status='active'
        )
        self.db.add(db_session)
        await self.db.flush()

        ai_questions = await self.ai_service.generate_questions(
            role=data.role,
            domain=data.domain,
            difficulty=data.difficulty,
            count=data.num_questions
        )

        for idx, q_data in enumerate(ai_questions):
            db_question = Question(
                session_id=db_session.id,
                text=q_data.get('text', 'Missing question text'),
                category=q_data.get('category', 'General'),
                difficulty=q_data.get('difficulty', data.difficulty),
                order_num=idx + 1
            )
            self.db.add(db_question)

        await self.db.commit()
        await self.db.refresh(db_session, ['questions'])
        return db_session

    async def get_session(self, session_id: str) -> SessionResponse:
        stmt = select(InterviewSession).options(selectinload(InterviewSession.questions)).where(InterviewSession.id == session_id)
        result = await self.db.execute(stmt)
        session = result.scalar_one_or_none()
        if not session:
            raise ValueError("Session not found")
        return session

    async def submit_answer(self, session_id: str, data: AnswerSubmit) -> EvaluationResponse:
        stmt = select(Question).where(Question.id == data.question_id, Question.session_id == session_id)
        result = await self.db.execute(stmt)
        question = result.scalar_one_or_none()
        if not question:
            raise ValueError("Question not found")

        session_stmt = select(InterviewSession).where(InterviewSession.id == session_id)
        session_result = await self.db.execute(session_stmt)
        db_session = session_result.scalar_one()

        ai_eval = await self.ai_service.evaluate_answer(
            question_text=question.text,
            answer_text=data.answer_text,
            role=db_session.role,
            domain=db_session.domain
        )

        answer = Answer(
            question_id=question.id,
            answer_text=data.answer_text,
            score=ai_eval.get('score', 0.0),
            feedback=ai_eval.get('feedback', ''),
            evaluated_at=datetime.utcnow()
        )
        self.db.add(answer)
        await self.db.commit()

        await self.breeth_service.store_memory(
            session_id=session_id,
            content=f"Q: {question.text} | A: {data.answer_text} | Score: {answer.score}",
            metadata={"question_id": question.id, "type": "interview_qa"}
        )

        return EvaluationResponse(
            question_id=question.id,
            score=answer.score,
            feedback=answer.feedback,
            strengths=ai_eval.get('strengths', []),
            improvements=ai_eval.get('improvements', [])
        )

    async def get_results(self, session_id: str) -> SessionResultsResponse:
        stmt = select(InterviewSession).options(
            selectinload(InterviewSession.questions).selectinload(Question.answer)
        ).where(InterviewSession.id == session_id)
        
        result = await self.db.execute(stmt)
        db_session = result.scalar_one_or_none()
        if not db_session:
            raise ValueError("Session not found")

        total_questions = len(db_session.questions)
        answered_questions = [q for q in db_session.questions if q.answer is not None]
        answered_count = len(answered_questions)
        
        evaluations = []
        total_score = 0.0
        
        for q in answered_questions:
            total_score += (q.answer.score or 0.0)
            evaluations.append(
                EvaluationResponse(
                    question_id=q.id,
                    score=q.answer.score or 0.0,
                    feedback=q.answer.feedback or '',
                    strengths=[],
                    improvements=[]
                )
            )

        overall_score = (total_score / answered_count) if answered_count > 0 else 0.0

        db_session.status = 'completed'
        await self.db.commit()

        return SessionResultsResponse(
            session_id=session_id,
            overall_score=overall_score,
            total_questions=total_questions,
            answered_count=answered_count,
            evaluations=evaluations,
            summary=f"Completed {answered_count} out of {total_questions} questions with an average score of {overall_score:.1f}."
        )
