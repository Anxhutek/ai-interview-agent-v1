from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text
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
    role = Column(String, nullable=False)
    domain = Column(String, nullable=False)
    difficulty = Column(String, nullable=False)
    status = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    questions = relationship('Question', back_populates='session', cascade='all, delete-orphan')


class Question(Base):
    __tablename__ = 'questions'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    session_id = Column(String, ForeignKey('interview_sessions.id'), nullable=False)
    text = Column(Text, nullable=False)
    category = Column(String, nullable=False)
    difficulty = Column(String, nullable=False)
    order_num = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    session = relationship('InterviewSession', back_populates='questions')
    answer = relationship('Answer', back_populates='question', uselist=False, cascade='all, delete-orphan')


class Answer(Base):
    __tablename__ = 'answers'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    question_id = Column(String, ForeignKey('questions.id'), nullable=False, unique=True)
    answer_text = Column(Text, nullable=False)
    score = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    evaluated_at = Column(DateTime, nullable=True)
    
    question = relationship('Question', back_populates='answer')

async def create_all_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
