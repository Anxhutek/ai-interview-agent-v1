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
        A2[Candidate Profile & Uploads]
        A3[Admin Dashboard]
        A4[API Client]
    end

    subgraph Backend
        B[FastAPI Server]
        B1[Interview Router]
        B2[Auth Router]
        B3[Profile Router]
        B4[Proctoring Router]
        B5[Admin Router]
        B6[Health Router]
        B7[Breeth API Service]
        B8[Session / Curriculum Service]
        B9[Security / Auth Service]
    end

    subgraph Storage
        C[SQLite Database]
        D[Local File Storage (/uploads)]
    end

    A4 -->|HTTP REST| B
    B1 --> B8
    B2 --> B9
    B3 --> D
    B4 --> C
    B5 --> B8
    B7 --> C
    B8 --> C
    B9 --> C
```

---

## Data Models

### User
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| email | string | Unique email address |
| password_hash | string | Bcrypt hashed password |
| full_name | string | Candidate/Admin full name |
| role | string | candidate / admin |
| target_role | string | Candidate target role |
| profile_picture_url | string | URL path to avatar image |
| resume_url | string | URL path to PDF/DOCX resume |
| created_at | datetime | Creation timestamp |

### InterviewSession
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique session identifier |
| user_id | UUID (FK) | Foreign key to User.id |
| candidate_id | string | External or user candidate ID |
| candidate_name | string | Candidate display name |
| role | string | Target job role |
| domain | string | Technical domain |
| difficulty | string | easy / medium / hard |
| status | string | active / completed |
| turn_count | int | Current interview turn count |
| current_question | text | Active question text |
| is_finished | boolean | Session completion status |
| proctoring_score | float | Proctoring score (0-100) |
| integrity_status | string | clean / flagged |
| created_at | datetime | Creation timestamp |

### ProctoringLog
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique log identifier |
| session_id | UUID (FK) | Foreign key to InterviewSession.id |
| event_type | string | gaze_off_screen / multiple_faces / face_missing |
| severity | string | warning / critical |
| timestamp | datetime | Incident timestamp |

### InterviewTurn
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique turn identifier |
| session_id | UUID (FK) | Foreign key to InterviewSession.id |
| turn_index | int | Zero-based turn index |
| question_text | text | Question text |
| answer_text | text | Candidate's answer |
| breeth_episode_id | string | Episode ID from Breeth memory API |
| created_at | datetime | Turn timestamp |

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
