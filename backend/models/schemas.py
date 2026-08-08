from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from datetime import datetime

# Start Interview
class InterviewStartRequest(BaseModel):
    candidateId: str
    candidateName: str
    userId: Optional[str] = None

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

# Auth Schemas
class UserRegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    target_role: Optional[str] = None
    role: Optional[str] = "candidate"  # "candidate" or "admin"

class UserLoginRequest(BaseModel):
    email: str
    password: str

class UserProfileResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    target_role: Optional[str] = None
    profile_picture_url: Optional[str] = None
    resume_url: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfileResponse

# Profile Schemas
class AvatarUploadResponse(BaseModel):
    profile_picture_url: str
    message: str

class ResumeUploadResponse(BaseModel):
    resume_url: str
    extracted_text: Optional[str] = None
    message: str

# Proctoring Schemas
class ProctorEventRequest(BaseModel):
    session_id: str
    event_type: str  # e.g., "gaze_off_screen", "multiple_faces", "face_missing"
    severity: str = "warning"  # "warning", "critical"

class ProctoringLogSchema(BaseModel):
    id: str
    event_type: str
    severity: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)

class ProctorEventResponse(BaseModel):
    id: str
    session_id: str
    event_type: str
    severity: str
    timestamp: datetime
    proctoring_score: float
    integrity_status: str

# Admin Schemas
class CandidateSummary(BaseModel):
    id: str
    email: str
    full_name: str
    target_role: Optional[str] = None
    profile_picture_url: Optional[str] = None
    resume_url: Optional[str] = None
    created_at: datetime
    total_sessions: int
    avg_score: float
    integrity_status: str

class PaginatedCandidatesResponse(BaseModel):
    candidates: List[CandidateSummary]
    total: int
    page: int
    limit: int

class TurnSchema(BaseModel):
    id: str
    turn_index: int
    question_text: str
    answer_text: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AdminSessionDetailResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    candidate_name: Optional[str] = None
    role: Optional[str] = None
    status: str
    proctoring_score: float
    integrity_status: str
    created_at: datetime
    turns: List[TurnSchema]
    score_breakdown: Optional[dict] = None
    distilled_profile: Optional[str] = None
    proctoring_logs: List[ProctoringLogSchema]

class AdminAnalyticsResponse(BaseModel):
    total_candidates: int
    total_interviews_completed: int
    average_system_score: float
    flagged_sessions_count: int

# AI Evaluation Architecture Schemas
class EvaluationScoresSchema(BaseModel):
    technical_correctness: int = Field(default=0, ge=0, le=100)
    problem_solving: int = Field(default=0, ge=0, le=100)
    system_design: int = Field(default=0, ge=0, le=100)
    architecture: int = Field(default=0, ge=0, le=100)
    communication: int = Field(default=0, ge=0, le=100)
    depth: int = Field(default=0, ge=0, le=100)
    tradeoffs: int = Field(default=0, ge=0, le=100)
    relevance: int = Field(default=0, ge=0, le=100)
    completeness: int = Field(default=0, ge=0, le=100)

class EvaluationResultSchema(BaseModel):
    scores: EvaluationScoresSchema
    overall_score: float = Field(default=0.0, ge=0.0, le=100.0)
    verdict: str = "satisfactory"  # "strong", "satisfactory", "needs_improvement", "weak"
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    missing_points: List[str] = Field(default_factory=list)
    technical_feedback: str = ""
    communication_feedback: str = ""
    improvement_suggestions: List[str] = Field(default_factory=list)

class AnswerSubmissionRequest(BaseModel):
    answer_text: str

class AnswerSubmissionResponse(BaseModel):
    success: bool = True
    answer_id: str
    evaluation_status: str = "queued"  # "queued", "pending", "completed"

class EvaluationStatusResponse(BaseModel):
    status: str  # "pending", "processing", "completed", "failed"
    evaluation: Optional[EvaluationResultSchema] = None

class APIErrorDetail(BaseModel):
    code: str
    message: str

class APIErrorResponse(BaseModel):
    success: bool = False
    error: APIErrorDetail

class AIHealthResponse(BaseModel):
    providers: dict
    models: List[dict]
    timestamp: datetime


