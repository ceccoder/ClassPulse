"""
Pydantic schemas for ClassPulse API.
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# ─── Session Schemas ───────────────────────────────────────────────────────────

class SessionCreate(BaseModel):
    title: str
    platform: str = "youtube"
    stream_id: Optional[str] = None

class SessionUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    stream_id: Optional[str] = None
    live_chat_id: Optional[str] = None

class SessionOut(BaseModel):
    id: int
    title: str
    platform: str
    stream_id: Optional[str]
    live_chat_id: Optional[str]
    status: str
    created_at: datetime
    ended_at: Optional[datetime]
    is_polling: bool = False

    model_config = {"from_attributes": True}


# ─── Student Schemas ───────────────────────────────────────────────────────────

class StudentOut(BaseModel):
    id: int
    session_id: int
    channel_id: str
    display_name: str
    avatar_url: Optional[str]
    score: int
    quiz_score: int
    poll_participations: int
    first_seen: datetime
    last_seen: datetime

    model_config = {"from_attributes": True}


# ─── Poll Schemas ──────────────────────────────────────────────────────────────

class PollOptionCreate(BaseModel):
    text: str
    keyword: str

class PollOptionOut(BaseModel):
    id: int
    poll_id: int
    text: str
    keyword: str
    vote_count: int

    model_config = {"from_attributes": True}

class PollCreate(BaseModel):
    session_id: int
    question: str
    options: List[PollOptionCreate]
    allow_vote_change: bool = True

class PollUpdate(BaseModel):
    question: Optional[str] = None
    status: Optional[str] = None
    allow_vote_change: Optional[bool] = None

class PollOut(BaseModel):
    id: int
    session_id: int
    question: str
    status: str
    allow_vote_change: bool
    total_votes: int
    created_at: datetime
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    options: List[PollOptionOut] = []

    model_config = {"from_attributes": True}


# ─── Quiz Schemas ──────────────────────────────────────────────────────────────

class QuizQuestionCreate(BaseModel):
    question: str
    correct_answer: str
    options: List[str]  # Will be serialized to JSON
    order: int = 0

class QuizQuestionOut(BaseModel):
    id: int
    quiz_id: int
    question: str
    correct_answer: str
    options: List[str]
    order: int
    is_active: bool
    started_at: Optional[datetime]

    model_config = {"from_attributes": True}

class QuizCreate(BaseModel):
    session_id: int
    title: str
    time_limit_seconds: Optional[int] = 30
    points_per_correct: int = 10
    speed_bonus: bool = True
    questions: List[QuizQuestionCreate] = []

class QuizOut(BaseModel):
    id: int
    session_id: int
    title: str
    status: str
    time_limit_seconds: Optional[int]
    points_per_correct: int
    speed_bonus: bool
    created_at: datetime
    questions: List[QuizQuestionOut] = []

    model_config = {"from_attributes": True}

class QuizAnswerOut(BaseModel):
    id: int
    student_id: int
    answer: str
    is_correct: bool
    response_time_ms: Optional[int]
    points_earned: int
    answered_at: datetime

    model_config = {"from_attributes": True}


# ─── Attendance Schemas ────────────────────────────────────────────────────────

class AttendanceOut(BaseModel):
    id: int
    session_id: int
    student_id: int
    marked_at: datetime
    message: Optional[str]
    student: Optional[StudentOut] = None

    model_config = {"from_attributes": True}


# ─── HandRaise Schemas ─────────────────────────────────────────────────────────

class HandRaiseOut(BaseModel):
    id: int
    session_id: int
    student_id: int
    message: Optional[str]
    raised_at: datetime
    acknowledged: bool
    acknowledged_at: Optional[datetime]
    student: Optional[StudentOut] = None

    model_config = {"from_attributes": True}


# ─── Activity Schemas ──────────────────────────────────────────────────────────

class ActivityLogOut(BaseModel):
    id: int
    session_id: int
    event_type: str
    description: str
    student_name: Optional[str]
    metadata_json: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Analytics Schemas ─────────────────────────────────────────────────────────

class AnalyticsSummary(BaseModel):
    total_students: int
    present_count: int
    poll_count: int
    quiz_count: int
    total_messages: int
    avg_engagement: float
    top_students: List[StudentOut]
    activity_timeline: List[Dict[str, Any]]


# ─── Settings Schemas ──────────────────────────────────────────────────────────

class SettingUpdate(BaseModel):
    key: str
    value: str

class SettingsOut(BaseModel):
    key: str
    value: str
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── WebSocket Event ───────────────────────────────────────────────────────────

class WSEvent(BaseModel):
    event: str
    data: Dict[str, Any]
    session_id: Optional[int] = None
