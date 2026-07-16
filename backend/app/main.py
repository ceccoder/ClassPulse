"""
ClassPulse FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import init_db
from app.routers import (
    sessions, polls, quiz, attendance,
    leaderboard, analytics, reports,
    settings_router, activity
)
from app.websocket.manager import ws_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    await init_db()
    yield


app = FastAPI(
    title="ClassPulse API",
    description="Teacher dashboard for live online classes",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(sessions.router, prefix="/api/sessions", tags=["Sessions"])
app.include_router(polls.router, prefix="/api/polls", tags=["Polls"])
app.include_router(quiz.router, prefix="/api/quiz", tags=["Quiz"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(leaderboard.router, prefix="/api/leaderboard", tags=["Leaderboard"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(settings_router.router, prefix="/api/settings", tags=["Settings"])
app.include_router(activity.router, prefix="/api/activity", tags=["Activity"])
app.include_router(ws_router)


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "ClassPulse API"}
