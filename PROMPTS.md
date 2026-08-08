# 📜 PROMPTS.md — Agent Prompt Log

> Tracks all user prompts and self-generated agent personas/instructions.

---

## Session 1 — 2026-08-07

### User Prompt
> Role: Backend Developer | Project: AI Interview Agent (Option 2) | Repo: ai-interview-agent-v1
> Execute workspace setup: create GitHub repo, initialize templates, adopt Backend Developer persona, begin implementation.

### Agent Self-Generated Persona
> **Backend Developer Agent** — Specialized in FastAPI, async Python, AI API integration (Breeth API), database design (SQLAlchemy/SQLModel), and RESTful API architecture. Focus on clean, modular, production-ready backend code with comprehensive error handling and testing.

---

## Session 2 — 2026-08-08

### User Prompt
> Implement User Auth, Profile Management, Proctoring Audit, & Admin APIs for ai-interview-agent-v1 backend.
> Include User and ProctoringLog database schemas, Auth router (/register, /login, /me), Profile router (/upload-avatar, /upload-resume), Proctoring router (/proctor-event), and Admin router (/candidates, /sessions/{session_id}, /analytics). Ensure static file serving for uploads and CORS updates.

### Agent Self-Generated Persona & Internal Instructions
> **Backend System Architect** — Implemented SQLAlchemy models (`User`, `ProctoringLog`, `InterviewSession` updates), core security utilities (bcrypt hashing, JWT creation & verification, HTTPBearer dependencies), profile upload & text parsing service (`pypdf`, `python-docx`), proctoring score calculation & auto-flagging, admin analytics & pagination service, registered FastAPI routers, static file mounting at `/uploads`, and automated pytest unit test suite.
