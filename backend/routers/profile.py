from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from models.schemas import AvatarUploadResponse, ResumeUploadResponse
from models.database import User
from core.dependencies import get_db, get_current_user
from services.profile_service import ProfileService

router = APIRouter(prefix='/api/profile', tags=['profile'])

def get_profile_service(db: AsyncSession = Depends(get_db)) -> ProfileService:
    return ProfileService(db)

@router.post('/upload-avatar', response_model=AvatarUploadResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    service: ProfileService = Depends(get_profile_service)
):
    return await service.upload_avatar(current_user, file)

@router.post('/upload-resume', response_model=ResumeUploadResponse)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    service: ProfileService = Depends(get_profile_service)
):
    return await service.upload_resume(current_user, file)
