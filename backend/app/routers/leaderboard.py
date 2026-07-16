"""
Leaderboard router.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.models import Student
from app.schemas.schemas import StudentOut

router = APIRouter()


@router.get("/session/{session_id}", response_model=List[StudentOut])
async def get_leaderboard(
    session_id: int,
    limit: int = 20,
    sort_by: str = "score",
    db: AsyncSession = Depends(get_db)
):
    """Get student leaderboard for a session."""
    sort_column = {
        "score": Student.score,
        "quiz_score": Student.quiz_score,
        "polls": Student.poll_participations
    }.get(sort_by, Student.score)

    result = await db.execute(
        select(Student)
        .where(Student.session_id == session_id)
        .order_by(desc(sort_column))
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/session/{session_id}/stats")
async def get_session_stats(session_id: int, db: AsyncSession = Depends(get_db)):
    """Get overall session statistics."""
    from app.models import Poll, Attendance, HandRaise, ActivityLog
    from sqlalchemy import func

    # Student count
    students_result = await db.execute(
        select(func.count(Student.id)).where(Student.session_id == session_id)
    )
    total_students = students_result.scalar() or 0

    # Attendance count
    att_result = await db.execute(
        select(func.count(Attendance.id)).where(Attendance.session_id == session_id)
    )
    present_count = att_result.scalar() or 0

    # Poll count
    poll_result = await db.execute(
        select(func.count(Poll.id)).where(Poll.session_id == session_id)
    )
    poll_count = poll_result.scalar() or 0

    # Hand raises
    hand_result = await db.execute(
        select(func.count(HandRaise.id)).where(HandRaise.session_id == session_id)
    )
    hand_count = hand_result.scalar() or 0

    # Top 5 students
    top_result = await db.execute(
        select(Student)
        .where(Student.session_id == session_id)
        .order_by(desc(Student.score))
        .limit(5)
    )
    top_students = top_result.scalars().all()

    return {
        "total_students": total_students,
        "present_count": present_count,
        "poll_count": poll_count,
        "hand_raises": hand_count,
        "top_students": [
            {
                "id": s.id,
                "name": s.display_name,
                "score": s.score,
                "quiz_score": s.quiz_score,
                "poll_participations": s.poll_participations,
                "avatar_url": s.avatar_url
            }
            for s in top_students
        ]
    }
