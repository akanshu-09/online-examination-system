import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Timer, Check, Star } from 'lucide-react';
import { getExamQuestions } from '../../api/exams';
import { recordTabSwitch, saveAnswer, submitAttempt, updateAnswerReview } from '../../api/attempts';
import { getErrorMessage, formatSeconds, OPTION_LABELS, optionKey } from '../../utils/helpers';
import { useToast } from '../../components/common/Toast';
import Loader from '../../components/common/Loader';
import ErrorState from '../../components/common/ErrorState';
import Modal from '../../components/common/Modal';

export default function ExamInterface() {
  const { attemptId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const exam = useMemo(() => {
    if (location.state?.exam) return location.state.exam;
    try {
      const cached = sessionStorage.getItem(`examora_attempt_${attemptId}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }, [location.state, attemptId]);

  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [question_id]: 'A' }
  const [savingId, setSavingId] = useState(null);
  const [reviewedQuestions, setReviewedQuestions] = useState({});
  const [reviewUpdating, setReviewUpdating] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [secondsLeft, setSecondsLeft] = useState(null);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [terminationMessage, setTerminationMessage] = useState('');
  const submittedRef = useRef(false);
  const tabSwitchCountRef = useRef(0);
  const terminationStartedRef = useRef(false);

  useEffect(() => {
    try {
      const savedCount = Number(sessionStorage.getItem(`examora_tab_switches_${attemptId}`) || 0);
      if (savedCount > 0) {
        tabSwitchCountRef.current = savedCount;
        setTabSwitchCount(savedCount);
      }
    } catch {
      // Session storage may be unavailable in privacy-restricted browsers.
    }
  }, [attemptId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!exam?.id) {
        setError('Exam session not found. Please start this exam again from the exams page.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const data = await getExamQuestions(exam.id);
        if (!cancelled) {
          setQuestions(data);
          setReviewedQuestions(
            Object.fromEntries(
              data.map((question) => [question.id, Boolean(question.marked_for_review)])
            )
          );
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load exam questions.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam?.id]);

  useEffect(() => {
    if (exam?.duration != null && secondsLeft === null) {
      setSecondsLeft(Number(exam.duration) * 60);
    }
  }, [exam, secondsLeft]);

  const handleAutoSubmit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    try {
      await submitAttempt(attemptId);
      showToast('Time is up — your exam was submitted automatically.', 'success');
    } catch (err) {
      // If it was already submitted, that's fine — just proceed to results.
      if (err?.response?.status !== 400) {
        showToast(getErrorMessage(err), 'error');
      }
    } finally {
      sessionStorage.removeItem(`examora_attempt_${attemptId}`);
      navigate(`/student/results/${attemptId}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId, navigate]);

  const terminateForTabSwitch = useCallback(async (count) => {
    if (terminationStartedRef.current) return;
    terminationStartedRef.current = true;
    submittedRef.current = true;
    setTerminationMessage('Exam terminated due to excessive tab switching.');

    try {
      await recordTabSwitch(attemptId, count, true);
    } catch (err) {
      showToast(getErrorMessage(err, 'Could not record the termination reason.'), 'error');
    }

    try {
      await submitAttempt(attemptId);
    } catch (err) {
      if (err?.response?.status !== 400) {
        showToast(getErrorMessage(err, 'Could not submit the terminated exam.'), 'error');
      }
    } finally {
      sessionStorage.removeItem(`examora_attempt_${attemptId}`);
      sessionStorage.removeItem(`examora_tab_switches_${attemptId}`);
      navigate(`/student/results/${attemptId}`, { replace: true });
    }
  }, [attemptId, navigate, showToast]);

  // Count only real transitions to hidden while the loaded attempt is active.
  useEffect(() => {
    if (loading || !questions || submittedRef.current) return undefined;

    function handleVisibilityChange() {
      if (document.visibilityState !== 'hidden' || submittedRef.current || terminationStartedRef.current) return;

      const nextCount = tabSwitchCountRef.current + 1;
      tabSwitchCountRef.current = nextCount;
      setTabSwitchCount(nextCount);
      sessionStorage.setItem(`examora_tab_switches_${attemptId}`, String(nextCount));

      if (nextCount > 2) {
        terminateForTabSwitch(nextCount);
        return;
      }

      const message = nextCount === 1
        ? 'Warning: Leaving the exam window is not allowed. This is violation 1 of 2.'
        : 'Warning: Leaving the exam window again will terminate your exam. This is violation 2 of 2.';
      showToast(message, 'error');
      recordTabSwitch(attemptId, nextCount).catch((err) => {
        showToast(getErrorMessage(err, 'Could not record the tab-switch violation.'), 'error');
      });
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [attemptId, loading, questions, showToast, terminateForTabSwitch]);

  // Countdown tick.
  useEffect(() => {
    if (secondsLeft === null || submittedRef.current) return;
    if (secondsLeft <= 0) {
      handleAutoSubmit();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, handleAutoSubmit]);

  async function handleSelect(question, letter) {
    if (terminationStartedRef.current || submittedRef.current) return;
    setAnswers((prev) => ({ ...prev, [question.id]: letter }));
    setSavingId(question.id);
    try {
      await saveAnswer(attemptId, question.id, letter);
    } catch (err) {
      showToast(getErrorMessage(err, 'Could not save that answer.'), 'error');
    } finally {
      setSavingId(null);
    }
  }

  async function handleReviewToggle() {
    if (terminationStartedRef.current || submittedRef.current) return;
    const markedForReview = !reviewedQuestions[current.id];
    setReviewUpdating(true);
    setReviewedQuestions((prev) => ({ ...prev, [current.id]: markedForReview }));
    try {
      await updateAnswerReview(attemptId, current.id, markedForReview);
    } catch (err) {
      setReviewedQuestions((prev) => ({ ...prev, [current.id]: !markedForReview }));
      showToast(getErrorMessage(err, 'Could not update the review status.'), 'error');
    } finally {
      setReviewUpdating(false);
    }
  }

  async function handleConfirmSubmit() {
    setSubmitting(true);
    setSubmitError('');
    try {
      submittedRef.current = true;
      await submitAttempt(attemptId);
      sessionStorage.removeItem(`examora_attempt_${attemptId}`);
      navigate(`/student/results/${attemptId}`, { replace: true });
    } catch (err) {
      if (err?.response?.status === 400) {
        // Already submitted — treat as success and move on.
        sessionStorage.removeItem(`examora_attempt_${attemptId}`);
        navigate(`/student/results/${attemptId}`, { replace: true });
        return;
      }
      submittedRef.current = false;
      setSubmitError(getErrorMessage(err, 'Could not submit your exam.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="app-shell"><div className="app-main"><Loader label="Loading examination…" /></div></div>;
  if (error) {
    return (
      <div className="app-shell">
        <div className="app-main">
          <ErrorState message={error} />
          <div className="text-center mt-24">
            <button className="btn btn-secondary" onClick={() => navigate('/student/exams')}>Back to exams</button>
          </div>
        </div>
      </div>
    );
  }
  if (!questions || questions.length === 0) {
    return (
      <div className="app-shell">
        <div className="app-main">
          <ErrorState message="This exam has no questions yet." />
        </div>
      </div>
    );
  }

  const current = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const timerClass = secondsLeft <= 30 ? 'timer-critical' : secondsLeft <= 60 ? 'timer-warning' : '';

  return (
    <div className="app-shell">
      <header className="topbar exam-topbar" style={{ padding: '0 28px' }}>
        <div>
          <div className="topbar-brand" style={{ marginBottom: 2 }}>
            <span>Examora</span>
          </div>
          <div className="exam-topbar-sub">{exam?.title}</div>
        </div>
        {secondsLeft !== null && (
          <div className={`exam-timer ${timerClass}`}>
            <Timer size={17} />
            {formatSeconds(secondsLeft)}
          </div>
        )}
      </header>

      <main className="app-main">
        <div className="exam-body">
          <div className="card card-pad">
            <div className="question-progress">Question {currentIndex + 1} of {questions.length}</div>
            <p className="question-text">{current.question_text}</p>

            <div className="option-list">
              {OPTION_LABELS.map((letter) => {
                const text = current[optionKey(letter)];
                if (text === undefined || text === null) return null;
                const selected = answers[current.id] === letter;
                return (
                  <div
                    key={letter}
                    className={`option-row${selected ? ' selected' : ''}`}
                    onClick={() => handleSelect(current, letter)}
                    role="radio"
                    aria-checked={selected}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelect(current, letter); }}
                  >
                    <span className="option-bubble">{selected ? <Check size={13} /> : letter}</span>
                    <span className="option-text">{text}</span>
                  </div>
                );
              })}
            </div>

            <button
              className={`review-toggle${reviewedQuestions[current.id] ? ' marked' : ''}`}
              onClick={handleReviewToggle}
              disabled={reviewUpdating}
              aria-pressed={reviewedQuestions[current.id]}
            >
              <Star size={17} fill={reviewedQuestions[current.id] ? 'currentColor' : 'none'} />
              {reviewedQuestions[current.id] ? 'Marked for Review' : 'Mark for Review'}
            </button>

            <div className="exam-actions">
              <button
                className="btn btn-secondary"
                disabled={currentIndex === 0 || terminationStartedRef.current || submittedRef.current}
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              >
                Previous
              </button>
              <div className="exam-actions-right">
                {currentIndex < questions.length - 1 ? (
                  <button
                    className="btn btn-primary"
                    onClick={() => !terminationStartedRef.current && !submittedRef.current && setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
                  >
                    Next
                  </button>
                ) : null}
                <button className="btn btn-danger" onClick={() => setConfirmOpen(true)} disabled={terminationStartedRef.current || submittedRef.current}>
                  Submit Exam
                </button>
              </div>
            </div>
          </div>

          <aside className="card card-pad exam-nav-panel">
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>Questions</h3>
            <p style={{ fontSize: 12.5, color: 'var(--color-ink-muted)', marginTop: 2 }}>
              {answeredCount} of {questions.length} answered
            </p>

            <div className="nav-bubbles">
              {questions.map((q, idx) => {
                const isAnswered = answers[q.id] != null;
                const isMarkedForReview = reviewedQuestions[q.id];
                const isCurrent = idx === currentIndex;
                return (
                  <button
                    key={q.id}
                    className={`nav-bubble${isAnswered ? ' answered' : ''}${isMarkedForReview ? ' review' : ''}${isCurrent ? ' current' : ''}`}
                    onClick={() => !terminationStartedRef.current && !submittedRef.current && setCurrentIndex(idx)}
                    aria-label={`Go to question ${idx + 1}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="nav-legend">
              <span><span className="legend-dot answered" /> Answered</span>
              <span><span className="legend-dot unanswered" /> Unanswered</span>
              <span><span className="legend-dot review" /> Marked for review</span>
              <span><span className="legend-dot current" /> Current question</span>
            </div>
          </aside>
        </div>
      </main>

      <Modal open={confirmOpen} title="Submit exam?" onClose={() => !submitting && setConfirmOpen(false)}>
        <p style={{ fontSize: 14, color: 'var(--color-ink-muted)', lineHeight: 1.55 }}>
          You've answered {answeredCount} of {questions.length} questions. You won't be able to
          change your answers after submitting.
        </p>
        {submitError && <div className="form-error" style={{ marginTop: 16, marginBottom: 0 }}>{submitError}</div>}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setConfirmOpen(false)} disabled={submitting}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={handleConfirmSubmit} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Exam'}
          </button>
        </div>
      </Modal>

      <Modal open={Boolean(terminationMessage)} title="Exam terminated" onClose={() => {}}>
        <p style={{ fontSize: 14, color: 'var(--color-ink-muted)', lineHeight: 1.55 }}>
          {terminationMessage}
        </p>
      </Modal>
    </div>
  );
}
