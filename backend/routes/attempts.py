from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from routes.auth import get_current_user
from schemas import AttemptCreate, AnswerCreate, AnswerReviewUpdate, TabSwitchResponse
from models import Attempt, Exam, User, Question, Answer
from datetime import datetime

router = APIRouter()


@router.post("/attempts")
def start_attempt(
    attempt_data: AttemptCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user = (
        db.query(User)
        .filter(User.id == attempt_data.user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    exam = (
        db.query(Exam)
        .filter(Exam.id == attempt_data.exam_id)
        .first()
    )

    if not exam:
        raise HTTPException(
            status_code=404,
            detail="Exam not found"
        )

    attempt = Attempt(
        user_id=attempt_data.user_id,
        exam_id=attempt_data.exam_id,
        score=0,
        tab_switch_count=0,
        terminated=False,
        termination_reason=None
    )

    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    return {
        "attempt_id": attempt.id,
        "user_id": attempt.user_id,
        "exam_id": attempt.exam_id,
        "tab_switch_count": attempt.tab_switch_count,
        "terminated": attempt.terminated,
        "termination_reason": attempt.termination_reason
    }

@router.get("/attempts/{attempt_id}")
def get_attempt(
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

    return {
        "attempt_id": attempt.id,
        "user_id": attempt.user_id,
        "exam_id": attempt.exam_id,
        "score": attempt.score,
        "submitted": attempt.submitted,
        "submitted_at": attempt.submitted_at,
        "tab_switch_count": attempt.tab_switch_count,
        "terminated": attempt.terminated,
        "termination_reason": attempt.termination_reason
    }

@router.post("/attempts/{attempt_id}/tab-switch", response_model=TabSwitchResponse)
def record_tab_switch(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    attempt = (
        db.query(Attempt)
        .filter(Attempt.id == attempt_id)
        .with_for_update()
        .first()
    )

    if not attempt:
        raise HTTPException(
            status_code=404,
            detail="Attempt not found"
        )

    if attempt.terminated:
        return TabSwitchResponse(
            tab_switch_count=attempt.tab_switch_count,
            terminated=True,
            termination_reason=attempt.termination_reason or "Excessive tab switching"
        )

    attempt.tab_switch_count = (attempt.tab_switch_count or 0) + 1

    if attempt.tab_switch_count >= 3:
        attempt.terminated = True
        attempt.termination_reason = "Excessive tab switching"

    db.commit()
    db.refresh(attempt)

    return TabSwitchResponse(
        tab_switch_count=attempt.tab_switch_count,
        terminated=attempt.terminated,
        termination_reason=attempt.termination_reason
    )

@router.post("/attempts/{attempt_id}/answers")
def save_answer(
    attempt_id: int,
    answer_data: AnswerCreate,
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

    if attempt.terminated:
        raise HTTPException(
            status_code=400,
            detail="Attempt has been terminated due to tab switching"
        )

    question = (
        db.query(Question)
        .filter(
            Question.id == answer_data.question_id,
            Question.exam_id == attempt.exam_id
        )
        .first()
    )

    if not question:
        raise HTTPException(
            status_code=404,
            detail="Question does not belong to this exam"
        )

    if answer_data.selected_option not in ["A", "B", "C", "D"]:
        raise HTTPException(
            status_code=400,
            detail="Selected option must be A, B, C, or D"
        )

    existing_answer = (
        db.query(Answer)
        .filter(
            Answer.attempt_id == attempt_id,
            Answer.question_id == answer_data.question_id
        )
        .first()
    )

    if existing_answer:
        existing_answer.selected_option = answer_data.selected_option

        db.commit()

        return {
            "message": "Answer updated successfully",
            "answer_id": existing_answer.id
        }

    answer = Answer(
        attempt_id=attempt_id,
        question_id=answer_data.question_id,
        selected_option=answer_data.selected_option
    )

    db.add(answer)
    db.commit()
    db.refresh(answer)

    return {
        "message": "Answer saved successfully",
        "answer_id": answer.id
    }

@router.patch("/attempts/{attempt_id}/answers/{question_id}/review")
def update_answer_review(
    attempt_id: int,
    question_id: int,
    review_data: AnswerReviewUpdate,
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

    if attempt.terminated:
        raise HTTPException(
            status_code=400,
            detail="Attempt has been terminated due to tab switching"
        )

    question = (
        db.query(Question)
        .filter(
            Question.id == question_id,
            Question.exam_id == attempt.exam_id
        )
        .first()
    )

    if not question:
        raise HTTPException(
            status_code=404,
            detail="Question does not belong to this exam"
        )

    answer = (
        db.query(Answer)
        .filter(
            Answer.attempt_id == attempt_id,
            Answer.question_id == question_id
        )
        .first()
    )

    if answer:
        answer.marked_for_review = review_data.marked_for_review
    else:
        answer = Answer(
            attempt_id=attempt_id,
            question_id=question_id,
            marked_for_review=review_data.marked_for_review
        )
        db.add(answer)

    db.commit()

    return {
        "message": "Review status updated successfully"
    }

@router.post("/attempts/{attempt_id}/submit")
def submit_attempt(
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

    if attempt.terminated:
        raise HTTPException(
            status_code=400,
            detail="Attempt has been terminated due to tab switching"
        )

    if attempt.submitted:
        raise HTTPException(
            status_code=400,
            detail="Attempt has already been submitted"
        )

    questions = (
        db.query(Question)
        .filter(Question.exam_id == attempt.exam_id)
        .all()
    )

    answers = (
        db.query(Answer)
        .filter(Answer.attempt_id == attempt_id)
        .all()
    )

    answer_map = {
        answer.question_id: answer.selected_option
        for answer in answers
    }

    score = 0

    for question in questions:
        selected_answer = answer_map.get(question.id)

        if selected_answer == question.correct_option:
            score += 1

    total_questions = len(questions)

    percentage = 0

    if total_questions > 0:
        percentage = round(
            (score / total_questions) * 100,
            2
        )

    attempt.score = score
    attempt.submitted = True
    attempt.submitted_at = datetime.now()

    db.commit()
    db.refresh(attempt)

    return {
        "attempt_id": attempt.id,
        "score": score,
        "total_questions": total_questions,
        "percentage": percentage,
        "submitted": True
    }
