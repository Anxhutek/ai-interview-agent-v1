from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from models.schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    UserProfileResponse
)
from models.database import User
from core.dependencies import get_db, get_current_user
from services.auth_service import AuthService

router = APIRouter(prefix='/api/auth', tags=['auth'])

def get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(db)

@router.post('/register', response_model=TokenResponse)
async def register(
    data: UserRegisterRequest,
    service: AuthService = Depends(get_auth_service)
):
    return await service.register_user(data)

@router.post('/login', response_model=TokenResponse)
async def login(
    data: UserLoginRequest,
    service: AuthService = Depends(get_auth_service)
):
    return await service.login_user(data)

@router.get('/me', response_model=UserProfileResponse)
async def get_me(
    current_user: User = Depends(get_current_user)
):
    return UserProfileResponse.model_validate(current_user)
