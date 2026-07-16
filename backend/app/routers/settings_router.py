"""
Settings router.
"""
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import AppSettings
from app.schemas.schemas import SettingUpdate, SettingsOut

router = APIRouter()

DEFAULT_SETTINGS = {
    "youtube_api_key": "",
    "default_platform": "youtube",
    "poll_vote_keyword_mode": "letter",  # 'letter' or 'number'
    "theme": "dark",
    "show_student_avatars": "true",
    "leaderboard_limit": "10",
    "quiz_default_time_limit": "30",
    "quiz_speed_bonus": "true",
}


@router.get("/", response_model=List[SettingsOut])
async def get_all_settings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AppSettings))
    settings = result.scalars().all()

    # Add any missing defaults
    existing_keys = {s.key for s in settings}
    new_settings = []
    for key, value in DEFAULT_SETTINGS.items():
        if key not in existing_keys:
            s = AppSettings(key=key, value=value)
            db.add(s)
            new_settings.append(s)

    if new_settings:
        await db.flush()
        result = await db.execute(select(AppSettings))
        settings = result.scalars().all()

    return settings


@router.get("/{key}")
async def get_setting(key: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AppSettings).where(AppSettings.key == key))
    setting = result.scalar_one_or_none()
    if not setting:
        default = DEFAULT_SETTINGS.get(key, "")
        s = AppSettings(key=key, value=default)
        db.add(s)
        await db.flush()
        return {"key": key, "value": default}
    return {"key": setting.key, "value": setting.value}


@router.put("/{key}")
async def update_setting(key: str, data: SettingUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AppSettings).where(AppSettings.key == key))
    setting = result.scalar_one_or_none()
    if setting:
        setting.value = data.value
        setting.updated_at = datetime.utcnow()
    else:
        setting = AppSettings(key=key, value=data.value)
        db.add(setting)
    await db.flush()
    return {"key": key, "value": data.value}


@router.post("/bulk")
async def bulk_update_settings(
    updates: List[SettingUpdate],
    db: AsyncSession = Depends(get_db)
):
    """Update multiple settings at once."""
    result = await db.execute(select(AppSettings))
    existing = {s.key: s for s in result.scalars().all()}

    for update in updates:
        if update.key in existing:
            existing[update.key].value = update.value
            existing[update.key].updated_at = datetime.utcnow()
        else:
            s = AppSettings(key=update.key, value=update.value)
            db.add(s)

    await db.flush()
    return {"status": "updated", "count": len(updates)}
