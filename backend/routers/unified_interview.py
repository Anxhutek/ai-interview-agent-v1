import json
import os
import uuid
from typing import Dict, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import get_db, get_ai_orchestrator
from services.ai.ai_orchestrator import AIOrchestrator

router = APIRouter(tags=['unified_interview'])

# In-memory storage for session context for the hackathon (so we don't have to overhaul the DB schema for now)
session_store: Dict[str, Dict[str, Any]] = {}

class UnifiedInterviewRequest(BaseModel):
    sessionId: str
    candidateId: str
    message: str

class UnifiedInterviewResponse(BaseModel):
    reply: str
    done: bool
    feedback: Optional[Dict[str, Any]] = None

def load_candidate(candidate_id: str):
    path = os.path.join(os.path.dirname(__file__), '..', 'data', 'candidates.json')
    try:
        with open(path, 'r', encoding='utf-8') as f:
            candidates = json.load(f)
            for c in candidates:
                if c['id'] == candidate_id:
                    return c
    except Exception:
        pass
    return None

def load_curriculum():
    path = os.path.join(os.path.dirname(__file__), '..', 'data', 'curriculum.json')
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        pass
    return {}

SYSTEM_PROMPT = """You are an expert AI technical interviewer.
You are interviewing a candidate for an AI Engineering role based on a 31-day AI learning curriculum.
You must adapt your questions based on their mission history (e.g., if they failed or skipped a mission, probe those concepts; if they passed, ask deeper questions).
Ask ONE technical question at a time. Do not answer it for them.
Maintain the conversation, ask follow-ups, and evaluate their responses.
When you feel you have gathered enough information to assess their skills (e.g., after 3-5 exchanges), you MUST end the interview by outputting exactly the word "<DONE>" followed by a JSON object containing the feedback.

Output format for concluding:
<DONE>
{{
    "summary": "...",
    "strengths": ["...", "..."],
    "gaps": ["...", "..."],
    "next": ["..."]
}}

Candidate Profile:
{candidate_profile}

Curriculum Modules:
{curriculum}
"""

@router.post('/api/interview', response_model=UnifiedInterviewResponse)
async def unified_interview(
    data: UnifiedInterviewRequest,
    orchestrator: AIOrchestrator = Depends(get_ai_orchestrator)
):
    session_id = data.sessionId
    if not session_id:
        session_id = str(uuid.uuid4())

    if session_id not in session_store:
        candidate = load_candidate(data.candidateId)
        if not candidate:
            candidate = {"id": data.candidateId, "name": "Unknown Candidate", "mission_history": []}
        
        curriculum = load_curriculum()
        
        sys_prompt = SYSTEM_PROMPT.format(
            candidate_profile=json.dumps(candidate, indent=2),
            curriculum=json.dumps(curriculum, indent=2)
        )
        
        session_store[session_id] = {
            "candidate": candidate,
            "history": [
                {"role": "system", "content": sys_prompt}
            ],
            "turn_count": 0
        }
    
    session_data = session_store[session_id]
    history = session_data["history"]
    
    # Append user message
    history.append({"role": "user", "content": data.message})
    session_data["turn_count"] += 1

    # Call AI Orchestrator
    try:
        # Assuming orchestrator.generate_text supports history or we can just stringify it
        # AIOrchestrator in this codebase usually takes prompt and system_prompt.
        # Let's flatten the history for the orchestrator.
        prompt = "\n".join([f"{msg['role'].upper()}: {msg['content']}" for msg in history])
        
        # We use a wrapper system prompt to instruct the AI
        ai_response, provider, model, latency = await orchestrator.generate_with_fallback(
            prompt=prompt,
            system_instruction="You are an AI interviewer. Respond to the USER.",
            temperature=0.7
        )
        
        history.append({"role": "assistant", "content": ai_response})
        
        # Check if AI finished the interview
        if "<DONE>" in ai_response:
            parts = ai_response.split("<DONE>")
            reply = parts[0].strip()
            feedback_str = parts[1].strip()
            
            # Clean JSON if necessary
            feedback_str = feedback_str.replace("```json", "").replace("```", "").strip()
            
            try:
                feedback = json.loads(feedback_str)
            except Exception:
                feedback = {
                    "summary": "Interview completed but feedback parsing failed.",
                    "strengths": [],
                    "gaps": [],
                    "next": []
                }
                
            return UnifiedInterviewResponse(reply=reply, done=True, feedback=feedback)
            
        return UnifiedInterviewResponse(reply=ai_response, done=False)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
