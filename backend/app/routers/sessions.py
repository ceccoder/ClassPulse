"""
Sessions router.
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.models import ClassSession, SessionStatus
from app.schemas.schemas import SessionCreate, SessionUpdate, SessionOut
from app.services.polling import polling_service
from app.connectors.youtube import YouTubeConnector

router = APIRouter()


@router.post("/", response_model=SessionOut)
async def create_session(data: SessionCreate, db: AsyncSession = Depends(get_db)):
    session = ClassSession(
        title=data.title,
        platform=data.platform,
        stream_id=data.stream_id,
        status=SessionStatus.active
    )
    db.add(session)
    await db.flush()
    await db.refresh(session)
    session.is_polling = polling_service.is_polling(session.id)
    return session


@router.get("/", response_model=List[SessionOut])
async def list_sessions(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    q = select(ClassSession).order_by(desc(ClassSession.created_at))
    if status:
        q = q.where(ClassSession.status == status)
    result = await db.execute(q)
    sessions = result.scalars().all()
    for s in sessions:
        s.is_polling = polling_service.is_polling(s.id)
    return sessions


@router.get("/active", response_model=Optional[SessionOut])
async def get_active_session(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ClassSession)
        .where(ClassSession.status == SessionStatus.active)
        .order_by(desc(ClassSession.created_at))
        .limit(1)
    )
    session = result.scalar_one_or_none()
    if session:
        session.is_polling = polling_service.is_polling(session.id)
    return session


@router.get("/{session_id}", response_model=SessionOut)
async def get_session(session_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ClassSession).where(ClassSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")
    session.is_polling = polling_service.is_polling(session.id)
    return session


@router.patch("/{session_id}", response_model=SessionOut)
async def update_session(
    session_id: int,
    data: SessionUpdate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(ClassSession).where(ClassSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")

    if data.title is not None:
        session.title = data.title
    if data.status is not None:
        session.status = data.status
        if data.status == SessionStatus.ended:
            session.ended_at = datetime.utcnow()
            await polling_service.stop_polling(session_id)
    if data.stream_id is not None:
        session.stream_id = data.stream_id
    if data.live_chat_id is not None:
        session.live_chat_id = data.live_chat_id

    await db.flush()
    await db.refresh(session)
    session.is_polling = polling_service.is_polling(session.id)
    return session


@router.post("/{session_id}/start-polling")
async def start_polling(session_id: int, db: AsyncSession = Depends(get_db)):
    """Start polling YouTube chat for a session."""
    from app.models import AppSettings
    result = await db.execute(select(ClassSession).where(ClassSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")

    # Get API key from settings
    api_key_result = await db.execute(
        select(AppSettings).where(AppSettings.key == "youtube_api_key")
    )
    api_key_setting = api_key_result.scalar_one_or_none()
    api_key = api_key_setting.value if api_key_setting else ""

    live_chat_id = session.live_chat_id
    if not live_chat_id and session.stream_id and api_key:
        connector = YouTubeConnector({"api_key": api_key})
        live_chat_id = await connector.get_live_chat_id(session.stream_id)
        if live_chat_id:
            session.live_chat_id = live_chat_id
            await db.flush()

    if not live_chat_id:
        raise HTTPException(400, "No live chat ID available. Set YouTube API key and stream ID.")

    await polling_service.start_polling(session_id, session.platform, live_chat_id, api_key)
    return {"status": "polling_started", "live_chat_id": live_chat_id}


@router.post("/{session_id}/stop-polling")
async def stop_polling(session_id: int):
    """Stop polling for a session."""
    await polling_service.stop_polling(session_id)
    return {"status": "polling_stopped"}


@router.delete("/{session_id}")
async def delete_session(session_id: int, db: AsyncSession = Depends(get_db)):
    await polling_service.stop_polling(session_id)
    result = await db.execute(select(ClassSession).where(ClassSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")
    await db.delete(session)
    return {"status": "deleted"}
