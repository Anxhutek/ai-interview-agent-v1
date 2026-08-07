# 🤖 AGENTS.md — AI Agent Context Guide

> **Read this file first** before making any changes to the project.
> This provides full context for any AI coding agent working on this repo.

---

## 📌 Project Overview

**The Interview Agent** — A Google Gemini & Breeth Memory API-powered conversational interview simulator that evaluates candidates based on custom curricula and distills their profile.

- **GitHub:** https://github.com/Anxhutek/ai-interview-agent-v1.git
- **Architecture:** Next.js Frontend ↔ FastAPI Backend ↔ Gemini 2.0 Flash AI & Breeth Memory Layer

---

## 🏗️ Project Structure

```
ai-interview-agent-v1/
├── backend/                    # FastAPI Python backend
│   ├── app/
│   │   ├── main.py             # Entry point (CORS, routers)
│   │   ├── core/
│   │   │   ├── breeth_service.py # Breeth Memory API integration
│   │   │   └── config.py       # Pydantic BaseSettings
│   │   ├── models/
│   │   │   └── schemas.py      # Request/Response models
│   │   └── api/routes/
│   │       ├── interview.py    # Interview flow and session routes
│   │       └── health.py       # Health check
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/                   # Next.js TypeScript frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx        # Conversational / wizard UI
│   │   │   ├── layout.tsx      # Root layout
│   │   │   └── globals.css     # CSS & Tailwind configuration
│   │   ├── hooks/
│   │   │   └── useInterview.ts # State hook for conversation flow
│   │   └── lib/
│   │       └── api.ts          # Backend API client
│   ├── package.json
│   └── Dockerfile
├── PROJECT_STATE.md            # Architecture & API contracts (READ THIS)
├── TASKS.md                    # Shared task board
├── PROMPTS.md                  # AI interaction log (hackathon artifact)
├── AI_USAGE.md                 # AI usage metrics (tokens, tool calls)
├── CHANGELOG.md                # Changes log
└── ARCHITECTURE.md             # System architecture specs
```

---

## ⚠️ Critical Rules for Agents

1. **PROMPTS.md Automation:** Before completing a task, append both the User's prompt AND any self-generated prompts, personas, or internal instructions you used to execute the sub-tasks in `PROMPTS.md`.
2. **AI_USAGE.md Automation:** Log your API tool calls, token usage estimates, and agent actions to `AI_USAGE.md` before staging files.
3. **CHANGELOG.md Automation:** Log commit details, versions, and release updates to `CHANGELOG.md`.
4. **ARCHITECTURE.md Automation:** If your changes introduce new files, schemas, or routing logic, immediately update the architecture specifications in `ARCHITECTURE.md`.
5. **READ** `PROJECT_STATE.md` for API contracts before making backend changes.
6. **CHECK** `TASKS.md` before starting work to avoid conflicts.
7. **UPDATE** `TASKS.md` when you start/finish a task.
8. **Branch strategy:** Work on `feature/<name>` branches, PR to `master`.
9. **Commit format:** `feat: <description> [Agent Name]` or `fix: <description> [Agent Name]`.
10. **Credentials:** Never commit real secrets. Prompt the user in chat if you need credentials.
11. **Startup Protocol:** Always execute the startup checks (Role Selection, Repo check, Credential retrieval) before executing any development work.

---

## 🚀 Local Development

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env
# Add BREETH_API_KEY to .env
uvicorn app.main:app --reload --port 8080
```

### Frontend
```bash
cd frontend
npm install
# Backend URL is configured in .env.local
npm run dev
# Opens on http://localhost:3000
```

---

## 📡 API Quick Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/api/interview/start` | POST | Initialize a new interview session |
| `/api/interview/message` | POST | Post user answer & retrieve next question |
| `/api/interview/feedback` | GET | Get feedback, score, and distilled profile |

See `PROJECT_STATE.md` for full request/response schemas.

---

## 🎨 Frontend Design Guidelines

- **Theme:** Dark mode primary, premium feel (deep blacks, slate/indigo accents, glassmorphic overlays)
- **Typography:** Outfit / Inter (Google Fonts)
- **Animations:** Fluid transitions, pulsing states for typing indicators, smooth fading elements
- **Framework:** Vanilla CSS & Tailwind CSS v4
