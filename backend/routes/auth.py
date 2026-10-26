import hmac
import re
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import get_db
from email_service import send_verification_email
from models import EmailVerification, User
from security import hash_code, hash_password, verify_code, verify_password
from schemas import (
    EmailRequest,
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
    VerifyEmailRequest,
)

router = APIRouter()
security = HTTPBearer(auto_error=False)

sessions = {}
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
VERIFICATION_EXPIRY_MINUTES = 5
VERIFICATION_MAX_ATTEMPTS = 5
RESEND_COOLDOWN_SECONDS = 60


def normalize_email(email: str) -> str:
    normalized = email.strip().lower()
    if len(normalized) > 100 or not EMAIL_PATTERN.fullmatch(normalized):
        raise HTTPException(status_code=422, detail="Enter a valid email address")
    return normalized


def current_utc() -> datetime:
    return datetime.now(timezone.utc)


@router.post("/auth/send-verification-code")
def send_verification_code(
    email_data: EmailRequest,
    db: Session = Depends(get_db),
):
    email = normalize_email(email_data.email)
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=409, detail="Email is already registered")

    now = current_utc()
    latest = (
        db.query(EmailVerification)
        .filter(EmailVerification.email == email)
        .order_by(desc(EmailVerification.created_at))
        .first()
    )
    if latest and latest.created_at:
        created_at = latest.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        if (now - created_at).total_seconds() < RESEND_COOLDOWN_SECONDS:
            raise HTTPException(
                status_code=429,
                detail="Please wait before requesting another verification code",
            )

    code = f"{secrets.randbelow(1_000_000):06d}"
    code_hash, code_salt = hash_code(code)
    verification = EmailVerification(
        email=email,
        code_hash=code_hash,
        code_salt=code_salt,
        expires_at=now + timedelta(minutes=VERIFICATION_EXPIRY_MINUTES),
        created_at=now,
    )
    db.add(verification)
    db.commit()

    try:
        send_verification_email(email, code, VERIFICATION_EXPIRY_MINUTES)
    except RuntimeError:
        db.delete(verification)
        db.commit()
        raise HTTPException(
            status_code=502,
            detail="Could not send the verification email",
        )

    return {"success": True, "message": "Verification code sent"}


@router.post("/auth/verify-email")
def verify_email(
    verification_data: VerifyEmailRequest,
    db: Session = Depends(get_db),
):
    email = normalize_email(verification_data.email)
    if not re.fullmatch(r"\d{6}", verification_data.code):
        raise HTTPException(status_code=400, detail="Verification code must be 6 digits")

    verification = (
        db.query(EmailVerification)
        .filter(
            EmailVerification.email == email,
            EmailVerification.verified.is_(False),
            EmailVerification.consumed.is_(False),
        )
        .order_by(desc(EmailVerification.created_at))
        .first()
    )
    if not verification:
        raise HTTPException(status_code=400, detail="No active verification code found")

    expires_at = verification.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= current_utc():
        raise HTTPException(status_code=400, detail="Verification code has expired")

    if verification.attempts >= VERIFICATION_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many incorrect verification attempts")

    if not verify_code(verification_data.code, verification.code_hash, verification.code_salt):
        verification.attempts += 1
        db.commit()
        raise HTTPException(status_code=400, detail="Invalid verification code")

    verification.verified = True
    db.commit()
    return {"success": True, "message": "Email verified"}


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    user = sessions.get(credentials.credentials)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please log in again.",
        )

    return user


def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required",
        )
    return current_user


@router.post("/login", response_model=LoginResponse)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    
    user = (
        db.query(User)
        .filter(User.email == normalize_email(login_data.email))
        .first()
    )

    password_matches = False
    if user:
        password_matches = verify_password(login_data.password, user.password)
        if not password_matches:
            password_matches = hmac.compare_digest(user.password, login_data.password)
            if password_matches:
                user.password = hash_password(login_data.password)
                db.commit()

    if not user or not password_matches:
        return LoginResponse(
            success=False,
            message="Invalid email or password"
        )

    token = secrets.token_urlsafe(32)
    sessions[token] = {
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
    }

    return LoginResponse(
        success=True,
        message="Logged in",
        user_id=user.id,
        name=user.name,
        role=user.role,
        token=token,
    )


@router.get("/session")
def get_session(current_user: dict = Depends(get_current_user)):
    return {
        "success": True,
        **current_user,
    }


@router.post("/register", response_model=RegisterResponse)
@router.post("/auth/register", response_model=RegisterResponse)
def register(
    register_data: RegisterRequest,
    db: Session = Depends(get_db)
):
    
    email = normalize_email(register_data.email)
    if len(register_data.name.strip()) == 0 or len(register_data.name.strip()) > 100:
        raise HTTPException(status_code=422, detail="Name is required")
    if len(register_data.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters")

    existing_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_user:
        return RegisterResponse(
            success=False,
            message="Email already registered"
        )

    verification = (
        db.query(EmailVerification)
        .filter(
            EmailVerification.email == email,
            EmailVerification.verified.is_(True),
            EmailVerification.consumed.is_(False),
        )
        .order_by(desc(EmailVerification.created_at))
        .first()
    )
    if not verification:
        raise HTTPException(status_code=403, detail="Verify your email before registering")

    expires_at = verification.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= current_utc():
        raise HTTPException(status_code=403, detail="Email verification has expired")

    new_user = User(
        name=register_data.name.strip(),
        email=email,
        password=hash_password(register_data.password),
        role="student"
    )

    verification.consumed = True
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return RegisterResponse(
        success=True,
        message="Registration successful",
        user_id=new_user.id
    )

