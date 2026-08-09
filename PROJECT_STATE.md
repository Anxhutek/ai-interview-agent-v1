# 📊 PROJECT STATE — The Interview Agent (Because HR Was Too Forgiving)

> **Status:** Active Development (Hackathon)
> **Branch:** `master`

---

## 🏗️ System Architecture (Or How We Trap Candidates)

```text
┌─────────────────────────────────┐      ┌───────────────────────────────┐
│     FastAPI Backend Router      │◀────▶│       Breeth Memory API       │
│  (Session & Multi-Turn flows    │      │  (Intent-Aware Distillation   │
│   where we mock your answers)   │      │    where we judge your soul)  │
└─────────────────────────────────┘      └───────────────────────────────┘
```

---

## 📡 API Contracts (Break These And We Fail The Build)

### Base URL: `http://localhost:8000` (or `http://168.144.189.164` when deploying to production on a Friday)

| Method | Endpoint | Request Body | Response Schema | Status |
|--------|----------|--------------|-----------------|--------|
| `POST` | `/api/interview/start` | `{ "candidateId": "string", "candidateName": "string" }` | `{ "sessionId": "string", "firstQuestion": "string" }` | 🟢 Active |
| `POST` | `/api/interview/message` | `{ "sessionId": "string", "message": "string" }` | `{ "reply": "string", "isFinished": false }` | 🟢 Active |
| `GET`  | `/api/interview/feedback` | `?sessionId=abc` | `{ "feedback": "string", "score": 85, "distilledProfile": "string" }` | 🟢 Active |
| `GET`  | `/health` | - | `{ "status": "ok", "version": "0.1.0" }` | 🟢 Active (barely) |

---

## 🧠 Breeth API Memory Layer Integration (The Sentient Observer)

The application integrates exclusively with the Breeth memory layer (now properly secured using environment variables instead of hardcoded keys, thank you very much) to store candidate responses and extract traits, decisions, and distilled profiles of incompetence.

### 1. Base URL & Authentication
- **Base URL**: `https://api.thebreeth.com`
- **Headers**:
  ```http
  Authorization: Bearer <BREETH_API_KEY_FROM_ENV_NOT_HARDCODED>
  Content-Type: application/json
  ```

### 2. Ingesting Interview Turns (Episodes of Despair)
Whenever a candidate replies to a question, the turn is logged as a prose episode:
- **Endpoint**: `POST /v1/episodes`
- **Request Body**:
  ```json
  {
    "content": "Candidate (John Doe) answered question about async programming: 'I prefer async/await because it reduces tail latency and handles I/O bottlenecks effectively.'",
    "group_id": "candidate_john_doe",
    "source_description": "interview_turn",
    "extract_intent": true
  }
  ```
- **Description**: Setting `extract_intent: true` enables Breeth to perform synchronous/asynchronous trait extraction, essentially connecting your nervous stammering to your underlying lack of knowledge.

### 3. Retrieving Distilled Profiles & Facts (The Final Judgment)
At the end of the interview or during evaluation, the system lazy-loads the distilled profile narrative and extracted entities:
- **Endpoint**: `GET /v1/graph/nodes/{name}/details` (URL-encoded name, e.g., `/v1/graph/nodes/John%20Doe/details`)
- **Response Shape**:
  ```json
  {
    "entity": {
      "uuid": "a7b1...",
      "name": "John Doe",
      "summary": "Candidate showing backend leaning with focus on async performance.",
      "knot_narrative": "John Doe exhibits consistent preference for tail-latency optimizations and structured error handling. Bet on async Rust for production loads.",
      "knot_score": 85.0
    },
    "neighbors": [
      {
        "peer": "Async Rust",
        "direction": "out",
        "fact": "John Doe prefers async Rust over Go for I/O-heavy loads",
        "intent_meta": {
          "edge_kind": "preference",
          "cognitive_pattern": "cost-vs-quality tradeoff",
          "why_connected": "Tail latency optimization is preferred over development velocity."
        }
      }
    ]
  }
  ```
- **Integration**: The `knot_narrative` maps to the `distilledProfile` in the feedback endpoint response. We then laugh at it.

### 4. Hybrid Search over Candidate Graph (Stalking Features)
To query candidate traits or specific question answers programmatically:
- **Endpoint**: `POST /v1/search`
- **Request Body**:
  ```json
  {
    "query": "What are John Doe's preferences on backend databases?",
    "group_id": "candidate_john_doe",
    "limit": 5
  }
  ```
- **Response**: Returns a ranked list of edges with attribution and intent metadata, so we can prove you lied on your resume.
