from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import AsyncGenerator

from models.database import SessionLocal, User
from core.security import decode_access_token

security = HTTPBearer()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id: str = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required"
        )
    return current_user

async def require_admin_2fa(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    user = await get_current_user(credentials, db)
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required"
        )

    payload = decode_access_token(credentials.credentials) or {}

    # Query Admin2FA status
    from models.database import Admin2FA
    stmt = select(Admin2FA).where(Admin2FA.admin_id == user.id)
    res = await db.execute(stmt)
    two_fa_record = res.scalar_one_or_none()

    if two_fa_record and two_fa_record.enabled:
        if not payload.get("admin_2fa_verified"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="2FA verification required for admin access"
            )

    return user



from core.config import settings

from services.ai.gemini_provider import GeminiProvider
from services.ai.groq_provider import GroqProvider
from services.ai.model_registry import ModelRegistry
from services.ai.ai_orchestrator import AIOrchestrator
from services.evaluation_service import InterviewEvaluationService

# Singleton instances for model registry and orchestrator
_gemini_provider = GeminiProvider(settings.GEMINI_API_KEY)
_groq_provider = GroqProvider(settings.GROQ_API_KEY)
_model_registry = ModelRegistry(_gemini_provider, _groq_provider)
_ai_orchestrator = AIOrchestrator(_gemini_provider, _groq_provider, _model_registry)
_evaluation_service = InterviewEvaluationService(_ai_orchestrator)

def get_ai_orchestrator() -> AIOrchestrator:
    return _ai_orchestrator

def get_evaluation_service() -> InterviewEvaluationService:
    return _evaluation_service


