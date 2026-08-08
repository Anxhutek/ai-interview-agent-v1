# 📝 CHANGELOG.md — AI Interview Agent

All notable changes to this project will be documented in this file.

---

## [0.1.0] — 2026-08-07

### Added
- Initial project workspace setup
- `PROJECT_STATE.md` with architecture diagram and API contracts
- `TASKS.md` with 15 planned development tasks
- `AGENTS.md` with project structure and agent collaboration rules
- `PROMPTS.md` for prompt tracking compliance
- `AI_USAGE.md` for API usage tracking
- `ARCHITECTURE.md` with system design specifications
- `.gitignore` for Python/Node projects

---

## [0.2.0] — 2026-08-08

### Added
- User Authentication endpoints (`POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`) with bcrypt password hashing and JWT authorization.
- Profile Management endpoints (`POST /api/profile/upload-avatar`, `POST /api/profile/upload-resume`) supporting local file storage and PDF/DOCX resume text extraction.
- Proctoring Logging endpoint (`POST /api/interview/proctor-event`) with dynamic proctoring score calculation and automatic integrity flagging.
- Admin Dashboard endpoints (`GET /api/admin/candidates`, `GET /api/admin/sessions/{session_id}`, `GET /api/admin/analytics`) requiring admin authorization.
- Database ORM models (`User`, `ProctoringLog`, and updated `InterviewSession`) in `backend/models/database.py`.
- Static file serving mounted at `/uploads`.
- Pytest test suite for auth, profile, proctoring, and admin APIs in `backend/tests/test_auth_profile_proctoring_admin.py`.

---
