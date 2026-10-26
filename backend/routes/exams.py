from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from routes.auth import get_current_user
from models import Exam, Question
from schemas import ExamResponse, QuestionResponse

router = APIRouter()


@router.get("/exams", response_model=list[ExamResponse])
def get_exams(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return db.query(Exam).all()


@router.get("/exams/{exam_id}", response_model=ExamResponse)
def get_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()

    if not exam:
        raise HTTPException(
            status_code=404,
            detail="Exam not found"
        )

    return exam


@router.get(
    "/exams/{exam_id}/questions",
    response_model=list[QuestionResponse]
)
def get_questions(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()

    if not exam:
        raise HTTPException(
            status_code=404,
            detail="Exam not found"
        )

    questions = (
        db.query(Question)
        .filter(Question.exam_id == exam_id)
        .all()
    )

    return questions