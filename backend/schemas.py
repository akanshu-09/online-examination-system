from pydantic import BaseModel
from typing import Optional


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    success: bool
    message: str
    user_id: Optional[int] = None
    name: Optional[str] = None
    role: Optional[str] = None
    token: Optional[str] = None


class ExamResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    duration: int

    class Config:
        from_attributes = True


class QuestionResponse(BaseModel):
    id: int
    exam_id: int
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str

    class Config:
        from_attributes = True


class AttemptCreate(BaseModel):
    user_id: int
    exam_id: int


class AttemptResponse(BaseModel):
    id: int
    user_id: int
    exam_id: int
    score: int
    submitted: bool = False
    tab_switch_count: int = 0
    terminated: bool = False
    termination_reason: Optional[str] = None

    class Config:
        from_attributes = True


class TabSwitchResponse(BaseModel):
    tab_switch_count: int
    terminated: bool
    termination_reason: Optional[str] = None


class AnswerCreate(BaseModel):
    question_id: int
    selected_option: str

class AnswerReviewUpdate(BaseModel):
    marked_for_review: bool


class ResultResponse(BaseModel):
    attempt_id: int
    exam_id: Optional[int] = None
    score: int
    total_questions: int
    percentage: float
    submitted: bool = False
    tab_switch_count: int = 0
    terminated: bool = False
    termination_reason: Optional[str] = None


class ExamCreate(BaseModel):
    title: str
    description: Optional[str] = None
    duration: int

class QuestionCreate(BaseModel):
    exam_id: int
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_option: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class RegisterResponse(BaseModel):
    success: bool
    message: str
    user_id: Optional[int] = None


class EmailRequest(BaseModel):
    email: str


class VerifyEmailRequest(BaseModel):
    email: str
    code: str