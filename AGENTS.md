# 🤖 AGENTS.md — AI Interview Agent Context Guide

> **Read this file first** before making any changes to the project.
> This document provides the complete context required for any AI coding agent operating within this repository.

---

## 🏗️ Project Structure

```text
ai-interview-agent-v1/
├── backend/
│   ├── main.py              # FastAPI application entry point
│   ├── core/
│   │   ├── config.py        # Environment variables and system configurations
│   │   └── dependencies.py  # Shared injection dependencies
│   ├── routers/
│   │   ├── sessions.py      # Interview session endpoints
│   │   ├── questions.py     # Question generation endpoints
│   │   └── health.py        # Health check endpoint
│   ├── models/
│   │   ├── schemas.py       # Pydantic request and response schemas
│   │   └── database.py      # SQLAlchemy/SQLModel ORM data models
│   ├── services/
│   │   ├── ai_service.py    # Breeth AI integration service
│   │   ├── evaluation.py    # Answer evaluation logic and scoring
│   │   └── session.py       # Interview session lifecycle management
│   └── tests/
│       └── test_*.py        # Automated pytest test suites
├── frontend/                 # React/Next.js implementation (Frontend Agent domain)
├── PROJECT_STATE.md          # Architecture overview and API contracts
├── TASKS.md                  # Kanban task tracking board
├── AGENTS.md                 # This file (Agent protocol guide)
├── PROMPTS.md                # Execution log for Agent prompts and actions
├── AI_USAGE.md               # Tool execution and API usage telemetry
├── CHANGELOG.md              # Versioning and release history
└── ARCHITECTURE.md           # Comprehensive system architecture details
```

---

## ⚠️ Critical Rules for Agents

1. **PROMPTS.md Automation:** Prior to finalizing a task, append both the original User prompt and any generated personas, system prompts, or internal execution instructions to `PROMPTS.md`.
2. **AI_USAGE.md Automation:** Record all API tool executions, token consumption estimates, and operational actions in `AI_USAGE.md` before staging files.
3. **CHANGELOG.md Automation:** Document commit details, semantic versions, and deployment notes in `CHANGELOG.md`. (Integrates with CI/CD deployment pipelines if active).
4. **ARCHITECTURE.md Automation:** When introducing new files, schemas, or routing logic, immediately synchronize the architecture specifications in `ARCHITECTURE.md`.
5. **Contract Review:** Read `PROJECT_STATE.md` to verify API contracts prior to executing backend modifications.
6. **Task Synchronization:** Review `TASKS.md` before commencing development to mitigate merge conflicts.
7. **Task Tracking:** Update `TASKS.md` immediately upon starting or concluding an assigned task.
8. **Branch Strategy:** Execute all work on `feature/<name>` branches and submit Pull Requests to `master`.
9. **Commit Format:** Enforce conventional commits: `feat: <description> [Agent Name]` or `fix: <description> [Agent Name]`.
10. **Credentials Security:** **Never commit hardcoded secrets, tokens, or credentials.** Rely exclusively on environment variables and prompt the user if required credentials are missing.
11. **Startup Protocol:** Mandatorily execute startup checks (Role Selection, Repository Status, Credential Verification) prior to initiating development workflows.

---

## 🔧 Technology Stack

- **Backend:** Python 3.11+, FastAPI, Uvicorn
- **AI Provider:** Breeth API (Dynamic question generation and real-time evaluation)
- **Database:** SQLite (Development) / Firestore (Production)
- **ORM:** SQLAlchemy / SQLModel
- **Testing:** pytest, httpx
- **Frontend:** React / Next.js (Managed by the Frontend Agent)

---

## 🚀 Local Development Guidelines

### Backend Initialization
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Test Execution
```bash
cd backend
pytest -v
```
