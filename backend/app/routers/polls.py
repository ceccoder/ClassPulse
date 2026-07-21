"""
Polls router.
"""
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Poll, PollOption, PollStatus
from app.schemas.schemas import PollCreate, PollUpdate, PollOut
from app.websocket.manager import manager

router = APIRouter()


@router.post("/", response_model=PollOut)
async def create_poll(data: PollCreate, db: AsyncSession = Depends(get_db)):
    poll = Poll(
        session_id=data.session_id,
        question=data.question,
        allow_vote_change=data.allow_vote_change,
        status=PollStatus.draft
    )
    db.add(poll)
    await db.flush()

    for opt in data.options:
        option = PollOption(
            poll_id=poll.id,
            text=opt.text,
            keyword=opt.keyword.upper()
        )
        db.add(option)

    await db.flush()
    await db.refresh(poll)

    result = await db.execute(
        select(Poll)
        .options(selectinload(Poll.options))
        .where(Poll.id == poll.id)
    )
    return result.scalar_one()


@router.get("/session/{session_id}", response_model=List[PollOut])
async def get_polls_by_session(session_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Poll)
        .options(selectinload(Poll.options))
        .where(Poll.session_id == session_id)
        .order_by(desc(Poll.created_at))
    )
    return result.scalars().all()


@router.get("/{poll_id}", response_model=PollOut)
async def get_poll(poll_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Poll)
        .options(selectinload(Poll.options))
        .where(Poll.id == poll_id)
    )
    poll = result.scalar_one_or_none()
    if not poll:
        raise HTTPException(404, "Poll not found")
    return poll


@router.post("/{poll_id}/start", response_model=PollOut)
async def start_poll(poll_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Poll)
        .options(selectinload(Poll.options))
        .where(Poll.id == poll_id)
    )
    poll = result.scalar_one_or_none()
    if not poll:
        raise HTTPException(404, "Poll not found")

    # End any other active polls in same session
    active_result = await db.execute(
        select(Poll)
        .options(selectinload(Poll.options))
        .where(Poll.session_id == poll.session_id, Poll.status == PollStatus.active)
    )
    for active_poll in active_result.scalars().all():
        if active_poll.id != poll_id:
            active_poll.status = PollStatus.ended
            active_poll.ended_at = datetime.utcnow()

    poll.status = PollStatus.active
    poll.started_at = datetime.utcnow()
    await db.flush()

    await manager.broadcast(
        "poll_started",
        {"poll_id": poll.id, "question": poll.question,
         "options": [{"keyword": o.keyword, "text": o.text} for o in poll.options]},
        poll.session_id
    )
    return poll


@router.post("/{poll_id}/pause", response_model=PollOut)
async def pause_poll(poll_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Poll).options(selectinload(Poll.options)).where(Poll.id == poll_id)
    )
    poll = result.scalar_one_or_none()
    if not poll:
        raise HTTPException(404, "Poll not found")
    poll.status = PollStatus.paused
    await db.flush()
    await manager.broadcast("poll_paused", {"poll_id": poll.id}, poll.session_id)
    return poll


@router.post("/{poll_id}/resume", response_model=PollOut)
async def resume_poll(poll_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Poll).options(selectinload(Poll.options)).where(Poll.id == poll_id)
    )
    poll = result.scalar_one_or_none()
    if not poll:
        raise HTTPException(404, "Poll not found")
    poll.status = PollStatus.active
    await db.flush()
    await manager.broadcast("poll_resumed", {"poll_id": poll.id}, poll.session_id)
    return poll


@router.post("/{poll_id}/end", response_model=PollOut)
async def end_poll(poll_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Poll).options(selectinload(Poll.options)).where(Poll.id == poll_id)
    )
    poll = result.scalar_one_or_none()
    if not poll:
        raise HTTPException(404, "Poll not found")
    poll.status = PollStatus.ended
    poll.ended_at = datetime.utcnow()
    await db.flush()
    await manager.broadcast("poll_ended", {"poll_id": poll.id}, poll.session_id)
    return poll


@router.post("/{poll_id}/reset", response_model=PollOut)
async def reset_poll(poll_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Poll).options(selectinload(Poll.options)).where(Poll.id == poll_id)
    )
    poll = result.scalar_one_or_none()
    if not poll:
        raise HTTPException(404, "Poll not found")

    poll.status = PollStatus.draft
    poll.total_votes = 0
    poll.started_at = None
    poll.ended_at = None

    for opt in poll.options:
        opt.vote_count = 0

    # Delete all votes
    from app.models import PollVote
    from sqlalchemy import delete as sa_delete
    await db.execute(sa_delete(PollVote).where(PollVote.poll_id == poll_id))
    await db.flush()

    await manager.broadcast("poll_reset", {"poll_id": poll.id}, poll.session_id)
    return poll


@router.delete("/{poll_id}")
async def delete_poll(poll_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Poll).where(Poll.id == poll_id))
    poll = result.scalar_one_or_none()
    if not poll:
        raise HTTPException(404, "Poll not found")
    await db.delete(poll)
    return {"status": "deleted"}


@router.get("/{poll_id}/voters")
async def get_poll_voters(poll_id: int, db: AsyncSession = Depends(get_db)):
    """Get list of voters categorized by option for a poll."""
    from app.models import PollVote, PollOption, Student
    result = await db.execute(
        select(PollVote, PollOption, Student)
        .join(PollOption, PollVote.option_id == PollOption.id)
        .join(Student, PollVote.student_id == Student.id)
        .where(PollVote.poll_id == poll_id)
    )
    voters_data = []
    for vote, option, student in result.all():
        voters_data.append({
            "vote_id": vote.id,
            "option_id": option.id,
            "option_keyword": option.keyword,
            "option_text": option.text,
            "student_id": student.id,
            "student_name": student.display_name,
            "student_avatar": student.avatar_url,
            "voted_at": vote.created_at.isoformat() if vote.created_at else None
        })
    return voters_data
