# 🤖 AI Interview Agent - Hackathon Submission

Welcome to the **AI Interview Agent**, a fully autonomous, personalized technical interview platform. 

This project was built to satisfy the Hackathon Problem Statement by creating a highly dynamic AI interviewer that tests candidates based on their specific learning history and a rigorous 31-day AI engineering curriculum.

## 🚀 Key Features (Hackathon Requirements)

- **Unified API (`POST /api/interview`)**: A single, stateful conversational endpoint that handles the entire interview process. No authentication or login is required to access this API.
- **Candidate Personalization (`candidates.json`)**: Contains 20 unique mock candidate profiles. The AI actively reads the candidate's specific mission history (passed, failed, skipped) and progress statistics to tailor the interview to their weaknesses.
- **Dynamic Curriculum (`curriculum.json`)**: A complete 31-day, 8-module AI learning curriculum. The AI cross-references the candidate's profile against this curriculum (covering topics like RAG, LangChain, MCP, Docker, and Fine-Tuning) to generate highly technical, relevant questions.
- **Conversational Memory**: The backend maintains strict conversational state across multiple requests using a persistent `sessionId`.
- **Structured AI Feedback**: Once the AI determines the interview is complete, it outputs a strict JSON payload summarizing the candidate's performance, strengths, knowledge gaps, and recommended next steps.

## 🏗️ Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Python, FastAPI, Uvicorn |
| AI Engine | Gemini / Groq Multi-Fallback Orchestration |
| Knowledge Base | JSON (Candidates & Curriculum) |
| Frontend | React, Next.js, Tailwind CSS |
| Hosting | Custom VPS & Nginx Reverse Proxy |

## 📦 Run it Locally

### 1. Backend API
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```
*Access the Unified API at `http://localhost:8000/api/interview`*

### 2. Frontend UI
```bash
cd frontend
npm install
npm run dev -p 3001
```
*Access the Interview Dashboard at `http://localhost:3001`*

## 📋 Hackathon Verification Files
- [`PROMPTS.md`](PROMPTS.md) — Our complete AI Usage Log proving genuine vibe-coding.
- [`backend/docs/technical-spec.md`](backend/docs/technical-spec.md) — The API interface requirements.
- [`backend/data/candidates.json`](backend/data/candidates.json) — Candidate profiles database.
- [`backend/data/curriculum.json`](backend/data/curriculum.json) — 31-day curriculum database.

---
*Built for the Hackathon 2026. Ready for the Live Steer Challenge.*
