"""
Attendance router.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Attendance, HandRaise, Student
from app.schemas.schemas import AttendanceOut, HandRaiseOut

router = APIRouter()


@router.get("/session/{session_id}", response_model=List[AttendanceOut])
async def get_attendance(session_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Attendance)
        .options(selectinload(Attendance.student))
        .where(Attendance.session_id == session_id)
        .order_by(desc(Attendance.marked_at))
    )
    return result.scalars().all()


@router.get("/session/{session_id}/count")
async def get_attendance_count(session_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Attendance).where(Attendance.session_id == session_id)
    )
    records = result.scalars().all()
    return {"count": len(records), "session_id": session_id}


@router.get("/session/{session_id}/handraises", response_model=List[HandRaiseOut])
async def get_hand_raises(
    session_id: int,
    acknowledged: bool = None,
    db: AsyncSession = Depends(get_db)
):
    q = (
        select(HandRaise)
        .options(selectinload(HandRaise.student))
        .where(HandRaise.session_id == session_id)
        .order_by(HandRaise.raised_at)
    )
    if acknowledged is not None:
        q = q.where(HandRaise.acknowledged == acknowledged)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/handraises/{raise_id}/acknowledge", response_model=HandRaiseOut)
async def acknowledge_hand_raise(raise_id: int, db: AsyncSession = Depends(get_db)):
    from datetime import datetime
    result = await db.execute(
        select(HandRaise)
        .options(selectinload(HandRaise.student))
        .where(HandRaise.id == raise_id)
    )
    hand_raise = result.scalar_one_or_none()
    if not hand_raise:
        raise HTTPException(404, "Hand raise not found")

    hand_raise.acknowledged = True
    hand_raise.acknowledged_at = datetime.utcnow()
    await db.flush()
    return hand_raise


@router.delete("/handraises/{raise_id}")
async def delete_hand_raise(raise_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(HandRaise).where(HandRaise.id == raise_id))
    hr = result.scalar_one_or_none()
    if not hr:
        raise HTTPException(404, "Hand raise not found")
    await db.delete(hr)
    return {"status": "deleted"}
