from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException, status
import logging

from models.database import User
from models.schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    UserProfileResponse
)
from core.security import hash_password, verify_password, create_access_token

logger = logging.getLogger(__name__)

class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register_user(self, data: UserRegisterRequest) -> TokenResponse:
        # Check if email exists
        stmt = select(User).where(User.email == data.email.lower().strip())
        res = await self.db.execute(stmt)
        if res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )

        hashed = hash_password(data.password)
        new_user = User(
            email=data.email.lower().strip(),
            password_hash=hashed,
            full_name=data.full_name,
            role=data.role if data.role in ["candidate", "admin"] else "candidate",
            target_role=data.target_role
        )
        self.db.add(new_user)
        await self.db.commit()
        await self.db.refresh(new_user)

        token = create_access_token({"sub": new_user.id, "email": new_user.email, "role": new_user.role})
        user_profile = UserProfileResponse.model_validate(new_user)

        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user=user_profile
        )

    async def login_user(self, data: UserLoginRequest) -> TokenResponse:
        stmt = select(User).where(User.email == data.email.lower().strip())
        res = await self.db.execute(stmt)
        user = res.scalar_one_or_none()

        if not user or not verify_password(data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
        user_profile = UserProfileResponse.model_validate(user)

        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user=user_profile
        )
