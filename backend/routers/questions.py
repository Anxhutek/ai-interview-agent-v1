from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from services.ai_service import AIService
from core.config import settings

router = APIRouter(prefix='/api/v1/questions', tags=['questions'])

class QuestionGenerateRequest(BaseModel):
    role: str
    domain: str
    difficulty: str = 'medium'
    count: int = 5

@router.post('/generate')
async def generate_questions(data: QuestionGenerateRequest):
    try:
        ai_service = AIService(api_key=settings.GEMINI_API_KEY)
        questions = await ai_service.generate_questions(
            role=data.role,
            domain=data.domain,
            difficulty=data.difficulty,
            count=data.count
        )
        return questions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
