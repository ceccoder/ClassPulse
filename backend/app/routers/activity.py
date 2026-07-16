"""
Activity feed router.
"""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.models import ActivityLog
from app.schemas.schemas import ActivityLogOut

router = APIRouter()


@router.get("/session/{session_id}", response_model=List[ActivityLogOut])
async def get_activity(
    session_id: int,
    limit: int = 50,
    event_type: str = None,
    db: AsyncSession = Depends(get_db)
):
    q = (
        select(ActivityLog)
        .where(ActivityLog.session_id == session_id)
        .order_by(desc(ActivityLog.created_at))
        .limit(limit)
    )
    if event_type:
        q = q.where(ActivityLog.event_type == event_type)

    result = await db.execute(q)
    return result.scalars().all()


@router.delete("/session/{session_id}")
async def clear_activity(session_id: int, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import delete as sa_delete
    await db.execute(sa_delete(ActivityLog).where(ActivityLog.session_id == session_id))
    return {"status": "cleared"}
