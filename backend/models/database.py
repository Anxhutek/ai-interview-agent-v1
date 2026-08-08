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

class InterviewSession(Base):
    __tablename__ = 'interview_sessions'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    candidate_id = Column(String, nullable=True)
    candidate_name = Column(String, nullable=True)
    role = Column(String, nullable=True, default='Software Engineer')
    domain = Column(String, nullable=True, default='Backend Architecture')
    difficulty = Column(String, nullable=True, default='medium')
    status = Column(String, nullable=False, default='active')
    turn_count = Column(Integer, default=0)
    current_question = Column(Text, nullable=True)
    is_finished = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    turns = relationship('InterviewTurn', back_populates='session', cascade='all, delete-orphan')

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

async def create_all_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
