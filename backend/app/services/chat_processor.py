"""
Chat processor service: parses incoming chat messages using the modular VoteDetector engine,
manages poll votes, attendance, hand raises, quiz answers, and broadcasts real-time WebSocket events.
"""
import asyncio
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models import (
    ClassSession, Student, Poll, PollOption, PollVote,
    Quiz, QuizQuestion, QuizAnswer, Attendance, HandRaise,
    ActivityLog, PollStatus, QuizStatus
)
from app.connectors.base import ChatMessage
from app.services.vote_detector import default_vote_detector
from app.websocket.manager import manager


class ChatProcessor:
    """Processes live chat messages and triggers ClassPulse events."""

    def __init__(self, db_session_factory, vote_detector=None):
        self.db_session_factory = db_session_factory
        self.vote_detector = vote_detector or default_vote_detector

    async def process_message(self, msg: ChatMessage, session_id: int):
        """Route a chat message to appropriate handlers and broadcast real-time chat event."""
        text = msg.text.strip()
        text_lower = text.lower()

        async with self.db_session_factory() as db:
            student = await self._get_or_create_student(db, msg, session_id)

            # Get active poll to check valid keywords
            active_poll_keywords, active_poll = await self._get_active_poll_details(db, session_id)

            # Check if this text is a vote using modular VoteDetector
            detected_keyword = self.vote_detector.detect_vote(text, active_poll_keywords) if active_poll_keywords else None

            is_vote = False
            is_correct = None
            voted_keyword = None

            # Handle commands and events
            if text_lower.startswith("#present"):
                await self._handle_attendance(db, msg, student, session_id)
            elif text_lower.startswith("#hand"):
                await self._handle_hand_raise(db, msg, student, session_id)
            elif detected_keyword:
                voted = await self._handle_poll_vote(db, student, detected_keyword, session_id, active_poll)
                if voted:
                    is_vote = True
                    voted_keyword = detected_keyword
                    if active_poll and active_poll.correct_keyword:
                        is_correct = (detected_keyword.upper() == active_poll.correct_keyword.upper())
                else:
                    # If not voted in poll, check quiz answer
                    await self._handle_quiz_answer(db, student, detected_keyword, session_id, msg.timestamp)
            else:
                # Check for single char fallback if quiz is active
                fallback_kw = self.vote_detector.detect_vote(text, ["A", "B", "C", "D", "1", "2", "3", "4"])
                if fallback_kw:
                    await self._handle_quiz_answer(db, student, fallback_kw, session_id, msg.timestamp)

            # Broadcast raw live chat message feed event to all WebSocket clients
            await manager.broadcast(
                "chat_message",
                {
                    "message_id": msg.message_id,
                    "author_id": msg.author_id,
                    "author_name": msg.author_name,
                    "author_avatar": msg.author_avatar,
                    "text": msg.text,
                    "timestamp": msg.timestamp.isoformat() if hasattr(msg.timestamp, 'isoformat') else str(msg.timestamp),
                    "is_vote": is_vote,
                    "voted_keyword": voted_keyword,
                    "is_correct": is_correct
                },
                session_id
            )

            await db.commit()

    async def _get_active_poll_details(self, db: AsyncSession, session_id: int) -> tuple[List[str], Optional[Poll]]:
        """Fetch active poll and its available option keywords."""
        result = await db.execute(
            select(Poll).where(
                and_(
                    Poll.session_id == session_id,
                    Poll.status == PollStatus.active
                )
            )
        )
        poll = result.scalar_one_or_none()
        if not poll:
            return [], None

        opts_result = await db.execute(
            select(PollOption).where(PollOption.poll_id == poll.id)
        )
        options = opts_result.scalars().all()
        keywords = [o.keyword.upper() for o in options]
        return keywords, poll

    async def _get_or_create_student(
        self,
        db: AsyncSession,
        msg: ChatMessage,
        session_id: int
    ) -> Student:
        """Get existing student or create a new one."""
        result = await db.execute(
            select(Student).where(
                and_(
                    Student.session_id == session_id,
                    Student.channel_id == msg.author_id
                )
            )
        )
        student = result.scalar_one_or_none()

        if student is None:
            student = Student(
                session_id=session_id,
                channel_id=msg.author_id,
                display_name=msg.author_name,
                avatar_url=msg.author_avatar,
                first_seen=msg.timestamp,
                last_seen=msg.timestamp
            )
            db.add(student)
            await db.flush()

            await self._log_activity(
                db, session_id, "new_student",
                f"{msg.author_name} joined the class",
                msg.author_name
            )
            await manager.broadcast(
                "new_student",
                {"student_id": student.id, "name": msg.author_name, "avatar": msg.author_avatar},
                session_id
            )
        else:
            student.last_seen = msg.timestamp
            if msg.author_avatar:
                student.avatar_url = msg.author_avatar

        return student

    async def _handle_attendance(
        self, db: AsyncSession, msg: ChatMessage,
        student: Student, session_id: int
    ):
        """Mark student as present."""
        existing = await db.execute(
            select(Attendance).where(
                and_(
                    Attendance.session_id == session_id,
                    Attendance.student_id == student.id
                )
            )
        )
        if existing.scalar_one_or_none():
            return

        attendance = Attendance(
            session_id=session_id,
            student_id=student.id,
            marked_at=msg.timestamp,
            message=msg.text
        )
        db.add(attendance)

        await self._log_activity(
            db, session_id, "attendance",
            f"{student.display_name} marked present",
            student.display_name
        )
        await manager.broadcast(
            "attendance_marked",
            {"student_id": student.id, "name": student.display_name},
            session_id
        )

    async def _handle_hand_raise(
        self, db: AsyncSession, msg: ChatMessage,
        student: Student, session_id: int
    ):
        """Add student to hand raise queue."""
        hand_raise = HandRaise(
            session_id=session_id,
            student_id=student.id,
            message=msg.text,
            raised_at=msg.timestamp
        )
        db.add(hand_raise)

        await self._log_activity(
            db, session_id, "hand_raise",
            f"{student.display_name} raised their hand",
            student.display_name
        )
        await manager.broadcast(
            "hand_raised",
            {"student_id": student.id, "name": student.display_name, "message": msg.text},
            session_id
        )

    async def _handle_poll_vote(
        self, db: AsyncSession, student: Student,
        answer_keyword: str, session_id: int, poll: Optional[Poll] = None
    ) -> bool:
        """Handle a poll vote with duplicate vote check and real-time broadcasting."""
        if poll is None:
            result = await db.execute(
                select(Poll).where(
                    and_(
                        Poll.session_id == session_id,
                        Poll.status == PollStatus.active
                    )
                )
            )
            poll = result.scalar_one_or_none()

        if poll is None:
            return False

        # Find matching option by keyword
        result = await db.execute(
            select(PollOption).where(
                and_(
                    PollOption.poll_id == poll.id,
                    PollOption.keyword == answer_keyword.upper()
                )
            )
        )
        option = result.scalar_one_or_none()
        if option is None:
            return False

        # Check if answer is correct if correct_keyword is configured
        is_correct = None
        if poll.correct_keyword:
            is_correct = (answer_keyword.upper() == poll.correct_keyword.upper())

        # Check existing vote
        result = await db.execute(
            select(PollVote).where(
                and_(
                    PollVote.poll_id == poll.id,
                    PollVote.student_id == student.id
                )
            )
        )
        existing_vote = result.scalar_one_or_none()

        if existing_vote:
            if not poll.allow_vote_change:
                return True
            # Change vote from previous option
            if existing_vote.option_id != option.id:
                old_option_result = await db.execute(
                    select(PollOption).where(PollOption.id == existing_vote.option_id)
                )
                old_option = old_option_result.scalar_one_or_none()
                if old_option:
                    old_option.vote_count = max(0, old_option.vote_count - 1)
                    # Deduct score if old vote was correct in a correct-answer poll
                    if poll.correct_keyword and old_option.keyword.upper() == poll.correct_keyword.upper():
                        student.score = max(0, student.score - 1)

                existing_vote.option_id = option.id
                option.vote_count += 1

                # Award score if new vote is correct in a correct-answer poll
                if poll.correct_keyword and is_correct:
                    student.score += 1
        else:
            # First vote
            vote = PollVote(
                poll_id=poll.id,
                option_id=option.id,
                student_id=student.id
            )
            db.add(vote)
            option.vote_count += 1
            poll.total_votes += 1
            student.poll_participations += 1

            # Leaderboard Score Logic:
            # 1. Opinion poll (no correct_keyword): participation awards +1 point
            # 2. Correct answer poll (correct_keyword set): correct answer awards +1 point
            if not poll.correct_keyword:
                student.score += 1
            elif is_correct:
                student.score += 1

        await db.flush()

        # Log activity
        await self._log_activity(
            db, session_id, "poll_vote",
            f"{student.display_name} voted for Option {answer_keyword.upper()}",
            student.display_name,
            {"poll_id": poll.id, "option_keyword": answer_keyword.upper(), "is_correct": is_correct}
        )

        # Broadcast updated options & votes
        results = await db.execute(
            select(PollOption).where(PollOption.poll_id == poll.id).order_by(PollOption.id)
        )
        options_list = results.scalars().all()

        await manager.broadcast(
            "poll_vote",
            {
                "poll_id": poll.id,
                "student_id": student.id,
                "student_name": student.display_name,
                "student_avatar": student.avatar_url,
                "option_keyword": answer_keyword.upper(),
                "is_correct": is_correct,
                "options": [
                    {"id": o.id, "keyword": o.keyword, "text": o.text, "vote_count": o.vote_count}
                    for o in options_list
                ],
                "total_votes": poll.total_votes
            },
            session_id
        )
        return True

    async def _handle_quiz_answer(
        self, db: AsyncSession, student: Student,
        answer: str, session_id: int, timestamp: datetime
    ):
        """Handle quiz answer."""
        result = await db.execute(
            select(Quiz).where(
                and_(
                    Quiz.session_id == session_id,
                    Quiz.status == QuizStatus.active
                )
            )
        )
        quiz = result.scalar_one_or_none()
        if quiz is None:
            return

        result = await db.execute(
            select(QuizQuestion).where(
                and_(
                    QuizQuestion.quiz_id == quiz.id,
                    QuizQuestion.is_active == True
                )
            )
        )
        question = result.scalar_one_or_none()
        if question is None:
            return

        result = await db.execute(
            select(QuizAnswer).where(
                and_(
                    QuizAnswer.question_id == question.id,
                    QuizAnswer.student_id == student.id
                )
            )
        )
        if result.scalar_one_or_none():
            return

        is_correct = answer.upper() == question.correct_answer.upper()
        response_time_ms = None
        points = 0
        if question.started_at and is_correct:
            response_time_ms = int((timestamp - question.started_at).total_seconds() * 1000)
            points = quiz.points_per_correct
            if quiz.speed_bonus and response_time_ms < 5000:
                bonus = int(points * 0.5 * (1 - response_time_ms / 5000))
                points += bonus

        quiz_answer = QuizAnswer(
            quiz_id=quiz.id,
            question_id=question.id,
            student_id=student.id,
            answer=answer,
            is_correct=is_correct,
            response_time_ms=response_time_ms,
            points_earned=points
        )
        db.add(quiz_answer)

        if is_correct:
            student.quiz_score += points
            student.score += points

            await self._log_activity(
                db, session_id, "quiz_correct",
                f"{student.display_name} answered correctly! +{points} pts",
                student.display_name,
                {"points": points, "response_time_ms": response_time_ms}
            )

        await manager.broadcast(
            "quiz_answer",
            {
                "student_id": student.id,
                "name": student.display_name,
                "answer": answer,
                "is_correct": is_correct,
                "points": points,
                "response_time_ms": response_time_ms
            },
            session_id
        )

    async def _log_activity(
        self, db: AsyncSession, session_id: int,
        event_type: str, description: str,
        student_name: str = None, metadata: dict = None
    ):
        """Log an activity event."""
        import json as _json
        log = ActivityLog(
            session_id=session_id,
            event_type=event_type,
            description=description,
            student_name=student_name,
            metadata_json=_json.dumps(metadata) if metadata else None
        )
        db.add(log)

        await manager.broadcast(
            "activity",
            {
                "event_type": event_type,
                "description": description,
                "student_name": student_name,
                "timestamp": datetime.utcnow().isoformat()
            },
            session_id
        )
