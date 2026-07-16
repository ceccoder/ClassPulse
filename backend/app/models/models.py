"""
SQLAlchemy ORM models for ClassPulse.
"""
from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    String, Integer, Float, Boolean, DateTime,
    ForeignKey, Text, Enum as SAEnum
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import enum


class SessionStatus(str, enum.Enum):
    active = "active"
    paused = "paused"
    ended = "ended"


class PollStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    paused = "paused"
    ended = "ended"


class QuizStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    ended = "ended"


class ClassSession(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    platform: Mapped[str] = mapped_column(String(50), default="youtube")
    stream_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    live_chat_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[SessionStatus] = mapped_column(
        SAEnum(SessionStatus), default=SessionStatus.active
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    students: Mapped[List["Student"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    polls: Mapped[List["Poll"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    quizzes: Mapped[List["Quiz"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    attendance_records: Mapped[List["Attendance"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    hand_raises: Mapped[List["HandRaise"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    activity_logs: Mapped[List["ActivityLog"]] = relationship(back_populates="session", cascade="all, delete-orphan")


class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("sessions.id"), nullable=False)
    channel_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    score: Mapped[int] = mapped_column(Integer, default=0)
    quiz_score: Mapped[int] = mapped_column(Integer, default=0)
    poll_participations: Mapped[int] = mapped_column(Integer, default=0)
    first_seen: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_seen: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    session: Mapped["ClassSession"] = relationship(back_populates="students")
    poll_votes: Mapped[List["PollVote"]] = relationship(back_populates="student", cascade="all, delete-orphan")
    quiz_answers: Mapped[List["QuizAnswer"]] = relationship(back_populates="student", cascade="all, delete-orphan")
    attendance: Mapped[Optional["Attendance"]] = relationship(back_populates="student", uselist=False)


class Poll(Base):
    __tablename__ = "polls"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("sessions.id"), nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[PollStatus] = mapped_column(SAEnum(PollStatus), default=PollStatus.draft)
    allow_vote_change: Mapped[bool] = mapped_column(Boolean, default=True)
    total_votes: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    session: Mapped["ClassSession"] = relationship(back_populates="polls")
    options: Mapped[List["PollOption"]] = relationship(back_populates="poll", cascade="all, delete-orphan", order_by="PollOption.id")
    votes: Mapped[List["PollVote"]] = relationship(back_populates="poll", cascade="all, delete-orphan")


class PollOption(Base):
    __tablename__ = "poll_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    poll_id: Mapped[int] = mapped_column(Integer, ForeignKey("polls.id"), nullable=False)
    text: Mapped[str] = mapped_column(String(500), nullable=False)
    keyword: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., "A", "B", "1", "2"
    vote_count: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    poll: Mapped["Poll"] = relationship(back_populates="options")
    votes: Mapped[List["PollVote"]] = relationship(back_populates="option", cascade="all, delete-orphan")


class PollVote(Base):
    __tablename__ = "poll_votes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    poll_id: Mapped[int] = mapped_column(Integer, ForeignKey("polls.id"), nullable=False)
    option_id: Mapped[int] = mapped_column(Integer, ForeignKey("poll_options.id"), nullable=False)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("students.id"), nullable=False)
    voted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    poll: Mapped["Poll"] = relationship(back_populates="votes")
    option: Mapped["PollOption"] = relationship(back_populates="votes")
    student: Mapped["Student"] = relationship(back_populates="poll_votes")


class Quiz(Base):
    __tablename__ = "quizzes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("sessions.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[QuizStatus] = mapped_column(SAEnum(QuizStatus), default=QuizStatus.draft)
    time_limit_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    points_per_correct: Mapped[int] = mapped_column(Integer, default=10)
    speed_bonus: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    session: Mapped["ClassSession"] = relationship(back_populates="quizzes")
    questions: Mapped[List["QuizQuestion"]] = relationship(back_populates="quiz", cascade="all, delete-orphan", order_by="QuizQuestion.order")
    answers: Mapped[List["QuizAnswer"]] = relationship(back_populates="quiz", cascade="all, delete-orphan")


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    quiz_id: Mapped[int] = mapped_column(Integer, ForeignKey("quizzes.id"), nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    correct_answer: Mapped[str] = mapped_column(String(100), nullable=False)
    options: Mapped[str] = mapped_column(Text, nullable=False)  # JSON string
    order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    quiz: Mapped["Quiz"] = relationship(back_populates="questions")
    answers: Mapped[List["QuizAnswer"]] = relationship(back_populates="question", cascade="all, delete-orphan")


class QuizAnswer(Base):
    __tablename__ = "quiz_answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    quiz_id: Mapped[int] = mapped_column(Integer, ForeignKey("quizzes.id"), nullable=False)
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("quiz_questions.id"), nullable=False)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("students.id"), nullable=False)
    answer: Mapped[str] = mapped_column(String(100), nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    response_time_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    points_earned: Mapped[int] = mapped_column(Integer, default=0)
    answered_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    quiz: Mapped["Quiz"] = relationship(back_populates="answers")
    question: Mapped["QuizQuestion"] = relationship(back_populates="answers")
    student: Mapped["Student"] = relationship(back_populates="quiz_answers")


class Attendance(Base):
    __tablename__ = "attendance"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("sessions.id"), nullable=False)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("students.id"), nullable=False)
    marked_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    message: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Relationships
    session: Mapped["ClassSession"] = relationship(back_populates="attendance_records")
    student: Mapped["Student"] = relationship(back_populates="attendance")


class HandRaise(Base):
    __tablename__ = "hand_raises"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("sessions.id"), nullable=False)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("students.id"), nullable=False)
    message: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    raised_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    session: Mapped["ClassSession"] = relationship(back_populates="hand_raises")
    student: Mapped["Student"] = relationship()


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("sessions.id"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    student_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    metadata_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    session: Mapped["ClassSession"] = relationship(back_populates="activity_logs")


class AppSettings(Base):
    __tablename__ = "app_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
