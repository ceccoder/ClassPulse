"""
Analytics router.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.database import get_db
from app.models import Student, Poll, PollVote, ActivityLog, Attendance, HandRaise

router = APIRouter()


@router.get("/session/{session_id}/overview")
async def get_session_overview(session_id: int, db: AsyncSession = Depends(get_db)):
    """Comprehensive analytics overview for a session."""
    # Students
    students_q = await db.execute(
        select(func.count(Student.id)).where(Student.session_id == session_id)
    )
    total_students = students_q.scalar() or 0

    # Present
    att_q = await db.execute(
        select(func.count(Attendance.id)).where(Attendance.session_id == session_id)
    )
    present = att_q.scalar() or 0

    # Polls
    polls_q = await db.execute(
        select(Poll).where(Poll.session_id == session_id)
    )
    polls = polls_q.scalars().all()

    # Hand raises
    hand_q = await db.execute(
        select(func.count(HandRaise.id)).where(HandRaise.session_id == session_id)
    )
    hand_count = hand_q.scalar() or 0

    # Activity timeline (last 50 events)
    activity_q = await db.execute(
        select(ActivityLog)
        .where(ActivityLog.session_id == session_id)
        .order_by(desc(ActivityLog.created_at))
        .limit(50)
    )
    activities = activity_q.scalars().all()

    # Top students
    top_q = await db.execute(
        select(Student)
        .where(Student.session_id == session_id)
        .order_by(desc(Student.score))
        .limit(10)
    )
    top_students = top_q.scalars().all()

    # Engagement rate
    engagement = (present / total_students * 100) if total_students > 0 else 0

    # Poll summary
    poll_summary = []
    for poll in polls:
        from sqlalchemy.orm import selectinload
        from app.models import PollOption
        opts_q = await db.execute(
            select(PollOption).where(PollOption.poll_id == poll.id)
        )
        opts = opts_q.scalars().all()
        poll_summary.append({
            "id": poll.id,
            "question": poll.question,
            "status": poll.status,
            "total_votes": poll.total_votes,
            "options": [
                {"keyword": o.keyword, "text": o.text, "votes": o.vote_count}
                for o in opts
            ]
        })

    return {
        "total_students": total_students,
        "present_count": present,
        "engagement_rate": round(engagement, 1),
        "poll_count": len(polls),
        "hand_raises": hand_count,
        "polls": poll_summary,
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
        ],
        "activity_timeline": [
            {
                "id": a.id,
                "event_type": a.event_type,
                "description": a.description,
                "student_name": a.student_name,
                "created_at": a.created_at.isoformat()
            }
            for a in reversed(activities)
        ]
    }
