# 📋 TASKS — AI Interview Agent

> **Last Updated:** 2026-08-07
> Shared task board for all team members and agents.

---

## 🔴 Critical (Must Do)

| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 10 | Implement WebSocket for real-time interview | Backend Agent | ⏳ Planned | Live question delivery |
| 11 | Write unit tests for core services | Backend Agent | ⏳ Planned | pytest with mocked AI responses |
| 12 | Create Docker configuration | Backend Agent | ⏳ Planned | Dockerfile + docker-compose.yml |

---

## 🟡 In Progress

| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
|   |      |          |        |       |

---

## ✅ Done

| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 1 | Initialize FastAPI backend project structure | Backend Agent | ✅ Done | main.py, routers, models, services created |
| 2 | Implement AI integration service (Gemini + Breeth) | Backend Agent | ✅ Done | Google Gemini 2.0 Flash + Breeth memory |
| 3 | Design and implement interview session API | Backend Agent | ✅ Done | POST /sessions, GET /sessions/{id} working |
| 4 | Build answer submission and evaluation endpoint | Backend Agent | ✅ Done | POST /sessions/{id}/answer working |
| 5 | Create health check endpoint | Backend Agent | ✅ Done | GET /health verified |
| 6 | Implement session results aggregation | Backend Agent | ✅ Done | GET /sessions/{id}/results working |
| 7 | Add question generation endpoint | Backend Agent | ✅ Done | POST /questions/generate |
| 8 | Set up SQLite database with SQLAlchemy | Backend Agent | ✅ Done | Models for sessions, questions, answers |
| 9 | Add CORS middleware and security headers | Backend Agent | ✅ Done | Allow frontend origin |
| 13 | Frontend: Setup React/Next.js project | Frontend Developer | ✅ Done | UI scaffold with Next.js 16.3 + React 19 + Tailwind v4 |
| 14 | Frontend: Build interview UI components | Frontend Developer | ✅ Done | Immersive multi-turn chat wizard UI |
| 15 | Frontend: Results dashboard | Frontend Developer | ✅ Done | Score visualization & Breeth Memory Graph Inspector |
| 16 | VPS Deployment Setup | Backend Agent & Frontend Developer | ✅ Done | Live at http://168.144.189.164 |

---

## 📝 How to Use This Board

1. **Pick a task** from the Planned section
2. **Move it** to In Progress with your name
3. **Create a feature branch:** `feature/<short-description>`
4. **When done,** create a PR and mark status as ✅ Done
5. **Commit message format:** `feat: <description> [Agent Name]`
