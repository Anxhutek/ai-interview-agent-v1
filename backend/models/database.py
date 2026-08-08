from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, Boolean
from datetime import datetime
import uuid
from core.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG)
SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = 'users'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False, default='candidate') # 'candidate', 'admin'
    target_role = Column(String, nullable=True)
    profile_picture_url = Column(String, nullable=True)
    resume_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    sessions = relationship('InterviewSession', back_populates='user', cascade='all, delete-orphan')

class InterviewSession(Base):
    __tablename__ = 'interview_sessions'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey('users.id'), nullable=True)
    candidate_id = Column(String, nullable=True)
    candidate_name = Column(String, nullable=True)
    role = Column(String, nullable=True, default='Software Engineer')
    domain = Column(String, nullable=True, default='Backend Architecture')
    difficulty = Column(String, nullable=True, default='medium')
    status = Column(String, nullable=False, default='active')
    turn_count = Column(Integer, default=0)
    current_question = Column(Text, nullable=True)
    is_finished = Column(Boolean, default=False)
    proctoring_score = Column(Float, default=100.0)
    integrity_status = Column(String, default='clean') # 'clean', 'flagged'
    adaptive_state = Column(Text, nullable=True) # JSON stored state
    final_evaluation = Column(Text, nullable=True) # JSON stored final summary report
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship('User', back_populates='sessions')
    turns = relationship('InterviewTurn', back_populates='session', cascade='all, delete-orphan')
    proctoring_logs = relationship('ProctoringLog', back_populates='session', cascade='all, delete-orphan')
    evaluations = relationship('AnswerEvaluation', back_populates='session', cascade='all, delete-orphan')

class InterviewTurn(Base):
    __tablename__ = 'interview_turns'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    session_id = Column(String, ForeignKey('interview_sessions.id'), nullable=False)
    turn_index = Column(Integer, nullable=False)
    question_text = Column(Text, nullable=False)
    answer_text = Column(Text, nullable=True)
    breeth_episode_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    session = relationship('InterviewSession', back_populates='turns')
    evaluation = relationship('AnswerEvaluation', back_populates='turn', uselist=False, cascade='all, delete-orphan')

class ProctoringLog(Base):
    __tablename__ = 'proctoring_logs'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    session_id = Column(String, ForeignKey('interview_sessions.id'), nullable=False)
    event_type = Column(String, nullable=False) # e.g. "gaze_off_screen", "multiple_faces", "face_missing"
    severity = Column(String, nullable=False, default='warning') # "warning", "critical"
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    session = relationship('InterviewSession', back_populates='proctoring_logs')

class AnswerEvaluation(Base):
    __tablename__ = 'answer_evaluations'

    id = Column(String, primary_key=True, default=generate_uuid)
    session_id = Column(String, ForeignKey('interview_sessions.id'), nullable=False)
    turn_id = Column(String, ForeignKey('interview_turns.id'), nullable=True)
    question_id = Column(String, nullable=True)
    answer_id = Column(String, nullable=True)
    provider = Column(String, nullable=False, default='gemini') # 'gemini', 'groq'
    model = Column(String, nullable=False)
    scores = Column(Text, nullable=True) # JSON string of 9 dimensions
    overall_score = Column(Float, default=0.0)
    verdict = Column(String, nullable=True, default='satisfactory') # 'strong', 'satisfactory', 'needs_improvement', 'weak'
    strengths = Column(Text, nullable=True) # JSON array
    weaknesses = Column(Text, nullable=True) # JSON array
    missing_points = Column(Text, nullable=True) # JSON array
    technical_feedback = Column(Text, nullable=True)
    communication_feedback = Column(Text, nullable=True)
    improvement_suggestions = Column(Text, nullable=True) # JSON array
    evaluation_status = Column(String, nullable=False, default='pending') # 'pending', 'processing', 'completed', 'failed'
    evaluation_latency = Column(Float, default=0.0)
    evaluation_attempts = Column(Integer, default=1)
    evaluation_version = Column(String, default='1.0')
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship('InterviewSession', back_populates='evaluations')
    turn = relationship('InterviewTurn', back_populates='evaluation')


async def create_all_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

