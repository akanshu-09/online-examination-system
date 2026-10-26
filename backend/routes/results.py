from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from routes.auth import get_current_user
from models import Attempt, Exam, User, Question
from schemas import ResultResponse

router = APIRouter()

@router.get("/results/{user_id}")
def get_user_results(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    attempts = (
        db.query(Attempt)
        .filter(Attempt.user_id == user_id)
        .all()
    )

    results = []

    for attempt in attempts:

        total_questions = (
            db.query(Question)
            .filter(Question.exam_id == attempt.exam_id)
            .count()
        )

        percentage = 0

        if total_questions > 0:
            percentage = (
                attempt.score / total_questions
            ) * 100

        exam = (
            db.query(Exam)
            .filter(Exam.id == attempt.exam_id)
            .first()
        )

        results.append({
            "attempt_id": attempt.id,
            "exam_id": attempt.exam_id,
            "exam_title": exam.title if exam else "Unknown",
            "score": attempt.score,
            "total_questions": total_questions,
            "percentage": percentage,
            "submitted_at": attempt.submitted_at,
            "submitted": attempt.submitted,
            "tab_switch_count": attempt.tab_switch_count,
            "terminated": attempt.terminated,
            "termination_reason": attempt.termination_reason
        })

    return results


@router.get("/results/attempt/{attempt_id}")
def get_attempt_result(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    attempt = (
        db.query(Attempt)
        .filter(Attempt.id == attempt_id)
        .first()
    )

    if not attempt:
        raise HTTPException(
            status_code=404,
            detail="Attempt not found"
        )

    total_questions = (
        db.query(Question)
        .filter(Question.exam_id == attempt.exam_id)
        .count()
    )

    percentage = 0

    if total_questions > 0:
        percentage = (
            attempt.score / total_questions
        ) * 100

    return {
        "attempt_id": attempt.id,
        "exam_id": attempt.exam_id,
        "score": attempt.score,
        "total_questions": total_questions,
        "percentage": percentage,
        "submitted_at": attempt.submitted_at,
        "submitted": attempt.submitted,
        "tab_switch_count": attempt.tab_switch_count,
        "terminated": attempt.terminated,
        "termination_reason": attempt.termination_reason
    }
