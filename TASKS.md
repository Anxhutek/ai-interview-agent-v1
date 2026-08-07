# 📋 TASKS — AI Interview Agent

> **Last Updated:** 2026-08-07
> Shared task board for all team members and agents.

---

## 🔴 Critical (Must Do)

| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 1 | Initialize FastAPI backend project structure | Backend Agent | 🟡 Planned | Create main.py, routers, models, services dirs |
| 2 | Implement Breeth AI integration service | Backend Agent | 🟡 Planned | Question generation + answer evaluation |
| 3 | Design and implement interview session API | Backend Agent | 🟡 Planned | POST /sessions, GET /sessions/{id} |
| 4 | Build answer submission and evaluation endpoint | Backend Agent | 🟡 Planned | POST /sessions/{id}/answer |

---

## 🟡 In Progress

| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
|   |      |          |        |       |

---

## 🟢 Planned

| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 5 | Create health check endpoint | Backend Agent | 🟡 Planned | GET /health |
| 6 | Implement session results aggregation | Backend Agent | 🟡 Planned | GET /sessions/{id}/results |
| 7 | Add question generation endpoint | Backend Agent | 🟡 Planned | POST /questions/generate |
| 8 | Set up SQLite database with SQLAlchemy | Backend Agent | 🟡 Planned | Models for sessions, questions, answers |
| 9 | Add CORS middleware and security headers | Backend Agent | 🟡 Planned | Allow frontend origin |
| 10 | Implement WebSocket for real-time interview | Backend Agent | 🟡 Planned | Live question delivery |
| 11 | Write unit tests for core services | Backend Agent | 🟡 Planned | pytest with mocked AI responses |
| 12 | Create Docker configuration | Backend Agent | 🟡 Planned | Dockerfile + docker-compose.yml |
| 13 | Frontend: Setup React/Next.js project | Frontend Agent | 🟡 Planned | UI scaffold |
| 14 | Frontend: Build interview UI components | Frontend Agent | 🟡 Planned | Question cards, timer, recording |
| 15 | Frontend: Results dashboard | Frontend Agent | 🟡 Planned | Score visualization |

---

## ✅ Done

| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
|   |      |          |        |       |

---

## 📝 How to Use This Board

1. **Pick a task** from the Planned section
2. **Move it** to In Progress with your name
3. **Create a feature branch:** `feature/<short-description>`
4. **When done,** create a PR and mark status as ✅ Done
5. **Commit message format:** `feat: <description> [Agent Name]`
