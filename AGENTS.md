# 🤖 AGENTS.md — AI Interview Agent Context Guide

> **Read this file first** before making any changes to the project.
> This provides full context for any AI coding agent working on this repo.

---

## 🏗️ Project Structure

```
ai-interview-agent-v1/
├── backend/
│   ├── main.py              # FastAPI application entry
│   ├── core/
│   │   ├── config.py        # Settings and environment vars
│   │   └── dependencies.py  # Shared dependencies
│   ├── routers/
│   │   ├── sessions.py      # Interview session endpoints
│   │   ├── questions.py     # Question generation endpoints
│   │   └── health.py        # Health check endpoint
│   ├── models/
│   │   ├── schemas.py       # Pydantic request/response models
│   │   └── database.py      # SQLAlchemy/SQLModel ORM models
│   ├── services/
│   │   ├── ai_service.py    # Breeth AI integration
│   │   ├── evaluation.py    # Answer evaluation logic
│   │   └── session.py       # Session management
│   └── tests/
│       └── test_*.py        # pytest test files
├── frontend/                 # React/Next.js (Frontend Agent)
├── PROJECT_STATE.md          # API contracts & architecture
├── TASKS.md                  # Kanban task board
├── AGENTS.md                 # This file
├── PROMPTS.md                # Agent prompt log
├── AI_USAGE.md               # API usage tracking
├── CHANGELOG.md              # Release history
└── ARCHITECTURE.md           # System architecture details
```

---

## ⚠️ Critical Rules for Agents

1. **PROMPTS.md Automation:** Before completing a task, append both the User's prompt AND any self-generated prompts, personas, or internal instructions you used to execute the sub-tasks in `PROMPTS.md`.
2. **AI_USAGE.md Automation:** Log your API tool calls, token usage estimates, and agent actions to `AI_USAGE.md` before staging files.
3. **CHANGELOG.md Automation:** Log commit details, versions, and release updates to `CHANGELOG.md`. (Note: Can be combined with CI/CD deployment pipelines if active).
4. **ARCHITECTURE.md Automation:** If your changes introduce new files, schemas, or routing logic, immediately update the architecture specifications in `ARCHITECTURE.md`.
5. **READ** `PROJECT_STATE.md` for API contracts before making backend changes.
6. **CHECK** `TASKS.md` before starting work to avoid conflicts.
7. **UPDATE** `TASKS.md` when you start/finish a task.
8. **Branch strategy:** Work on `feature/<name>` branches, PR to `master`.
9. **Commit format:** `feat: <description> [Agent Name]` or `fix: <description> [Agent Name]`.
10. **Credentials:** Never commit real secrets. Prompt the user in chat if you need credentials.
11. **Startup Protocol:** Always execute the startup checks (Role Selection, Repo check, Credential retrieval) before executing any development work.

---

## 🔧 Tech Stack

- **Backend:** Python 3.11+, FastAPI, Uvicorn
- **AI Provider:** Breeth API (question generation + evaluation)
- **Database:** SQLite (dev) / Firestore (prod)
- **ORM:** SQLAlchemy / SQLModel
- **Testing:** pytest, httpx
- **Frontend:** React / Next.js (handled by Frontend Agent)

---

## 🚀 Local Development

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Run Tests
```bash
cd backend
pytest -v
```
