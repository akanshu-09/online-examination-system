import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, HelpCircle, Loader2 } from 'lucide-react';
import { getExam } from '../../api/exams';
import { startAttempt } from '../../api/attempts';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../utils/helpers';
import Loader from '../../components/common/Loader';
import ErrorState from '../../components/common/ErrorState';

const INSTRUCTIONS = [
  'Make sure you have a stable internet connection.',
  'Your answers are saved while you attempt the exam.',
  'You can review questions before submitting.',
  'Do not refresh or close the examination window unnecessarily.',
  'The examination will be submitted when you click Submit.',
];

export default function PreExamInstructions() {
  const { examId } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [exam, setExam] = useState(location.state?.exam ?? null);
  const [loading, setLoading] = useState(!location.state?.exam);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');

  useEffect(() => {
    if (exam) return;
    let cancelled = false;

    async function load() {
      try {
        setExam(await getExam(examId));
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Exam not found.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [exam, examId]);

  async function handleStart() {
    setStarting(true);
    setStartError('');
    try {
      const attempt = await startAttempt(user.id, Number(examId));
      const attemptId = attempt.attempt_id ?? attempt.id;
      sessionStorage.setItem(`examora_attempt_${attemptId}`, JSON.stringify(exam));
      navigate(`/student/exam/${attemptId}`, { state: { exam } });
    } catch (err) {
      setStartError(getErrorMessage(err, 'Could not start the exam. Please try again.'));
      setStarting(false);
    }
  }

  if (loading) return <Loader label="Loading exam…" />;
  if (error) return <ErrorState message={error} />;
  if (!exam) return null;

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="page-header">
        <span className="page-eyebrow">Before you begin</span>
        <h1 className="page-title">{exam.title}</h1>
      </div>

      <div className="card card-pad">
        <div className="exam-meta" style={{ marginBottom: 22, fontSize: 14 }}>
          {exam.duration != null && <span><Clock size={15} /> {exam.duration} minutes</span>}
          {exam.questions_count != null && <span><HelpCircle size={15} /> {exam.questions_count} questions</span>}
        </div>

        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Before you begin</h3>
        <ol className="instructions-list">
          {INSTRUCTIONS.map((line) => <li key={line}>{line}</li>)}
        </ol>

        {startError && <div className="form-error">{startError}</div>}

        <div className="exam-actions" style={{ marginTop: 22 }}>
          <button className="btn btn-secondary" onClick={() => navigate(`/student/exams/${examId}`)} disabled={starting}>
            <ArrowLeft size={16} /> Back
          </button>
          <button className="btn btn-primary" onClick={handleStart} disabled={starting}>
            {starting && <Loader2 size={16} className="spin-icon" />}
            {starting ? 'Starting…' : 'Start Exam'}
          </button>
        </div>
      </div>
    </div>
  );
}