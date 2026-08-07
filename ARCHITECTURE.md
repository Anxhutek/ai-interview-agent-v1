# 🏗️ ARCHITECTURE.md — AI Interview Agent

> System architecture and design specifications.

---

## System Overview

The AI Interview Agent is a full-stack application that conducts mock technical interviews powered by AI. It generates contextual questions based on the user's target role/domain, evaluates their answers in real-time, and provides detailed feedback with scoring.

---

## Architecture

```mermaid
graph TD
    subgraph Frontend
        A[React/Next.js App]
        A1[Interview UI]
        A2[Results Dashboard]
        A3[API Client]
    end

    subgraph Backend
        B[FastAPI Server]
        B1[Session Router]
        B2[Question Router]
        B3[Health Router]
        B4[AI Service - Breeth API]
        B5[Evaluation Service]
        B6[Session Service]
    end

    subgraph Storage
        C[SQLite Database]
        D[Redis Cache]
    end

    A3 -->|HTTP/WS| B
    B1 --> B6
    B2 --> B4
    B1 --> B5
    B5 --> B4
    B6 --> C
    B6 --> D
```

---

## Data Models

### InterviewSession
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique session identifier |
| role | string | Target job role |
| domain | string | Interview domain |
| difficulty | enum | easy/medium/hard |
| status | enum | pending/active/completed |
| created_at | datetime | Session creation time |

### Question
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique question identifier |
| session_id | UUID | FK to InterviewSession |
| text | string | Question content |
| category | string | Question category |
| difficulty | enum | easy/medium/hard |
| order | int | Display order |

### Answer
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique answer identifier |
| question_id | UUID | FK to Question |
| answer_text | string | User's response |
| score | float | AI-evaluated score (0-100) |
| feedback | string | AI-generated feedback |
| evaluated_at | datetime | Evaluation timestamp |

---

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend Framework | FastAPI | Async support, auto-docs, type safety |
| AI Provider | Breeth API | Hackathon-provided API key |
| Database (Dev) | SQLite | Zero config, portable |
| ORM | SQLAlchemy + SQLModel | FastAPI integration, type safety |
| Testing | pytest + httpx | Async test support |
| API Format | REST JSON | Simple, well-understood |

---
