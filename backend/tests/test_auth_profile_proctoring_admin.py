import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
import io
from main import app
from models.database import engine, Base, create_all_tables

@pytest_asyncio.fixture(autouse=True)
async def prepare_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)


@pytest.mark.asyncio
async def test_auth_register_and_login():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Register Candidate
        reg_payload = {
            "email": "candidate@example.com",
            "password": "SecretPassword123!",
            "full_name": "Jane Candidate",
            "target_role": "Backend Engineer",
            "role": "candidate"
        }
        res = await ac.post("/api/auth/register", json=reg_payload)
        assert res.status_code == 200, res.text
        data = res.json()
        assert "access_token" in data
        assert data["user"]["email"] == "candidate@example.com"
        token = data["access_token"]

        # Duplicate register should fail
        res_dup = await ac.post("/api/auth/register", json=reg_payload)
        assert res_dup.status_code == 400

        # Login
        login_payload = {
            "email": "candidate@example.com",
            "password": "SecretPassword123!"
        }
        res_login = await ac.post("/api/auth/login", json=login_payload)
        assert res_login.status_code == 200
        assert "access_token" in res_login.json()

        # Get Profile /me
        headers = {"Authorization": f"Bearer {token}"}
        res_me = await ac.get("/api/auth/me", headers=headers)
        assert res_me.status_code == 200
        assert res_me.json()["full_name"] == "Jane Candidate"

@pytest.mark.asyncio
async def test_profile_file_uploads():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Register user
        reg_payload = {
            "email": "upload_user@example.com",
            "password": "SecretPassword123!",
            "full_name": "Upload User",
            "target_role": "Frontend Engineer"
        }
        res = await ac.post("/api/auth/register", json=reg_payload)
        token = res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Test Avatar Upload
        avatar_content = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR..."
        files = {"file": ("avatar.png", io.BytesIO(avatar_content), "image/png")}
        res_avatar = await ac.post("/api/profile/upload-avatar", headers=headers, files=files)
        assert res_avatar.status_code == 200
        assert "/uploads/avatars/" in res_avatar.json()["profile_picture_url"]

        # Test Resume Upload (.pdf mock)
        pdf_content = b"%PDF-1.4 mock content"
        files_resume = {"file": ("resume.pdf", io.BytesIO(pdf_content), "application/pdf")}
        res_resume = await ac.post("/api/profile/upload-resume", headers=headers, files=files_resume)
        assert res_resume.status_code == 200
        assert "/uploads/resumes/" in res_resume.json()["resume_url"]

@pytest.mark.asyncio
async def test_proctoring_event_logging():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Start a session
        start_payload = {
            "candidateId": "cand_123",
            "candidateName": "Proctor Test Candidate"
        }
        res_start = await ac.post("/api/interview/start", json=start_payload)
        assert res_start.status_code == 200
        session_id = res_start.json()["sessionId"]

        # Log 1st warning: gaze_off_screen
        res_p1 = await ac.post("/api/interview/proctor-event", json={
            "session_id": session_id,
            "event_type": "gaze_off_screen",
            "severity": "warning"
        })
        assert res_p1.status_code == 200
        p1_data = res_p1.json()
        assert p1_data["proctoring_score"] == 95.0
        assert p1_data["integrity_status"] == "clean"

        # Log 2nd warning
        await ac.post("/api/interview/proctor-event", json={
            "session_id": session_id,
            "event_type": "multiple_faces",
            "severity": "warning"
        })

        # Log 3rd warning
        await ac.post("/api/interview/proctor-event", json={
            "session_id": session_id,
            "event_type": "face_missing",
            "severity": "warning"
        })

        # Log 4th warning -> total events > 3 => integrity_status="flagged"
        res_p4 = await ac.post("/api/interview/proctor-event", json={
            "session_id": session_id,
            "event_type": "gaze_off_screen",
            "severity": "warning"
        })
        assert res_p4.status_code == 200
        assert res_p4.json()["integrity_status"] == "flagged"

@pytest.mark.asyncio
async def test_admin_dashboard_apis():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Register Admin user
        admin_reg = {
            "email": "admin@example.com",
            "password": "AdminSecret123!",
            "full_name": "Admin User",
            "role": "admin"
        }
        res_admin = await ac.post("/api/auth/register", json=admin_reg)
        admin_token = res_admin.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # GET candidates list
        res_cands = await ac.get("/api/admin/candidates?page=1&limit=10", headers=admin_headers)
        assert res_cands.status_code == 200
        data_cands = res_cands.json()
        assert "candidates" in data_cands
        assert "total" in data_cands

        # GET analytics
        res_analytics = await ac.get("/api/admin/analytics", headers=admin_headers)
        assert res_analytics.status_code == 200
        an_data = res_analytics.json()
        assert "total_candidates" in an_data
        assert "total_interviews_completed" in an_data
        assert "average_system_score" in an_data

        # Non-admin access should be forbidden (403)
        cand_reg = {
            "email": "normal@example.com",
            "password": "NormalSecret123!",
            "full_name": "Normal Candidate",
            "role": "candidate"
        }
        res_cand = await ac.post("/api/auth/register", json=cand_reg)
        cand_token = res_cand.json()["access_token"]
        cand_headers = {"Authorization": f"Bearer {cand_token}"}

        res_forbidden = await ac.get("/api/admin/analytics", headers=cand_headers)
        assert res_forbidden.status_code == 403
