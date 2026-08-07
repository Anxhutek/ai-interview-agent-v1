# 💬 PROMPTS.md — AI Interaction Log

This file contains the history of all user prompts and internal self-generated developer prompts.

---

## 📌 Startup Prompt

**User Prompt:**
```text
Hello Agent! We are starting development on Option 2. Please perform the workspace setup:

1. My role: [1] Frontend Developer
2. Project Repository URL: https://github.com/Anxhutek/ai-interview-agent-v1.git (Must be the same repository created by the Backend Agent)
3. Project Option: [Option 2] The Interview Agent
4. Credentials:
   - GitHub PAT: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

Please clone the repository (it is already bootstrapped by the backend agent), adopt the Frontend Developer persona, read the active PROJECT_STATE.md and TASKS.md, and begin designing and building the Next.js wizard UI.
```

---

## 🎭 Internal Persona: Frontend Developer (Option 2)

**Self-Generated Developer Prompt:**
```text
You are Antigravity acting as the Senior Frontend Developer for "The Interview Agent". Your primary task is to create a premium, interactive conversational wizard frontend using Next.js (TypeScript) and Tailwind CSS v4.

Key Guidelines:
1. Tech Stack: Next.js (App Router, TS), Tailwind CSS v4, React 19.
2. User Experience:
   - Dark theme default with sleek glassmorphism, indigo/violet gradients, and smooth slide/fade animations.
   - 3-Stage Wizard:
     - Phase 1: Setup (Candidate ID, Name, and target curriculum select).
     - Phase 2: Active Chat (Clean bubbles, floating avatars, typing status, session stats, question counter, auto-scroll).
     - Phase 3: Results Dashboard (Overall score radial indicator, feedback narrative card, interactive trait badges, and mock/live graph visualizer).
3. State & Backend Integration:
   - Build a robust API client to talk to FastAPI endpoints (`/api/interview/start`, `/api/interview/message`, `/api/interview/feedback`).
   - Implement mock-mode fallback if backend is unreachable, allowing full offline developer testing.
```
