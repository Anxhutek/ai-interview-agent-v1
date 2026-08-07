# 🏛️ System Architecture Specification

This document details the system design, file structure, API interfaces, and memory layer abstractions of **The Interview Agent**.

---

## 🏗️ Structural Overview

```
ai-interview-agent-v1/
├── backend/                    # FastAPI backend router (to be bootstrapped)
└── frontend/                   # Next.js 16 Web App
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx      # App wrapper with Outfit/Inter typography & SEO tags
    │   │   ├── page.tsx        # Stateful multi-stage interview wizard component
    │   │   └── globals.css     # Tailwind v4 configuration, theme tokens, glassmorphism CSS
    │   ├── hooks/
    │   │   └── useInterview.ts # State hook managing session storage, chat log state, typing triggers
    │   └── lib/
    │       └── api.ts          # Fetch client mapped to endpoints with mock offline fallbacks
    ├── package.json            # Target manifest (React 19, Next 16, Tailwind v4)
    └── tsconfig.json           # Type resolution configurations
```

---

## 📡 API Layer Details

The frontend connects to `http://localhost:8080` (customizable via `NEXT_PUBLIC_API_URL`) using the following payloads:

### `/api/interview/start`
- **Method:** `POST`
- **Request:**
  ```typescript
  interface StartRequest {
    candidateId: string;
    candidateName: string;
    curriculum?: string;
  }
  ```
- **Response:**
  ```typescript
  interface StartResponse {
    sessionId: string;
    firstQuestion: string;
  }
  ```

### `/api/interview/message`
- **Method:** `POST`
- **Request:**
  ```typescript
  interface MessageRequest {
    sessionId: string;
    message: string;
  }
  ```
- **Response:**
  ```typescript
  interface MessageResponse {
    reply: string;
    isFinished: boolean;
  }
  ```

### `/api/interview/feedback`
- **Method:** `GET`
- **Query Params:** `?sessionId=<session-id>`
- **Response:**
  ```typescript
  interface FeedbackResponse {
    feedback: string;
    score: number;
    distilledProfile: string;
    graph?: {
      entity: {
        uuid: string;
        name: string;
        summary: string;
        knot_narrative: string;
        knot_score: number;
      };
      neighbors: Array<{
        peer: string;
        direction: string;
        fact: string;
        intent_meta: {
          edge_kind: string;
          cognitive_pattern: string;
          why_connected: string;
        };
      }>;
    };
  }
  ```

---

## 🧠 Memory Graph Inspector Schema

The results dashboard renders the `CandidateGraph` structure:
1. **Central Entity Node:** Represents the Candidate profile knot narrative and overall score.
2. **Neighbor Nodes:** Represent specific cognitive patterns, target tool selections, or developers' traits mapped back to candidate actions.
3. **Inspector Drawer:** Displays selected neighbor metadata (extrapolated fact, intent category, and logical inference reasons) dynamically when clicked.
