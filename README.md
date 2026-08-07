# 🤖 AI Interview Agent

An AI-powered mock interview platform that generates contextual technical interview questions, evaluates candidate responses in real-time, and provides detailed feedback with scoring.

## 🚀 Features

- **Smart Question Generation** — AI generates role-specific interview questions based on domain and difficulty
- **Real-time Evaluation** — Answers are evaluated with scoring and actionable feedback
- **Session Management** — Track interview progress and review past performance
- **Multi-domain Support** — Practice for various tech roles and specializations

## 🏗️ Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Python, FastAPI, Uvicorn |
| AI Engine | Breeth API |
| Database | SQLite (dev) / Firestore (prod) |
| ORM | SQLAlchemy, SQLModel |
| Frontend | React / Next.js |
| Testing | pytest, httpx |

## 📦 Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### API Docs
Once running, visit: `http://localhost:8000/docs`

## 📋 Project Management

- [`PROJECT_STATE.md`](PROJECT_STATE.md) — Architecture & API contracts
- [`TASKS.md`](TASKS.md) — Task board
- [`AGENTS.md`](AGENTS.md) — Agent collaboration guide
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — System design

## 👥 Team

- **Backend Agent** — API development, AI integration, database
- **Frontend Agent** — UI/UX, interview interface, dashboards

---

Built with ❤️ for the Gemini Hackathon 2026
