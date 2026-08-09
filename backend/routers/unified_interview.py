import json
import os
import uuid
from typing import Dict, Optional, Any, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.curriculum_router import CurriculumRouter

router = APIRouter(tags=["unified_interview"])

# In-memory session store (per the hackathon technical spec)
session_store: Dict[str, Dict[str, Any]] = {}


class UnifiedInterviewRequest(BaseModel):
    sessionId: Optional[str] = None
    candidateId: str
    message: Optional[str] = None


class UnifiedInterviewResponse(BaseModel):
    sessionId: str
    reply: str
    done: bool
    feedback: Optional[Dict[str, Any]] = None


def load_candidate(candidate_id: str) -> Dict[str, Any]:
    path = os.path.join(os.path.dirname(__file__), "..", "data", "candidates.json")
    try:
        with open(path, "r", encoding="utf-8") as f:
            candidates = json.load(f)
            for c in candidates:
                if str(c.get("id", "")).lower() == str(candidate_id).lower():
                    return c
    except Exception:
        pass
    return {"id": candidate_id, "name": "Candidate", "mission_history": []}


@router.post("/api/interview", response_model=UnifiedInterviewResponse)
async def unified_interview(data: UnifiedInterviewRequest):
    """
    Unified interview endpoint per hackathon spec (POST /api/interview).
    - No authentication required.
    - Session-based: first call starts, subsequent calls continue.
    - Returns done=True with feedback at the end.
    """
    session_id = data.sessionId
    is_new_session = not session_id or session_id not in session_store

    if is_new_session:
        session_id = session_id or str(uuid.uuid4())
        candidate = load_candidate(data.candidateId)
        curriculum_router = CurriculumRouter()
        session_store[session_id] = {
            "candidate": candidate,
            "router": curriculum_router,
            "turn_index": 0,
            "is_done": False,
            "turn_scores": [],
        }
        first_question = curriculum_router.get_initial_question()
        greeting = (
            f"Hello {candidate.get('name', 'Candidate')}! "
            f"Welcome to your AI Technical Interview for the {candidate.get('role', 'Software Engineer')} role. "
            f"I will be asking you 8 structured questions covering key engineering topics. "
            f"Let us begin!\n\n{first_question}"
        )
        return UnifiedInterviewResponse(sessionId=session_id, reply=greeting, done=False)

    session_data = session_store[session_id]

    if session_data.get("is_done"):
        raise HTTPException(status_code=400, detail="Interview already completed for this session.")

    message = data.message or ""
    router_obj: CurriculumRouter = session_data["router"]
    turn_index = session_data["turn_index"]

    if not message.strip():
        if turn_index < len(router_obj.curriculum):
            return UnifiedInterviewResponse(
                sessionId=session_id,
                reply="Please provide your answer to continue. " + router_obj.curriculum[turn_index]["question"],
                done=False
            )

    reply, is_finished, evaluation = router_obj.process_turn(
        turn_index=turn_index,
        candidate_message=message,
        historical_evaluations=session_data.get("turn_scores", [])
    )

    session_data["turn_scores"].append(evaluation)
    session_data["turn_index"] = turn_index + 1

    if is_finished:
        session_data["is_done"] = True
        all_strengths: List[str] = []
        all_gaps: List[str] = []
        for ts in session_data["turn_scores"]:
            all_strengths.extend(ts.get("strengths", []))
            all_gaps.extend(ts.get("improvements", []))

        avg_score = router_obj.get_average_score()
        candidate = session_data["candidate"]

        if avg_score >= 75:
            status = "Strong Candidate"
        elif avg_score >= 55:
            status = "Proficient Candidate"
        elif avg_score >= 40:
            status = "Developing Candidate"
        else:
            status = "Needs Improvement"

        feedback = {
            "summary": (
                f"{candidate.get('name', 'Candidate')} completed all 8 technical modules "
                f"with an average score of {avg_score}/100. Status: {status}."
            ),
            "strengths": list(dict.fromkeys(all_strengths))[:5],
            "gaps": list(dict.fromkeys(all_gaps))[:5],
            "next": [
                "Review topics where score was low",
                "Practice system design problems",
                "Study distributed systems fundamentals"
            ],
            "score": round(avg_score, 1),
            "status": status
        }

        return UnifiedInterviewResponse(sessionId=session_id, reply=reply, done=True, feedback=feedback)

    return UnifiedInterviewResponse(sessionId=session_id, reply=reply, done=False)
