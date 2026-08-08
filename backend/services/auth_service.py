from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException, status, Request
from typing import Dict, Any, Union, Optional
import pyotp
import logging

from models.database import User, Admin2FA, AdminBackupCode
from models.schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    UserProfileResponse,
    Admin2FALoginResponse,
    Admin2FAVerifyRequest,
    AdminChangePasswordRequest
)
from core.security import hash_password, verify_password, create_access_token, decode_access_token
from services.crypto_service import decrypt_secret, verify_backup_code
from services.audit_service import log_security_event
from services.rate_limiter import totp_rate_limiter

logger = logging.getLogger(__name__)

class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register_user(self, data: UserRegisterRequest) -> TokenResponse:
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

        token = create_access_token({
            "sub": new_user.id,
            "email": new_user.email,
            "role": new_user.role,
            "admin_2fa_verified": False if new_user.role == "admin" else True
        })
        user_profile = UserProfileResponse.model_validate(new_user)

        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user=user_profile
        )

    async def login_user(self, data: UserLoginRequest, request: Optional[Request] = None) -> Union[TokenResponse, Admin2FALoginResponse]:
        stmt = select(User).where(User.email == data.email.lower().strip())
        res = await self.db.execute(stmt)
        user = res.scalar_one_or_none()

        if not user or not verify_password(data.password, user.password_hash):
            if user:
                await log_security_event(self.db, "login_failed_password", user_id=user.id, ip_address=request.client.host if request and request.client else None)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        # Check if Admin has 2FA enabled
        if user.role == "admin":
            stmt_2fa = select(Admin2FA).where(Admin2FA.admin_id == user.id)
            res_2fa = await self.db.execute(stmt_2fa)
            rec_2fa = res_2fa.scalar_one_or_none()

            if rec_2fa and rec_2fa.enabled:
                # 2-Step Login required for Admin
                pre_2fa_token = create_access_token(
                    {
                        "sub": user.id,
                        "email": user.email,
                        "role": "admin",
                        "pre_2fa": True,
                        "admin_2fa_verified": False
                    },
                    expires_delta=timedelta(minutes=5)
                )
                return Admin2FALoginResponse(
                    require_2fa=True,
                    pre_2fa_token=pre_2fa_token,
                    user=UserProfileResponse.model_validate(user)
                )

        # Candidate or Admin without 2FA enabled
        token = create_access_token({
            "sub": user.id,
            "email": user.email,
            "role": user.role,
            "admin_2fa_verified": True if user.role == "admin" else False
        })

        await log_security_event(
            self.db,
            "admin_login" if user.role == "admin" else "candidate_login",
            user_id=user.id,
            ip_address=request.client.host if request and request.client else None
        )

        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user=UserProfileResponse.model_validate(user)
        )

    async def verify_admin_2fa(self, data: Admin2FAVerifyRequest, request: Optional[Request] = None) -> TokenResponse:
        payload = decode_access_token(data.pre_2fa_token)
        if not payload or not payload.get("pre_2fa") or not payload.get("sub"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired pre-authentication token."
            )

        user_id = payload["sub"]
        stmt = select(User).where(User.id == user_id)
        res = await self.db.execute(stmt)
        user = res.scalar_one_or_none()

        if not user or user.role != "admin":
            raise HTTPException(status_code=401, detail="Unauthorized admin user.")

        # Check rate limiter lockout
        locked, remaining = totp_rate_limiter.is_locked(user.id)
        if locked:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many attempts. Please try again later."
            )

        stmt_2fa = select(Admin2FA).where(Admin2FA.admin_id == user.id)
        res_2fa = await self.db.execute(stmt_2fa)
        rec_2fa = res_2fa.scalar_one_or_none()

        if not rec_2fa or not rec_2fa.enabled:
            raise HTTPException(status_code=400, detail="2FA is not enabled for this admin account.")

        bc_stmt = select(AdminBackupCode).where(AdminBackupCode.admin_id == user.id)
        bc_res = await self.db.execute(bc_stmt)
        backup_codes = list(bc_res.scalars().all())

        secret = decrypt_secret(rec_2fa.encrypted_totp_secret)
        clean_code = data.code.strip().replace(" ", "").replace("-", "")

        is_valid = False
        used_backup_code = None

        # 1. Check TOTP 6-digit code
        totp = pyotp.TOTP(secret)
        if totp.verify(clean_code, valid_window=1):
            is_valid = True
        else:
            # 2. Check backup codes
            for bc in backup_codes:
                if bc.used_at is None and verify_backup_code(data.code, bc.code_hash):
                    is_valid = True
                    used_backup_code = bc
                    break

        if not is_valid:
            totp_rate_limiter.record_failure(user.id)
            await log_security_event(self.db, "2fa_verification_failure", user_id=user.id, ip_address=request.client.host if request and request.client else None)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid authentication code."
            )

        # Clear rate limit counter on success
        totp_rate_limiter.record_success(user.id)

        # Mark backup code consumed if used
        if used_backup_code:
            used_backup_code.used_at = datetime.utcnow()
            await log_security_event(self.db, "backup_code_used", user_id=user.id, ip_address=request.client.host if request and request.client else None)

        rec_2fa.last_used_at = datetime.utcnow()
        await self.db.commit()

        await log_security_event(self.db, "2fa_verification_success", user_id=user.id, ip_address=request.client.host if request and request.client else None)
        await log_security_event(self.db, "admin_login", user_id=user.id, ip_address=request.client.host if request and request.client else None)

        # Issue full admin access token
        access_token = create_access_token({
            "sub": user.id,
            "email": user.email,
            "role": "admin",
            "admin_2fa_verified": True
        })

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserProfileResponse.model_validate(user)
        )

    async def change_password(self, user: User, data: AdminChangePasswordRequest, request: Optional[Request] = None) -> Dict[str, Any]:
        if not verify_password(data.current_password, user.password_hash):
            raise HTTPException(status_code=400, detail="Invalid current password.")

        if user.role == "admin":
            stmt_2fa = select(Admin2FA).where(Admin2FA.admin_id == user.id)
            res_2fa = await self.db.execute(stmt_2fa)
            rec_2fa = res_2fa.scalar_one_or_none()

            if rec_2fa and rec_2fa.enabled:
                if not data.code_or_backup_code:
                    raise HTTPException(status_code=400, detail="2FA authentication code required.")

                bc_stmt = select(AdminBackupCode).where(AdminBackupCode.admin_id == user.id)
                bc_res = await self.db.execute(bc_stmt)
                backup_codes = list(bc_res.scalars().all())

                secret = decrypt_secret(rec_2fa.encrypted_totp_secret)
                totp = pyotp.TOTP(secret)
                clean_code = data.code_or_backup_code.strip().replace(" ", "").replace("-", "")

                is_valid = totp.verify(clean_code, valid_window=1)
                if not is_valid:
                    for bc in backup_codes:
                        if bc.used_at is None and verify_backup_code(data.code_or_backup_code, bc.code_hash):
                            is_valid = True
                            bc.used_at = datetime.utcnow()
                            break

                if not is_valid:
                    raise HTTPException(status_code=400, detail="Invalid authentication code.")

        # Update password hash
        user.password_hash = hash_password(data.new_password)
        await self.db.commit()

        await log_security_event(self.db, "password_changed", user_id=user.id, ip_address=request.client.host if request and request.client else None)

        return {"success": True, "message": "Password changed successfully. Please log in again."}
