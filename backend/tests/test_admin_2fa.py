import pytest
import pytest_asyncio
import pyotp
from httpx import AsyncClient, ASGITransport
from main import app
from sqlalchemy.future import select
from models.database import engine, Base, SessionLocal, User, Admin2FA, AdminBackupCode, SecurityAuditLog
from services.crypto_service import decrypt_secret

@pytest_asyncio.fixture(autouse=True)
async def prepare_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

@pytest.mark.asyncio
async def test_full_admin_2fa_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Register Admin User
        admin_data = {
            "email": "totp_admin@example.com",
            "password": "AdminPassword123!",
            "full_name": "TOTP Admin User",
            "role": "admin"
        }
        reg_res = await ac.post("/api/auth/register", json=admin_data)
        assert reg_res.status_code == 200
        token = reg_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Check 2FA Status (initial: disabled)
        status_res = await ac.get("/api/admin/2fa/status", headers=headers)
        assert status_res.status_code == 200
        assert status_res.json()["enabled"] is False

        # 3. Setup 2FA
        setup_res = await ac.post("/api/admin/2fa/setup", headers=headers)
        assert setup_res.status_code == 200
        setup_data = setup_res.json()
        assert "secret" in setup_data
        assert "qr_code" in setup_data
        secret = setup_data["secret"]

        # Verify 2FA is STILL disabled until initial OTP verification
        status_res2 = await ac.get("/api/admin/2fa/status", headers=headers)
        assert status_res2.json()["enabled"] is False

        # 4. Enable 2FA with valid TOTP code
        totp = pyotp.TOTP(secret)
        otp_code = totp.now()

        enable_res = await ac.post("/api/admin/2fa/enable", json={"code": otp_code}, headers=headers)
        assert enable_res.status_code == 200
        enable_data = enable_res.json()
        assert enable_data["enabled"] is True
        assert len(enable_data["backup_codes"]) == 10
        backup_codes = enable_data["backup_codes"]

        # 5. Verify 2FA is now ENABLED
        status_res3 = await ac.get("/api/admin/2fa/status", headers=headers)
        assert status_res3.json()["enabled"] is True

        # 6. Admin Login Step 1: Username & Password
        login_res = await ac.post("/api/auth/login", json={
            "email": "totp_admin@example.com",
            "password": "AdminPassword123!"
        })
        assert login_res.status_code == 200
        login_data = login_res.json()
        assert login_data["require_2fa"] is True
        assert "pre_2fa_token" in login_data
        pre_2fa_token = login_data["pre_2fa_token"]

        # Pre-2FA token MUST NOT be able to access protected admin endpoints
        pre_2fa_headers = {"Authorization": f"Bearer {pre_2fa_token}"}
        protected_res = await ac.get("/api/admin/candidates", headers=pre_2fa_headers)
        assert protected_res.status_code == 403

        # 7. Admin Login Step 2: Invalid TOTP Code -> Failure
        invalid_verify = await ac.post("/api/auth/admin/verify-2fa", json={
            "pre_2fa_token": pre_2fa_token,
            "code": "000000"
        })
        assert invalid_verify.status_code == 400
        assert invalid_verify.json()["detail"] == "Invalid authentication code."

        # 8. Admin Login Step 2: Valid TOTP Code -> Success
        valid_code = totp.now()
        verify_res = await ac.post("/api/auth/admin/verify-2fa", json={
            "pre_2fa_token": pre_2fa_token,
            "code": valid_code
        })
        assert verify_res.status_code == 200
        full_token = verify_res.json()["access_token"]
        full_headers = {"Authorization": f"Bearer {full_token}"}

        # Verify full token can access protected admin routes
        candidates_res = await ac.get("/api/admin/candidates", headers=full_headers)
        assert candidates_res.status_code == 200

        # 9. Backup Code Login
        login_res2 = await ac.post("/api/auth/login", json={
            "email": "totp_admin@example.com",
            "password": "AdminPassword123!"
        })
        pre_2fa_token2 = login_res2.json()["pre_2fa_token"]

        # Use first backup code
        used_bc = backup_codes[0]
        bc_verify_res = await ac.post("/api/auth/admin/verify-2fa", json={
            "pre_2fa_token": pre_2fa_token2,
            "code": used_bc
        })
        assert bc_verify_res.status_code == 200

        # Attempt to RE-USE same backup code -> MUST FAIL
        login_res3 = await ac.post("/api/auth/login", json={
            "email": "totp_admin@example.com",
            "password": "AdminPassword123!"
        })
        pre_2fa_token3 = login_res3.json()["pre_2fa_token"]
        reuse_res = await ac.post("/api/auth/admin/verify-2fa", json={
            "pre_2fa_token": pre_2fa_token3,
            "code": used_bc
        })
        assert reuse_res.status_code == 400

        # 10. Regenerate Backup Codes
        regen_res = await ac.post("/api/admin/2fa/regenerate-backup-codes", json={
            "current_password": "AdminPassword123!",
            "code_or_backup_code": totp.now()
        }, headers=full_headers)
        assert regen_res.status_code == 200
        assert len(regen_res.json()["backup_codes"]) == 10

        # 11. Disable 2FA
        disable_res = await ac.post("/api/admin/2fa/disable", json={
            "current_password": "AdminPassword123!",
            "code_or_backup_code": totp.now()
        }, headers=full_headers)
        assert disable_res.status_code == 200

        # Verify status is now disabled
        status_res4 = await ac.get("/api/admin/2fa/status", headers=full_headers)
        assert status_res4.json()["enabled"] is False

        # Verify login is now 1-step
        login_res4 = await ac.post("/api/auth/login", json={
            "email": "totp_admin@example.com",
            "password": "AdminPassword123!"
        })
        assert login_res4.status_code == 200
        assert login_res4.json().get("require_2fa", False) is False
        assert "access_token" in login_res4.json()

        # 12. Check Security Audit Log entries
        async with SessionLocal() as db:
            audit_stmt = select(SecurityAuditLog).order_by(SecurityAuditLog.created_at.asc())
            audit_res = await db.execute(audit_stmt)
            logs = audit_res.scalars().all()
            event_types = [l.event_type for l in logs]
            assert "2fa_enabled" in event_types
            assert "2fa_verification_success" in event_types
            assert "backup_code_used" in event_types
            assert "backup_codes_regenerated" in event_types
            assert "2fa_disabled" in event_types
