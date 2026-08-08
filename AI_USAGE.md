# 📊 AI_USAGE.md — AI Agent Usage Tracking

> Tracks API calls, tool usage, and token estimates per session.

---

## Session 1 — 2026-08-07

| Action | Tool/API | Estimated Tokens | Notes |
|--------|----------|-----------------|-------|
| Create GitHub Repo | GitHub REST API | ~200 | Repo already existed (422), proceeded with clone |
| Clone Repository | git clone | N/A | Empty repo initialized |
| Generate PROJECT_STATE.md | Agent Generation | ~800 | Architecture, API contracts, tech decisions |
| Generate TASKS.md | Agent Generation | ~600 | 15 tasks across backend and frontend |
| Generate AGENTS.md | Agent Generation | ~700 | Project structure, rules, dev setup |

---

## Session 2 — 2026-08-08

| Action | Tool/API | Estimated Tokens | Notes |
|--------|----------|-----------------|-------|
| Database Models Update | write_to_file / replace_file_content | ~1,200 | User, ProctoringLog, InterviewSession updates |
| Security & Auth Routers | write_to_file | ~2,500 | bcrypt password hashing, JWT tokens, auth dependencies |
| Profile Service & Uploads | write_to_file | ~2,000 | Avatar & Resume file storage and PDF/DOCX parsing |
| Proctoring Logging | write_to_file | ~1,500 | Incident logging, proctoring score calculation, auto-flagging |
| Admin Routers & Services | write_to_file | ~3,000 | Candidate pagination, session drilldown, analytics |
| Pytest Test Suite | run_command (pytest) | ~1,800 | 5/5 unit tests passing cleanly |

---
