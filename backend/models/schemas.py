from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# Start Interview
class InterviewStartRequest(BaseModel):
    candidateId: str
    candidateName: str

class InterviewStartResponse(BaseModel):
    sessionId: str
    firstQuestion: str

# Message Interview
class InterviewMessageRequest(BaseModel):
    sessionId: str
    message: str

class InterviewMessageResponse(BaseModel):
    reply: str
    isFinished: bool

# Feedback Interview
class InterviewFeedbackResponse(BaseModel):
    feedback: str
    score: int
    distilledProfile: str

# Health Response
class HealthResponse(BaseModel):
    status: str
    version: str
    uptime_seconds: float
