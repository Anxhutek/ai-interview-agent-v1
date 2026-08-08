import io
import base64
import pyotp
import qrcode
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Dict, Any

from models.database import User, Admin2FA, AdminBackupCode
from models.schemas import (
    Admin2FASetupResponse,
    Admin2FAEnableRequest,
    Admin2FAEnableResponse,
    Admin2FADisableRequest,
    Admin2FARegenerateBackupCodesRequest
)
from core.dependencies import get_db, get_current_admin, require_admin_2fa
from core.config import settings
from core.security import verify_password
from services.crypto_service import (
    encrypt_secret,
    decrypt_secret,
    generate_backup_codes,
    hash_backup_code,
    verify_backup_code
)
from services.audit_service import log_security_event
from services.rate_limiter import totp_rate_limiter

router = APIRouter(prefix='/api/admin/2fa', tags=['admin-2fa'])

def _verify_otp_or_backup(secret: str, code: str, backup_codes: list) -> Tuple[bool, bool, Optional[AdminBackupCode]]:
    """
    Verifies code against TOTP secret or backup codes.
    Returns: (is_valid, is_backup_code, matching_backup_code_obj)
    """
    clean_code = code.strip().replace(" ", "").replace("-", "")
    
    # 1. Try TOTP code
    totp = pyotp.TOTP(secret)
    if totp.verify(clean_code, valid_window=1):
        return True, False, None

    # 2. Try backup codes
    for bc in backup_codes:
        if bc.used_at is None and verify_backup_code(code, bc.code_hash):
            return True, True, bc

    return False, False, None

@router.get('/status')
async def get_2fa_status(
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Admin2FA).where(Admin2FA.admin_id == current_user.id)
    res = await db.execute(stmt)
    rec = res.scalar_one_or_none()
    return {
        "admin_id": current_user.id,
        "enabled": bool(rec and rec.enabled)
    }

@router.post('/setup', response_model=Admin2FASetupResponse)
async def setup_2fa(
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    # Check if 2FA record exists
    stmt = select(Admin2FA).where(Admin2FA.admin_id == current_user.id)
    res = await db.execute(stmt)
    rec = res.scalar_one_or_none()

    if rec and rec.enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is already enabled on this account."
        )

    # Generate new random secret
    secret = pyotp.random_base32()
    encrypted = encrypt_secret(secret)

    if rec:
        rec.encrypted_totp_secret = encrypted
        rec.enabled = False
        rec.updated_at = datetime.utcnow()
    else:
        rec = Admin2FA(
            admin_id=current_user.id,
            enabled=False,
            encrypted_totp_secret=encrypted
        )
        db.add(rec)

    await db.commit()

    # Generate QR Code Data URI
    totp = pyotp.TOTP(secret)
    otpauth_url = totp.provisioning_uri(name=current_user.email, issuer_name=settings.TOTP_ISSUER)
    
    img = qrcode.make(otpauth_url)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    qr_code_data_uri = f"data:image/png;base64,{qr_b64}"

    return Admin2FASetupResponse(
        secret=secret,
        qr_code=qr_code_data_uri,
        otpauth_url=otpauth_url
    )

@router.post('/enable', response_model=Admin2FAEnableResponse)
async def enable_2fa(
    body: Admin2FAEnableRequest,
    request: Request,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Admin2FA).where(Admin2FA.admin_id == current_user.id)
    res = await db.execute(stmt)
    rec = res.scalar_one_or_none()

    if not rec or not rec.encrypted_totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA setup must be initiated first."
        )

    secret = decrypt_secret(rec.encrypted_totp_secret)
    totp = pyotp.TOTP(secret)

    clean_code = body.code.strip().replace(" ", "")
    if not totp.verify(clean_code, valid_window=1):
        await log_security_event(db, "2fa_enable_failed", user_id=current_user.id, ip_address=request.client.host if request.client else None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid authentication code."
        )

    # Enable 2FA
    rec.enabled = True
    rec.last_used_at = datetime.utcnow()
    rec.updated_at = datetime.utcnow()

    # Clear old backup codes & generate 10 new ones
    bc_stmt = select(AdminBackupCode).where(AdminBackupCode.admin_id == current_user.id)
    bc_res = await db.execute(bc_stmt)
    for old_bc in bc_res.scalars().all():
        await db.delete(old_bc)

    plaintext_codes = generate_backup_codes(10)
    for code in plaintext_codes:
        bc_entry = AdminBackupCode(
            admin_id=current_user.id,
            code_hash=hash_backup_code(code)
        )
        db.add(bc_entry)

    await db.commit()

    await log_security_event(
        db,
        "2fa_enabled",
        user_id=current_user.id,
        ip_address=request.client.host if request.client else None
    )

    return Admin2FAEnableResponse(
        success=True,
        enabled=True,
        backup_codes=plaintext_codes
    )

@router.post('/disable')
async def disable_2fa(
    body: Admin2FADisableRequest,
    request: Request,
    current_user: User = Depends(require_admin_2fa),
    db: AsyncSession = Depends(get_db)
):
    # Verify password
    if not verify_password(body.current_password, current_user.password_hash):
        await log_security_event(db, "2fa_disable_failed_password", user_id=current_user.id)
        raise HTTPException(status_code=400, detail="Invalid credentials.")

    stmt = select(Admin2FA).where(Admin2FA.admin_id == current_user.id)
    res = await db.execute(stmt)
    rec = res.scalar_one_or_none()

    if not rec or not rec.enabled:
        return {"success": True, "message": "2FA is already disabled."}

    # Fetch backup codes
    bc_stmt = select(AdminBackupCode).where(AdminBackupCode.admin_id == current_user.id)
    bc_res = await db.execute(bc_stmt)
    backup_codes = list(bc_res.scalars().all())

    secret = decrypt_secret(rec.encrypted_totp_secret)
    is_valid, is_backup, bc_obj = _verify_otp_or_backup(secret, body.code_or_backup_code, backup_codes)

    if not is_valid:
        await log_security_event(db, "2fa_disable_failed_code", user_id=current_user.id)
        raise HTTPException(status_code=400, detail="Invalid authentication code.")

    # Disable 2FA & delete backup codes
    rec.enabled = False
    rec.updated_at = datetime.utcnow()

    for bc in backup_codes:
        await db.delete(bc)

    await db.commit()

    await log_security_event(
        db,
        "2fa_disabled",
        user_id=current_user.id,
        ip_address=request.client.host if request.client else None
    )

    return {"success": True, "message": "Two-factor authentication disabled successfully."}

@router.post('/regenerate-backup-codes')
async def regenerate_backup_codes(
    body: Admin2FARegenerateBackupCodesRequest,
    request: Request,
    current_user: User = Depends(require_admin_2fa),
    db: AsyncSession = Depends(get_db)
):
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid credentials.")

    stmt = select(Admin2FA).where(Admin2FA.admin_id == current_user.id)
    res = await db.execute(stmt)
    rec = res.scalar_one_or_none()

    if not rec or not rec.enabled:
        raise HTTPException(status_code=400, detail="2FA is not enabled.")

    bc_stmt = select(AdminBackupCode).where(AdminBackupCode.admin_id == current_user.id)
    bc_res = await db.execute(bc_stmt)
    backup_codes = list(bc_res.scalars().all())

    secret = decrypt_secret(rec.encrypted_totp_secret)
    is_valid, is_backup, bc_obj = _verify_otp_or_backup(secret, body.code_or_backup_code, backup_codes)

    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid authentication code.")

    # Delete existing backup codes
    for bc in backup_codes:
        await db.delete(bc)

    # Generate 10 new ones
    plaintext_codes = generate_backup_codes(10)
    for code in plaintext_codes:
        bc_entry = AdminBackupCode(
            admin_id=current_user.id,
            code_hash=hash_backup_code(code)
        )
        db.add(bc_entry)

    await db.commit()

    await log_security_event(
        db,
        "backup_codes_regenerated",
        user_id=current_user.id,
        ip_address=request.client.host if request.client else None
    )

    return {
        "success": True,
        "backup_codes": plaintext_codes
    }
