from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class QuestionResponse(BaseModel):
    id: str
    text: str
    category: str
    difficulty: str
    order_num: int

    model_config = {'from_attributes': True}

class SessionCreate(BaseModel):
    role: str
    domain: str
    difficulty: str = 'medium'
    num_questions: int = 5

class SessionResponse(BaseModel):
    id: str
    role: str
    domain: str
    difficulty: str
    status: str
    created_at: datetime
    questions: List[QuestionResponse] = []

    model_config = {'from_attributes': True}

class AnswerSubmit(BaseModel):
    question_id: str
    answer_text: str

class EvaluationResponse(BaseModel):
    question_id: str
    score: float
    feedback: str
    strengths: List[str]
    improvements: List[str]

class SessionResultsResponse(BaseModel):
    session_id: str
    overall_score: float
    total_questions: int
    answered_count: int
    evaluations: List[EvaluationResponse]
    summary: str

class HealthResponse(BaseModel):
    status: str
    version: str
    uptime_seconds: float
