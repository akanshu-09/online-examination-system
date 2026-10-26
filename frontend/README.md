# Examora — Frontend

A React + Vite frontend for your existing FastAPI + PostgreSQL online examination
backend. This does **not** modify, replace, or invent anything on the backend —
it's a UI built strictly against the API contract in your spec.

## How to run it

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

## What must be running

Your FastAPI backend at `http://127.0.0.1:8000` (`uvicorn ... --reload`), with
PostgreSQL up and reachable, exactly as it already is. Nothing about the backend,
its routes, or the database schema was changed.

## Backend CORS requirement (only backend-side note)

The frontend calls `http://127.0.0.1:8000` from `http://localhost:5173`, which
is a cross-origin request. Your FastAPI app needs `CORSMiddleware` enabled for
the dev origin, e.g.:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

This is a config addition only — no route, model, or schema changes.

## Project structure

```
src/
  api/            Axios client + one module per resource (auth, exams, attempts, results, admin)
  context/        AuthContext — stores the logged-in user (id, name, email, role)
  components/
    common/       Loader, ErrorState, EmptyState, ProtectedRoute, ScoreRing, Modal, Toast
    layout/       StudentLayout (topbar) and AdminLayout (sidebar)
  pages/
    Login.jsx
    student/      Dashboard, ExamsList, ExamDetails, ExamInterface, Results, ResultDetail
    admin/        AdminDashboard, AdminExams, AdminCreateExam, AdminAddQuestion, AdminResults
  utils/          Error-message mapping, date/percentage/timer formatting
```

## Routes

```
/login
/student                      dashboard
/student/exams                exam listing
/student/exams/:examId        exam details + start
/student/exam/:attemptId      live examination interface (timer, autosave, submit)
/student/results              results history
/student/results/:attemptId   single result detail

/admin                        dashboard (stats computed client-side from GET /admin/results)
/admin/exams                  exam listing
/admin/exams/create           create exam form
/admin/questions/create       add question form
/admin/results                searchable/sortable/filterable results table
```

## Endpoints used (exactly as specified — nothing invented)

`POST /login` · `GET /exams` · `GET /exams/{id}` · `GET /exams/{id}/questions` ·
`POST /attempts` · `POST /attempts/{id}/answers` · `POST /attempts/{id}/submit` ·
`GET /results/{user_id}` · `GET /results/attempt/{id}` · `POST /admin/exams` ·
`POST /admin/questions` · `GET /admin/results`

## Assumptions you may need to adjust

Since I built this from your written spec (no ZIP of an existing frontend or
live Swagger/OpenAPI schema was available in this session — only this document
was provided), a couple of details had to be assumed. They're isolated to single,
clearly-commented spots so they're easy to correct:

1. **`POST /login` request shape** — `src/api/auth.js` sends `{ email, password }`.
   If your backend expects different field names (e.g. `username`), change the
   payload built in `src/pages/Login.jsx`'s `handleSubmit`.
2. **Login response → role mapping** — `src/context/AuthContext.jsx`'s
   `normalizeUser()` looks for `role`, `user_role`, or `is_admin` on the login
   response (or a nested `response.user`), and for a `token`/`access_token` to
   attach as a Bearer header on later requests. Adjust that function if your
   response is shaped differently.
3. **No "get attempt/exam by attempt id" endpoint exists** in your spec, so the
   exam interface (`ExamInterface.jsx`) carries the exam object via React Router
   navigation state and also caches it in `sessionStorage` (keyed by attempt id)
   so a page refresh mid-exam doesn't lose the title/duration. If the backend
   later adds a way to fetch attempt details, that cache can be replaced with
   a real fetch.
4. **`exam.questions_count`** is displayed if the backend includes it on the
   exam object; if not present, that line is simply omitted from the UI (no
   error, no placeholder).

## Security note honored

`correct_option`, even if the backend includes it in
`GET /exams/{id}/questions`, is never read or rendered anywhere in the student
UI — it's only used (and only entered by admins) in the Add Question form.

## Known limitations

- No JWT-style route guarding beyond what's in the browser session — matches
  "do not implement complicated authentication unless the existing frontend
  already requires it."
- The exam timer is entirely frontend-driven from `exam.duration`; the backend
  remains the source of truth for scoring, so a client-side clock drift can't
  affect the actual result.
- Redux was not introduced — all state is React Context + component state, per
  the spec.

## If you'd like me to wire this to your actual backend

If you paste your backend's `openapi.json` (from `http://127.0.0.1:8000/openapi.json`)
or upload your existing frontend ZIP, I can re-check every request/response
shape against the real contract and correct any of the assumptions above.
