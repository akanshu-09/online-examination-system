from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from routes.auth import require_admin
from models import Exam, Question, Attempt, User
from schemas import ExamCreate, ExamResponse, QuestionCreate

router = APIRouter()


@router.post("/admin/exams", response_model=ExamResponse)
def create_exam(
    exam_data: ExamCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    exam = Exam(
        title=exam_data.title,
        description=exam_data.description,
        duration=exam_data.duration
    )

    db.add(exam)
    db.commit()
    db.refresh(exam)

    return exam

@router.post("/admin/questions")
def create_question(
    question_data: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    exam = (
        db.query(Exam)
        .filter(Exam.id == question_data.exam_id)
        .first()
    )

    if not exam:
        raise HTTPException(
            status_code=404,
            detail="Exam not found"
        )

    if question_data.correct_option not in ["A", "B", "C", "D"]:
        raise HTTPException(
            status_code=400,
            detail="Correct option must be A, B, C, or D"
        )

    question = Question(
        exam_id=question_data.exam_id,
        question_text=question_data.question_text,
        option_a=question_data.option_a,
        option_b=question_data.option_b,
        option_c=question_data.option_c,
        option_d=question_data.option_d,
        correct_option=question_data.correct_option
    )

    db.add(question)
    db.commit()
    db.refresh(question)

    return {
        "message": "Question created successfully",
        "question_id": question.id
    }

@router.get("/admin/results")
def get_all_results(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    attempts = db.query(Attempt).all()

    results = []

    for attempt in attempts:

        user = (
            db.query(User)
            .filter(User.id == attempt.user_id)
            .first()
        )

        exam = (
            db.query(Exam)
            .filter(Exam.id == attempt.exam_id)
            .first()
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

        results.append({
            "attempt_id": attempt.id,
            "student_id": attempt.user_id,
            "student_name": user.name if user else "Unknown",
            "exam_id": attempt.exam_id,
            "exam_title": exam.title if exam else "Unknown",
            "score": attempt.score,
            "total_questions": total_questions,
            "percentage": percentage,
            "submitted_at": attempt.submitted_at,
            "tab_switch_count": attempt.tab_switch_count,
            "terminated": attempt.terminated,
            "termination_reason": attempt.termination_reason
        })

    return results
