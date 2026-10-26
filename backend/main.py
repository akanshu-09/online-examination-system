from fastapi import FastAPI
from routes.attempts import router as attempt_router
from routes.exams import router as exam_router
from routes.auth import router as auth_router
from routes.results import router as result_router
from routes.admin import router as admin_router
from database import engine
from models import EmailVerification



from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Online Examination System")


@app.on_event("startup")
def create_auth_tables():
    EmailVerification.__table__.create(bind=engine, checkfirst=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(exam_router)
app.include_router(auth_router)
app.include_router(attempt_router)
app.include_router(result_router)
app.include_router(admin_router)

@app.get("/")
def home():
    return 
    {
        "message": "System API is running"
    }