from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession

from models.schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    UserProfileResponse,
    Admin2FALoginResponse,
    Admin2FAVerifyRequest,
    AdminChangePasswordRequest
)
from models.database import User
from core.dependencies import get_db, get_current_user
from services.auth_service import AuthService
from services.audit_service import log_security_event

router = APIRouter(prefix='/api/auth', tags=['auth'])

def get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(db)

@router.post('/register', response_model=TokenResponse)
async def register(
    data: UserRegisterRequest,
    service: AuthService = Depends(get_auth_service)
):
    return await service.register_user(data)

@router.post('/login')
async def login(
    data: UserLoginRequest,
    request: Request,
    service: AuthService = Depends(get_auth_service)
):
    return await service.login_user(data, request)

@router.post('/admin/verify-2fa', response_model=TokenResponse)
async def verify_admin_2fa(
    data: Admin2FAVerifyRequest,
    request: Request,
    service: AuthService = Depends(get_auth_service)
):
    return await service.verify_admin_2fa(data, request)

@router.post('/change-password')
async def change_password(
    data: AdminChangePasswordRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service)
):
    return await service.change_password(current_user, data, request)

@router.post('/logout')
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await log_security_event(db, "admin_logout" if current_user.role == "admin" else "candidate_logout", user_id=current_user.id, ip_address=request.client.host if request.client else None)
    return {"success": True, "message": "Successfully logged out."}

@router.get('/me', response_model=UserProfileResponse)
async def get_me(
    current_user: User = Depends(get_current_user)
):
    return UserProfileResponse.model_validate(current_user)
