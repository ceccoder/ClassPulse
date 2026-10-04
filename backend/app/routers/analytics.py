"""
Analytics router: detailed engagement metrics, responses per minute,
correct/incorrect vote breakdowns, and activity timeline.
"""
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Student, Poll, PollOption, PollVote, ActivityLog, Attendance, HandRaise

router = APIRouter()


@router.get("/session/{session_id}/overview")
async def get_session_overview(session_id: int, db: AsyncSession = Depends(get_db)):
    """Comprehensive analytics overview for a session."""
    # Total students
    students_q = await db.execute(
        select(func.count(Student.id)).where(Student.session_id == session_id)
    )
    total_students = students_q.scalar() or 0

    # Present count
    att_q = await db.execute(
        select(func.count(Attendance.id)).where(Attendance.session_id == session_id)
    )
    present = att_q.scalar() or 0

    # Polls
    polls_q = await db.execute(
        select(Poll)
        .options(selectinload(Poll.options), selectinload(Poll.votes))
        .where(Poll.session_id == session_id)
        .order_by(desc(Poll.created_at))
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

    # Poll analytics summary
    poll_summary = []
    total_votes_across_polls = 0
    now = datetime.utcnow()
    one_min_ago = now - timedelta(minutes=1)

    for poll in polls:
        total_votes_across_polls += poll.total_votes
        correct_count = 0
        incorrect_count = 0

        # Calculate responses per minute for this poll
        votes_last_min = 0
        vote_timeline_map = {}

        for vote in poll.votes:
            if vote.voted_at >= one_min_ago:
                votes_last_min += 1

            # Option matching
            opt = next((o for o in poll.options if o.id == vote.option_id), None)
            if opt and poll.correct_keyword:
                if opt.keyword.upper() == poll.correct_keyword.upper():
                    correct_count += 1
                else:
                    incorrect_count += 1

            # Timeline grouping by 30-second interval
            if vote.voted_at:
                bucket = vote.voted_at.strftime("%H:%M:%S")
                vote_timeline_map[bucket] = vote_timeline_map.get(bucket, 0) + 1

        poll_summary.append({
            "id": poll.id,
            "question": poll.question,
            "status": poll.status,
            "total_votes": poll.total_votes,
            "correct_keyword": poll.correct_keyword,
            "duration_seconds": poll.duration_seconds,
            "correct_count": correct_count,
            "incorrect_count": incorrect_count,
            "responses_per_minute": votes_last_min,
            "options": [
                {"keyword": o.keyword, "text": o.text, "votes": o.vote_count}
                for o in poll.options
            ],
            "timeline": [
                {"time": k, "count": v} for k, v in sorted(vote_timeline_map.items())
            ]
        })

    return {
        "total_students": total_students,
        "present_count": present,
        "engagement_rate": round(engagement, 1),
        "poll_count": len(polls),
        "total_votes": total_votes_across_polls,
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
