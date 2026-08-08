# 📋 TASKS — The Interview Agent (Option 2)

> Shared task board for AI Interview Agent.

---

## 🔴 Critical (Must Do)

| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 1 | Setup FastAPI backend configuration | Backend Agent | ✅ Done | CORS limits & health routers |
| 2 | Integrate Breeth Memory Layer (`ck_live_...`) | Backend Agent | ✅ Done | Save dialogs as memory episodes via /v1/episodes |
| 3 | Parse Curriculum JSON & Candidate Profiles | Backend Agent | ✅ Done | Local dynamic curriculum router & profile distillation |
| 4 | Deploy interview state routes (/start, /message) | Backend Agent | ✅ Done | Multi-turn interview loops (min 8 queries) |
| 5 | Deploy final feedback & score computations | Backend Agent | ✅ Done | Structured profile feedback via Breeth graph nodes |

---

## 🟢 Planned

| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 6 | Create responsive web conversational UI | Frontend Agent | ⏳ Planned | Chatbox interface |
| 7 | Set up automated deployment to Cloud Run | DevOps Agent | ⏳ Planned | YAML deployment setup |
| 8 | User Auth, Profile, Proctoring Audit, & Admin APIs | Backend Agent | ✅ Done | Auth, Avatar/Resume upload, Proctoring events, Admin dashboard |
| 9 | Backend AI Evaluation Architecture Upgrade | Backend Agent | 🔄 In Progress | Provider Abstraction, Model Discovery, Groq Fallback, Eval Service, Persistence |



