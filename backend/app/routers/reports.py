"""
Reports router with CSV export.
"""
import csv
import io
from datetime import datetime
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import (
    ClassSession, Student, Poll, PollOption, PollVote,
    Attendance, HandRaise, Quiz, QuizAnswer
)

router = APIRouter()


@router.get("/session/{session_id}/attendance/csv")
async def export_attendance_csv(session_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Attendance)
        .options(selectinload(Attendance.student))
        .where(Attendance.session_id == session_id)
        .order_by(Attendance.marked_at)
    )
    records = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Student Name", "Channel ID", "Marked At"])
    for r in records:
        writer.writerow([
            r.student.display_name if r.student else "",
            r.student.channel_id if r.student else "",
            r.marked_at.isoformat()
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.read()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=attendance_session_{session_id}.csv"}
    )


@router.get("/session/{session_id}/leaderboard/csv")
async def export_leaderboard_csv(session_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Student)
        .where(Student.session_id == session_id)
        .order_by(desc(Student.score))
    )
    students = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Rank", "Name", "Total Score", "Quiz Score", "Poll Participations", "First Seen"])
    for i, s in enumerate(students, 1):
        writer.writerow([
            i, s.display_name, s.score, s.quiz_score,
            s.poll_participations, s.first_seen.isoformat()
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.read()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=leaderboard_session_{session_id}.csv"}
    )


@router.get("/session/{session_id}/polls/csv")
async def export_polls_csv(session_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Poll)
        .options(selectinload(Poll.options))
        .where(Poll.session_id == session_id)
        .order_by(Poll.created_at)
    )
    polls = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Poll ID", "Question", "Status", "Option", "Keyword", "Votes", "Total Votes"])
    for poll in polls:
        for opt in poll.options:
            writer.writerow([
                poll.id, poll.question, poll.status,
                opt.text, opt.keyword, opt.vote_count, poll.total_votes
            ])

    output.seek(0)
    return StreamingResponse(
        iter([output.read()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=polls_session_{session_id}.csv"}
    )


@router.get("/session/{session_id}/quiz/csv")
async def export_quiz_csv(session_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(QuizAnswer, Student)
        .join(Student, QuizAnswer.student_id == Student.id)
        .where(Student.session_id == session_id)
    )
    rows = result.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Student", "Answer", "Correct", "Points", "Response Time (ms)", "Timestamp"])
    for answer, student in rows:
        writer.writerow([
            student.display_name, answer.answer,
            answer.is_correct, answer.points_earned,
            answer.response_time_ms, answer.answered_at.isoformat()
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.read()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=quiz_session_{session_id}.csv"}
    )


@router.get("/session/{session_id}/summary")
async def get_session_summary(session_id: int, db: AsyncSession = Depends(get_db)):
    """Full session summary for reports page."""
    session_q = await db.execute(select(ClassSession).where(ClassSession.id == session_id))
    session = session_q.scalar_one_or_none()

    students_q = await db.execute(
        select(Student)
        .where(Student.session_id == session_id)
        .order_by(desc(Student.score))
    )
    students = students_q.scalars().all()

    polls_q = await db.execute(
        select(Poll)
        .options(selectinload(Poll.options))
        .where(Poll.session_id == session_id)
    )
    polls = polls_q.scalars().all()

    att_q = await db.execute(
        select(Attendance).where(Attendance.session_id == session_id)
    )
    attendance = att_q.scalars().all()

    return {
        "session": {
            "id": session.id,
            "title": session.title,
            "platform": session.platform,
            "status": session.status,
            "created_at": session.created_at.isoformat(),
            "ended_at": session.ended_at.isoformat() if session.ended_at else None
        } if session else None,
        "student_count": len(students),
        "present_count": len(attendance),
        "poll_count": len(polls),
        "top_students": [
            {"name": s.display_name, "score": s.score, "quiz_score": s.quiz_score}
            for s in students[:10]
        ],
        "polls": [
            {
                "question": p.question,
                "total_votes": p.total_votes,
                "options": [
                    {"keyword": o.keyword, "text": o.text, "votes": o.vote_count}
                    for o in p.options
                ]
            }
            for p in polls
        ]
    }
