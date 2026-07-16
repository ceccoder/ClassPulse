"""
Quiz router.
"""
import json
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Quiz, QuizQuestion, QuizAnswer, QuizStatus, Student
from app.schemas.schemas import QuizCreate, QuizOut, QuizQuestionOut
from app.websocket.manager import manager

router = APIRouter()


def _serialize_question(q: QuizQuestion) -> dict:
    return {
        "id": q.id,
        "quiz_id": q.quiz_id,
        "question": q.question,
        "correct_answer": q.correct_answer,
        "options": json.loads(q.options) if q.options else [],
        "order": q.order,
        "is_active": q.is_active,
        "started_at": q.started_at.isoformat() if q.started_at else None
    }


@router.post("/", response_model=QuizOut)
async def create_quiz(data: QuizCreate, db: AsyncSession = Depends(get_db)):
    quiz = Quiz(
        session_id=data.session_id,
        title=data.title,
        status=QuizStatus.draft,
        time_limit_seconds=data.time_limit_seconds,
        points_per_correct=data.points_per_correct,
        speed_bonus=data.speed_bonus
    )
    db.add(quiz)
    await db.flush()

    for i, q in enumerate(data.questions):
        question = QuizQuestion(
            quiz_id=quiz.id,
            question=q.question,
            correct_answer=q.correct_answer.upper(),
            options=json.dumps(q.options),
            order=q.order if q.order is not None else i
        )
        db.add(question)

    await db.flush()

    result = await db.execute(
        select(Quiz)
        .options(selectinload(Quiz.questions))
        .where(Quiz.id == quiz.id)
    )
    quiz_loaded = result.scalar_one()

    # Build response with parsed options
    quiz_dict = {
        "id": quiz_loaded.id,
        "session_id": quiz_loaded.session_id,
        "title": quiz_loaded.title,
        "status": quiz_loaded.status,
        "time_limit_seconds": quiz_loaded.time_limit_seconds,
        "points_per_correct": quiz_loaded.points_per_correct,
        "speed_bonus": quiz_loaded.speed_bonus,
        "created_at": quiz_loaded.created_at,
        "questions": [
            {**_serialize_question(q)}
            for q in sorted(quiz_loaded.questions, key=lambda x: x.order)
        ]
    }
    return quiz_dict


@router.get("/session/{session_id}", response_model=List[QuizOut])
async def get_quizzes_by_session(session_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Quiz)
        .options(selectinload(Quiz.questions))
        .where(Quiz.session_id == session_id)
        .order_by(desc(Quiz.created_at))
    )
    quizzes = result.scalars().all()
    return [
        {
            "id": q.id,
            "session_id": q.session_id,
            "title": q.title,
            "status": q.status,
            "time_limit_seconds": q.time_limit_seconds,
            "points_per_correct": q.points_per_correct,
            "speed_bonus": q.speed_bonus,
            "created_at": q.created_at,
            "questions": [_serialize_question(qq) for qq in sorted(q.questions, key=lambda x: x.order)]
        }
        for q in quizzes
    ]


@router.get("/{quiz_id}")
async def get_quiz(quiz_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Quiz).options(selectinload(Quiz.questions)).where(Quiz.id == quiz_id)
    )
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(404, "Quiz not found")
    return {
        "id": quiz.id,
        "session_id": quiz.session_id,
        "title": quiz.title,
        "status": quiz.status,
        "time_limit_seconds": quiz.time_limit_seconds,
        "points_per_correct": quiz.points_per_correct,
        "speed_bonus": quiz.speed_bonus,
        "created_at": quiz.created_at,
        "questions": [_serialize_question(q) for q in sorted(quiz.questions, key=lambda x: x.order)]
    }


@router.post("/{quiz_id}/start")
async def start_quiz(quiz_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Quiz).options(selectinload(Quiz.questions)).where(Quiz.id == quiz_id)
    )
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(404, "Quiz not found")
    quiz.status = QuizStatus.active
    await db.flush()
    await manager.broadcast("quiz_started", {"quiz_id": quiz.id, "title": quiz.title}, quiz.session_id)
    return {"status": "started", "quiz_id": quiz_id}


@router.post("/{quiz_id}/question/{question_id}/activate")
async def activate_question(
    quiz_id: int, question_id: int, db: AsyncSession = Depends(get_db)
):
    """Activate a specific question (deactivates others)."""
    result = await db.execute(
        select(Quiz).options(selectinload(Quiz.questions)).where(Quiz.id == quiz_id)
    )
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(404, "Quiz not found")

    # Deactivate all questions
    for q in quiz.questions:
        q.is_active = False

    # Activate target question
    target = next((q for q in quiz.questions if q.id == question_id), None)
    if not target:
        raise HTTPException(404, "Question not found")

    target.is_active = True
    target.started_at = datetime.utcnow()
    await db.flush()

    await manager.broadcast(
        "quiz_question_active",
        {
            "quiz_id": quiz_id,
            "question_id": question_id,
            "question": target.question,
            "options": json.loads(target.options),
            "time_limit": quiz.time_limit_seconds
        },
        quiz.session_id
    )
    return _serialize_question(target)


@router.post("/{quiz_id}/end")
async def end_quiz(quiz_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Quiz).options(selectinload(Quiz.questions)).where(Quiz.id == quiz_id)
    )
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(404, "Quiz not found")

    quiz.status = QuizStatus.ended
    for q in quiz.questions:
        q.is_active = False

    await db.flush()
    await manager.broadcast("quiz_ended", {"quiz_id": quiz_id}, quiz.session_id)
    return {"status": "ended"}


@router.get("/{quiz_id}/leaderboard")
async def quiz_leaderboard(quiz_id: int, db: AsyncSession = Depends(get_db)):
    """Get quiz-specific leaderboard."""
    result = await db.execute(
        select(QuizAnswer, Student)
        .join(Student, QuizAnswer.student_id == Student.id)
        .where(QuizAnswer.quiz_id == quiz_id)
    )
    rows = result.all()

    # Aggregate by student
    student_scores = {}
    for answer, student in rows:
        sid = student.id
        if sid not in student_scores:
            student_scores[sid] = {
                "student_id": sid,
                "name": student.display_name,
                "avatar_url": student.avatar_url,
                "total_points": 0,
                "correct": 0,
                "total": 0
            }
        student_scores[sid]["total_points"] += answer.points_earned
        student_scores[sid]["total"] += 1
        if answer.is_correct:
            student_scores[sid]["correct"] += 1

    ranked = sorted(student_scores.values(), key=lambda x: x["total_points"], reverse=True)
    for i, s in enumerate(ranked):
        s["rank"] = i + 1

    return ranked


@router.delete("/{quiz_id}")
async def delete_quiz(quiz_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(404, "Quiz not found")
    await db.delete(quiz)
    return {"status": "deleted"}
